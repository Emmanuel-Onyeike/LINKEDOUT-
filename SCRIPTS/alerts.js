// alerts.js - The Central Notification Engine

/**
 * PUSH NOTIFICATION
 * Use this to send an alert from any page
 */
window.pushNotification = function(title, message, category = "General") {
    // 1. Get existing notifications or start fresh from localStorage
    let alerts = JSON.parse(localStorage.getItem('linkedOut_alerts')) || [];

    // 2. Create the new alert object
    const newAlert = {
        id: Date.now(),
        title: title,
        message: message,
        category: category,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isRead: false
    };

    // 3. Add to the start of the list (newest first)
    alerts.unshift(newAlert);

    // 4. Save back to LocalStorage
    localStorage.setItem('linkedOut_alerts', JSON.stringify(alerts));
    
    console.log(`📡 Alert Synced: ${title}`);
};