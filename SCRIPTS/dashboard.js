// dashboard.js - Full Integrated Version

document.addEventListener('DOMContentLoaded', () => {
    renderFeed();
    syncSidebarCommunities();
    checkSavedTheme();
});

// --- 1. UI TOGGLES & THEME (Preserving your logic) ---
function toggleLoafMenu() {
    const overlay = document.getElementById('loafModalOverlay');
    const modal = document.getElementById('loafDropdown');
    if (!overlay || !modal) return;
    
    if (overlay.classList.contains('hidden')) {
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
        setTimeout(() => modal.classList.remove('scale-95'), 10);
    } else {
        modal.classList.add('scale-95');
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
        }, 200);
    }
}

function checkSavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        updateThemeIcon(true);
    }
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
    triggerAlert('Theme Switched', `System is now in ${isDark ? "Night Shift" : "Daylight"} mode.`, isDark ? "🌙" : "☀️");
}

function updateThemeIcon(isDark) {
    const icon = document.getElementById('themeIcon');
    if (!icon) return;
    if (isDark) {
        icon.classList.replace('fa-moon', 'fa-sun');
        icon.classList.add('text-amber-400');
    } else {
        icon.classList.replace('fa-sun', 'fa-moon');
        icon.classList.remove('text-amber-400');
    }
}

// --- 2. CORE FEED & POSTING ---
function handlePostInput(el) {
    const postActions = document.getElementById('postActions');
    const counter = document.getElementById('charCounter');
    const maxLength = 500;
    
    if (el.value.length > maxLength) el.value = el.value.substring(0, maxLength);
    if (counter) counter.innerText = `${el.value.length} / ${maxLength}`;

    el.style.height = "auto";
    el.style.height = (el.scrollHeight) + "px";

    if (el.value.trim().length > 0) {
        postActions?.classList.remove('hidden');
        postActions?.classList.add('flex');
    } else {
        postActions?.classList.add('hidden');
        postActions?.classList.remove('flex');
    }
}

function submitLoaf() {
    const input = document.getElementById('postInput');
    const text = input.value.trim();
    if (!text) return;

    const newPost = {
        id: 'post-' + Date.now(),
        author: 'Loafer #1',
        text: text,
        timestamp: 'Just now'
    };

    const userPosts = JSON.parse(localStorage.getItem('userPosts')) || [];
    userPosts.unshift(newPost);
    localStorage.setItem('userPosts', JSON.stringify(userPosts));

    input.value = '';
    input.style.height = "auto";
    document.getElementById('postActions')?.classList.add('hidden');
    
    renderFeed();
    triggerAlert('Loaf Published', 'Your thoughts have entered the void.', '🚀');
}

