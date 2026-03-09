// comm.js - Full Integrated Version

// 1. DATA STATE & IMAGE HANDLER
let communities = [];
let selectedImageData = null;

document.addEventListener('DOMContentLoaded', () => {
    // Load communities from storage
    communities = JSON.parse(localStorage.getItem('userCommunities')) || [];
    renderCommunities();
});

// FIXED IMAGE PREVIEW LOGIC
function previewCommImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            selectedImageData = e.target.result;
            
            const previewBox = document.getElementById('imagePreviewContainer');
            previewBox.innerHTML = `
                <img src="${selectedImageData}" class="w-full h-full object-cover rounded-3xl">
                <div class="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition rounded-3xl cursor-pointer" onclick="document.getElementById('commFile').click()">
                    <span class="text-[10px] text-white font-black uppercase tracking-widest">Change Image</span>
                </div>
                <input type="file" id="commFile" class="hidden" onchange="previewCommImage(this)">
            `;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// 2. RENDER ENGINE (Integrated with Join/Founder Logic)
function renderCommunities() {
    const container = document.getElementById('communityContainer');
    // Always pull fresh from storage to see current 'joined' status
    const currentList = JSON.parse(localStorage.getItem('userCommunities')) || [];
    
    if (currentList.length === 0) {
        container.innerHTML = `
            <div class="bg-white border border-slate-200 rounded-[40px] p-20 text-center shadow-sm w-full">
                <div class="text-5xl mb-6 opacity-20 grayscale">🏜️</div>
                <h2 class="text-sm font-black text-slate-800 uppercase tracking-widest">The Wasteland is Empty</h2>
                <p class="text-[10px] text-slate-400 font-bold uppercase mt-2 max-w-xs mx-auto">
                    No colonies found. Be the founder of a new era.
                </p>
            </div>
        `;
        return;
    }

    container.innerHTML = currentList.map(comm => {
        const isJoined = comm.joined === true;
        const btnText = isJoined ? '<i class="fa-solid fa-check mr-1"></i> Joined' : 'Join Circle';
        const btnClass = isJoined 
            ? "bg-cyan-500 text-white shadow-lg shadow-cyan-100" 
            : "bg-slate-50 border border-slate-200 text-slate-800 hover:bg-cyan-500 hover:text-white";

        return `
            <div class="community-card bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm animate-[modalBounce_0.5s_ease-out]">
                <div class="h-32 w-full overflow-hidden bg-slate-100">
                    <img src="${comm.image || '/IMG/Default_Cover.jpeg'}" class="w-full h-full object-cover">
                </div>
                <div class="px-8 pb-8">
                    <div class="relative -mt-10 mb-4">
                        <div class="w-20 h-20 bg-white rounded-3xl p-1 shadow-md">
                            <div class="w-full h-full bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden">
                                 <img src="${comm.image || '/IMG/Logo.jpeg'}" class="w-full h-full object-cover">
                            </div>
                        </div>
                    </div>
                    <h2 class="text-lg font-black text-slate-800 uppercase tracking-tight">${comm.name}</h2>
                    <p class="text-xs text-slate-500 font-medium mt-2 leading-relaxed line-clamp-2">${comm.desc}</p>
                    
                    <div class="flex items-center justify-between mt-8">
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            ${isJoined ? '1' : '0'} / ${comm.maxUsers} Loafers
                        </span>
                        <button 
                            onclick="joinCircle(this, '${comm.id}', '${comm.name}')" 
                            ${isJoined ? 'disabled' : ''}
                            class="${btnClass} px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                            ${btnText}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 3. REFRESH LOGIC
function handleRefresh() {
    const icon = document.getElementById('refreshIcon');
    const text = document.getElementById('refreshText');
    const container = document.getElementById('communityContainer');

    icon.classList.add('fa-spin');
    container.style.filter = "blur(8px)";
    container.style.opacity = "0.5";
    
    let phases = ["Scanning...", "Finding Pillows...", "Almost there..."];
    let i = 0;
    const interval = setInterval(() => { text.innerText = phases[i % 3]; i++; }, 2000);

    setTimeout(() => {
        clearInterval(interval);
        icon.classList.remove('fa-spin');
        text.innerText = "Refresh";
        container.style.filter = "none";
        container.style.opacity = "1";
        renderCommunities();
        triggerAlert('Scanned', 'Wasteland search complete.', '🔄');
    }, 6000);
}

// 4. CREATION LOGIC (Adds Admin/Founder status)
function openCreatorModal() {
    selectedImageData = null;
    document.getElementById('commName').value = '';
    document.getElementById('commDesc').value = '';
    
    document.getElementById('imagePreviewContainer').innerHTML = `
        <i class="fa-solid fa-camera text-slate-300 mb-2 group-hover:text-cyan-500 transition"></i>
        <span class="text-[9px] font-black text-slate-400 uppercase">Upload Cover Image</span>
        <input type="file" id="commFile" class="hidden" onchange="previewCommImage(this)">
    `;
    
    document.getElementById('creatorModal').classList.replace('hidden', 'flex');
}

function closeCreatorModal() {
    document.getElementById('creatorModal').classList.replace('flex', 'hidden');
}

function handleCreateColony() {
    const name = document.getElementById('commName').value;
    const desc = document.getElementById('commDesc').value;
    const maxUsers = document.getElementById('maxUsers').value || 100;

    if (!name || !desc) {
        triggerAlert('Entry Denied', 'A name and a vibe are mandatory.', '⚠️');
        return;
    }

    closeCreatorModal();
    triggerAlert('Establishing Colony', 'Surveying the area and claiming territory...', '🏗️');

    setTimeout(() => {
        const newColony = {
            id: 'comm-' + Date.now(), // Unique ID for routing
            name: name,
            desc: desc,
            maxUsers: maxUsers,
            image: selectedImageData || null, 
            joined: true,      // Founder is automatically a member
            isFounder: true    // Marks YOU as the admin
        };

        const existing = JSON.parse(localStorage.getItem('userCommunities')) || [];
        existing.unshift(newColony);
        localStorage.setItem('userCommunities', JSON.stringify(existing));

        // Auto Redirect to Dashboard so the sidebar updates
        window.location.href = '/PAGES/dashboard.html';
    }, 3000);
}

// 5. JOIN LOGIC
function joinCircle(btn, id, name) {
    let communityList = JSON.parse(localStorage.getItem('userCommunities')) || [];
    
    communityList = communityList.map(comm => {
        if (String(comm.id) === String(id)) {
            comm.joined = true;
        }
        return comm;
    });

    localStorage.setItem('userCommunities', JSON.stringify(communityList));

    btn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Joined';
    btn.className = "bg-cyan-500 text-white px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-cyan-100";
    btn.disabled = true;

    triggerAlert('Joined!', `Welcome to ${name}. You can now open this from your Dashboard.`, '🤝');
}

// 6. GLOBAL ALERT (Centered)
function triggerAlert(title, content, emoji = '🔔') {
    const modal = document.getElementById('globalModal');
    if (!modal) return;
    document.getElementById('modalTitle').innerText = `${emoji} ${title}`;
    document.getElementById('modalBody').innerHTML = content;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeGlobalModal() {
    document.getElementById('globalModal').classList.replace('flex', 'hidden');
}
// Add this helper function to comm.js
function togglePinField(role) {
    const pinField = document.getElementById('pinField');
    if (role === 'admin') {
        pinField.classList.remove('hidden');
    } else {
        pinField.classList.add('hidden');
    }
}

// Update your handleCreateColony function
function handleCreateColony() {
    const name = document.getElementById('commName').value;
    const desc = document.getElementById('commDesc').value;
    const role = document.getElementById('roleSelect').value;
    const pin = document.getElementById('adminPin').value;
    const assignedAdmin = document.getElementById('assignAdmin').value;

    if (!name || !desc) {
        triggerAlert('Entry Denied', 'A name and a vibe are mandatory.', '⚠️');
        return;
    }

    if (role === 'admin' && pin.length < 4) {
        triggerAlert('Security Flaw', 'Admin PIN must be 4 digits.', '🔒');
        return;
    }

    closeCreatorModal();
    triggerAlert('Establishing Colony', 'Verifying credentials and claiming territory...', '🏗️');

    setTimeout(() => {
        const newColony = {
            id: 'comm-' + Date.now(),
            name: name,
            desc: desc,
            maxUsers: document.getElementById('maxUsers').value || 100,
            image: selectedImageData || null, 
            joined: true,
            // NEW FIELDS
            role: role,
            adminPin: role === 'admin' ? pin : null, // Only store if admin
            assignedAdmin: assignedAdmin || 'Founder',
            isFounder: (role === 'admin') // This unlocks the box on open_comms.html
        };

        const existing = JSON.parse(localStorage.getItem('userCommunities')) || [];
        existing.unshift(newColony);
        localStorage.setItem('userCommunities', JSON.stringify(existing));

        window.location.href = '/PAGES/dashboard.html';
    }, 3000);
}