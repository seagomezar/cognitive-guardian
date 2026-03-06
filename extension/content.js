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
  } else if (
    alertData.type === "manipulation" ||
    alertData.type === "fakenews"
  ) {
    alertClass = "cg-alert-warning";
    icon = "👀";
  } else if (
    alertData.type === "procrastination" ||
    alertData.type === "burnout"
  ) {
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
      <span class="cg-alert-message"></span>
      
      <div class="cg-feedback-container">
        <div class="cg-feedback-row">
          <span class="cg-feedback-ask"></span>
          <div class="cg-feedback-buttons">
            <button class="cg-feedback-btn up" data-vote="up">👍 <span class="cg-feedback-yes"></span></button>
            <button class="cg-feedback-btn down" data-vote="down">👎 <span class="cg-feedback-no"></span></button>
          </div>
        </div>
        
        <div class="cg-feedback-input-area">
           <textarea class="cg-feedback-textarea"></textarea>
           <button class="cg-feedback-submit-btn"></button>
        </div>
      </div>
    </div>
  `;

  // Safely inject text to prevent XSS
  alertBox.querySelector(".cg-alert-message").textContent = alertData.message;

  const feedbackContainerTemp = alertBox.querySelector(
    ".cg-feedback-container",
  );
  feedbackContainerTemp.id = `feedback-container-${alertData.timestamp}`;
  feedbackContainerTemp.querySelector(".cg-feedback-ask").textContent =
    alertData.feedbackAskText;
  feedbackContainerTemp.querySelector(".cg-feedback-yes").textContent =
    alertData.feedbackYesText;
  feedbackContainerTemp.querySelector(".cg-feedback-no").textContent =
    alertData.feedbackNoText;

  const inputAreaTemp = feedbackContainerTemp.querySelector(
    ".cg-feedback-input-area",
  );
  inputAreaTemp.id = `feedback-input-${alertData.timestamp}`;
  inputAreaTemp.querySelector(".cg-feedback-textarea").placeholder =
    alertData.feedbackPlaceholderText;
  inputAreaTemp.querySelector(".cg-feedback-submit-btn").textContent =
    alertData.feedbackSubmitText;

  // Handle Feedback Submission
  const feedbackContainer = alertBox.querySelector(
    `#feedback-container-${alertData.timestamp}`,
  );
  const inputArea = feedbackContainer.querySelector(
    `#feedback-input-${alertData.timestamp}`,
  );
  const textarea = inputArea.querySelector("textarea");
  const submitBtn = inputArea.querySelector(".cg-feedback-submit-btn");

  // Function to finalize payload
  const finalizeFeedback = (vote, commentText) => {
    // Update UI safely
    feedbackContainer.innerHTML = "";
    const thanksSpan = document.createElement("span");
    thanksSpan.className = "cg-feedback-thanks";
    thanksSpan.textContent = `✨ ${alertData.feedbackThanksText}`;
    feedbackContainer.appendChild(thanksSpan);

    // Send data to background layer to forward to ADK
    chrome.runtime.sendMessage({
      command: "SUBMIT_FEEDBACK",
      payload: {
        originalAlert: alertData,
        vote: vote,
        comment: commentText || "",
      },
    });
  };

  const feedbackBtns = alertBox.querySelectorAll(".cg-feedback-btn");
  let selectedVote = null;

  feedbackBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const vote = btn.getAttribute("data-vote");

      if (vote === "down") {
        // Show beautiful inline text area instead of ugly prompt
        selectedVote = "down";
        inputArea.classList.add("active");
        textarea.focus();

        // Dim the YES button so it's clear what was pressed
        const upBtn = feedbackContainer.querySelector(".cg-feedback-btn.up");
        upBtn.classList.add("dimmed");
        btn.classList.add("selected");
      } else {
        finalizeFeedback("up", "");
      }
    });
  });

  submitBtn.addEventListener("click", () => {
    finalizeFeedback(selectedVote, textarea.value);
  });

  // Close functionality
  const closeBtn = alertBox.querySelector(".cg-close-btn");
  closeBtn.addEventListener("click", () => {
    if (!feedbackContainer.querySelector(".cg-feedback-thanks")) {
      chrome.runtime.sendMessage({
        command: "SUBMIT_FEEDBACK",
        payload: {
          originalAlert: alertData,
          vote: "ignored",
          comment: "",
        },
      });
    }

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
        if (!feedbackContainer.querySelector(".cg-feedback-thanks")) {
          chrome.runtime.sendMessage({
            command: "SUBMIT_FEEDBACK",
            payload: {
              originalAlert: alertData,
              vote: "ignored",
              comment: "",
            },
          });
        }
        alertBox.classList.add("cg-fade-out");
        setTimeout(() => {
          if (overlay.contains(alertBox)) overlay.removeChild(alertBox);
        }, 300);
      }
    }, 10000);
  }
}

function speakAlert(message, locale) {
  if ("speechSynthesis" in window) {
    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);

    const ttsLangMap = {
      es: "es-ES",
      fr: "fr-FR",
      pt: "pt-BR",
      en: "en-US",
    };
    utterance.lang = ttsLangMap[locale] || "en-US";
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

  if (
    actionPayload.action === "voice" ||
    actionPayload.voice_message ||
    actionPayload.message
  ) {
    const msg = actionPayload.voice_message || actionPayload.message;
    speakAlert(msg, actionPayload.locale || "en");
  }
}

// Receive messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "AGENT_INTERVENTION") {
    handleAgentAction(message.payload);
  }
});
