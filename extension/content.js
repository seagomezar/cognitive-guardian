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
  } else if (alertData.type === "aiimage") {
    alertClass = "cg-alert-warning";
    icon = "🤖";
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

function playAudioAlert(actionPayload) {
  const msg = actionPayload.voice_message || actionPayload.message;
  if (!msg) return;

  if (actionPayload.audio_data) {
    try {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      const audio = new Audio(actionPayload.audio_data);
      audio.play().catch((err) => {
        console.warn("CG: Audio play failed, falling back to Web Speech:", err);
        speakAlert(msg, actionPayload.locale || "en");
      });
      return;
    } catch (err) {
      console.warn("CG: Audio element failed, falling back to Web Speech:", err);
    }
  }
  speakAlert(msg, actionPayload.locale || "en");
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
    playAudioAlert(actionPayload);
  }
}

// --- AI Image Detection ---

const _analyzedImageHashes = new Set();
const _imageBadges = new Map(); // imageHash -> badge element
let _aiFlaggedCount = 0;
let _aiSummaryEl = null;

function showOrUpdateAiSummary() {
  if (!_aiSummaryEl) {
    _aiSummaryEl = document.createElement("div");
    _aiSummaryEl.className = "cg-ai-summary";
    const closeBtn = document.createElement("button");
    closeBtn.className = "cg-ai-summary-close";
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", () => {
      if (_aiSummaryEl) {
        _aiSummaryEl.remove();
        _aiSummaryEl = null;
      }
    });
    _aiSummaryEl.appendChild(closeBtn);
    const msg = document.createElement("span");
    msg.className = "cg-ai-summary-text";
    _aiSummaryEl.appendChild(msg);
    document.body.appendChild(_aiSummaryEl);
    setTimeout(() => {
      if (_aiSummaryEl) {
        _aiSummaryEl.classList.add("cg-fade-out");
        setTimeout(() => { if (_aiSummaryEl) { _aiSummaryEl.remove(); _aiSummaryEl = null; } }, 300);
      }
    }, 8000);
  }
  _aiSummaryEl.querySelector(".cg-ai-summary-text").textContent =
    `🤖 ${_aiFlaggedCount} AI-generated image${_aiFlaggedCount === 1 ? "" : "s"} detected on this page`;
}

function hashString(str) {
  // Simple djb2 hash for dedup (not crypto)
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

function attachImageBadge(img, imageHash) {
  // Position a compact icon badge over the image
  const badge = document.createElement("div");
  badge.className = "cg-ai-badge";
  badge.setAttribute("data-cg-hash", imageHash);
  badge.textContent = "🤖";
  badge.title = "Cognitive Guardian: This image may be AI-generated";

  // Ensure the parent is positioned so the badge can be absolute
  const parent = img.parentElement;
  if (parent) {
    const parentStyle = getComputedStyle(parent);
    if (parentStyle.position === "static") {
      parent.style.position = "relative";
    }
    parent.appendChild(badge);
  }

  _imageBadges.set(imageHash, badge);
  _aiFlaggedCount++;
  showOrUpdateAiSummary();
}

function extractAndSendImage(img) {
  const src = img.src || img.currentSrc;
  if (!src || src.startsWith("data:")) return;

  const imageHash = hashString(src.substring(0, 200));
  if (_analyzedImageHashes.has(imageHash)) return;
  _analyzedImageHashes.add(imageHash);

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (w < 150 || h < 150) return; // skip icons/thumbnails

  const timestamp = Date.now();
  const context = window.location.href;

  // Try same-origin canvas extraction first
  let imageData = "";
  try {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0);
    imageData = canvas.toDataURL("image/jpeg", 0.9);
  } catch (e) {
    // Cross-origin: tainted canvas — send URL to backend instead
    imageData = "";
  }

  chrome.runtime.sendMessage({
    command: "ANALYZE_IMAGE",
    payload: {
      image: imageData,
      url: src,
      context,
      timestamp,
      imageHash,
      tabId: null, // background.js fills this from sender.tab.id
    },
  });
}

function scanPageForAiImages() {
  const imgs = document.querySelectorAll("img");
  imgs.forEach((img) => {
    if (img.complete && img.naturalWidth >= 150 && img.naturalHeight >= 150) {
      extractAndSendImage(img);
    } else {
      img.addEventListener("load", () => {
        if (img.naturalWidth >= 150 && img.naturalHeight >= 150) {
          extractAndSendImage(img);
        }
      }, { once: true });
    }
  });
}

// Watch for dynamically added images
const _imageObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== 1) continue;
      if (node.tagName === "IMG") {
        if (node.naturalWidth >= 150 && node.naturalHeight >= 150) {
          extractAndSendImage(node);
        } else {
          node.addEventListener("load", () => {
            if (node.naturalWidth >= 150 && node.naturalHeight >= 150) {
              extractAndSendImage(node);
            }
          }, { once: true });
        }
      }
      // Also check descendants
      node.querySelectorAll && node.querySelectorAll("img").forEach((img) => {
        if (img.complete && img.naturalWidth >= 150 && img.naturalHeight >= 150) {
          extractAndSendImage(img);
        }
      });
    }
  }
});

// Start scanning only when monitoring is active (background will trigger via message)
let _aiImageScanActive = false;

function startAiImageScanning() {
  if (_aiImageScanActive) return;
  _aiImageScanActive = true;
  scanPageForAiImages();
  _imageObserver.observe(document.body, { childList: true, subtree: true });
}

function stopAiImageScanning() {
  _aiImageScanActive = false;
  _imageObserver.disconnect();
  _aiFlaggedCount = 0;
  if (_aiSummaryEl) {
    _aiSummaryEl.remove();
    _aiSummaryEl = null;
  }
}

// Receive messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "AGENT_INTERVENTION") {
    const payload = message.payload;
    // Suppress overlay for aiimage when per-image badges already cover the page
    if (payload.type === "aiimage" && _aiFlaggedCount > 0) {
      playAudioAlert(payload);
    } else {
      handleAgentAction(payload);
    }
  } else if (message.type === "IMAGE_FLAGGED") {
    const { imageHash } = message.payload;
    // Find the image with this hash and attach a badge
    const src_prefix_hash = imageHash;
    const imgs = document.querySelectorAll("img");
    imgs.forEach((img) => {
      const src = img.src || img.currentSrc;
      if (src && hashString(src.substring(0, 200)) === src_prefix_hash) {
        if (!_imageBadges.has(imageHash)) {
          attachImageBadge(img, imageHash);
        }
      }
    });
  } else if (message.type === "START_AI_IMAGE_SCAN") {
    startAiImageScanning();
  } else if (message.type === "STOP_AI_IMAGE_SCAN") {
    stopAiImageScanning();
  }
});
