/**
 * LINKEDOUT DASHBOARD - FULL COMPLETE EDITION
 * RESTORED: Identity Sync, Promotions, Communities, Theme Logic
 * UPDATED: High-Speed Likes, Reposts, Shares, and Deletes
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Check for Napping Status from Settings
    const isNapping = localStorage.getItem('nappingMode');
    const badge = document.getElementById('statusBadge');
    if (isNapping === 'enabled' && badge) {
        badge.classList.remove('hidden');
    }

    // Identity & Global Sync
    if (typeof syncAllIdentityElements === 'function') {
        await syncAllIdentityElements();
    }
    
    // Core Dashboard Initialization
    await renderFeed();
    syncSidebarCommunities();
    checkSavedTheme();
    updateDashboardStats();
    loadRecommendations();

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        syncIdentity(user.id);
        checkPromotion(user.id);
        setupRealtimeSync();
    }
});

// --- 1. THE FEED SYSTEM ---

async function renderFeed() {
    const feedContainer = document.getElementById('mainFeed');
    const placeholder = document.getElementById('feedPlaceholder');
    if (!feedContainer) return;

    const { data: { user: authUser } } = await supabase.auth.getUser();
    const currentUserId = authUser ? authUser.id : null;

    // Fetch posts with joins for profiles, likes, and reposts
    const { data: posts, error } = await supabase
        .from('posts')
        .select(`
            *,
            profiles (id, full_name, avatar_url, role),
            likes (user_id),
            reposts (user_id)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Feed error:", error);
        if (placeholder) {
            placeholder.innerHTML = `<p class="text-red-500 text-center py-8">TERMINAL ERROR: ${error.message}</p>`;
        }
        return;
    }

    if (!posts || posts.length === 0) {
        if (placeholder) placeholder.style.display = 'block';
        return;
    }

    if (placeholder) placeholder.style.display = 'none';

    let postWrapper = document.getElementById('postWrapper');
    if (!postWrapper) {
        postWrapper = document.createElement('div');
        postWrapper.id = 'postWrapper';
        postWrapper.className = 'space-y-4';
        feedContainer.appendChild(postWrapper);
    }

    postWrapper.innerHTML = posts.map(post => {
        const profile = post.profiles || {};
        const isOwner = currentUserId === post.user_id;
        const isLiked = post.likes?.some(l => l.user_id === currentUserId);
        const isReposted = post.reposts?.some(r => r.user_id === currentUserId);
        const postDate = new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return `
            <div class="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-3 cursor-pointer" onclick="window.location.href='/PAGES/view-profile.html?id=${post.user_id}'">
                            <img src="${profile.avatar_url || '/IMG/Logo.jpeg'}" class="w-10 h-10 rounded-full border border-slate-100 object-cover">
                            <div>
                                <h4 class="text-xs font-black text-slate-800 uppercase tracking-tight">${profile.full_name || 'Anonymous'}</h4>
                                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${postDate}</p>
                            </div>
                        </div>
                        ${isOwner ? `
                            <button onclick="deleteLoaf(${post.id})" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all">
                                <i class="fa-solid fa-trash-can text-[10px]"></i>
                            </button>
                        ` : ''}
                    </div>

                    <p class="text-sm text-slate-700 leading-relaxed mb-6">${post.content}</p>

                    <div class="flex items-center justify-between pt-4 border-t border-slate-50">
                        <div class="flex items-center gap-6">
                            <button onclick="handleLike(${post.id}, this, ${isLiked})" class="flex items-center gap-2 ${isLiked ? 'text-pink-500' : 'text-slate-400'} transition-all">
                                <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart text-xs"></i>
                                <span class="text-[10px] font-black">${post.likes?.length || 0}</span>
                            </button>

                            <button onclick="window.location.href='/PAGES/post.html?id=${post.id}'" class="flex items-center gap-2 text-slate-400 hover:text-cyan-500 transition-colors">
                                <i class="fa-regular fa-comment text-xs"></i>
                                <span class="text-[10px] font-black uppercase">Reply</span>
                            </button>

                            <button onclick="handleRepost(${post.id}, ${isReposted})" class="flex items-center gap-2 ${isReposted ? 'text-green-500' : 'text-slate-400'} hover:text-green-500 transition-colors">
                                <i class="fa-solid fa-retweet text-xs"></i>
                                <span class="text-[10px] font-black uppercase">${post.reposts?.length || 0}</span>
                            </button>
                        </div>

                        <button onclick="handleShare(${post.id})" class="text-slate-300 hover:text-slate-600 transition-colors">
                            <i class="fa-solid fa-arrow-up-from-bracket text-xs"></i>
                        </button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// --- 2. THEME & UI UTILITIES ---

/**
 * LINKEDOUT DROPDOWN MODAL
 * Targeted fix for the profile/settings dropdown
 */
