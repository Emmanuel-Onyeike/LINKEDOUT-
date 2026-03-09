/** * LinkedOut Beta v1.0 
 * Tech Nxxt Core Logic - Final Stable Build
 */

// --- 1. REGISTRATION HANDLER ---
function handleRegister(e) {
    e.preventDefault();
    
    // Get Elements
    const nameEl = document.getElementById('regFullName');
    const emailEl = document.getElementById('regEmail');
    const passEl = document.getElementById('regPass');
    const confirmEl = document.getElementById('regConfirmPass');

    // Values
    const fullName = nameEl ? nameEl.value.trim() : "";
    const email = emailEl ? emailEl.value.trim() : "";
    const pass = passEl ? passEl.value : "";
    const confirmPass = confirmEl ? confirmEl.value : "";

    // Validation
    if (!fullName || !email || !pass) {
        triggerAlert('Easy there!', 'You missed some fields. Take a breath and fill them in.', '✍️');
        return;
    }

    if (pass !== confirmPass) {
        triggerAlert('Mismatch!', 'Your passwords do not match. That sounds like too much work to fix.', '🔐');
        return;
    }
    
    // Visual Feedback on Button
    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerHTML = "Processing... ☁️";
    btn.disabled = true;

    // Show Central Modal (The Requirement)
    triggerAlert('Welcome Aboard!', `Registration complete for ${fullName}. Redirecting to the lounge...`, '✨');
    
    // Redirect after delay
    setTimeout(() => {
        window.location.href = '/PAGES/dashboard.html'; 
    }, 2000);
}

// --- 2. LOGIN HANDLER ---
function handleLogin(e) {
    e.preventDefault();
    
    const userEl = document.getElementById('loginUser');
    const passEl = document.getElementById('loginPass');
    const user = userEl ? userEl.value.trim() : "";
    
    if (!user || !passEl.value) {
        triggerAlert('Who are you?', 'Please enter your username and password to enter the lounge.', '🕵️');
        return;
    }

    // Visual Feedback
    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerHTML = "Opening the door... 🚪";
    btn.disabled = true;

    // Show Central Modal
    triggerAlert('Success!', `Welcome back, ${user}. Loading the bench...`, '💨');
    
    // Redirect
    setTimeout(() => {
        window.location.href = '/PAGES/dashboard.html';
    }, 2000);
}

// --- 3. MODAL LOGIC (Centralized Alert System) ---
function triggerAlert(title, message, emoji = '🛋️') {
    const modal = document.getElementById('globalModal');
    if (!modal) {
        console.error("Modal HTML missing!");
        return;
    }

    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalBody').innerText = message;
    document.getElementById('modalEmoji').innerText = emoji;
    
    // Display Modal
    modal.classList.remove('hidden');
    modal.classList.add('flex'); // Ensure it's flex for centering
}

function closeModal() {
    const modal = document.getElementById('globalModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// --- 4. UI ENHANCEMENTS ---
function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const svg = button.querySelector('svg');
    
    if (input.type === "password") {
        input.type = "text";
        button.classList.add('text-blue-500');
        button.classList.remove('text-slate-300');
    } else {
        input.type = "password";
        button.classList.remove('text-blue-500');
        button.classList.add('text-slate-300');
    }
}