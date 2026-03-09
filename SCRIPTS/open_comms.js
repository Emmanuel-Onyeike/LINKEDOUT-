// open_comms.js - Final Integrated Version

let currentColony = null;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const colonyId = urlParams.get('id');
    
    if (!colonyId) {
        window.location.href = '/PAGES/dashboard.html';
        return;
    }
    
    loadColonyData(colonyId);
});

function loadColonyData(id) {
    const allComms = JSON.parse(localStorage.getItem('userCommunities')) || [];
    
    // 1. FIND COLONY (Using String conversion to prevent ID mismatch)
    currentColony = allComms.find(c => String(c.id) === String(id));

    // 2. THE GUARD: Stop if colony is null to prevent "Cannot read properties of null"
    if (!currentColony) {
        console.error("Colony not found:", id);
        alert("Colony not found! Returning to base.");
        window.location.href = '/PAGES/dashboard.html';
        return;
    }

    // --- 3. UPDATE BRANDING & UI ---
    document.getElementById('commTitle').innerText = currentColony.name;
    document.getElementById('commVibe').innerText = `Vibe: ${currentColony.desc.substring(0, 30)}...`;
    document.getElementById('commFullDesc').innerText = currentColony.desc;
    document.getElementById('maxLimit').innerText = currentColony.maxUsers;
    
    const displayImg = currentColony.image || '/IMG/Logo.jpeg';
    document.getElementById('commCover').src = displayImg;
    document.getElementById('commIcon').src = displayImg;

    // --- 4. IDENTITY & ADMIN CHECK ---
    const adminBox = document.getElementById('adminPostBox');
    
    // Check if the user created this as an 'admin' role
    if (currentColony.role === 'admin') {
        renderAdminInterface(); 
    } else {
        // If they are a normal user or no role exists, hide the post box completely
        if (adminBox) adminBox.classList.add('hidden');
    }

    renderColonyPosts();
}

// Separate function to handle the PIN Lock UI
function renderAdminInterface() {
    const adminBox = document.getElementById('adminPostBox');
    if (!adminBox) return;

    adminBox.innerHTML = `
        <div id="pinLock" class="bg-white p-8 rounded-[40px] border-2 border-dashed border-slate-100 text-center animate-slide">
            <div class="w-12 h-12 bg-cyan-50 text-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fa-solid fa-shield-halved text-xl"></i>
            </div>
            <h3 class="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1">Founder Verification</h3>
            <p class="text-[9px] text-slate-400 font-bold uppercase mb-6">Enter your 4-digit Admin PIN to broadcast</p>
            
            <div class="flex justify-center gap-3">
                <input type="password" id="unlockPin" maxlength="4" placeholder="••••" 
                    class="w-28 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-center text-lg font-black tracking-[0.5em] focus:border-cyan-500 outline-none transition-all">
                <button onclick="unlockAdminTools()" 
                    class="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-cyan-600 transition active:scale-95 shadow-lg shadow-slate-200">
                    Verify
                </button>
            </div>
        </div>

        <div id="actualPostBox" class="hidden animate-slide">
            <div class="bg-white p-6 rounded-[40px] border-2 border-cyan-500/10 shadow-xl shadow-cyan-500/5">
                <div class="flex items-center gap-2 mb-4">
                    <span class="px-2 py-1 bg-cyan-500 text-white text-[7px] font-black uppercase rounded-md">Authorized Founder</span>
                    <span class="text-[9px] font-bold text-slate-300 uppercase italic">@${currentColony.assignedAdmin || 'Admin'}</span>
                </div>
                <textarea id="adminPostInput" placeholder="What's the word, Founder?" 
                    class="w-full bg-slate-50 border-none rounded-[30px] p-6 text-sm font-medium focus:ring-2 focus:ring-cyan-500 h-32 resize-none outline-none"></textarea>
                <div class="flex justify-end mt-4">
                    <button onclick="publishAdminPost()" class="bg-slate-900 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-cyan-600 transition-all shadow-lg">
                        Send Broadcast
                    </button>
                </div>
            </div>
        </div>
    `;
    adminBox.classList.remove('hidden');
}

function unlockAdminTools() {
    const enteredPin = document.getElementById('unlockPin').value;
    
    if (enteredPin === String(currentColony.adminPin)) {
        document.getElementById('pinLock').classList.add('hidden');
        document.getElementById('actualPostBox').classList.remove('hidden');
        
        if (typeof triggerAlert === "function") {
            triggerAlert('Access Granted', 'Systems online. You are clear to broadcast.', '🔓');
        }
    } else {
        const input = document.getElementById('unlockPin');
        input.value = '';
        input.classList.add('border-red-500', 'animate-shake'); // Add a shake effect if you have the CSS
        setTimeout(() => input.classList.remove('animate-shake'), 500);
        
        if (typeof triggerAlert === "function") {
            triggerAlert('Access Denied', 'Invalid Founder PIN code.', '🚫');
        } else {
            alert("Invalid PIN!");
        }
    }
}

function publishAdminPost() {
    const input = document.getElementById('adminPostInput');
    const text = input.value.trim();

    if (!text) return;

    const newPost = {
        id: 'cp-' + Date.now(),
        colonyId: currentColony.id,
        text: text,
        timestamp: 'Just now',
        author: currentColony.assignedAdmin || 'Founder',
        authorImg: currentColony.image || '/IMG/Logo.jpeg'
    };

    const storageKey = `posts_${currentColony.id}`;
    const colonyPosts = JSON.parse(localStorage.getItem(storageKey)) || [];
    colonyPosts.unshift(newPost);
    localStorage.setItem(storageKey, JSON.stringify(colonyPosts));

    input.value = '';
    renderColonyPosts();
}

function renderColonyPosts() {
    const feed = document.getElementById('colonyFeed');
    const storageKey = `posts_${currentColony.id}`;
    const posts = JSON.parse(localStorage.getItem(storageKey)) || [];

    if (posts.length === 0) {
        feed.innerHTML = `
            <div class="text-center py-24 bg-white rounded-[40px] border-2 border-dashed border-slate-50">
                <div class="text-4xl mb-4 opacity-10">📡</div>
                <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">Awaiting founder signals...</p>
            </div>
        `;
        return;
    }

    feed.innerHTML = posts.map(post => `
        <div class="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm mb-6 animate-slide">
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-3">
                    <img src="${post.authorImg}" class="w-10 h-10 rounded-2xl object-cover ring-4 ring-slate-50">
                    <div>
                        <div class="flex items-center gap-2">
                            <h4 class="text-xs font-black text-slate-800 uppercase">${post.author}</h4>
                            <span class="px-2 py-0.5 bg-cyan-500 text-white text-[7px] font-black uppercase rounded-md">Founder</span>
                        </div>
                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">${post.timestamp}</p>
                    </div>
                </div>
            </div>
            <p class="text-sm text-slate-600 leading-relaxed font-medium">${post.text}</p>
        </div>
    `).join('');
}