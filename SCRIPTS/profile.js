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
/**
 * TAB SWITCHING LOGIC
 */
function switchTab(tab) {
    const aboutSec = document.getElementById('aboutSection');
    const postsSec = document.getElementById('postsSection');
    const aboutBtn = document.getElementById('tab-about');
    const postsBtn = document.getElementById('tab-posts');

    if (tab === 'posts') {
        aboutSec.classList.add('hidden');
        postsSec.classList.remove('hidden');
        
        // UI State
        postsBtn.classList.replace('text-slate-400', 'text-slate-900');
        postsBtn.classList.replace('border-transparent', 'border-slate-900');
        aboutBtn.classList.replace('text-slate-900', 'text-slate-400');
        aboutBtn.classList.replace('border-slate-900', 'border-transparent');
        
        loadUserPosts(); // Trigger post fetch
    } else {
        postsSec.classList.add('hidden');
        aboutSec.classList.remove('hidden');
        
        // UI State
        aboutBtn.classList.replace('text-slate-400', 'text-slate-900');
        aboutBtn.classList.replace('border-transparent', 'border-slate-900');
        postsBtn.classList.replace('text-slate-900', 'text-slate-400');
        postsBtn.classList.replace('border-slate-900', 'border-transparent');
    }
}

/**
 * LOAD USER POSTS
 * Fetches only posts created by the current user
 */
function loadUserPosts() {
    const grid = document.getElementById('userPostsGrid');
    // Assuming your posts are stored in 'linkedOut_posts'
    const posts = JSON.parse(localStorage.getItem('linkedOut_posts')) || [];
    
    // In a real app, you'd filter by userId. For now, we show all "My" posts.
    if (posts.length === 0) {
        grid.innerHTML = `
            <div class="py-20 text-center border-2 border-dashed border-slate-100 rounded-[40px]">
                <p class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">No Transmissions Recorded</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = posts.map(post => `
        <div class="bg-white border border-slate-100 p-8 rounded-[32px] hover:border-slate-900 transition-all">
            <div class="flex justify-between items-start mb-4">
                <span class="text-[8px] font-black uppercase tracking-widest text-blue-600">${post.category || 'General'}</span>
                <span class="text-[8px] font-bold text-slate-300 uppercase">${post.timestamp || 'Recent'}</span>
            </div>
            <h3 class="text-sm font-black text-slate-900 mb-2 uppercase">${post.title || 'Untitled Transmission'}</h3>
            <p class="text-[11px] text-slate-500 leading-relaxed">${post.content}</p>
        </div>
    `).join('');
}