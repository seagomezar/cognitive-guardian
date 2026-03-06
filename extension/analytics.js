// extension/analytics.js
document.addEventListener("DOMContentLoaded", async () => {
  const elAnalyticsTitle = document.getElementById("el_analytics_title");
  const elStatHelped = document.getElementById("el_stat_helped");
  const elStatRejected = document.getElementById("el_stat_rejected");
  const statHelped = document.getElementById("stat_helped");
  const statRejected = document.getElementById("stat_rejected");

  let currentLocale = await I18n.getCurrentLocale();

  // Load analytics from storage
  chrome.storage.local.get(["cg_analytics"], function (result) {
    if (result.cg_analytics) {
      if (statHelped) statHelped.textContent = result.cg_analytics.helped || 0;
      if (statRejected)
        statRejected.textContent = result.cg_analytics.rejected || 0;
    }
  });

  // Track changes in local storage in real-time
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local" && changes.cg_analytics) {
      if (statHelped)
        statHelped.textContent = changes.cg_analytics.newValue.helped || 0;
      if (statRejected)
        statRejected.textContent = changes.cg_analytics.newValue.rejected || 0;
    }
  });

  function translateUI() {
    if (elAnalyticsTitle)
      elAnalyticsTitle.textContent = I18n.tSync(
        currentLocale,
        "analytics_title",
      );
    if (elStatHelped)
      elStatHelped.textContent = I18n.tSync(currentLocale, "stat_helped");
    if (elStatRejected)
      elStatRejected.textContent = I18n.tSync(currentLocale, "stat_rejected");
  }

  translateUI();

  // Track real time language changes
  chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === "local" && changes.cg_language) {
      currentLocale = changes.cg_language.newValue;
      translateUI();
    }
  });

  // Handle close button click safely (no inline script for CSP)
  const btnClose = document.getElementById("btnClose");
  if (btnClose) {
    btnClose.addEventListener("click", () => {
      window.close();
    });
  }
});
