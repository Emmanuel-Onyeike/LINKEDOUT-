/**
 * LINKEDOUT MASTER DASHBOARD - FIXED & UNIFIED
 * Includes: Profile Stats, Feed Engine, Interaction Logic, and Modal Fix
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log("LinkedOut Terminal: Initializing...");

    // 1. Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error("Auth session missing:", authError);
        return;
    }

    // 2. Set Profile Link
    const sidebarLink = document.getElementById('dashProfileLink');
    if (sidebarLink) sidebarLink.href = `/PAGES/users.html?id=${user.id}`;

    // 3. Kickoff Engine
    await loadDashboardStats(user.id);
    await renderFeed();
    checkSavedTheme();
});

// --- SECTION 1: MODAL ENGINE (The "Dismiss" Fix) ---
// We attach this to window so HTML buttons can always find it
window.closeModal = function() {
    console.log("Terminal: Clearing all active signals...");
    
    // Hide standard modal
    const modal = document.getElementById('globalModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    // Hide LinkedOut specific overlays
    const overlays = ['linkedOutModalOverlay', 'loafModalOverlay'];
    overlays.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('hidden');
            el.classList.remove('flex');
        }
    });

    // The Nuclear Option for any rogue fixed overlays
    document.querySelectorAll('.fixed.inset-0').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('flex');
        el.style.display = 'none'; // Force hide
    });

    document.body.style.overflow = 'auto';
    document.body.classList.remove('profile-open');
};

window.showModal = function(title, message, isSuccess = true) {
    const modal = document.getElementById('globalModal');
    if (!modal) return alert(message);

    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').textContent = message;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
};

// --- SECTION 2: FEED & INTERACTIONS ---
async function renderFeed() {
    const feedContainer = document.getElementById('mainFeed');
    const placeholder = document.getElementById('feedPlaceholder');
    if (!feedContainer) return;

    const { data: { user: authUser } } = await supabase.auth.getUser();
    const currentUserId = authUser?.id;

    // FETCH FIXED: Removed 'bio' to prevent the error in your screenshot
    const { data: posts, error } = await supabase
        .from('posts')
        .select(`
            *,
            likes(user_id),
            reposts(user_id)
        `)
        .order('created_at', { ascending: false });

    if (error || !posts || posts.length === 0) {
        if (placeholder) placeholder.style.display = 'block';
        return;
    }
    if (placeholder) placeholder.style.display = 'none';

    // Fetch Profile Map
    const userIds = [...new Set(posts.map(p => p.user_id))];
    const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .in('id', userIds);

    const profileMap = {};
    profilesData?.forEach(p => profileMap[p.id] = p);

    let postWrapper = document.getElementById('postWrapper') || document.createElement('div');
    postWrapper.id = 'postWrapper';
    postWrapper.className = 'space-y-4';
    feedContainer.appendChild(postWrapper);

    postWrapper.innerHTML = posts.map(post => {
        const profile = profileMap[post.user_id] || {};
        const isOwner = currentUserId === post.user_id;
        const isLiked = post.likes?.some(l => l.user_id === currentUserId);
        const isReposted = post.reposts?.some(r => r.user_id === currentUserId);

        return `
            <div class="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm mb-4">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-3 cursor-pointer" onclick="window.location.href='/PAGES/view-profile.html?id=${post.user_id}'">
                            <img src="${profile.avatar_url || '/IMG/Logo.jpeg'}" class="w-10 h-10 rounded-full border border-slate-100 object-cover">
                            <div>
                                <h4 class="text-xs font-black text-slate-800 uppercase">${profile.full_name || 'Anonymous'}</h4>
                                <p class="text-[9px] font-bold text-slate-400 uppercase">${new Date(post.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                        ${isOwner ? `<button onclick="deleteLoaf(${post.id})" class="text-red-400"><i class="fa-solid fa-trash text-xs"></i></button>` : ''}
                    </div>
                    <p class="text-sm text-slate-700 leading-relaxed mb-6">${post.content}</p>
                    
                    <div class="flex items-center gap-6 pt-4 border-t border-slate-50">
                        <button onclick="handleLike(${post.id}, this, ${isLiked})" class="flex items-center gap-2 ${isLiked ? 'text-pink-500' : 'text-slate-400'}">
                            <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart text-xs"></i>
                            <span class="text-[10px] font-black">${post.likes?.length || 0}</span>
                        </button>
                        <button onclick="window.location.href='/PAGES/post.html?id=${post.id}'" class="flex items-center gap-2 text-slate-400">
                            <i class="fa-regular fa-comment text-xs"></i>
                            <span class="text-[10px] font-black uppercase">Reply</span>
                        </button>
                        <button onclick="handleRepost(${post.id}, ${isReposted})" class="flex items-center gap-2 ${isReposted ? 'text-green-500' : 'text-slate-400'}">
                            <i class="fa-solid fa-retweet text-xs"></i>
                            <span class="text-[10px] font-black">${post.reposts?.length || 0}</span>
                        </button>
                        <button onclick="handleShare(${post.id})" class="text-slate-300 ml-auto">
                            <i class="fa-solid fa-arrow-up-from-bracket text-xs"></i>
                        </button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// --- INTERACTION LOGIC ---
async function handleLike(postId, btn, alreadyLiked) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return showModal("Auth", "Log in to like.", false);
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
    showModal("Success", "Re-loafed!", true);
    renderFeed();
}

function handleShare(postId) {
    const url = `${window.location.origin}/PAGES/post.html?id=${postId}`;
    navigator.clipboard.writeText(url);
    showModal("Terminal", "Link copied!", true);
}

// --- SECTION 3: PROFILE STATS ---
async function loadDashboardStats(userId) {
    const { data: profile } = await supabase.from('profiles').select('full_name, role, avatar_url').eq('id', userId).single();
    if (!profile) return;

    if (document.getElementById('dashName')) document.getElementById('dashName').innerText = profile.full_name;
    if (document.getElementById('dashRole')) document.getElementById('dashRole').innerText = profile.role || 'Professional Napper';
    
    const pfp = document.getElementById('dashPfpLarge');
    if (pfp) pfp.src = profile.avatar_url || '/IMG/Logo.jpeg';

    const { count } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId);
    if (document.getElementById('followerCount')) document.getElementById('followerCount').innerText = count || 0;
}

function checkSavedTheme() {
    if (localStorage.getItem('theme') === 'dark') document.documentElement.classList.add('dark');
}
