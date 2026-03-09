// subscribe.js - LinkedOut Terminal Logic

let isYearly = false;
const supportEmail = "technxxtsup@gmail.com";

// Current Signal Rates
const prices = {
    student: { monthly: 2500, yearly: 24000 },
    pro: { monthly: 7500, yearly: 72000 }
};

document.addEventListener('DOMContentLoaded', () => {
    const billingToggle = document.getElementById('billingToggle');
    if (billingToggle) {
        billingToggle.addEventListener('click', toggleFrequency);
    }
});

/**
 * TOGGLE FREQUENCY
 * Swaps between Monthly Pulse and Annual Sync
 */
function toggleFrequency() {
    isYearly = !isYearly;
    const toggle = document.getElementById('billingToggle');
    const knob = toggle.querySelector('div');

    if (isYearly) {
        toggle.classList.add('bg-cyan-500');
        knob.classList.add('translate-x-6'); 
        updateDisplay('yearly');
    } else {
        toggle.classList.remove('bg-cyan-500');
        knob.classList.remove('translate-x-6');
        updateDisplay('monthly');
    }
}

/**
 * UPDATE DISPLAY
 * Smoothly swaps the price numbers in the UI
 */
function updateDisplay(type) {
    const sPrice = document.getElementById('studentPrice');
    const pPrice = document.getElementById('proPrice');
    
    [sPrice, pPrice].forEach(el => {
        el.style.opacity = '0';
        setTimeout(() => {
            if (el.id === 'studentPrice') el.innerText = prices.student[type].toLocaleString();
            if (el.id === 'proPrice') el.innerText = prices.pro[type].toLocaleString();
            el.style.opacity = '1';
        }, 200);
    });
}

/**
 * INITIALIZE PLAN
 * Triggers the centered modal with professional networking context
 */
function payWithPaystack(plan) {
    const selectedAmount = isYearly ? prices[plan].yearly : prices[plan].monthly;
    const billingCycle = isYearly ? "Annual Sync" : "Monthly Pulse";
    
    // Terminal Log for Debugging
    console.log(`📡 Requesting ${plan} signal: ₦${selectedAmount} (${billingCycle})`);

    const planTitle = plan === 'student' ? "Community Sync" : "Overdrive Protocol";

    // Triggering the centered Modal per your rules
    triggerAlert(
        "Initialize Connection?", 
        `Confirming sync for the ${planTitle} at ₦${selectedAmount.toLocaleString()}. This will authorize your profile to broadcast on the LinkedOut Grid.`
    );
}

/**
 * MODAL SYSTEM
 * High-contrast centered alerts
 */
function triggerAlert(title, content) {
    const modal = document.getElementById('globalModal');
    if (modal) {
        document.getElementById('modalTitle').innerText = title;
        document.getElementById('modalBody').innerHTML = content;
        modal.classList.replace('hidden', 'flex');
    } else {
        alert(`${title}\n${content}`);
    }
}

function closeGlobalModal() {
    const modal = document.getElementById('globalModal');
    if (modal) {
        modal.classList.replace('flex', 'hidden');
    }
}