function toggleLinkedOutModal() {
    const overlay = document.getElementById('linkedOutModalOverlay');
    const dropdown = document.getElementById('linkedOutDropdown');
    
    if (!overlay) {
        console.error("Critical Error: 'linkedOutModalOverlay' missing from HTML");
        return;
    }

    const isHidden = overlay.classList.contains('hidden');

    if (isHidden) {
        // --- OPENING ---
        overlay.classList.remove('hidden');
        overlay.classList.add('flex'); // Centering
        
        // Small timeout to allow the 'hidden' removal to register before animating
        setTimeout(() => {
            overlay.style.opacity = '1';
            if (dropdown) {
                dropdown.classList.remove('scale-95', 'opacity-0');
                dropdown.classList.add('scale-100', 'opacity-100');
            }
        }, 10);

        document.body.style.overflow = 'hidden'; // Lock background
    } else {
        // --- CLOSING ---
        overlay.style.opacity = '0';
        if (dropdown) {
            dropdown.classList.remove('scale-100', 'opacity-100');
            dropdown.classList.add('scale-95', 'opacity-0');
        }

        // Wait for the CSS transition (300ms) before hiding completely
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
            document.body.style.overflow = ''; // Unlock background
        }, 300);
    }
}

// Close dropdown if user clicks the dark backdrop area
document.addEventListener('click', (e) => {
    const overlay = document.getElementById('linkedOutModalOverlay');
    const dropdown = document.getElementById('linkedOutDropdown');
    
    // If user clicked the overlay itself (not the white box inside)
    if (e.target === overlay) {
        toggleLinkedOutModal();
    }
});
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
    window.showModal?.('Theme Switched', `System is now in ${isDark ? "Night Shift" : "Daylight"} mode.`);
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

// --- 3. IDENTITY SYNC & PROMOTIONS ---

async function syncIdentity(userId) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!profile) return;

    const freshUrl = `${profile.avatar_url}?t=${Date.now()}`;
    ['dashPfpNav', 'dashPfp', 'dashPfpLarge'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.src = freshUrl;
    });

    const nameEl = document.getElementById('dashName');
    if (nameEl) nameEl.innerText = profile.full_name;

    const { count } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId);
    if (document.getElementById('followerCount')) document.getElementById('followerCount').innerText = count || 0;
}

async function checkPromotion(userId) {
    const { data: tierData } = await supabase.from('user_tiers').select('*').eq('id', userId).single();
    const milestones = { 11: 'Tier 2', 21: 'Tier 3', 41: 'Unverified' };
    if (tierData && milestones[tierData.days_old]) {
        showPromotionModal(milestones[tierData.days_old]);
    }
}

function showPromotionModal(tierName) {
    const modal = document.createElement('div');
    modal.className = "fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-6";
    modal.innerHTML = `
        <div class="bg-white p-8 rounded-[40px] shadow-2xl text-center max-w-xs animate-in zoom-in duration-300">
            <div class="w-16 h-16 bg-cyan-500/10 text-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fa-solid fa-bolt text-2xl"></i>
            </div>
            <h3 class="text-xs font-black uppercase tracking-widest">Promotion Detected</h3>
            <p class="text-[10px] text-slate-500 mt-2 mb-6">Your loyalty earned you a spot in <span class="text-cyan-500 font-bold">${tierName}</span>.</p>
            <button onclick="this.parentElement.parentElement.remove()" class="w-full py-3 bg-cyan-500 text-white rounded-2xl text-[10px] font-black uppercase">Dismiss Signal</button>
        </div>`;
    document.body.appendChild(modal);
}

// --- 4. INTERACTION LOGIC (Liking, Reposting, Sharing) ---

async function handleLike(postId, btn, alreadyLiked) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return window.showModal("Auth Required", "Log in to like loafs.", false);

    if (alreadyLiked) {
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
        await supabase.from('likes').insert([{ post_id: postId, user_id: user.id }]);
    }
    await renderFeed(); // Refresh the counts
}

async function handleRepost(postId, alreadyReposted) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return window.showModal("Auth Required", "Log in to repost.", false);
    if (alreadyReposted) return;

    const { error } = await supabase.from('reposts').insert([{ post_id: postId, user_id: user.id }]);
    if (!error) {
        window.showModal("Success", "Re-loafed to your profile!", true);
        await renderFeed();
    }
}

