(function () {
  function visible(element) {
    if (!element || !(element instanceof HTMLElement)) return false;
    if (element.hidden || element.getAttribute("aria-hidden") === "true") return false;
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function dropdownFieldFor(select) {
    if (!select) return null;
    return select.closest(
      [
        ".country_drop_wrap",
        ".can_select",
        ".can_select_wrap",
        ".select_wrap",
        ".select2-container",
        ".floatlabel-wrapper",
        ".core_field",
        ".form_builder_output",
        "li",
        ".control-group",
        ".field"
      ].join(",")
    );
  }

  function removeEmptyDropdownInputs(field, select) {
    if (!field || !select) return;
    const inputs = Array.from(field.querySelectorAll('input[type="text"], input[type="search"], input:not([type])'));
    inputs.forEach(function (input) {
      if (!(input instanceof HTMLInputElement)) return;
      if (input.type === "hidden") return;
      if (!visible(input)) return;
      if (String(input.value || "").trim()) return;
      const className = String(input.className || "");
      const name = String(input.name || "");
      const id = String(input.id || "");
      const looksGenerated =
        !name ||
        /select2|chosen|search|dropdown|write[-_ ]?in/i.test(className + " " + name + " " + id);
      if (!looksGenerated) return;
      input.remove();
    });
  }

  function hideGeneratedSelect2Controls(select, field) {
    if (!select || !field) return;
    const generatedControls = [];
    if (
      select.previousElementSibling &&
      select.previousElementSibling.classList &&
      select.previousElementSibling.classList.contains("select2-container")
    ) {
      generatedControls.push(select.previousElementSibling);
    }
    field.querySelectorAll(".select2-container").forEach(function (control) {
      if (generatedControls.indexOf(control) === -1) generatedControls.push(control);
    });
    generatedControls.forEach(function (control) {
      control.hidden = true;
      control.setAttribute("aria-hidden", "true");
      control.style.display = "none";
    });
    select.classList.remove("select2-offscreen");
    select.classList.add("gpe-an-native-select");
    select.removeAttribute("tabindex");
    select.removeAttribute("aria-hidden");
    select.style.position = "static";
    select.style.opacity = "1";
    select.style.display = "block";
    select.style.width = "100%";
    select.style.height = "auto";
    select.style.minHeight = "48px";
    select.style.pointerEvents = "auto";
    select.style.appearance = "auto";

    document.querySelectorAll(".select2-drop.can_embed_select2, .select2-drop").forEach(function (drop) {
      drop.hidden = true;
      drop.setAttribute("aria-hidden", "true");
      drop.style.display = "none";
    });
  }

  function syncSelectedValue(select, output) {
    if (!select || !output) return;
    const option = select.options && select.selectedIndex >= 0 ? select.options[select.selectedIndex] : null;
    const text = option && option.text ? option.text.trim() : "";
    output.textContent = text;
    output.hidden = !select.value || !text;
  }

  function initializeSelect(select) {
    if (!(select instanceof HTMLSelectElement)) return;
    if (select.dataset.gpeInitialized === "true") {
      const existingField = dropdownFieldFor(select);
      if (
        existingField &&
        (select.classList.contains("select2-offscreen") ||
          (select.previousElementSibling &&
            select.previousElementSibling.classList &&
            select.previousElementSibling.classList.contains("select2-container")))
      ) {
        hideGeneratedSelect2Controls(select, existingField);
      }
      removeEmptyDropdownInputs(existingField, select);
      return;
    }

    const field = dropdownFieldFor(select);
    if (!field) return;
    select.dataset.gpeInitialized = "true";
    field.classList.add("gpe-an-field");
    if (
      select.classList.contains("select2-offscreen") ||
      (select.previousElementSibling &&
        select.previousElementSibling.classList &&
        select.previousElementSibling.classList.contains("select2-container"))
    ) {
      hideGeneratedSelect2Controls(select, field);
    }
    removeEmptyDropdownInputs(field, select);

    const output = field.querySelector(".gpe-an-selected-value");
    if (output) {
      select.addEventListener("change", function () {
        syncSelectedValue(select, output);
      });
      syncSelectedValue(select, output);
    }
  }

  function normalizeActionNetworkDropdowns(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll("select").forEach(initializeSelect);
  }

  function initializeField(fieldConfig) {
    if (!fieldConfig || !fieldConfig.element) return;
    normalizeActionNetworkDropdowns(fieldConfig.element);
  }

  window.GPEActionNetworkDropdowns = {
    normalize: normalizeActionNetworkDropdowns,
    initializeField: initializeField
  };

  function start() {
    const roots = Array.from(document.querySelectorAll("#gpe-action-network-form, .action-network-shell, [id^='can-'][id*='-area-']"));
    const scopes = roots.length ? roots : [document.body];
    scopes.forEach(normalizeActionNetworkDropdowns);
    scopes.forEach(function (scope) {
      if (!scope) return;
      if (scope.dataset && scope.dataset.gpeDropdownObserver === "true") return;
      if (scope.dataset) scope.dataset.gpeDropdownObserver = "true";
      const observer = new MutationObserver(function () {
        normalizeActionNetworkDropdowns(scope);
      });
      observer.observe(scope, { childList: true, subtree: true });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
