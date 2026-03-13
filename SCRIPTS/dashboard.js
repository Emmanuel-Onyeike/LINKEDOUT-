/**
 * LINKEDOUT DASHBOARD – CLEAN & COMPLETE VERSION
 * Single file • one DOMContentLoaded • March 2025 style
 * Includes: feed with likes/reposts, identity sync, theme, communities, recommendations, promotion modal
 */

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof supabase === 'undefined') {
        console.error("Supabase client not loaded. Check script order.");
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = '/login'; // ← adjust path if needed
        return;
    }

    // Identity & realtime updates first
    await syncIdentity(user.id);
    setupRealtimeIdentitySync(user.id);
    checkPromotion(user.id);

    // Then load UI sections
    await renderFeed();
    syncSidebarCommunities();
    loadRecommendations();
    updateDashboardStats();
    checkSavedTheme();
});

// ─────────────────────────────────────────────────────────────────────────────
// IDENTITY & AVATAR SYNC
// ─────────────────────────────────────────────────────────────────────────────

async function syncIdentity(userId) {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('id', userId)
        .single();

    if (error || !profile) return;

    const freshUrl = `${profile.avatar_url || '/IMG/Logo.jpeg'}?t=${Date.now()}`;

    ['dashPfpNav', 'dashPfp', 'dashPfpLarge'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.src = freshUrl;
    });

    const nameEl = document.getElementById('dashName');
    if (nameEl) nameEl.textContent = profile.full_name || 'Anonymous';

    // Follower count
    const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

    const followerEl = document.getElementById('followerCount');
    if (followerEl) followerEl.textContent = count || 0;
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

// ─────────────────────────────────────────────────────────────────────────────
// FEED + POSTING + DELETE + SOCIAL INTERACTIONS
// ─────────────────────────────────────────────────────────────────────────────