function renderFeed() {
    const feedContainer = document.getElementById('mainFeed');
    const placeholder = document.getElementById('feedPlaceholder');
    const userPosts = JSON.parse(localStorage.getItem('userPosts')) || [];

    if (userPosts.length > 0) {
        if(placeholder) placeholder.style.display = 'none';
        
        let postWrapper = document.getElementById('postWrapper');
        if(!postWrapper) {
            postWrapper = document.createElement('div');
            postWrapper.id = 'postWrapper';
            postWrapper.className = 'space-y-4';
            feedContainer.appendChild(postWrapper);
        }

        postWrapper.innerHTML = userPosts.map(post => `
            <div class="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm animate-[modalSlideUp_0.4s_ease-out]">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <img src="/IMG/Logo.jpeg" class="w-10 h-10 rounded-full border border-slate-100">
                            <div>
                                <h4 class="text-xs font-black text-slate-800 uppercase">${post.author}</h4>
                                <p class="text-[9px] font-bold text-slate-400 uppercase">${post.timestamp}</p>
                            </div>
                        </div>
                        <button onclick="confirmDelete('${post.id}')" class="text-slate-300 hover:text-red-500 transition"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                    <p class="text-sm text-slate-700 leading-relaxed font-medium mb-4">${post.text}</p>
                    <div class="flex items-center gap-6 pt-2 border-t border-slate-50">
                        <button onclick="toggleLike(this)" class="flex items-center gap-2 text-slate-400 hover:text-cyan-500 transition">
                            <i class="fa-regular fa-heart"></i> <span class="text-[10px] font-black uppercase">Appreciate</span>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

function confirmDelete(postId) {
    let userPosts = JSON.parse(localStorage.getItem('userPosts')) || [];
    const updatedPosts = userPosts.filter(post => post.id != postId);
    localStorage.setItem('userPosts', JSON.stringify(updatedPosts));
    renderFeed();
    if (updatedPosts.length === 0) location.reload();
    triggerAlert('Post Deleted', 'Successfully scrubbed.', '🗑️');
}

// --- 3. COMMUNITY SIDEBAR SYNC (The ID-Targeted Fix) ---
// --- Updated syncSidebarCommunities section in dashboard.js ---
function syncSidebarCommunities() {
    const communityList = JSON.parse(localStorage.getItem('userCommunities')) || [];
    const sidebarCard = document.getElementById('myCommunitiesCard');
    const emptyState = document.getElementById('emptyCommState');
    const skeleton = document.getElementById('commSkeleton');

    if (!sidebarCard) return;

    if (communityList.length > 0) {
        if (emptyState) emptyState.classList.add('hidden');
        if (skeleton) skeleton.classList.add('hidden');

        let listWrapper = document.getElementById('sidebarCommList');
        if (!listWrapper) {
            listWrapper = document.createElement('div');
            listWrapper.id = 'sidebarCommList';
            listWrapper.className = 'space-y-3 mb-4';
            sidebarCard.querySelector('.flex.justify-between').insertAdjacentElement('afterend', listWrapper);
        }

        listWrapper.innerHTML = communityList.map(comm => {
            const isJoined = comm.joined || false;
            const btnText = isJoined ? "Open" : "Join";
            const btnClass = isJoined ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20" : "bg-slate-50 text-slate-800 border border-slate-100";
            
            // This is the critical update: passing the ID to open_comms.html
            const action = isJoined 
                ? `window.location.href='/PAGES/open_comms.html?id=${comm.id}'` 
                : `handleSidebarJoin('${comm.id}')`;

            return `
                <div class="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition-all group border border-transparent hover:border-slate-100">
                    <div class="flex items-center gap-3">
                        <img src="${comm.image || '/IMG/Logo.jpeg'}" class="w-10 h-10 rounded-xl object-cover">
                        <div class="max-w-[100px]">
                            <h4 class="text-[10px] font-black text-slate-800 uppercase truncate">${comm.name}</h4>
                            <p class="text-[7px] font-bold text-slate-400 uppercase tracking-widest">${isJoined ? 'Active Member' : 'Discovered'}</p>
                        </div>
                    </div>
                    <button onclick="${action}" class="${btnClass} px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-90">
                        ${btnText}
                    </button>
                </div>
            `;
        }).join('');
    }
}

function handleSidebarJoin(id) {
    let communityList = JSON.parse(localStorage.getItem('userCommunities')) || [];
    communityList = communityList.map(comm => {
        if (comm.id == id) comm.joined = true;
        return comm;
    });
    localStorage.setItem('userCommunities', JSON.stringify(communityList));
    
    triggerAlert('Circle Joined', 'You are now a member of this colony.', '🤝');
    syncSidebarCommunities();
}

// --- 4. GLOBAL ALERT SYSTEM (Centered Modal) ---
function triggerAlert(title, content, emoji = '🔔') {
    const modal = document.getElementById('globalModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    if (modal && modalBody) {
        modalTitle.innerText = `${emoji} ${title}`;
        modalBody.innerHTML = content; 
        modal.classList.remove('hidden');
        modal.classList.add('flex'); // Triggers centering
    }
}

function closeGlobalModal() {
    const modal = document.getElementById('globalModal');
    if (modal) modal.classList.replace('flex', 'hidden');
}

function toggleLike(btn) {
    btn.classList.toggle('text-cyan-500');
    const icon = btn.querySelector('i');
    icon.classList.toggle('fa-bounce');
    setTimeout(() => icon.classList.remove('fa-bounce'), 1000);
}


// dashboard.js - Command Center Logic

document.addEventListener('DOMContentLoaded', () => {
    updateDashboardStats();
});

function updateDashboardStats() {
    // 1. Get Application Count
    const apps = JSON.parse(localStorage.getItem('my_applications')) || [];
    const appCountElement = document.getElementById('appCount');
    
    if (appCountElement) {
        appCountElement.innerText = apps.length;
    }

    // 2. Optional: Get Unread Notifications count
    const alerts = JSON.parse(localStorage.getItem('linkedOut_alerts')) || [];
    const unreadAlerts = alerts.filter(a => !a.isRead).length;
    
    console.log(`System Check: ${apps.length} Applications, ${unreadAlerts} New Alerts.`);
}
// Add this to your main script to sync the nav bar
function syncGlobalIdentity() {
    const name = localStorage.getItem('linkedOut_name') || "Loafer #1";
    const pfp = localStorage.getItem('linkedOut_pfp');
    
    // Split name for the username (e.g. "Emmanuel Okeke" becomes "Emmanuel")
    const firstName = name.split(' ')[0];
    
    // Find nav elements (Update these IDs to match your nav)
    const navName = document.querySelector('h3.font-black'); 
    const navImg = document.querySelector('img.rounded-full');

    if (navName) navName.innerText = name;
    if (navImg && pfp) navImg.src = pfp;
}

document.addEventListener('DOMContentLoaded', syncGlobalIdentity);