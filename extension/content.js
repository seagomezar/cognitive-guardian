// extension/content.js
console.log("Cognitive Guardian: Content script injected.");

// Intervene visually
function showOverlay(alertData) {
    // Check if overlay already exists
    let overlay = document.getElementById("cg-overlay-container");

    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "cg-overlay-container";
        document.body.appendChild(overlay);
    }

    // Determine styling based on type
    let alertClass = "cg-alert-default";
    let icon = "🛡️";

    if (alertData.type === "phishing" || alertData.type === "scam") {
        alertClass = "cg-alert-danger";
        icon = "⚠️";
    } else if (alertData.type === "manipulation" || alertData.type === "fakenews") {
        alertClass = "cg-alert-warning";
        icon = "👀";
    } else if (alertData.type === "procrastination" || alertData.type === "burnout") {
        alertClass = "cg-alert-info";
        icon = "🧘";
    }

    const alertBox = document.createElement("div");
    alertBox.className = `cg-alert-box ${alertClass}`;

    alertBox.innerHTML = `
    <div class="cg-alert-header">
      <span class="cg-icon">${icon}</span>
      <span class="cg-title">Cognitive Guardian</span>
      <button class="cg-close-btn">&times;</button>
    </div>
    <div class="cg-alert-body">
      ${alertData.message}
    </div>
  `;

    // Close functionality
    const closeBtn = alertBox.querySelector(".cg-close-btn");
    closeBtn.addEventListener("click", () => {
        alertBox.classList.add("cg-fade-out");
        setTimeout(() => {
            if (overlay.contains(alertBox)) overlay.removeChild(alertBox);
        }, 300);
    });

    overlay.appendChild(alertBox);

    // Auto remove after 10s unless it's critical
    if (alertData.type !== "phishing") {
        setTimeout(() => {
            if (overlay.contains(alertBox)) {
                alertBox.classList.add("cg-fade-out");
                setTimeout(() => {
                    if (overlay.contains(alertBox)) overlay.removeChild(alertBox);
                }, 300);
            }
        }, 10000);
    }
}

function speakAlert(message) {
    if ('speechSynthesis' in window) {
        // Stop any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'es-ES'; // Default syntax to spanish
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    }
}

// Add voice interaction 
function handleAgentAction(actionPayload) {
    console.log("Cognitive Guardian Intervention:", actionPayload);

    if (actionPayload.action === "alert") {
        showOverlay(actionPayload);
    }

    if (actionPayload.action === "voice" || actionPayload.voice_message) {
        const msg = actionPayload.voice_message || actionPayload.message;
        speakAlert(msg);
    }
}

// Receive messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "AGENT_INTERVENTION") {
        handleAgentAction(message.payload);
    }
});
