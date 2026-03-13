/**
 * LINKEDOUT MASTER DASHBOARD - FULL COMPLETE BUILD
 * RESTORED: All 600+ Lines of Original Logic
 * UPDATED: Interactivity with Supabase
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log("LinkedOut Terminal: Initializing Full Dashboard...");

    // 1. INITIAL IDENTITY SYNC (RESTORED)
    if (typeof syncAllIdentityElements === 'function') {
        await syncAllIdentityElements();
    }
    
    // 2. CHECK NAPPING STATUS (ORIGINAL 1:1)
    const isNapping = localStorage.getItem('nappingMode');
    const badge = document.getElementById('statusBadge');
    if (isNapping === 'enabled' && badge) {
        badge.classList.remove('hidden');
        console.log("User Status: Napping Mode Active");
    }

    // 3. CORE ENGINE LOAD
    await renderFeed();
    syncSidebarCommunities();
    checkSavedTheme();
    updateDashboardStats();
    loadRecommendations();

    // 4. AUTHENTICATED USER SYNC
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        syncIdentity(user.id);
        checkPromotion(user.id);
        
        // Subscribe to real-time updates for notifications
        const channel = supabase
            .channel('dashboard-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, payload => {
                console.log('Real-time update:', payload);
                renderFeed();
            })
            .subscribe();
    }
});

// --- SECTION 1: THE FEED RENDERER (FULL LOGIC) ---

async function renderFeed() {
    const feedContainer = document.getElementById('mainFeed');
    const placeholder = document.getElementById('feedPlaceholder');
    if (!feedContainer) return;

    const { data: { user: authUser } } = await supabase.auth.getUser();
    const currentUserId = authUser ? authUser.id : null;

    // Fetching posts with profile joins and nested interaction arrays
    const { data: posts, error } = await supabase
        .from('posts')
        .select(`
            *,
            profiles (id, full_name, avatar_url, role, bio),
            likes (user_id),
            reposts (user_id),
            comments (id)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Feed Error:", error);
        if (placeholder) {
            placeholder.innerHTML = `<p class="text-red-500 font-black">FEED SYNC FAILED: ${error.message}</p>`;
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
        postWrapper.className = 'space-y-6';
        feedContainer.appendChild(postWrapper);
    }

    postWrapper.innerHTML = posts.map(post => {
        const profile = post.profiles || {};
        const isOwner = currentUserId === post.user_id;
        const isLiked = post.likes?.some(l => l.user_id === currentUserId);
        const isReposted = post.reposts?.some(r => r.user_id === currentUserId);
        const postDate = new Date(post.created_at).toLocaleDateString('en-US', { 
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });

        return `
            <div class="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group">
                <div class="p-8">
                    <div class="flex items-center justify-between mb-6">
                        <div class="flex items-center gap-4 cursor-pointer" onclick="window.location.href='/PAGES/view-profile.html?id=${post.user_id}'">
                            <div class="relative">
                                <img src="${profile.avatar_url || '/IMG/Logo.jpeg'}" class="w-12 h-12 rounded-[20px] border-2 border-slate-50 object-cover shadow-sm">
                                <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                            </div>
                            <div>
                                <h4 class="text-[11px] font-black text-slate-800 uppercase tracking-tight">${profile.full_name || 'Anonymous'}</h4>
                                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">${postDate}</p>
                            </div>
                        </div>
                        
                        ${isOwner ? `
                            <button onclick="deleteLoaf(${post.id})" class="w-10 h-10 flex items-center justify-center rounded-2xl text-slate-200 hover:bg-red-50 hover:text-red-500 transition-all">
                                <i class="fa-solid fa-trash-can text-xs"></i>
                            </button>
                        ` : `
                            <button class="text-slate-200 hover:text-slate-400"><i class="fa-solid fa-ellipsis"></i></button>
                        `}
                    </div>

                    <p class="text-[13px] text-slate-600 leading-[1.8] font-medium mb-8">${post.content}</p>

                    <div class="flex items-center justify-between pt-6 border-t border-slate-50">
                        <div class="flex items-center gap-8">
                            <button onclick="handleLike(${post.id}, this, ${isLiked})" class="flex items-center gap-2.5 ${isLiked ? 'text-pink-500' : 'text-slate-400'} group/btn transition-all">
                                <div class="w-9 h-9 rounded-full flex items-center justify-center group-hover/btn:bg-pink-50 transition-colors">
                                    <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart text-[14px]"></i>
                                </div>
                                <span class="text-[11px] font-black">${post.likes?.length || 0}</span>
                            </button>

                            <button onclick="window.location.href='/PAGES/post.html?id=${post.id}'" class="flex items-center gap-2.5 text-slate-400 group/btn transition-all">
                                <div class="w-9 h-9 rounded-full flex items-center justify-center group-hover/btn:bg-cyan-50 transition-colors">
                                    <i class="fa-regular fa-comment text-[14px]"></i>
                                </div>
                                <span class="text-[11px] font-black uppercase tracking-widest">${post.comments?.length || 0}</span>
                            </button>

                            <button onclick="handleRepost(${post.id}, ${isReposted})" class="flex items-center gap-2.5 ${isReposted ? 'text-green-500' : 'text-slate-400'} group/btn transition-all">
                                <div class="w-9 h-9 rounded-full flex items-center justify-center group-hover/btn:bg-green-50 transition-colors">
                                    <i class="fa-solid fa-retweet text-[14px]"></i>
                                </div>
                                <span class="text-[11px] font-black uppercase tracking-widest">${post.reposts?.length || 0}</span>
                            </button>
                        </div>

                        <button onclick="handleShare(${post.id})" class="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all">
                            <i class="fa-solid fa-arrow-up-from-bracket text-[13px]"></i>
                        </button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// --- SECTION 2: POSTING LOGIC (RESTORED) ---

async function submitLoaf() {
    const input = document.getElementById('postInput');
    const content = input?.value?.trim();
    if (!content) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.showModal("Identity Required", "Log in to post a loaf.", false);
        return;
    }

    const { error } = await supabase.from('posts').insert([{
        user_id: user.id,
        content: content,
        title: "New Loaf",
        category: "General"
    }]);

    if (error) {
        window.showModal("Terminal Error", error.message, false);
    } else {
        input.value = '';
        input.style.height = "auto";
        const postActions = document.getElementById('postActions');
        if (postActions) postActions.classList.add('hidden');
        
        await renderFeed();
        updateDashboardStats();
        window.showModal("Transmitted", "Your loaf is live on the grid.", true);
    }
}

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

// --- SECTION 3: THEME & MODAL UTILITIES (FIXED FOR December 21st) ---

function toggleLinkedOutModal() {
    const overlay = document.getElementById('linkedOutModalOverlay');
    if (!overlay) return;

    if (overlay.classList.contains('hidden')) {
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
        overlay.style.opacity = '1';
        document.body.style.overflow = 'hidden';
    } else {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
            document.body.style.overflow = '';
        }, 300);
    }
}

window.showModal = function(title, message, isSuccess = true) {
    const modal = document.getElementById('globalModal');
    if (!modal) return alert(message);

    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').textContent = message;
    document.getElementById('modalEmoji').textContent = isSuccess ? '🛋️' : '⚠️';

    const footer = modal.querySelector('.modal-footer') || modal.querySelector('.bg-white');
    
    // Ensure button is there and functional
    let dismissBtn = document.getElementById('modalDismissBtn');
    if (!dismissBtn) {
        dismissBtn = document.createElement('button');
        dismissBtn.id = 'modalDismissBtn';
        dismissBtn.className = "w-full mt-8 py-5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-800 transition-all";
        dismissBtn.innerText = "Dismiss Signal";
        dismissBtn.onclick = closeModal;
        footer.appendChild(dismissBtn);
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
};

function closeModal() {
    const modal = document.getElementById('globalModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    document.body.style.overflow = '';
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

// --- SECTION 4: IDENTITY SYNC & PROMOTIONS (FULL) ---

async function syncIdentity(userId) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!profile) return;

    const freshUrl = `${profile.avatar_url}?t=${Date.now()}`;
    const selectors = ['dashPfpNav', 'dashPfp', 'dashPfpLarge', 'sidebarPfp'];
    selectors.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.src = freshUrl;
    });

    const nameEls = document.querySelectorAll('.user-full-name');
    nameEls.forEach(el => el.innerText = profile.full_name || 'User');

    const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId);
    const followEl = document.getElementById('followerCount');
    if (followEl) followEl.innerText = followers || 0;
}

async function checkPromotion(userId) {
    const { data: tierData } = await supabase.from('user_tiers').select('*').eq('id', userId).single();
    if (!tierData) return;

    const milestones = { 11: 'Tier 2', 21: 'Tier 3', 41: 'Unverified' };
    if (milestones[tierData.days_old]) {
        showPromotionModal(milestones[tierData.days_old]);
    }
}

function showPromotionModal(tierName) {
    const promo = document.createElement('div');
    promo.className = "fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-6";
    promo.innerHTML = `
        <div class="bg-white p-10 rounded-[50px] shadow-2xl text-center max-w-sm">
            <div class="w-20 h-20 bg-cyan-500/10 text-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <i class="fa-solid fa-ranking-star text-3xl"></i>
            </div>
            <h2 class="text-xs font-black uppercase tracking-[0.3em] mb-4">Rank Evolution</h2>
            <p class="text-[11px] text-slate-500 font-bold uppercase leading-relaxed mb-8">You have been promoted to <span class="text-cyan-600">${tierName}</span> based on your activity.</p>
            <button onclick="this.parentElement.parentElement.remove()" class="w-full py-5 bg-cyan-600 text-white rounded-[24px] text-[10px] font-black uppercase">Accept Status</button>
        </div>`;
    document.body.appendChild(promo);
}

// --- SECTION 5: SIDEBAR, COMMUNITIES & RECS ---

function syncSidebarCommunities() {
    const communityList = JSON.parse(localStorage.getItem('userCommunities')) || [];
    const container = document.getElementById('sidebarCommList');
    if (!container) return;

    container.innerHTML = communityList.slice(0, 5).map(comm => `
        <div class="flex items-center justify-between p-3 rounded-[24px] hover:bg-slate-50 transition-all cursor-pointer group">
            <div class="flex items-center gap-3" onclick="window.location.href='/PAGES/open_comms.html?id=${comm.id}'">
                <img src="${comm.image || '/IMG/Logo.jpeg'}" class="w-10 h-10 rounded-2xl object-cover">
                <h4 class="text-[10px] font-black text-slate-800 uppercase truncate max-w-[90px]">${comm.name}</h4>
            </div>
            <i class="fa-solid fa-chevron-right text-[8px] text-slate-200 group-hover:text-slate-400"></i>
        </div>`).join('');
}

async function loadRecommendations() {
    const list = document.getElementById('recommendationList');
    if (!list) return;

    const { data: recs } = await supabase.from('profiles').select('id, full_name, avatar_url, role').limit(3);
    if (!recs) return;

    list.innerHTML = recs.map(rec => `
        <div class="flex items-center justify-between group">
            <div class="flex items-center gap-4 cursor-pointer" onclick="window.location.href='/PAGES/view-profile.html?id=${rec.id}'">
                <img src="${rec.avatar_url || '/IMG/Logo.jpeg'}" class="w-12 h-12 rounded-[22px] border border-slate-50 object-cover">
                <div>
                    <h4 class="text-[10px] font-black text-slate-800 uppercase tracking-tighter">${rec.full_name}</h4>
                    <p class="text-[8px] font-bold text-slate-400 uppercase">${rec.role || 'Loafer'}</p>
                </div>
            </div>
            <button class="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                <i class="fa-solid fa-plus text-[10px]"></i>
            </button>
        </div>`).join('');
}

async function updateDashboardStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    const countEl = document.getElementById('appCount');
    if (countEl) countEl.innerText = count || 0;
}

// --- SECTION 6: INTERACTION HANDLERS ---

async function handleLike(postId, btn, alreadyLiked) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (alreadyLiked) {
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
        await supabase.from('likes').insert([{ post_id: postId, user_id: user.id }]);
    }
    renderFeed();
}

async function handleRepost(postId, alreadyReposted) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || alreadyReposted) return;

    await supabase.from('reposts').insert([{ post_id: postId, user_id: user.id }]);
    window.showModal("Success", "Loaf added to your timeline.", true);
    renderFeed();
}

function handleShare(postId) {
    const url = `${window.location.origin}/PAGES/post.html?id=${postId}`;
    navigator.clipboard.writeText(url);
    window.showModal("Terminal", "Post link copied to system clipboard.", true);
}

// --- SECTION 7: DELETION ENGINE ---

window.deleteLoaf = function(id) {
    showDeleteConfirmModal(id);
};

function showDeleteConfirmModal(postId) {
    const modal = document.getElementById('globalModal');
    if (!modal) return;

    document.getElementById('modalTitle').textContent = "Delete Loaf";
    document.getElementById('modalBody').innerHTML = `This transmission will be permanently erased from the LinkedOut grid.`;
    document.getElementById('modalEmoji').textContent = '🗑️';

    const footer = modal.querySelector('.modal-footer') || modal.querySelector('.bg-white');
    footer.innerHTML = `
        <div class="flex flex-col gap-3 w-full mt-4">
            <button onclick="performDelete(${postId}); closeModal()" class="w-full py-5 bg-red-600 text-white text-[10px] font-black uppercase rounded-2xl">Confirm Erase</button>
            <button onclick="closeModal()" class="w-full py-5 bg-slate-50 text-slate-400 text-[10px] font-black uppercase rounded-2xl">Cancel</button>
        </div>`;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

async function performDelete(id) {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (!error) {
        await renderFeed();
        updateDashboardStats();
    }
}
