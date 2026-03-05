// extension/background.js
importScripts("i18n.js");
console.log("Cognitive Guardian: Background service worker started.");

const BACKEND_URL = "http://localhost:8000"; // ADK endpoint TODO
let captureInterval = null;
let isMonitoring = false;
let mockIndex = 0;

// API functions
async function sendFrameToBackend(dataUrl, metadata) {
  console.log("📸 Frame captured for analysis:", metadata.url.substring(0, 50));

  // Get dynamic language to respond with proper mock
  const locale = await I18n.getCurrentLocale();

  // Dummy sequence to simulate different interventions over time
  const mockScenarios = [
    {
      action: "alert",
      type: "procrastination",
      messageKey: "mock_procrastination",
    },
    { action: "none" },
    { action: "alert", type: "phishing", messageKey: "mock_phishing" },
    { action: "none" },
    { action: "alert", type: "fakenews", messageKey: "mock_fakenews" },
    { action: "none" },
    { action: "alert", type: "burnout", messageKey: "mock_burnout" },
    { action: "none" },
  ];

  // MOCKING THE RESPONSE FOR NOW
  setTimeout(() => {
    const rawResult = mockScenarios[mockIndex];
    let result = { ...rawResult };

    if (result.action !== "none") {
      result.message = I18n.tSync(locale, result.messageKey);
      result.locale = locale; // Pass locale to content script for accurate Text-To-Speech pronunciation
      result.timestamp = Date.now();

      // Pass translated feedback strings specifically to UI
      result.feedbackAskText = I18n.tSync(locale, "feedback_ask");
      result.feedbackYesText = I18n.tSync(locale, "feedback_yes");
      result.feedbackNoText = I18n.tSync(locale, "feedback_no");
      result.feedbackThanksText = I18n.tSync(locale, "feedback_thanks");
      result.feedbackPlaceholderText = I18n.tSync(
        locale,
        "feedback_placeholder",
      );
      result.feedbackSubmitText = I18n.tSync(locale, "feedback_submit");

      console.log("🤖 Mock Analysis result:", result);
      handleAgentAction(result);
    }

    mockIndex = (mockIndex + 1) % mockScenarios.length;
  }, 1000); // Simulate 1s network latency
}

function handleAgentAction(result) {
  if (!result || !result.action || result.action === "none") return;

  // Find active tab to send message
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs.length === 0) return;

    const activeTab = tabs[0];
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
  });
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
            sendFrameToBackend(dataUrl, metadata);
          }
        },
      );
    }
  });
}

// Controls
function startMonitoring() {
  if (isMonitoring) return;
  isMonitoring = true;
  console.log("Started monitoring...");
  captureAndSend(); // capture manual once
  captureInterval = setInterval(captureAndSend, 5000); // 5 seconds interval
}

function stopMonitoring() {
  isMonitoring = false;
  if (captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
  }
  console.log("Stopped monitoring.");
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
  } else if (message.command === "SUBMIT_FEEDBACK") {
    console.log("📝 User Feedback sent to ADK Model:", message.payload);
    // TODO: In the real implementation, we send a POST to ADK
    // fetch(`${BACKEND_URL}/api/feedback`, { method: "POST", body: ... })
  }
});
