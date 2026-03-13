// extension/background.js
importScripts("i18n.js");
console.log("Cognitive Guardian: Background service worker started.");

const BACKEND_URL = "http://localhost:8000"; // ADK endpoint TODO
let captureInterval = null;
let isMonitoring = false;

// Keeps track of alerts shown per tab to prevent spamming
const ALERT_COOLDOWN_MS = 30_000;
const alertCooldowns = new Map(); // Map<tabId, Map<type, timestamp>>

// Clean up on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  alertCooldowns.delete(tabId);
});
// API functions
async function sendFrameToBackend(dataUrl, metadata, activeTab) {
  console.log(
    "📸 Frame captured, sending to backend:",
    metadata.url.substring(0, 50),
  );
  const locale = await I18n.getCurrentLocale();
  const timestamp = Date.now();

  try {
    const response = await fetch(`${BACKEND_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl, metadata, timestamp, locale }),
    });

    if (!response.ok) {
      console.error("Backend error:", response.status);
      return;
    }

    const result = await response.json();
    if (!result || result.action === "none") return;

    // Cooldown Check: Prevent repeating the same alert type within 30s
    const tabId = activeTab.id;
    let tabCooldowns = alertCooldowns.get(tabId);
    if (!tabCooldowns) {
      tabCooldowns = new Map();
      alertCooldowns.set(tabId, tabCooldowns);
    }

    const lastShown = tabCooldowns.get(result.type) || 0;
    if (Date.now() - lastShown < ALERT_COOLDOWN_MS) {
      console.log(
        `⏳ Cooldown active: Skipping '${result.type}' alert.`,
      );
      return;
    }

    tabCooldowns.set(result.type, Date.now());

    result.locale = locale;
    result.timestamp = timestamp;
    result.feedbackAskText = I18n.tSync(locale, "feedback_ask");
    result.feedbackYesText = I18n.tSync(locale, "feedback_yes");
    result.feedbackNoText = I18n.tSync(locale, "feedback_no");
    result.feedbackThanksText = I18n.tSync(locale, "feedback_thanks");
    result.feedbackPlaceholderText = I18n.tSync(locale, "feedback_placeholder");
    result.feedbackSubmitText = I18n.tSync(locale, "feedback_submit");

    console.log("🤖 ADK Analysis result:", result);
    handleAgentAction(result, activeTab);
  } catch (error) {
    console.error("Failed to contact backend:", error);
    // Graceful degradation: skip this frame silently
  }
}

function handleAgentAction(result, activeTab) {
  if (!result || !result.action || result.action === "none") return;

  chrome.tabs.sendMessage(
    activeTab.id,
    {
      type: "AGENT_INTERVENTION",
      payload: result,
    },
    function () {
      if (chrome.runtime.lastError) {
        console.warn(
          "⚠️ Error: Content script not found. Please refresh the web page you are trying to analyze.",
        );
      }
    },
  );
}

// Function to capture the visible tab
function captureAndSend() {
  if (!isMonitoring) return;

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs.length === 0) return;
    const activeTab = tabs[0];

    // Check if it's a page we can capture (not chrome://, etc)
    if (activeTab.url && activeTab.url.startsWith("http")) {
      chrome.tabs.captureVisibleTab(
        null,
        { format: "jpeg", quality: 50 },
        function (dataUrl) {
          if (chrome.runtime.lastError) {
            console.error("Capture error:", chrome.runtime.lastError.message);
            return;
          }
          if (dataUrl) {
            const metadata = {
              url: activeTab.url,
              title: activeTab.title,
            };
            sendFrameToBackend(dataUrl, metadata, activeTab);
          }
        },
      );
    }
  });
}

// Controls
function broadcastToActiveTab(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs.length === 0) return;
    chrome.tabs.sendMessage(tabs[0].id, message, () => {
      if (chrome.runtime.lastError) { /* tab not ready yet */ }
    });
  });
}

function startMonitoring() {
  if (isMonitoring) return;
  isMonitoring = true;
  console.log("Started monitoring...");
  captureAndSend(); // capture manual once
  captureInterval = setInterval(captureAndSend, 5000); // 5 seconds interval
  broadcastToActiveTab({ type: "START_AI_IMAGE_SCAN" });
}

function stopMonitoring() {
  isMonitoring = false;
  if (captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
  }
  console.log("Stopped monitoring.");
  broadcastToActiveTab({ type: "STOP_AI_IMAGE_SCAN" });
}

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "START_MONITORING") {
    startMonitoring();
    sendResponse({ status: "started" });
  } else if (message.command === "STOP_MONITORING") {
    stopMonitoring();
    sendResponse({ status: "stopped" });
  } else if (message.command === "GET_STATUS") {
    sendResponse({ isMonitoring: isMonitoring });
  } else if (message.command === "ANALYZE_IMAGE") {
    // Relay image analysis request to backend, send result back to content script
    const { image, url, context, timestamp, imageHash } = message.payload;
    const senderTabId = sender.tab && sender.tab.id;
    (async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/analyze-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image, url, context, timestamp, image_hash: imageHash }),
        });
        if (!response.ok) return;
        const result = await response.json();
        if (result.is_ai_generated && result.confidence >= 0.75 && senderTabId) {
          chrome.tabs.sendMessage(senderTabId, {
            type: "IMAGE_FLAGGED",
            payload: { imageHash, confidence: result.confidence, reasoning: result.reasoning },
          });
        }
      } catch (err) {
        console.error("AI image analysis failed:", err);
      }
    })();
    sendResponse({ status: "queued" });
  } else if (message.command === "SUBMIT_FEEDBACK") {
    console.log("📝 User Feedback sent to ADK Model:", message.payload);

    // Process analytics: Helped (Yes + Ignored) vs Rejected (No)
    chrome.storage.local.get(["cg_analytics"], function (result) {
      let analytics = result.cg_analytics || { helped: 0, rejected: 0 };

      if (message.payload.vote === "up" || message.payload.vote === "ignored") {
        analytics.helped++;
      } else if (message.payload.vote === "down") {
        analytics.rejected++;
      }

      chrome.storage.local.set({ cg_analytics: analytics });
    });

    // TODO: In the real implementation, we send a POST to ADK
    // fetch(`${BACKEND_URL}/api/feedback`, { method: "POST", body: ... })
  }
});
