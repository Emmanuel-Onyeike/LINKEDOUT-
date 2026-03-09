/**
 * LINKEDOUT IDENTITY ENGINE
 * Persistent Storage & Sync Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    loadIdentity();
});

// 1. LOAD DATA ON REFRESH
function loadIdentity() {
    const savedName = localStorage.getItem('linkedOut_name') || "Loafer #1";
    const savedRole = localStorage.getItem('linkedOut_role') || "Professional Napper @ LinkedOut";
    const savedPfp = localStorage.getItem('linkedOut_pfp');

    document.getElementById('displayName').innerText = savedName;
    document.getElementById('displayRole').innerText = savedRole;
    document.getElementById('editName').value = savedName;
    document.getElementById('editRole').value = savedRole;

    if (savedPfp) {
        document.getElementById('displayPfp').src = savedPfp;
    }
}

// 2. IMAGE PREVIEW & CONVERSION
function previewImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('displayPfp').src = e.target.result;
            // We temporarily store the base64 in a variable, it saves when "Save Signal" is clicked
            window.tempPfp = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// 3. UI STATE CONTROLS
function enableEditMode() {
    document.getElementById('viewState').classList.add('hidden');
    document.getElementById('editState').classList.remove('hidden');
    document.getElementById('actionControls').classList.remove('hidden');
    document.getElementById('pfpUploadBtn').classList.replace('hidden', 'flex');
    document.getElementById('editBtn').classList.add('opacity-0', 'pointer-events-none');
}

function cancelEdit() {
    location.reload(); // Simplest way to reset the UI
}

// 4. SAVE & SYNC (The Loading Logic)
function saveIdentity() {
    const newName = document.getElementById('editName').value;
    const newRole = document.getElementById('editRole').value;

    // Show Loading for 5 seconds
    document.getElementById('loadingOverlay').classList.replace('hidden', 'flex');

    setTimeout(() => {
        // Save to LocalStorage
        localStorage.setItem('linkedOut_name', newName);
        localStorage.setItem('linkedOut_role', newRole);
        if (window.tempPfp) {
            localStorage.setItem('linkedOut_pfp', window.tempPfp);
        }

        // Hide Loading, Show Success
        document.getElementById('loadingOverlay').classList.replace('flex', 'hidden');
        document.getElementById('successModal').classList.replace('hidden', 'flex');
    }, 5000);
}
// 1. THE LOGIC ENGINE
function updateTierUI(role) {
    const tierBadge = document.getElementById('tierBadge');
    const tierText = document.getElementById('tierText');
    const tierIcon = document.getElementById('tierIcon');
    const roleLower = role.toLowerCase();

    // Default: SILVER (General)
    let config = {
        text: "Standard Signal",
        bg: "bg-slate-100",
        textCol: "text-slate-500",
        icon: "fa-shield"
    };

    // GOLD (Engineers / Developers)
    if (roleLower.includes('engineer') || roleLower.includes('developer') || roleLower.includes('cto')) {
        config = {
            text: "Elite Gold Tier",
            bg: "bg-amber-50",
            textCol: "text-amber-600",
            icon: "fa-shield-bolt"
        };
    } 
    // BLUE (Designers / UI / Creative)
    else if (roleLower.includes('designer') || roleLower.includes('creative') || roleLower.includes('ui')) {
        config = {
            text: "Premium Blue Tier",
            bg: "bg-blue-50",
            textCol: "text-blue-600",
            icon: "fa-shield-check"
        };
    }

    // Apply Styles
    tierBadge.className = `inline-flex items-center gap-2 px-3 py-1.5 rounded-full mt-3 transition-all ${config.bg} ${config.textCol}`;
    tierText.innerText = config.text;
    tierIcon.className = `fa-solid ${config.icon} text-[10px]`;
}

// 2. INTEGRATE INTO LOAD
// Inside your existing loadIdentity(), add this at the bottom:
updateTierUI(savedRole);

// 3. INTEGRATE INTO SAVE
// Inside your saveIdentity() function, add this after saving to localStorage:
updateTierUI(newRole);