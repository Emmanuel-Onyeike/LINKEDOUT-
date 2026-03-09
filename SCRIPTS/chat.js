/**
 * LINKEDOUT CHAT PROTOCOL
 * Status: Engineering Deployment in Progress
 */

document.addEventListener('DOMContentLoaded', () => {
    simulateDeploymentLogs();
});

/**
 * SIMULATE LOGS
 * Prints professional tech-jargon to the console while building
 */
function simulateDeploymentLogs() {
    const logs = [
        "Initializing WebSocket Handshake...",
        "Applying AES-256 Encryption Layer...",
        "Syncing Signal Persistence with LocalStorage...",
        "Optimizing UI Thread for Real-time Transmissions...",
        "LinkedOut Engineers: Deployment v0.42 Active."
    ];

    logs.forEach((log, i) => {
        setTimeout(() => {
            console.log(`%c[SYSTEM]: ${log}`, "color: #2563eb; font-weight: bold; font-size: 10px;");
        }, i * 1500);
    });
}

/**
 * ADMIN BYPASS
 * Use in console to reveal the UI
 */
function devMode() {
    document.getElementById('chatDeploymentOverlay').style.display = 'none';
    document.querySelector('main').classList.remove('opacity-10', 'pointer-events-none');
    document.body.style.overflow = 'auto';
}