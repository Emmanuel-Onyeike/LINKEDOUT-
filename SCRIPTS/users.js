/**
 * LINKEDOUT PROFILE ENGINE - COMPLETE
 * Handles: Profile Data, Follows, Stats, and View Recording
 */

// --- UTILS: GLOBAL ALERT ---
function showModalAlert(message) {
    const modal = document.getElementById('alertModal');
    const messageEl = document.getElementById('alertMessage');
    
    if (modal && messageEl) {
        messageEl.innerText = message;
        modal.classList.remove('hidden');
        modal.classList.add('flex'); 
    } else {
        alert(message);
    }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('id');

    if (!userId) {
        window.location.href = '/PAGES/recommendations.html';
        return;
    }

    // 1. Record the Profile View (New Logic)
    await recordProfileView(userId);

    // 2. Load Profile Content
    await loadUserProfile(userId);
    checkInitialFollowStatus(userId);
    loadUserLoafs(userId);
});

// --- NEW: RECORD PROFILE VIEW ---
async function recordProfileView(targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Safety: Don't count if the user is looking at their own profile
    if (user && user.id === targetUserId) return;

    // Call the SQL function we created to increment views
    const { error } = await supabase.rpc('increment_profile_views', { 
        target_id: targetUserId 
    });

    if (error) console.error("Terminal: View log failed", error.message);
}

// --- PROFILE DATA ---
async function loadUserProfile(userId) {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !profile) {
            const nameDisplay = document.getElementById('userFullName');
            if (nameDisplay) nameDisplay.innerText = "User Not Found";
            return;
        }

        // Update UI
        const elements = {
            'navUserName': profile.full_name,
            'userFullName': profile.full_name,
            'userRole': profile.role || 'Professional Loafer',
            'userAvatar': profile.avatar_url || '/IMG/Logo.jpeg'
        };

        for (const [id, val] of Object.entries(elements)) {
            const el = document.getElementById(id);
            if (el) {
                if (id === 'userAvatar') el.src = val;
                else el.innerText = val;
            }
        }

        await loadProfileStats(userId);
    } catch (err) {
        console.error("Profile Load Error:", err.message);
    }
}

// --- STATS REFRESH (Followers + Impressions + Views) ---
async function loadProfileStats(userId) {
    // 1. Fetch Follower/Following Counts
    const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

    const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);

    // 2. Fetch Views from Profile
    const { data: viewData } = await supabase
        .from('profiles')
        .select('views')
        .eq('id', userId)
        .single();

    // 3. Calculate Impressions (Likes + Reposts on user's posts)
    const { data: posts } = await supabase
        .from('posts')
        .select('id, likes(count), reposts(count)')
        .eq('user_id', userId);

    let totalImpressions = 0;
    posts?.forEach(p => {
        totalImpressions += (p.likes?.[0]?.count || 0) + (p.reposts?.[0]?.count || 0);
    });

    // Update UI Elements
    const updateText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val || 0;
    };

    updateText('statFollowers', followers);
    updateText('statFollowing', following);
    updateText('viewCount', viewData?.views);
    updateText('impressionCount', totalImpressions);
}

// --- LOAD USER LOAFS ---
async function loadUserLoafs(userId) {
    const streamContainer = document.getElementById('userLoafStream');
    try {
        const { data: posts, error } = await supabase
            .from('posts')
            .select(`*, profiles (full_name, avatar_url)`)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Update local badges
        const badge = document.getElementById('loafCountBadge');
        if (badge) badge.innerText = `${posts.length} POSTS`;

        if (posts.length === 0) {
            streamContainer.innerHTML = `<div class="py-12 text-center opacity-50 text-[10px] font-black uppercase">Zero transmissions found.</div>`;
            return;
        }

        streamContainer.innerHTML = posts.map(post => {
            const postDate = new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return `
                <div class="bg-white border border-slate-100 p-6 rounded-[2rem] transition-all hover:shadow-xl">
                    <div class="flex items-center gap-3 mb-4">
                        <img src="${post.profiles.avatar_url || '/IMG/Logo.jpeg'}" class="w-8 h-8 rounded-full object-cover">
                        <div>
                            <h4 class="text-[10px] font-black uppercase">${post.profiles.full_name}</h4>
                            <p class="text-[8px] font-bold text-slate-400">${postDate}</p>
                        </div>
                    </div>
                    <p class="text-sm text-slate-600 leading-relaxed pl-2 border-l-2 border-slate-50">${post.content}</p>
                </div>`;
        }).join('');
    } catch (err) {
        console.error("Loaf Stream Error:", err);
    }
}

// --- FOLLOW ACTION ---
async function handleFollowAction() {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const params = new URLSearchParams(window.location.search);
    const targetUserId = params.get('id');

    if (!currentUser) return showModalAlert("LOG IN TO FOLLOW THIS LOAFER");
    if (currentUser.id === targetUserId) return showModalAlert("YOU CANNOT FOLLOW YOURSELF");

    const { data: existingFollow } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', currentUser.id)
        .eq('following_id', targetUserId)
        .single();

    if (existingFollow) {
        await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', targetUserId);
        showModalAlert("UNFOLLOWED");
    } else {
        await supabase.from('follows').insert([{ follower_id: currentUser.id, following_id: targetUserId }]);
        showModalAlert("FOLLOWED SUCCESSFULLY");
        createFollowNotification(currentUser.id, targetUserId);
    }
    
    loadProfileStats(targetUserId);
    checkInitialFollowStatus(targetUserId);
}

async function checkInitialFollowStatus(targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('follows').select('*').eq('follower_id', user.id).eq('following_id', targetUserId).single();
    updateFollowButtonUI(!!data);
}

function updateFollowButtonUI(isFollowing) {
    const btn = document.getElementById('followBtn');
    if (!btn) return;
    btn.innerHTML = isFollowing ? '<i class="fa-solid fa-user-check mr-2"></i> FOLLOWING' : '<i class="fa-solid fa-user-plus mr-2"></i> FOLLOW';
    btn.className = isFollowing ? "px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all bg-slate-100 text-slate-600" : "px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all bg-cyan-500 text-white";
}
