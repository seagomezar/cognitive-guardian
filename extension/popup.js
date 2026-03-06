// extension/popup.js
document.addEventListener("DOMContentLoaded", async () => {
  const toggleBtn = document.getElementById("toggleBtn");
  const statusIndicator = document.getElementById("statusIndicator");
  const statusText = document.getElementById("statusText");
  const langSelect = document.getElementById("langSelect");
  const consentCb = document.getElementById("consentCb");
  const errorMsg = document.getElementById("errorMsg");

  // Elements for i18n
  const elSubtitle = document.getElementById("el_subtitle");
  const elLangLabel = document.getElementById("el_lang_label");
  const elConsentLabel = document.getElementById("el_consent_label");
  const elTermsLink = document.getElementById("el_terms_link");
  const elAnalyticsTitle = document.getElementById("el_analytics_title");
  const elStatHelped = document.getElementById("el_stat_helped");
  const elStatRejected = document.getElementById("el_stat_rejected");
  const statHelped = document.getElementById("stat_helped");
  const statRejected = document.getElementById("stat_rejected");

  let isMonitoring = false;
  let currentLocale = await I18n.getCurrentLocale();

  // Load consent checked state and analytics from storage
  chrome.storage.local.get(["cg_consent", "cg_analytics"], function (result) {
    if (result.cg_consent) {
      consentCb.checked = true;
    }
    if (result.cg_analytics) {
      if (statHelped) statHelped.textContent = result.cg_analytics.helped || 0;
      if (statRejected)
        statRejected.textContent = result.cg_analytics.rejected || 0;
    }
  });

  // Set initial dropdown value
  langSelect.value = currentLocale;

  function translateUI() {
    elSubtitle.textContent = I18n.tSync(currentLocale, "subtitle");
    elLangLabel.textContent = I18n.tSync(currentLocale, "lang_label");
    elConsentLabel.textContent = I18n.tSync(currentLocale, "consent_label");
    elTermsLink.textContent = I18n.tSync(currentLocale, "terms_link");
    errorMsg.textContent = I18n.tSync(currentLocale, "consent_error");
    if (elAnalyticsTitle)
      elAnalyticsTitle.textContent = I18n.tSync(
        currentLocale,
        "analytics_title",
      );
    if (elStatHelped)
      elStatHelped.textContent = I18n.tSync(currentLocale, "stat_helped");
    if (elStatRejected)
      elStatRejected.textContent = I18n.tSync(currentLocale, "stat_rejected");
    updateUI(); // This translates the button and status text
  }

  function updateUI() {
    if (isMonitoring) {
      toggleBtn.textContent = I18n.tSync(currentLocale, "btn_stop");
      toggleBtn.classList.add("active");
      statusIndicator.classList.add("on");
      statusText.textContent = I18n.tSync(currentLocale, "status_monitoring");
      consentCb.disabled = true; // Block unchecking while active
    } else {
      toggleBtn.textContent = I18n.tSync(currentLocale, "btn_start");
      toggleBtn.classList.remove("active");
      statusIndicator.classList.remove("on");
      statusText.textContent = I18n.tSync(currentLocale, "status_inactive");
      consentCb.disabled = false;
    }
  }

  // Initial translation
  translateUI();

  // Check current status
  chrome.runtime.sendMessage({ command: "GET_STATUS" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    if (response) {
      isMonitoring = response.isMonitoring;
      updateUI();
    }
  });

  // Language changed
  langSelect.addEventListener("change", async (e) => {
    currentLocale = e.target.value;
    await I18n.setLocale(currentLocale);
    translateUI();
  });

  // Save consent click to storage
  consentCb.addEventListener("change", () => {
    chrome.storage.local.set({ cg_consent: consentCb.checked });
    if (consentCb.checked) errorMsg.style.display = "none";
  });

  // Toggle button click
  toggleBtn.addEventListener("click", () => {
    if (!isMonitoring && !consentCb.checked) {
      errorMsg.style.display = "block";
      return;
    }
    errorMsg.style.display = "none";

    const command = isMonitoring ? "STOP_MONITORING" : "START_MONITORING";
    chrome.runtime.sendMessage({ command: command }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        return;
      }
      isMonitoring = !isMonitoring;
      updateUI();
    });
  });
});
