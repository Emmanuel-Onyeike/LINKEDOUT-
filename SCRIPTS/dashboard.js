/**
 * LINKEDOUT DASHBOARD – COMPLETE & ORGANIZED VERSION
 * Single file – one DOMContentLoaded – all features included
 * Last updated structure: March 2025 style
 */

document.addEventListener('DOMContentLoaded', async () => {
    // ── 0. Early safety checks ────────────────────────────────────────
    if (typeof supabase === 'undefined') {
        console.error("Supabase not loaded. Check script order in HTML.");
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = '/login';   // ← change to your actual login path if different
        return;
    }

    // ── 1. Identity & realtime sync (highest priority) ────────────────
    await syncAllIdentityElements(user.id);
    setupRealtimeIdentitySync(user.id);
    await syncIdentity(user.id);
    checkPromotion(user.id);

    // ── 2. Load main UI sections ──────────────────────────────────────
    await renderFeed();
    syncSidebarCommunities();
    loadRecommendations();
    updateDashboardStats();
    checkSavedTheme();
});

// =============================================================================
//  1. IDENTITY & PROFILE SYNC
// =============================================================================

async function syncAllIdentityElements(userId) {
    const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('id', userId)
        .single();

    if (!profile) return;

    const freshUrl = `${profile.avatar_url || '/IMG/Logo.jpeg'}?t=${Date.now()}`;

    ['dashPfpNav', 'dashPfp', 'dashPfpLarge'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.src = freshUrl;
    });

    const nameEl = document.getElementById('dashName');
    if (nameEl) nameEl.textContent = profile.full_name || 'Anonymous';
}

function setupRealtimeIdentitySync(userId) {
    supabase
        .channel('global_pfp_sync')
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`
        }, (payload) => {
            if (!payload.new.avatar_url) return;
            const freshUrl = `${payload.new.avatar_url}?t=${Date.now()}`;
            ['dashPfpNav', 'dashPfp', 'dashPfpLarge'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.src = freshUrl;
            });
        })
        .subscribe();
}

async function syncIdentity(userId) {
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (!profile) return;

    const freshUrl = `${profile.avatar_url}?t=${Date.now()}`;
    ['dashPfpNav', 'dashPfp', 'dashPfpLarge'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.src = freshUrl;
    });

    const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

    const followerEl = document.getElementById('followerCount');
    if (followerEl) followerEl.textContent = count || 0;
}

// =============================================================================
//  2. FEED + POSTING + DELETE
// =============================================================================

async function renderFeed() {
    const feedContainer = document.getElementById('mainFeed');
    const placeholder = document.getElementById('feedPlaceholder');
    if (!feedContainer) return;

    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id ?? null;

    const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Feed error:", error);
        if (placeholder) {
            placeholder.innerHTML = `<p class="text-red-500 text-center py-8">Feed error: ${error.message || 'Unknown'}</p>`;
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
                    <h3 class="text-[11px] font-black text-slate-800 uppercase tracking-[0.3em] mb-2">
                        Grid is Empty
                    </h3>
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] max-w-[220px] leading-relaxed text-center">
                        No loafs detected in the wild. Start the movement.
                    </p>
                    <div class="mt-8 opacity-20">
                        <div class="w-1 h-12 bg-gradient-to-b from-slate-400 to-transparent rounded-full"></div>
                    </div>
                </div>
            `;
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

    const userIds = [...new Set(posts.map(p => p.user_id))];
    const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

    const profileMap = {};
    profilesData?.forEach(p => profileMap[p.id] = p);

   postWrapper.innerHTML = posts.map(post => {
    // 1. Data Setup
    const profile = profileMap[post.user_id] || {};
    const isOwner = currentUserId === post.user_id;
    
    // 2. Interaction State
    const isLiked = post.likes?.some(l => l.user_id === currentUserId);
    const isReposted = post.reposts?.some(r => r.user_id === currentUserId);

    // 3. Combined Template
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

async function submitLoaf() {
    const input = document.getElementById('postInput');
    const content = input?.value?.trim();
    if (!content) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Login first");

    const { error } = await supabase.from('posts').insert([{
        user_id: user.id,
        content: content,
        title: "Loaf",
        category: "General"
    }]);

    if (error) {
        console.error(error);
        alert("Post failed: " + error.message);
    } else {
        input.value = '';
        await renderFeed();
        alert("Posted!");
    }
}

window.deleteLoaf = function(id) {
    showDeleteConfirmModal(id);
};

function showDeleteConfirmModal(postId) {
    const modal = document.getElementById('globalModal');
    if (!modal) {
        if (confirm("Delete this loaf forever?")) {
            performDelete(postId);
        }
        return;
    }

    document.getElementById('modalTitle').textContent = "Delete Loaf";
    document.getElementById('modalBody').innerHTML = `
        Are you sure you want to delete this loaf?<br>
        <small>This action cannot be undone.</small>
    `;
    document.getElementById('modalEmoji').textContent = '🗑️';

    const buttonContainer = document.querySelector('#globalModal button')?.parentElement;
    if (buttonContainer) {
        buttonContainer.innerHTML = `
            <div class="flex flex-col gap-3 w-full mt-2">
                <button onclick="performDelete(${postId}); closeModal()"
                    class="w-full py-5 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl 
                    hover:bg-red-700 hover:shadow-lg hover:shadow-red-200 active:scale-95 transition-all duration-200">
                    Confirm Deletion
                </button>
                <button onclick="closeModal()"
                    class="w-full py-5 bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl 
                    hover:bg-slate-100 hover:text-slate-600 active:scale-95 transition-all duration-200">
                    Keep this Loaf
                </button>
            </div>
        `;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
}

async function performDelete(id) {
    const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);

    if (error) {
        console.error("Delete failed:", error);
        window.showModal?.("Error", "Could not delete: " + error.message, false);
    } else {
        await renderFeed();
        window.showModal?.("Deleted", "Loaf removed successfully.", true);
    }
}

// =============================================================================
//  3. UI HELPERS – Theme, Input, Stats, Global Modal
// =============================================================================

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

    const { count } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

    const appCountElement = document.getElementById('appCount');
    if (appCountElement) appCountElement.innerText = count || 0;
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
    window.showModal?.('Theme Switched', `System is now in ${isDark ? "Night Shift" : "Daylight"} mode.`);
}

function checkSavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        updateThemeIcon(true);
    }
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
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
}

