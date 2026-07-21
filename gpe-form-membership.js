(function () {
  "use strict";

  var messages = {
    idle: "",
    checking: "Checking your GPE membership...",
    active_member_existing_hub_user: "We found your active GPE membership. This submission will be connected to your member profile.",
    active_member_needs_hub_invite: "We found your active GPE membership. We'll also help connect you to the GPE Hub.",
    inactive_or_expired_member: "Your previous GPE membership appears to be inactive. GPE membership is free, and you can renew it with this submission.",
    existing_constituent_without_membership: "We found an existing GPE account, but no active membership. You can become a free member without leaving this form.",
    nonmember: "Want to join the GPE community? Membership is free, and you can sign up with this submission.",
    ambiguous_account: "We could not automatically confirm your membership. You can still continue, and Team GPE will review the connection.",
    lookup_failed: "Membership status could not be checked right now. You can still continue.",
    hub_user_active_member: "Welcome back! Sign in to connect this submission to your GPE account.",
    hub_user_no_active_membership: "Your GPE Hub account does not currently have an active membership connected.",
    neon_member_needs_hub_activation: "You're already a GPE member. Activate your GPE Hub account to continue as a member.",
    expired_member: "Your previous GPE membership appears to be inactive. GPE membership is free, and you can renew it with this submission.",
    new_person: "Want to join the GPE community? Membership is free, and you can sign up with this submission.",
    ambiguous_match: "We could not safely confirm your membership. You can still submit this form, and Team GPE will review the connection.",
    lookup_unavailable: "Membership status could not be checked right now. You can still continue."
  };

  function publicConfig() {
    return window.GPE_FORM_CONFIG || {};
  }

  function stateFrom(data, fallback) {
    if (data && data.publicState) return data.publicState;
    var outcome = (data && data.outcome) || fallback;
    if (outcome === "active_member_existing_hub_user") return "hub_user_active_member";
    if (outcome === "active_member_needs_hub_invite") return "neon_member_needs_hub_activation";
    if (outcome === "inactive_or_expired_member") return "expired_member";
    if (outcome === "ambiguous_account") return "ambiguous_match";
    if (outcome === "lookup_failed") return "lookup_unavailable";
    if (outcome === "nonmember" && data && data.matched) return "existing_constituent_no_membership";
    if (outcome === "nonmember") return "new_person";
    return outcome || "lookup_unavailable";
  }

  function validEmail(value) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value || "").trim());
  }

  function debounce(fn, delay) {
    var timer = null;
    return function () {
      var args = arguments;
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        fn.apply(null, args);
      }, delay);
    };
  }

  function initMembershipPreflight(options) {
    var form = options.form;
    var emailInput = options.emailInput;
    var statusEl = options.statusEl;
    var firstNameInput = options.firstNameInput;
    var lastNameInput = options.lastNameInput;
    var membershipPanel = options.membershipPanel;
    var endpoint = options.endpoint;
    var controller = null;
    var lastEmail = "";
    var result = null;

    if (statusEl) {
      if (!statusEl.getAttribute("role")) statusEl.setAttribute("role", "status");
      if (!statusEl.getAttribute("aria-live")) statusEl.setAttribute("aria-live", "polite");
    }

    function ensurePanel() {
      if (membershipPanel || !form || !statusEl) return membershipPanel;
      var panel = document.createElement("div");
      panel.className = options.panelClass || "gpe-membership-inline-panel";
      panel.setAttribute("data-gpe-membership-panel", "true");
      panel.setAttribute("aria-live", "polite");
      panel.hidden = true;
      panel.innerHTML = [
        '<label class="gpe-membership-inline-choice">',
        '<input type="checkbox" data-gpe-membership-request>',
        '<span data-gpe-membership-request-label>Yes, create my free GPE membership with this submission.</span>',
        '</label>',
        '<label class="gpe-membership-inline-consent" hidden>',
        '<input type="checkbox" data-gpe-membership-consent>',
        '<span>I consent to become or renew as a Girl Plus Environment member.</span>',
        '</label>'
      ].join("");
      statusEl.insertAdjacentElement("afterend", panel);
      membershipPanel = panel;
      var request = panel.querySelector("[data-gpe-membership-request]");
      var consentWrap = panel.querySelector(".gpe-membership-inline-consent");
      if (request && consentWrap) {
        request.addEventListener("change", function () {
          consentWrap.hidden = !request.checked;
        });
      }
      return membershipPanel;
    }

    function ensureAuthPanel() {
      if (!form || !statusEl) return null;
      var existing = form.querySelector("[data-gpe-auth-panel]");
      if (existing) return existing;
      var config = publicConfig();
      var hubLogin = config.hubLoginUrl || "https://members.girlplusenvironment.org/login";
      var forgot = config.hubForgotPasswordUrl || hubLogin;
      var panel = document.createElement("div");
      panel.className = options.authPanelClass || "gpe-membership-auth-panel";
      panel.setAttribute("data-gpe-auth-panel", "true");
      panel.hidden = true;
      panel.innerHTML = [
        '<div data-gpe-auth-copy></div>',
        '<label data-gpe-password-row>Password <input type="password" data-gpe-auth-password autocomplete="current-password"></label>',
        '<button type="button" data-gpe-password-toggle>Show password</button>',
        '<button type="button" data-gpe-auth-submit>Sign in</button>',
        '<a data-gpe-forgot-password href="' + forgot + '" target="_top">Forgot password?</a>',
        '<a data-gpe-hub-link href="' + hubLogin + '" target="_top">Visit Hub</a>',
        '<div data-gpe-auth-status role="status" aria-live="polite" hidden></div>'
      ].join("");
      statusEl.insertAdjacentElement("afterend", panel);
      var password = panel.querySelector("[data-gpe-auth-password]");
      var toggle = panel.querySelector("[data-gpe-password-toggle]");
      var submit = panel.querySelector("[data-gpe-auth-submit]");
      var authStatus = panel.querySelector("[data-gpe-auth-status]");
      toggle.addEventListener("click", function () {
        password.type = password.type === "password" ? "text" : "password";
        toggle.textContent = password.type === "password" ? "Show password" : "Hide password";
      });
      submit.addEventListener("click", async function () {
        var email = emailInput.value.trim();
        if (!password.value.trim()) {
          authStatus.hidden = false;
          authStatus.textContent = "Enter your password to sign in.";
          return;
        }
        try {
          submit.disabled = true;
          authStatus.hidden = false;
          authStatus.textContent = "Signing in...";
          var supabaseLib = window.supabase;
          if (!supabaseLib || !supabaseLib.createClient || !config.supabaseUrl || !config.supabaseAnonKey) {
            var url = new URL(config.hubLoginUrl || "https://members.girlplusenvironment.org/login");
            url.searchParams.set("returnTo", window.location.href);
            window.location.href = url.toString();
            return;
          }
          var client = form.__gpeSupabaseClient || supabaseLib.createClient(config.supabaseUrl, config.supabaseAnonKey);
          form.__gpeSupabaseClient = client;
          var result = await client.auth.signInWithPassword({ email: email, password: password.value });
          if (result.error) throw result.error;
          form.dataset.gpeAuthenticated = "true";
          authStatus.textContent = "Signed in. Continue with this form.";
          form.dispatchEvent(new CustomEvent("gpe:authenticated", { detail: { email: email } }));
        } catch (error) {
          authStatus.textContent = "Sign-in failed. Use Forgot password or continue as allowed by this form.";
        } finally {
          submit.disabled = false;
        }
      });
      return panel;
    }

    function panelLabelFor(state) {
      if (state === "inactive_or_expired_member" || state === "expired_member") return "Renew my free GPE membership with this submission.";
      if (state === "existing_constituent_without_membership" || state === "existing_constituent_no_membership" || state === "hub_user_no_active_membership") return "Become a free GPE member with this submission.";
      return "Yes, create my free GPE membership with this submission.";
    }

    function setState(state, data) {
      result = data || result;
      state = stateFrom(data, state);
      statusEl.textContent = messages[state] || messages.lookup_failed;
      statusEl.dataset.state = state;
      statusEl.hidden = state === "idle";
      var panel = ensurePanel();
      var authPanel = ensureAuthPanel();
      if (panel) {
        var showPanel = state === "new_person" || state === "nonmember" || state === "inactive_or_expired_member" || state === "expired_member" || state === "existing_constituent_without_membership" || state === "existing_constituent_no_membership" || state === "hub_user_no_active_membership";
        var label = panel.querySelector("[data-gpe-membership-request-label]");
        if (label) label.textContent = panelLabelFor(state);
        panel.hidden = !showPanel;
        panel.setAttribute("aria-expanded", showPanel ? "true" : "false");
      }
      if (authPanel) {
        var authCopy = authPanel.querySelector("[data-gpe-auth-copy]");
        var passwordRow = authPanel.querySelector("[data-gpe-password-row]");
        var passwordToggle = authPanel.querySelector("[data-gpe-password-toggle]");
        var authSubmit = authPanel.querySelector("[data-gpe-auth-submit]");
        var hubLink = authPanel.querySelector("[data-gpe-hub-link]");
        var showAuth = state === "hub_user_active_member" || state === "neon_member_needs_hub_activation";
        authPanel.hidden = !showAuth;
        authPanel.setAttribute("aria-expanded", showAuth ? "true" : "false");
        if (authCopy) authCopy.textContent = messages[state] || "";
        var needsPassword = state === "hub_user_active_member";
        if (passwordRow) passwordRow.hidden = !needsPassword;
        if (passwordToggle) passwordToggle.hidden = !needsPassword;
        if (authSubmit) authSubmit.hidden = !needsPassword;
        if (hubLink) hubLink.textContent = state === "neon_member_needs_hub_activation" ? "Activate Hub account" : "Visit Hub";
      }
      if (form) {
        form.dataset.membershipOutcome = state;
        form.dataset.identityState = state;
        form.dispatchEvent(new CustomEvent("gpe:membership", { detail: { state: state, result: result } }));
      }
    }

    async function check() {
      var email = emailInput.value.trim();
      if (!validEmail(email) || email === lastEmail || !endpoint) return;
      lastEmail = email;
      if (controller) controller.abort();
      controller = new AbortController();
      setState("checking");
      try {
        var response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email,
            firstName: firstNameInput ? firstNameInput.value.trim() : "",
            lastName: lastNameInput ? lastNameInput.value.trim() : ""
          }),
          signal: controller.signal
        });
        if (!response.ok) throw new Error("membership lookup failed");
        var data = await response.json();
        setState(data.publicState || data.outcome || "lookup_failed", data);
      } catch (error) {
        if (error.name !== "AbortError") setState("lookup_failed");
      }
    }

    emailInput.addEventListener("blur", check);
    emailInput.addEventListener("input", debounce(check, options.debounceMs || 800));

    var api = {
      check: check,
      getResult: function () {
        return result;
      }
    };
    if (form) form.__gpeMembershipPreflight = api;
    return api;
  }

  window.GPEFormMembership = {
    messages: messages,
    validEmail: validEmail,
    supabaseClientForForm: function (form) {
      var config = publicConfig();
      var supabaseLib = window.supabase;
      if (!supabaseLib || !supabaseLib.createClient || !config.supabaseUrl || !config.supabaseAnonKey) return null;
      var target = form || document;
      var client = target.__gpeSupabaseClient || supabaseLib.createClient(config.supabaseUrl, config.supabaseAnonKey);
      target.__gpeSupabaseClient = client;
      return client;
    },
    accessTokenForForm: async function (form) {
      var client = window.GPEFormMembership.supabaseClientForForm(form);
      if (!client || !client.auth || !client.auth.getSession) return "";
      var result = await client.auth.getSession();
      return result && result.data && result.data.session && result.data.session.access_token ? result.data.session.access_token : "";
    },
    membershipRequestForForm: function (form, source) {
      if (!form) return null;
      var request = form.querySelector("[data-gpe-membership-request]");
      var consent = form.querySelector("[data-gpe-membership-consent]");
      var explicitCampConsent = form.querySelector('[name="membershipConsent"]');
      var requested = Boolean((request && request.checked) || (explicitCampConsent && explicitCampConsent.checked));
      if (!requested) return null;
      return {
        requested: true,
        consent: Boolean((consent && consent.checked) || (explicitCampConsent && explicitCampConsent.checked)),
        source: source || form.dataset.source || form.dataset.functionName || "gpe_public_form",
        firstName: form.querySelector('[name="firstName"]') ? form.querySelector('[name="firstName"]').value.trim() : "",
        lastName: form.querySelector('[name="lastName"]') ? form.querySelector('[name="lastName"]').value.trim() : "",
        email: form.querySelector('[name="email"]') ? form.querySelector('[name="email"]').value.trim() : "",
        phone: form.querySelector('[name="phone"]') ? form.querySelector('[name="phone"]').value.trim() : "",
        city: form.querySelector('[name="city"]') ? form.querySelector('[name="city"]').value.trim() : "",
        state: form.querySelector('[name="state"]') ? form.querySelector('[name="state"]').value.trim() : "",
        zip: form.querySelector('[name="zip"]') ? form.querySelector('[name="zip"]').value.trim() : ""
      };
    },
    init: initMembershipPreflight
  };

  if (!document.getElementById("gpe-membership-inline-style")) {
    var style = document.createElement("style");
    style.id = "gpe-membership-inline-style";
    style.textContent = [
      ".gpe-membership-inline-panel{margin-top:.75rem;border:3px solid #000;background:#fff7cc;padding:.85rem 1rem;font-weight:700;box-shadow:3px 3px 0 #000}",
      ".gpe-membership-inline-panel[hidden]{display:none!important}",
      ".gpe-membership-inline-panel label{display:flex;gap:.65rem;align-items:flex-start;margin:.35rem 0}",
      ".gpe-membership-inline-panel input{width:1.25rem;height:1.25rem;flex:0 0 auto;margin-top:.1rem;accent-color:#d53f8c}",
      ".gpe-membership-inline-panel input:focus-visible{outline:4px solid #67e8f9;outline-offset:3px}",
      ".gpe-membership-auth-panel{margin-top:.75rem;border:3px solid #000;background:#d9ffd0;padding:.85rem 1rem;font-weight:700;box-shadow:3px 3px 0 #000}",
      ".gpe-membership-auth-panel[hidden],.gpe-membership-auth-panel [hidden]{display:none!important}",
      ".gpe-membership-auth-panel label{display:grid;gap:.35rem;margin:.5rem 0}",
      ".gpe-membership-auth-panel input{border:3px solid #000;padding:.7rem;background:#fff;width:100%}",
      ".gpe-membership-auth-panel button,.gpe-membership-auth-panel a{display:inline-flex;margin:.35rem .35rem .35rem 0;border:3px solid #000;background:#fff;color:#000;padding:.65rem .9rem;font-weight:900;text-decoration:none;box-shadow:3px 3px 0 #000}",
      ".gpe-membership-auth-panel button:focus-visible,.gpe-membership-auth-panel a:focus-visible,.gpe-membership-auth-panel input:focus-visible{outline:4px solid #67e8f9;outline-offset:3px}"
    ].join("");
    document.head.appendChild(style);
  }
})();
