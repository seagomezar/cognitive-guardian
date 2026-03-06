# 🛡️ Cognitive Guardian

> **Your Digital Immune System.** Built for the **Gemini Live Agent Challenge** under the **UI Navigator ☸️** category.

[![Gemini Live Agent Challenge](https://img.shields.io/badge/Hackathon-Gemini_Live_Agent_Challenge-8b5cf6?style=for-the-badge)](https://geminiliveagentchallenge.devpost.com/)

## 📖 Project Summary

**Cognitive Guardian** is a next-generation AI agent that acts as your digital immune system while you browse the internet. Instead of waiting for you to type a question into a text box, the Guardian lives inside your browser, constantly "seeing" what you see to protect your cognitive load, mental health, and security in real-time.

By combining a lightweight Chrome Extension with a powerful backend powered by the **Agent Development Kit (ADK)** and Google's **Gemini Multimodal API**, the Guardian silently analyzes your screen context and intervenes directly in your UI when it detects specific threats:

1. 🎣 **Phishing & Scam Protection:** Detects highly-tailored spear-phishing attempts that traditional pattern-matching misses by analyzing the visual and contextual cues of the page.
2. 📰 **Fake News & Manipulation Detection:** Highlights sensationalist language and low-validity news articles right on the screen.
3. 🌀 **Burnout & Doomscrolling Intervention:** Keeps track of prolonged, unproductive scrolling (e.g., spending an hour mindlessly scrolling social media) and gently nudges you via text and synthesized voice to take a break or return to work.

### ✨ How it leverages the Gemini Live Agent Challenge Requirements:

- **UI Navigator:** The agent acts as the user's "eyes" on the screen. It interprets visual elements from the web browser by capturing anonymized, real-time visual frames of the active tab. It understands DOM structure visually and intervenes _over_ the UI with dynamic HTML overlays and generated audio (`speechSynthesis`).
- **Multimodal Input & Output:** Inputs are continuous screenshots (Vision) over WebSockets/HTTP. Outputs are text, structural DOM highlighting, and synthesized voice.
- **Powered by Google:** Built completely on top of Google Cloud, utilizing the ADK framework to orchestration Gemini's Vision models.

---

## 🏗️ Architecture

The project consists of two tightly-coupled but responsibilities-separated pillars:

1. **The Sensor / Actuator (Frontend):** A Chrome Extension (Manifest V3) that runs a Service Worker (`background.js`) to capture the active tab's visual state. It communicates with the backend and uses a Content Script to inject non-intrusive UI alerts, CSS highlighting, and read text aloud. Includes an internationalized (i18n) settings and analytics popup.
2. **The Agent Engine (Backend):** An Agent Development Kit (ADK) server hosted on **Google Cloud**. It exposes an API that receives the visual frames. It uses the Gemini API to analyze the context (Phishing, Fake News, Doomscrolling) and returns structured JSON commands (Actions) back to the browser.

_(Please refer to the architecture diagram uploaded in the Devpost submission)._

---

## 🛠️ Technologies Used

- **AI Model:** Google Gemini (Multimodal Vision capabilities)
- **Agent Framework:** ADK (Agent Development Kit) / Google GenAI SDK
- **Cloud Infrastructure:** Google Cloud Platform (GCP)
- **Frontend:** HTML, Vanilla CSS, JavaScript (Chrome Extension APIs)
- **Storage:** `chrome.storage.local` for decentralized analytics and metrics tracking.

---

## 🚀 Spin-Up Instructions (Reproducibility)

To run **Cognitive Guardian** locally for judging:

### 1. Backend (ADK) Setup

1. Navigate to the `backend/` directory.
2. Ensure you have Python installed. Install dependencies (assuming you have initialized the ADK environment):
   ```bash
   pip install -r requirements.txt
   ```
3. Set your Google Gemini API and Google Cloud credentials in a `.env` file.
4. Start the ADK agent server:
   ```bash
   # Run your ADK specific start command, e.g.:
   python main.py
   ```
5. The backend should now be listening on `http://localhost:8000`.

### 2. Frontend (Chrome Extension) Setup

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle on **"Developer mode"** in the top right corner.
3. Click **"Load unpacked"** in the top left.
4. Select the `extension/` folder inside this repository.
5. Pin the **Cognitive Guardian** purple shield icon to your toolbar.
6. Click the extension, review and accept the Privacy terms, and click **"Start Guardian"**.
7. _Voilá!_ Open a sample phishing email or start doomscrolling Twitter to see the Guardian intervene.

---

## 📊 Analytics & Privacy

All snapshot data sent to the Gemini API is ephemeral. The extension specifically tracks metrics like "Times Helped" vs "Rejected Advice" based entirely on the user's localized feedback within the intervening UI—so the Agent learns what constitutes helpful navigation aid vs interference. Data history is strictly held in local storage.

---

### Hackathon Submission Links Checklist

- [ ] **Video Demo (< 4 min):** `[Insert YouTube Link]`
- [ ] **Proof of Google Cloud Deployment:** `[Insert GCP Console screenshot/recording link]`
- [ ] **Architecture Diagram:** `[Insert Link to Image]`
- [ ] **Public Code Repo:** `[Insert GitHub Link]`

_Created with ❤️ for the Gemini Live Agent Challenge._
