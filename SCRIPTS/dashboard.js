/**
 * LINKEDOUT DASHBOARD - FULL MASTER VERSION
 * All Original Features + New High-Speed Database Interactions
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Original Identity & Sync Features
    if (typeof syncAllIdentityElements === 'function') {
        await syncAllIdentityElements();
    }
    
    // Core Dashboard Execution
    await renderFeed();
    syncSidebarCommunities();
    checkSavedTheme();
    updateDashboardStats();

    // Start Real-time Identity Sync
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        syncIdentity(user.id);
        checkPromotion(user.id);
    }
});

// --- 1. THE FEED (RENDER & FETCH) ---

async function renderFeed() {
    const feedContainer = document.getElementById('mainFeed');
    const placeholder = document.getElementById('feedPlaceholder');
    if (!feedContainer) return;

    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user ? user.id : null;

    // Fetching posts with profile joins and interaction counts
    const { data: posts, error } = await supabase
        .from('posts')
        .select(`
            *,
            profiles (id, full_name, avatar_url),
            likes (user_id),
            reposts (user_id)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Feed error:", error);
        if (placeholder) {
            placeholder.innerHTML = `<p class="text-red-500 text-center py-8 uppercase text-[10px] font-black tracking-widest">Feed Error: ${error.message}</p>`;
            placeholder.style.display = 'block';
        }
        return;
    }

    if (!posts || posts.length === 0) {
        if (placeholder) {
            placeholder.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20 px-6 animate-in fade-in duration-700">
                    <div class="w-20 h-20 bg-white border border-slate-100 rounded-[32px] flex items-center justify-center shadow-sm mb-6">
                        <i class="fa-solid fa-mug-hot text-slate-200 text-2xl"></i>
                    </div>
                    <h3 class="text-[11px] font-black text-slate-800 uppercase tracking-[0.3em] mb-2">Grid is Empty</h3>
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] max-w-[220px] leading-relaxed text-center">
                        No loafs detected in the wild. Start the movement.
                    </p>
                    <div class="mt-8 opacity-20">
                        <div class="w-1 h-12 bg-gradient-to-b from-slate-400 to-transparent rounded-full"></div>
                    </div>
                </div>`;
            placeholder.style.display = 'block';
        }
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
        const postDate = new Date(post.created_at).toLocaleDateString();

        return `
            <div class="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm transition-all hover:border-slate-300">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-3 cursor-pointer" onclick="window.location.href='/PAGES/view-profile.html?id=${post.user_id}'">
                            <img src="${profile.avatar_url || '/IMG/Logo.jpeg'}" class="w-10 h-10 rounded-full border border-slate-100 object-cover">
                            <div>
                                <h4 class="text-xs font-black text-slate-800">${profile.full_name || 'Anonymous'}</h4>
                                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${postDate}</p>
                            </div>
                        </div>
                        ${isOwner ? `
                            <button onclick="deleteLoaf(${post.id})" class="text-slate-300 hover:text-red-500 transition-colors">
                                <i class="fa-solid fa-trash text-xs"></i>
                            </button>
                        ` : ''}
                    </div>
                    <p class="text-sm text-slate-700 leading-relaxed mb-6">${post.content}</p>

                    <div class="flex items-center justify-between pt-4 border-t border-slate-50">
                        <div class="flex items-center gap-6">
                            <button onclick="handleLike(${post.id}, this, ${isLiked})" class="flex items-center gap-2 ${isLiked ? 'text-pink-500' : 'text-slate-400'} transition-all hover:scale-105">
                                <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart text-xs"></i>
                                <span class="text-[10px] font-black">${post.likes?.length || 0}</span>
                            </button>

                            <button onclick="openCommentModal(${post.id})" class="flex items-center gap-2 text-slate-400 hover:text-cyan-500 transition-all">
                                <i class="fa-regular fa-comment text-xs"></i>
                                <span class="text-[10px] font-black uppercase">Reply</span>
                            </button>

                            <button onclick="handleRepost(${post.id}, ${isReposted})" class="flex items-center gap-2 ${isReposted ? 'text-green-500' : 'text-slate-400'} hover:text-green-500 transition-all">
                                <i class="fa-solid fa-retweet text-xs"></i>
                                <span class="text-[10px] font-black uppercase">${post.reposts?.length || 0}</span>
                            </button>
                        </div>
                        <button onclick="handleShare(${post.id})" class="text-slate-300 hover:text-slate-600">
                            <i class="fa-solid fa-arrow-up-from-bracket text-xs"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// --- 2. THE POSTING ENGINE ---

async function submitLoaf() {
    const input = document.getElementById('postInput');
    const content = input?.value?.trim();
    if (!content) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return window.showModal("Auth", "You must be logged in to loaf.", false);

    const { error } = await supabase.from('posts').insert([{
        user_id: user.id,
        content: content,
        title: "Loaf",
        category: "General"
    }]);

    if (error) {
        console.error(error);
        window.showModal("Error", "Post failed: " + error.message, false);
    } else {
        input.value = '';
        input.style.height = "auto";
        await renderFeed();
        updateDashboardStats();
        window.showModal("Success", "Loaf transmitted!", true);
    }
}

// --- 3. THE INTERACTION ENGINE (Likes, Reposts, Share) ---

async function handleLike(postId, btn, alreadyLiked) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return window.showModal("Auth", "Log in to like.", false);

    // Optimistic Update
    const countSpan = btn.querySelector('span');
    let count = parseInt(countSpan.innerText);
    
    if (alreadyLiked) {
        btn.classList.replace('text-pink-500', 'text-slate-400');
        countSpan.innerText = Math.max(0, count - 1);
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
        btn.classList.replace('text-slate-400', 'text-pink-500');
        countSpan.innerText = count + 1;
        await supabase.from('likes').insert([{ post_id: postId, user_id: user.id }]);
    }
    // Refresh to sync state
    renderFeed();
}

async function handleRepost(postId, alreadyReposted) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return window.showModal("Auth", "Log in to repost.", false);
    if (alreadyReposted) return;

    await supabase.from('reposts').insert([{ post_id: postId, user_id: user.id }]);
    window.showModal("Success", "Re-loafed to your feed!", true);
    renderFeed();
}

function handleShare(postId) {
    const url = `${window.location.origin}/PAGES/post.html?id=${postId}`;
    navigator.clipboard.writeText(url);
    window.showModal("Terminal", "Post link copied to clipboard.", true);
}

// --- 4. DELETION LOGIC (Confirmed Center Modal) ---

window.deleteLoaf = function(id) {
    showDeleteConfirmModal(id);
};

function showDeleteConfirmModal(postId) {
    const modal = document.getElementById('globalModal');
    if (!modal) return;

    document.getElementById('modalTitle').textContent = "Delete Loaf";
    document.getElementById('modalBody').innerHTML = `Are you sure? This transmission will be lost in the void forever.`;
    document.getElementById('modalEmoji').textContent = '🗑️';

    const buttonContainer = document.querySelector('#globalModal button')?.parentElement;
    if (buttonContainer) {
        buttonContainer.innerHTML = `
            <div class="flex flex-col gap-3 w-full mt-2">
                <button onclick="performDelete(${postId}); closeModal()" class="w-full py-5 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-red-700 active:scale-95 transition-all">Confirm Deletion</button>
                <button onclick="closeModal()" class="w-full py-5 bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-100 transition-all">Cancel</button>
            </div>`;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
}

async function performDelete(id) {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) {
        window.showModal?.("Error", error.message, false);
    } else {
        await renderFeed();
        updateDashboardStats();
        window.showModal?.("Deleted", "Loaf removed.", true);
    }
}

// --- 5. IDENTITY, THEME & SIDEBAR (ORIGINAL 1:1) ---

async function syncIdentity(userId) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!profile) return;

    const freshUrl = `${profile.avatar_url}?t=${Date.now()}`;
    ['dashPfpNav', 'dashPfp', 'dashPfpLarge'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.src = freshUrl;
    });

    const { count } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId);
    if (document.getElementById('followerCount')) document.getElementById('followerCount').innerText = count || 0;
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
        postActions?.classList.replace('hidden', 'flex');
    } else {
        postActions?.classList.replace('flex', 'hidden');
    }
}

async function updateDashboardStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    const appCountElement = document.getElementById('appCount');
    if (appCountElement) appCountElement.innerText = count || 0;
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

// --- 6. PROMOTIONS & MODALS (ORIGINAL 1:1) ---

async function checkPromotion(userId) {
    const { data: tierData } = await supabase.from('user_tiers').select('*').eq('id', userId).single();
    const milestones = { 11: 'Tier 2', 21: 'Tier 3', 41: 'Unverified' };
    if (milestones[tierData?.days_old]) {
        showPromotionModal(milestones[tierData.days_old]);
    }
}

function showPromotionModal(tierName) {
    const modal = document.createElement('div');
    modal.className = "fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-6";
    modal.innerHTML = `
        <div class="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-2xl text-center max-w-xs animate-in zoom-in duration-300">
            <div class="w-16 h-16 bg-cyan-500/10 text-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fa-solid fa-bolt text-2xl"></i>
            </div>
            <h3 class="text-xs font-black uppercase tracking-widest">Promotion Detected</h3>
            <p class="text-[10px] text-slate-500 mt-2 mb-6">Your loyalty earned you <span class="text-cyan-500 font-bold">${tierName}</span>.</p>
            <button onclick="this.parentElement.parentElement.remove()" class="w-full py-3 bg-cyan-500 text-white rounded-2xl text-[10px] font-black uppercase">Dismiss Signal</button>
        </div>`;
    document.body.appendChild(modal);
}

// --- 7. MODAL HELPERS (Centered as requested 2025-12-21) ---

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
    }
}

// --- 8. ANALYTICS & MISC ---
async function incrementPostView(postId) {
    const { error } = await supabase.rpc('increment_post_views', { target_post_id: postId });
    if (error) console.error("View Count Error:", error.message);
}
