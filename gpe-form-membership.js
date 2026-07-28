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

  var canonicalFieldsHtml = [
    '<fieldset class="gpe-membership-canonical-fields" data-gpe-membership-canonical hidden>',
    '<legend>Membership questions</legend>',
    '<label class="gpe-check-row"><input type="checkbox" name="eligibilityAffirmed" value="yes" data-gpe-membership-required><span>I identify as a Black or Brown girl, woman, femme, or gender-expansive person. *</span></label>',
    '<label>Age range * <select name="ageRange" data-gpe-membership-required><option value="">Select one</option><option value="under_18">Under 18</option><option value="18_24">18-24</option><option value="25_34">25-34</option><option value="35_44">35-44</option><option value="45_plus">45+</option><option value="prefer_not_to_say">Prefer not to say</option></select></label>',
    '<fieldset class="gpe-check-group"><legend>Race/ethnicity *</legend><p class="gpe-field-help">Select all that apply.</p><div class="gpe-check-grid"><label class="gpe-check-row"><input type="checkbox" name="raceEthnicity" value="black_african_american" data-gpe-membership-required-group="raceEthnicity"><span>Black or African American</span></label><label class="gpe-check-row"><input type="checkbox" name="raceEthnicity" value="latina_latine_hispanic" data-gpe-membership-required-group="raceEthnicity"><span>Latina, Latine, or Hispanic</span></label><label class="gpe-check-row"><input type="checkbox" name="raceEthnicity" value="indigenous_native" data-gpe-membership-required-group="raceEthnicity"><span>Indigenous or Native</span></label><label class="gpe-check-row"><input type="checkbox" name="raceEthnicity" value="asian_pacific_islander" data-gpe-membership-required-group="raceEthnicity"><span>Asian or Pacific Islander</span></label><label class="gpe-check-row"><input type="checkbox" name="raceEthnicity" value="middle_eastern_north_african" data-gpe-membership-required-group="raceEthnicity"><span>Middle Eastern or North African</span></label><label class="gpe-check-row"><input type="checkbox" name="raceEthnicity" value="multiracial" data-gpe-membership-required-group="raceEthnicity"><span>Multiracial</span></label><label class="gpe-check-row"><input type="checkbox" name="raceEthnicity" value="self_describe" data-gpe-membership-required-group="raceEthnicity"><span>Self-describe</span></label></div></fieldset>',
    '<label>Race/ethnicity self-description <input name="raceEthnicityOther"></label>',
    '<fieldset class="gpe-check-group"><legend>Gender identity</legend><p class="gpe-field-help">Select all that apply.</p><div class="gpe-check-grid"><label class="gpe-check-row"><input type="checkbox" name="genderIdentity" value="girl"><span>Girl</span></label><label class="gpe-check-row"><input type="checkbox" name="genderIdentity" value="woman"><span>Woman</span></label><label class="gpe-check-row"><input type="checkbox" name="genderIdentity" value="femme"><span>Femme</span></label><label class="gpe-check-row"><input type="checkbox" name="genderIdentity" value="gender_expansive"><span>Gender-expansive</span></label><label class="gpe-check-row"><input type="checkbox" name="genderIdentity" value="nonbinary"><span>Nonbinary</span></label><label class="gpe-check-row"><input type="checkbox" name="genderIdentity" value="self_describe"><span>Self-describe</span></label><label class="gpe-check-row"><input type="checkbox" name="genderIdentity" value="prefer_not_to_say"><span>Prefer not to say</span></label></div></fieldset>',
    '<label>Gender self-description <input name="genderIdentityOther"></label>',
    '<fieldset class="gpe-check-group"><legend>Climate interests</legend><p class="gpe-field-help">Select all that apply.</p><div class="gpe-check-grid"><label class="gpe-check-row"><input type="checkbox" name="climateInterests" value="energy_justice"><span>Energy justice</span></label><label class="gpe-check-row"><input type="checkbox" name="climateInterests" value="extreme_weather"><span>Extreme weather</span></label><label class="gpe-check-row"><input type="checkbox" name="climateInterests" value="clean_beauty"><span>Clean beauty justice</span></label><label class="gpe-check-row"><input type="checkbox" name="climateInterests" value="climate_mental_health"><span>Climate mental health</span></label><label class="gpe-check-row"><input type="checkbox" name="climateInterests" value="green_jobs"><span>Green jobs</span></label><label class="gpe-check-row"><input type="checkbox" name="climateInterests" value="community_advocacy"><span>Community advocacy</span></label></div></fieldset>',
    '<fieldset class="gpe-check-group"><legend>Communication preferences</legend><p class="gpe-field-help">Select all that apply.</p><div class="gpe-check-grid"><label class="gpe-check-row"><input type="checkbox" name="communicationPreferences" value="email"><span>Email</span></label><label class="gpe-check-row"><input type="checkbox" name="communicationPreferences" value="sms"><span>SMS/text</span></label><label class="gpe-check-row"><input type="checkbox" name="communicationPreferences" value="events"><span>Events</span></label><label class="gpe-check-row"><input type="checkbox" name="communicationPreferences" value="office_hours"><span>Office Hours</span></label></div></fieldset>',
    '<label class="gpe-check-row"><input type="checkbox" name="interestedInOfficeHours" value="yes"><span>I am interested in attending GPE Office Hours.</span></label>',
    '<label class="gpe-check-row"><input type="checkbox" name="emailConsent" value="yes" data-gpe-membership-required><span>I agree to receive GPE membership emails. *</span></label>',
    '<label class="gpe-check-row"><input type="checkbox" name="smsConsent" value="yes"><span>I agree to receive SMS/text updates where available.</span></label>',
    '<label class="gpe-check-row"><input type="checkbox" name="termsConsent" value="yes" data-gpe-membership-required><span>I agree to GPE membership terms and privacy expectations. *</span></label>',
    '</fieldset>'
  ].join("");

  function setCanonicalRequired(panel, enabled) {
    if (!panel) return;
    panel.querySelectorAll("[data-gpe-membership-required]").forEach(function (field) {
      if (enabled) field.setAttribute("required", "required");
      else field.removeAttribute("required");
    });
  }

  function selectedValues(form, name) {
    return Array.from(form.querySelectorAll('[name="' + name + '"]:checked')).map(function (input) {
      return input.value;
    });
  }

  function enhanceMembershipCheckboxLayout(root) {
    (root || document).querySelectorAll(".gpe-membership-canonical-fields label").forEach(function (label) {
      if (label.querySelector('input[type="checkbox"]')) label.classList.add("gpe-check-row");
    });
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
        '</label>',
        canonicalFieldsHtml
      ].join("");
      enhanceMembershipCheckboxLayout(panel);
      statusEl.insertAdjacentElement("afterend", panel);
      membershipPanel = panel;
      var request = panel.querySelector("[data-gpe-membership-request]");
      var consentWrap = panel.querySelector(".gpe-membership-inline-consent");
      if (request && consentWrap) {
        request.addEventListener("change", function () {
          consentWrap.hidden = !request.checked;
          var canonical = panel.querySelector("[data-gpe-membership-canonical]");
          if (canonical) canonical.hidden = !request.checked;
          setCanonicalRequired(panel, request.checked);
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
        var showPanel = state === "new_person" || state === "nonmember" || state === "inactive_or_expired_member" || state === "expired_member" || state === "existing_constituent_without_membership" || state === "existing_constituent_no_membership" || state === "hub_user_no_active_membership" || state === "ambiguous_account" || state === "ambiguous_match" || state === "lookup_failed" || state === "lookup_unavailable";
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
        console.log("Calling endpoint:", endpoint);
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
    if (form) {
      var explicitCampConsent = form.querySelector('[name="membershipConsent"]');
      var existingCanonical = form.querySelector("[data-gpe-membership-canonical]");
      if (explicitCampConsent && existingCanonical) {
        enhanceMembershipCheckboxLayout(existingCanonical);
        function syncExplicitCanonical() {
          existingCanonical.hidden = !explicitCampConsent.checked;
          setCanonicalRequired(existingCanonical, explicitCampConsent.checked);
        }
        explicitCampConsent.addEventListener("change", syncExplicitCanonical);
        syncExplicitCanonical();
      }
    }

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
        zip: form.querySelector('[name="zip"]') ? form.querySelector('[name="zip"]').value.trim() : "",
        ageRange: form.querySelector('[name="ageRange"]') ? form.querySelector('[name="ageRange"]').value.trim() : "",
        raceEthnicity: selectedValues(form, "raceEthnicity"),
        raceEthnicityOther: form.querySelector('[name="raceEthnicityOther"]') ? form.querySelector('[name="raceEthnicityOther"]').value.trim() : "",
        genderIdentity: selectedValues(form, "genderIdentity"),
        genderIdentityOther: form.querySelector('[name="genderIdentityOther"]') ? form.querySelector('[name="genderIdentityOther"]').value.trim() : "",
        eligibilityAffirmed: Boolean(form.querySelector('[name="eligibilityAffirmed"]:checked')),
        interestedInOfficeHours: Boolean(form.querySelector('[name="interestedInOfficeHours"]:checked')),
        climateInterests: selectedValues(form, "climateInterests"),
        communicationPreferences: selectedValues(form, "communicationPreferences"),
        emailConsent: Boolean(form.querySelector('[name="emailConsent"]:checked')),
        smsConsent: Boolean(form.querySelector('[name="smsConsent"]:checked')),
        termsConsent: Boolean(form.querySelector('[name="termsConsent"]:checked'))
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
      ".gpe-membership-inline-panel label{display:grid;gap:.35rem;margin:.45rem 0}",
      ".gpe-membership-inline-panel fieldset{border:0;padding:0;margin:.75rem 0 0}",
      ".gpe-membership-inline-panel legend{font-weight:900;text-transform:uppercase;margin:.45rem 0}",
      ".gpe-membership-inline-panel .gpe-field-help{margin:.15rem 0 .45rem;font-size:.85rem;font-weight:800;text-transform:none}",
      ".gpe-membership-inline-panel .gpe-check-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:.45rem .75rem}",
      ".gpe-membership-inline-panel .gpe-check-row,.gpe-membership-inline-choice,.gpe-membership-inline-consent{display:grid!important;grid-template-columns:1.375rem minmax(0,1fr)!important;align-items:start!important;column-gap:.75rem!important;row-gap:0!important;width:100%;line-height:1.35}",
      ".gpe-membership-inline-panel .gpe-check-row span,.gpe-membership-inline-choice span,.gpe-membership-inline-consent span{min-width:0}",
      ".gpe-membership-inline-panel select,.gpe-membership-inline-panel input:not([type=checkbox]){border:3px solid #000;padding:.65rem;background:#fff;width:100%;margin-top:.3rem}",
      ".gpe-membership-inline-panel input[type=checkbox],[data-gpe-custom-form] input[type=checkbox],[data-gpe-grad-form] input[type=checkbox],[data-camp-gpe-form] input[type=checkbox]{width:1.375rem!important;height:1.375rem!important;min-width:1.375rem!important;max-width:1.375rem!important;padding:0!important;margin:.1rem 0 0!important;flex:0 0 1.375rem;accent-color:#d53f8c}",
      "[data-gpe-custom-form] .gpe-membership-canonical-fields .gpe-check-row,[data-gpe-custom-form] .gpe-membership-canonical-fields label:has(input[type=checkbox]),[data-gpe-grad-form] .gpe-membership-canonical-fields .gpe-check-row,[data-gpe-grad-form] .gpe-membership-canonical-fields label:has(input[type=checkbox]),[data-camp-gpe-form] .gpe-membership-canonical-fields .gpe-check-row,[data-camp-gpe-form] .gpe-membership-canonical-fields label:has(input[type=checkbox]){display:grid!important;grid-template-columns:1.375rem minmax(0,1fr)!important;align-items:start!important;gap:0 .75rem!important;width:100%;line-height:1.35}",
      "[data-gpe-custom-form] .gpe-membership-canonical-fields fieldset,[data-gpe-grad-form] .gpe-membership-canonical-fields fieldset,[data-camp-gpe-form] .gpe-membership-canonical-fields fieldset{display:grid;gap:.45rem;margin-top:.75rem}",
      ".gpe-membership-inline-panel input:focus-visible{outline:4px solid #67e8f9;outline-offset:3px}",
      "@media (max-width:640px){.gpe-membership-inline-panel .gpe-check-grid{grid-template-columns:1fr}.gpe-membership-inline-panel{padding:.8rem}}",
      ".gpe-membership-auth-panel{margin-top:.75rem;border:3px solid #000;background:#d9ffd0;padding:.85rem 1rem;font-weight:700;box-shadow:3px 3px 0 #000}",
      ".gpe-membership-auth-panel[hidden],.gpe-membership-auth-panel [hidden]{display:none!important}",
      ".gpe-membership-auth-panel label{display:grid;gap:.35rem;margin:.5rem 0}",
      ".gpe-membership-auth-panel input{border:3px solid #000;padding:.7rem;background:#fff;width:100%}",
      ".gpe-membership-auth-panel button,.gpe-membership-auth-panel a{display:inline-flex;margin:.35rem .35rem .35rem 0;border:3px solid #000;background:#fff;color:#000;padding:.65rem .9rem;font-weight:900;text-decoration:none;box-shadow:3px 3px 0 #000}",
      ".gpe-membership-auth-panel button:focus-visible,.gpe-membership-auth-panel a:focus-visible,.gpe-membership-auth-panel input:focus-visible{outline:4px solid #67e8f9;outline-offset:3px}"
    ].join("");
    document.head.appendChild(style);
  }
  enhanceMembershipCheckboxLayout(document);
})();