function handleShare(postId) {
    const url = `${window.location.origin}/PAGES/post.html?id=${postId}`;
    navigator.clipboard.writeText(url);
    window.showModal("Terminal", "Link copied to clipboard.", true);
}

// --- 5. DELETION LOGIC (Centered Modal) ---

window.deleteLoaf = function(id) {
    showDeleteConfirmModal(id);
};

function showDeleteConfirmModal(postId) {
    const modal = document.getElementById('globalModal');
    if (!modal) return;

    document.getElementById('modalTitle').textContent = "Delete Loaf";
    document.getElementById('modalBody').innerHTML = `Are you sure? This action cannot be undone.`;
    document.getElementById('modalEmoji').textContent = '🗑️';

    const buttonContainer = document.querySelector('#globalModal button')?.parentElement;
    if (buttonContainer) {
        buttonContainer.innerHTML = `
            <div class="flex flex-col gap-3 w-full mt-2">
                <button onclick="performDelete(${postId}); closeModal()" class="w-full py-5 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-red-700 active:scale-95 transition-all duration-200">Confirm Deletion</button>
                <button onclick="closeModal()" class="w-full py-5 bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-100 transition-all duration-200">Keep this Loaf</button>
            </div>`;
    }
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
}

async function performDelete(id) {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (!error) {
        await renderFeed();
        updateDashboardStats();
    }
}

// --- 6. SIDEBAR & RECOMMENDATIONS ---

async function loadRecommendations() {
    const listContainer = document.getElementById('recommendationList');
    if (!listContainer) return;
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, role').limit(5);
    if (profiles) {
        listContainer.innerHTML = profiles.map(profile => `
            <div class="flex items-center justify-between group cursor-pointer">
                <div class="flex items-center gap-4" onclick="window.location.href='/PAGES/view-profile.html?id=${profile.id}'">
                    <img src="${profile.avatar_url || '/IMG/Logo.jpeg'}" class="w-12 h-12 rounded-2xl object-cover border-2 border-transparent group-hover:border-cyan-500 transition-all">
                    <div>
                        <h4 class="text-xs font-black text-slate-800 uppercase tracking-tighter">${profile.full_name || 'Anonymous'}</h4>
                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${profile.role || 'Loafer'}</p>
                    </div>
                </div>
                <button onclick="followUser('${profile.id}')" class="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all">
                    <i class="fa-solid fa-plus text-[10px]"></i>
                </button>
            </div>`).join('');
    }
}

function syncSidebarCommunities() {
    const communityList = JSON.parse(localStorage.getItem('userCommunities')) || [];
    const sidebarCard = document.getElementById('myCommunitiesCard');
    if (!sidebarCard) return;
    let listWrapper = document.getElementById('sidebarCommList') || document.createElement('div');
    listWrapper.id = 'sidebarCommList';
    listWrapper.className = 'space-y-3 mb-4';
    sidebarCard.querySelector('.flex.justify-between').insertAdjacentElement('afterend', listWrapper);

    listWrapper.innerHTML = communityList.slice(0, 3).map(comm => `
        <div class="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
            <div class="flex items-center gap-3">
                <img src="${comm.image || '/IMG/Logo.jpeg'}" class="w-10 h-10 rounded-xl object-cover">
                <h4 class="text-[10px] font-black text-slate-800 uppercase truncate max-w-[80px]">${comm.name}</h4>
            </div>
            <button onclick="window.location.href='/PAGES/open_comms.html?id=${comm.id}'" class="bg-slate-50 text-slate-800 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase">Open</button>
        </div>`).join('');
}

// --- 7. INPUT HANDLING & STATS ---

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

async function updateDashboardStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    const appCountElement = document.getElementById('appCount');
    if (appCountElement) appCountElement.innerText = count || 0;
}

// --- 8. GLOBAL MODAL SYSTEM ---

window.showModal = function(title, message, isSuccess = true) {
    const modal = document.getElementById('globalModal');
    if (!modal) return alert(message);
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').textContent = message;
    document.getElementById('modalEmoji').textContent = isSuccess ? '🛋️' : '⚠️';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
};

function closeModal() {
    const modal = document.getElementById('globalModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
        // Reset button container if it was modified for delete
        const btnContainer = document.querySelector('#globalModal .modal-footer'); // Assuming footer exists or target specific button
    }
}