// =============================================================================
//  4. COMMUNITIES + RECOMMENDATIONS + PROMOTION + LINKEDOUT DROPDOWN
// =============================================================================

function syncSidebarCommunities() {
    const communityList = JSON.parse(localStorage.getItem('userCommunities')) || [];
    const sidebarCard = document.getElementById('myCommunitiesCard');
    if (!sidebarCard) return;

    let listWrapper = document.getElementById('sidebarCommList');
    if (!listWrapper) {
        listWrapper = document.createElement('div');
        listWrapper.id = 'sidebarCommList';
        listWrapper.className = 'space-y-3 mb-4';
        sidebarCard.querySelector('.flex.justify-between')?.insertAdjacentElement('afterend', listWrapper);
    }

    listWrapper.innerHTML = communityList.slice(0, 3).map(comm => `
        <div class="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
            <div class="flex items-center gap-3">
                <img src="${comm.image || '/IMG/Logo.jpeg'}" class="w-10 h-10 rounded-xl object-cover">
                <h4 class="text-[10px] font-black text-slate-800 uppercase truncate max-w-[80px]">${comm.name}</h4>
            </div>
            <button onclick="window.location.href='/PAGES/open_comms.html?id=${comm.id}'" class="bg-slate-50 text-slate-800 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase">Open</button>
        </div>
    `).join('');
}

