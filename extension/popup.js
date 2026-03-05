// extension/popup.js
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggleBtn');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    let isMonitoring = false;

    function updateUI() {
        if (isMonitoring) {
            toggleBtn.textContent = 'Detener Guardián';
            toggleBtn.classList.add('active');
            statusIndicator.classList.add('on');
            statusText.textContent = 'Monitoreando...';
        } else {
            toggleBtn.textContent = 'Iniciar Guardián';
            toggleBtn.classList.remove('active');
            statusIndicator.classList.remove('on');
            statusText.textContent = 'Inactivo';
        }
    }

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

    // Toggle button click
    toggleBtn.addEventListener('click', () => {
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
