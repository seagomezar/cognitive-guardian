// extension/background.js
console.log("Cognitive Guardian: Background service worker started.");

const BACKEND_URL = "http://localhost:8000"; // Update this later
let captureInterval = null;
let isMonitoring = false;

// API functions
async function sendFrameToBackend(dataUrl, metadata) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image: dataUrl,
        metadata: metadata,
        timestamp: Date.now()
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log("Analysis result:", result);
      handleAgentAction(result);
    }
  } catch (error) {
    console.error("Error communicating with Cognitive Guardian backend:", error);
  }
}

function handleAgentAction(result) {
  if (!result || !result.action || result.action === "none") return;
  
  // Find active tab to send message
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (tabs.length === 0) return;
    
    const activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, {
      type: "AGENT_INTERVENTION",
      payload: result
    });
  });
}

// Function to capture the visible tab
function captureAndSend() {
  if (!isMonitoring) return;
  
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (tabs.length === 0) return;
    const activeTab = tabs[0];
    
    // Check if it's a page we can capture (not chrome://, etc)
    if (activeTab.url && activeTab.url.startsWith("http")) {
       chrome.tabs.captureVisibleTab(null, { format: "jpeg", quality: 50 }, function(dataUrl) {
          if (chrome.runtime.lastError) {
             console.error("Capture error:", chrome.runtime.lastError.message);
             return;
          }
          if (dataUrl) {
              const metadata = {
                  url: activeTab.url,
                  title: activeTab.title
              };
              sendFrameToBackend(dataUrl, metadata);
          }
       });
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
  }
});

// Start by default for the hackathon? 
// Might be better to let user click start in popup.