async function renderFeed() {
    const feedContainer = document.getElementById('mainFeed');
    const placeholder = document.getElementById('feedPlaceholder');
    if (!feedContainer) return;

    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id ?? null;

    // 1. Fetch posts + aggregate counts
    const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(`
            id, user_id, content, created_at, title, category,
            likes ( count ),
            reposts ( count )
        `)
        .order('created_at', { ascending: false });

    if (postsError) {
        console.error("Feed fetch error:", postsError);
        if (placeholder) {
            placeholder.innerHTML = `<p class="text-red-500 text-center py-8">Feed error: ${postsError.message || 'Unknown'}</p>`;
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

    placeholder?.style.display = 'none';

    // 2. Get current user's like/repost status
    const postIds = posts.map(p => p.id);

    const { data: userLikes } = await supabase
        .from('likes')
        .select('post_id')
        .in('post_id', postIds)
        .eq('user_id', currentUserId);

    const { data: userReposts } = await supabase
        .from('reposts')
        .select('post_id')
        .in('post_id', postIds)
        .eq('user_id', currentUserId);

    const likedPostIds    = new Set(userLikes?.map(l => l.post_id)   || []);
    const repostedPostIds = new Set(userReposts?.map(r => r.post_id) || []);

    // 3. Fetch author profiles
    const userIds = [...new Set(posts.map(p => p.user_id))];
    const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

    const profileMap = {};
    profilesData?.forEach(p => profileMap[p.id] = p);

    // 4. Render posts
    let wrapper = document.getElementById('postWrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'postWrapper';
        wrapper.className = 'space-y-4';
        feedContainer.appendChild(wrapper);
    }

    wrapper.innerHTML = posts.map(post => {
        const profile = profileMap[post.user_id] || {};
        const isOwner = currentUserId === post.user_id;
        const likeCount   = post.likes?.[0]?.count ?? 0;
        const repostCount = post.reposts?.[0]?.count ?? 0;
        const isLiked     = likedPostIds.has(post.id);
        const isReposted  = repostedPostIds.has(post.id);

        return `
            <div class="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <img src="${profile.avatar_url || '/IMG/Logo.jpeg'}" class="w-10 h-10 rounded-full border border-slate-100 object-cover">
                            <div>
                                <h4 class="text-xs font-black text-slate-800">${profile.full_name || 'Anonymous'}</h4>
                                <p class="text-[9px] font-bold text-slate-400">${new Date(post.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                        ${isOwner ? `<button onclick="deleteLoaf('${post.id}')" class="text-red-500"><i class="fa-solid fa-trash"></i></button>` : ''}
                    </div>
                    <p class="text-sm text-slate-700">${post.content}</p>
                </div>

                <div class="flex items-center gap-6 px-6 pb-5 pt-3 border-t border-slate-100">
                    <button onclick="handleLike('${post.id}', this, ${JSON.stringify(isLiked)})"
                            class="flex items-center gap-1.5 transition-colors ${isLiked ? 'text-pink-500' : 'text-slate-500 hover:text-pink-500'}">
                        <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart text-lg"></i>
                        <span class="text-xs font-semibold">${likeCount}</span>
                    </button>

                    <button onclick="openComments('${post.id}')"
                            class="flex items-center gap-1.5 text-slate-500 hover:text-cyan-600 transition-colors">
                        <i class="fa-regular fa-comment text-lg"></i>
                        <span class="text-xs font-semibold uppercase">Reply</span>
                    </button>

                    <button onclick="handleRepost('${post.id}', ${JSON.stringify(isReposted)})"
                            class="flex items-center gap-1.5 transition-colors ${isReposted ? 'text-green-600' : 'text-slate-500 hover:text-green-600'}">
                        <i class="fa-solid fa-retweet text-lg"></i>
                        <span class="text-xs font-semibold">${repostCount}</span>
                    </button>

                    <button onclick="handleShare('${post.id}')"
                            class="ml-auto text-slate-400 hover:text-slate-700 transition-colors">
                        <i class="fa-solid fa-arrow-up-from-bracket text-lg"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function submitLoaf() {
    const input = document.getElementById('postInput');
    const content = input?.value?.trim();
    if (!content) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Please login first");

    const { error } = await supabase.from('posts').insert([{
        user_id: user.id,
        content,
        title: "Loaf",
        category: "General"
    }]);

    if (error) {
        console.error("Post error:", error);
        alert("Post failed: " + (error.message || "Unknown error"));
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
        if (confirm("Delete this loaf forever?")) performDelete(postId);
        return;
    }

    document.getElementById('modalTitle').textContent = "Delete Loaf";
    document.getElementById('modalBody').innerHTML = `
        Are you sure you want to delete this loaf?<br>
        <small>This action cannot be undone.</small>
    `;
    document.getElementById('modalEmoji').textContent = '🗑️';

    const btnContainer = document.querySelector('#globalModal button')?.parentElement;
    if (btnContainer) {
        btnContainer.innerHTML = `
            <div class="flex flex-col gap-3 w-full mt-2">
                <button onclick="performDelete('${postId}'); closeModal()"
                    class="w-full py-5 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-red-700 hover:shadow-lg hover:shadow-red-200 active:scale-95 transition-all duration-200">
                    Confirm Deletion
                </button>
                <button onclick="closeModal()"
                    class="w-full py-5 bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-100 hover:text-slate-600 active:scale-95 transition-all duration-200">
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
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) {
        console.error("Delete failed:", error);
        window.showModal?.("Error", "Could not delete: " + error.message, false);
    } else {
        await renderFeed();
        window.showModal?.("Deleted", "Loaf removed successfully.", true);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL INTERACTIONS
// ─────────────────────────────────────────────────────────────────────────────

async function handleLike(postId, btn, alreadyLiked) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return window.showModal("Auth", "Log in to like loafs.", false);

    const icon = btn.querySelector('i');
    const countSpan = btn.querySelector('span');
    const originalCount = parseInt(countSpan.innerText) || 0;
    const originalBtnClass = btn.className;
    const originalIconClass = icon.className;

    // Optimistic UI
    if (alreadyLiked) {
        btn.classList.replace('text-pink-500', 'text-slate-500');
        icon.classList.replace('fa-solid', 'fa-regular');
        countSpan.innerText = Math.max(0, originalCount - 1);
    } else {
        btn.classList.replace('text-slate-500', 'text-pink-500');
        icon.classList.replace('fa-regular', 'fa-solid');
        countSpan.innerText = originalCount + 1;
    }

    try {
        if (alreadyLiked) {
            await supabase.from('likes').delete()
                .eq('post_id', postId)
                .eq('user_id', user.id);
        } else {
            await supabase.from('likes').insert([{ post_id: postId, user_id: user.id }]);
        }
    } catch (err) {
        console.error("Like failed:", err);
        // Revert UI
        btn.className = originalBtnClass;
        icon.className = originalIconClass;
        countSpan.innerText = originalCount;
        window.showModal?.("Error", "Couldn't update like", false);
    }
}

async function handleRepost(postId, alreadyReposted) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return window.showModal("Auth", "Log in to repost.", false);
    if (alreadyReposted) return;

    const { error } = await supabase.from('reposts').insert([
        { post_id: postId, user_id: user.id }
    ]);

    if (error) {
        console.error("Repost failed:", error);
        window.showModal("Error", "Could not repost", false);
    } else {
        window.showModal("Success", "Re-loafed to your profile!", true);
        await renderFeed();
    }
}

function handleShare(postId) {
    const url = `${window.location.origin}/PAGES/post.html?id=${postId}`;

    if (navigator.share) {
        navigator.share({ title: 'Check this Loaf on LinkedOut', url })
            .catch(err => console.error(err));
    } else {
        navigator.clipboard.writeText(url)
            .then(() => window.showModal("Terminal", "Link copied to clipboard.", true))
            .catch(() => window.showModal("Error", "Could not copy link", false));
    }
}

function openComments(postId) {
    window.location.href = `/PAGES/post.html?id=${postId}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// OTHER UI HELPERS (theme, input, stats, modals, communities, etc.)
// ─────────────────────────────────────────────────────────────────────────────

function handlePostInput(el) {
    const actions = document.getElementById('postActions');
    const counter = document.getElementById('charCounter');
    const MAX = 500;

    if (el.value.length > MAX) el.value = el.value.substring(0, MAX);
    if (counter) counter.innerText = `${el.value.length} / ${MAX}`;

    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";

    if (el.value.trim()) {
        actions?.classList.remove('hidden');
        actions?.classList.add('flex');
    } else {
        actions?.classList.add('hidden');
        actions?.classList.remove('flex');
    }
}

async function updateDashboardStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { count } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

    document.getElementById('appCount')?.setAttribute('innerText', count || 0);
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
    window.showModal?.('Theme Switched', `Now in ${isDark ? "Night Shift" : "Daylight"} mode.`);
}

function checkSavedTheme() {
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.classList.add('dark');
        updateThemeIcon(true);
    }
}

function updateThemeIcon(isDark) {
    const icon = document.getElementById('themeIcon');
    if (!icon) return;
    icon.classList.replace(isDark ? 'fa-sun' : 'fa-moon', isDark ? 'fa-moon' : 'fa-sun');
    if (isDark) icon.classList.add('text-amber-400');
    else icon.classList.remove('text-amber-400');
}

window.showModal = function(title, message, isSuccess = true) {
    const modal = document.getElementById('globalModal');
    if (!modal) return alert(`${title}\n${message}`);

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

// ── Communities, Recommendations, Promotion (unchanged except minor safety) ──

function syncSidebarCommunities() {
    const communities = JSON.parse(localStorage.getItem('userCommunities')) || [];
    const card = document.getElementById('myCommunitiesCard');
    if (!card) return;

    let wrapper = document.getElementById('sidebarCommList');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'sidebarCommList';
        wrapper.className = 'space-y-3 mb-4';
        card.querySelector('.flex.justify-between')?.insertAdjacentElement('afterend', wrapper);
    }

    wrapper.innerHTML = communities.slice(0, 3).map(comm => `
        <div class="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
            <div class="flex items-center gap-3">
                <img src="${comm.image || '/IMG/Logo.jpeg'}" class="w-10 h-10 rounded-xl object-cover">
                <h4 class="text-[10px] font-black text-slate-800 uppercase truncate max-w-[80px]">${comm.name}</h4>
            </div>
            <button onclick="window.location.href='/PAGES/open_comms.html?id=${comm.id}'" 
                    class="bg-slate-50 text-slate-800 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase">
                Open
            </button>
        </div>
    `).join('');
}

async function loadRecommendations() {
    const container = document.getElementById('recommendationList');
    if (!container) return;

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .limit(5);

    if (error) {
        console.error("Recommendations error:", error);
        return;
    }

    container.innerHTML = '';

    profiles.forEach(profile => {
        const card = document.createElement('div');
        card.className = "flex items-center justify-between group cursor-pointer";
        card.innerHTML = `
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
        container.appendChild(card);
    });
}

async function checkPromotion(userId) {
    const { data: tier } = await supabase
        .from('user_tiers')
        .select('days_old')
        .eq('id', userId)
        .single();

    const milestones = { 11: 'Tier 2', 21: 'Tier 3', 41: 'Unverified' };
    const tierName = milestones[tier?.days_old];

    if (tierName) showPromotionModal(tierName);
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
            <p class="text-[10px] text-slate-500 mt-2 mb-6">
                Your loyalty has earned you a spot in <span class="text-cyan-500 font-bold">${tierName}</span>.
            </p>
            <button onclick="this.parentElement.parentElement.remove()" 
                    class="w-full py-3 bg-cyan-500 text-white rounded-2xl text-[10px] font-black uppercase">
                Dismiss Signal
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

function toggleLinkedOutModal() {
    const overlay = document.getElementById('linkedOutModalOverlay');
    if (!overlay) return console.error("Overlay not found");

    if (overlay.classList.contains('hidden')) {
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
        overlay.style.opacity = '1';
        document.getElementById('linkedOutDropdown')?.classList.replace('scale-95 opacity-0', 'scale-100 opacity-100');
        document.body.style.overflow = 'hidden';
    } else {
        overlay.style.opacity = '0';
        document.getElementById('linkedOutDropdown')?.classList.replace('scale-100 opacity-100', 'scale-95 opacity-0');
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
            document.body.style.overflow = '';
        }, 300);
    }
}

async function incrementPostView(postId) {
    const { error } = await supabase.rpc('increment_post_views', { target_post_id: postId });
    if (error) console.error("View increment failed:", error.message);
}