async function loadRecommendations() {
    const listContainer = document.getElementById('recommendationList');
    if (!listContainer) return;

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .limit(5);

    if (error) {
        console.error("Recs Error:", error);
        return;
    }

    listContainer.innerHTML = '';

    profiles.forEach(profile => {
        const userCard = document.createElement('div');
        userCard.className = "flex items-center justify-between group cursor-pointer";

        userCard.innerHTML = `
            <div class="flex items-center gap-4" onclick="window.location.href='/PAGES/view-profile.html?id=${profile.id}'">
                <div class="relative">
                    <img src="${profile.avatar_url || '/IMG/Logo.jpeg'}" 
                         class="w-12 h-12 rounded-2xl object-cover border-2 border-transparent group-hover:border-cyan-500 transition-all">
                </div>
                <div>
                    <h4 class="text-xs font-black text-slate-800 uppercase tracking-tighter">${profile.full_name || 'Anonymous'}</h4>
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${profile.role || 'Loafer'}</p>
                </div>
            </div>
            <button onclick="followUser('${profile.id}')" 
                class="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all">
                <i class="fa-solid fa-plus text-[10px]"></i>
            </button>
        `;
        listContainer.appendChild(userCard);
    });
}

async function checkPromotion(userId) {
    const { data: tierData } = await supabase
        .from('user_tiers')
        .select('*')
        .eq('id', userId)
        .single();

    const milestones = { 11: 'Tier 2', 21: 'Tier 3', 41: 'Unverified' };

    if (tierData?.days_old && milestones[tierData.days_old]) {
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
            <h3 class="text-xs font-black uppercase tracking-widest dark:text-white">Promotion Detected</h3>
            <p class="text-[10px] text-slate-500 mt-2 mb-6">Your loyalty has earned you a spot in <span class="text-cyan-500 font-bold">${tierName}</span>.</p>
            <button onclick="this.parentElement.parentElement.remove()" class="w-full py-3 bg-cyan-500 text-white rounded-2xl text-[10px] font-black uppercase">Dismiss Signal</button>
        </div>
    `;

    document.body.appendChild(modal);
}

function toggleLinkedOutModal() {
    const overlay = document.getElementById('linkedOutModalOverlay');
    if (!overlay) {
        console.error("Overlay not found");
        return;
    }

    if (overlay.classList.contains('hidden')) {
        // Open
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
        overlay.style.opacity = '1';
        const content = document.getElementById('linkedOutDropdown');
        if (content) {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }
        document.body.style.overflow = 'hidden';
    } else {
        // Close
        overlay.style.opacity = '0';
        const content = document.getElementById('linkedOutDropdown');
        if (content) {
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
        }
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
            document.body.style.overflow = '';
        }, 300);
    }

    console.log("Modal toggle called - current hidden:", overlay.classList.contains('hidden'));
}

async function incrementPostView(postId) {
    const { error } = await supabase.rpc('increment_post_views', { target_post_id: postId });
    if (error) console.error("View Count Error:", error.message);
}
/** * SOCIAL INTERACTION ENGINE 
 * Isolated functions for Like, Repost, Share, and Commenting
 */
async function updateDashboardStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    const countEl = document.getElementById('appCount');
    if (countEl) countEl.innerText = count || 0;
}

// --- SECTION 6: INTERACTION HANDLERS ---

// --- LIKE HANDLER ---
async function handleLike(postId, btn, alreadyLiked) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return window.showModal("Auth", "Log in to like loafs.", false);

    // Optimistic UI Update for speed
    const icon = btn.querySelector('i');
    const countSpan = btn.querySelector('span');
    let currentCount = parseInt(countSpan.innerText);

    if (alreadyLiked) {
        // Remove Like from DB
        const { error } = await supabase.from('likes')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', user.id);
            
        if (!error) {
            btn.classList.replace('text-pink-500', 'text-slate-400');
            icon.classList.replace('fa-solid', 'fa-regular');
            countSpan.innerText = Math.max(0, currentCount - 1);
        }
    } else {
        // Add Like to DB
        const { error } = await supabase.from('likes')
            .insert([{ post_id: postId, user_id: user.id }]);
            
        if (!error) {
            btn.classList.replace('text-slate-400', 'text-pink-500');
            icon.classList.replace('fa-regular', 'fa-solid');
            countSpan.innerText = currentCount + 1;
        }
    }
    
    // Refresh to ensure UI and DB are perfectly synced
    await renderFeed(); 
}

// --- REPOST HANDLER ---
async function handleRepost(postId, alreadyReposted) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || alreadyReposted) return; 

    const { error } = await supabase.from('reposts').insert([
        { post_id: postId, user_id: user.id }
    ]);

    if (!error) {
        window.showModal("Success", "Re-loafed!", true);
        await renderFeed();
    }
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
