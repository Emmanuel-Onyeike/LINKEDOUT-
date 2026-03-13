document.addEventListener('DOMContentLoaded', async () => {
    const nameDisplay = document.getElementById('userFullName');
    if (!nameDisplay) return; 

    const params = new URLSearchParams(window.location.search);
    const userId = params.get('id');

    if (!userId) {
        window.location.href = '/PAGES/recommendations.html';
        return;
    }

    await loadUserProfile(userId);
    checkInitialFollowStatus(userId);
});

// --- BACKGROUND NOTIFICATION ---
async function createFollowNotification(myId, theirId) {
    try {
        const { data: myProfile } = await supabase.from('profiles').select('full_name').eq('id', myId).single();
        const followerName = myProfile?.full_name || "A Loafer";

        await supabase.from('notifications').insert([{
            user_id: theirId,
            actor_id: myId,
            type: 'follow',
            content: `${followerName} started following your loafs!`,
            is_read: false
        }]);
    } catch (err) {
        console.warn("Notification failed in background:", err);
    }
}

// --- PROFILE LOADING ---
async function loadUserProfile(userId) {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !profile) {
            document.getElementById('userFullName').innerText = "User Not Found";
            return;
        }

        document.getElementById('navUserName').innerText = profile.full_name;
        document.getElementById('userFullName').innerText = profile.full_name;
        document.getElementById('userRole').innerText = profile.role || 'Professional Loafer';
        document.getElementById('userAvatar').src = profile.avatar_url || '/IMG/Logo.jpeg';

        // Load both Followers and Following counts
        await loadProfileStats(userId);
    } catch (err) {
        console.error("Profile Load Error:", err.message);
    }
}

// --- STATS REFRESH (Fixed for both Followers & Following) ---
async function loadProfileStats(userId) {
    // 1. Get Followers (People following THIS user)
    const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

    // 2. Get Following (People THIS user follows)
    const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);

    // Update UI Elements
    const followerEl = document.getElementById('statFollowers');
    const followingEl = document.getElementById('statFollowing');

    if (followerEl) followerEl.innerText = followers || 0;
    if (followingEl) followingEl.innerText = following || 0;
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
        updateFollowButtonUI(false);
        const { error } = await supabase
            .from('follows')
            .delete()
            .eq('follower_id', currentUser.id)
            .eq('following_id', targetUserId);

        if (error) {
            updateFollowButtonUI(true);
            showModalAlert("ACTION FAILED");
        } else {
            showModalAlert("UNFOLLOWED");
            // Refresh counts for the profile owner
            loadProfileStats(targetUserId); 
        }
    } else {
        updateFollowButtonUI(true);
        const { error } = await supabase
            .from('follows')
            .insert([{ follower_id: currentUser.id, following_id: targetUserId }]);

        if (error) {
            updateFollowButtonUI(false);
            showModalAlert("FOLLOW FAILED");
        } else {
            showModalAlert("FOLLOWED SUCCESSFULLY");
            // Refresh counts for the profile owner
            loadProfileStats(targetUserId);
            createFollowNotification(currentUser.id, targetUserId);
        }
    }
}

async function checkInitialFollowStatus(targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .single();

    updateFollowButtonUI(!!data);
}

function updateFollowButtonUI(isFollowing) {
    const btn = document.getElementById('followBtn');
    if (!btn) return;
    
    if (isFollowing) {
        btn.innerHTML = '<i class="fa-solid fa-user-check mr-2"></i> FOLLOWING';
        btn.className = "px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all bg-slate-100 text-slate-600";
    } else {
        btn.innerHTML = '<i class="fa-solid fa-user-plus mr-2"></i> FOLLOW';
        btn.className = "px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all bg-cyan-500 text-white";
    }
}
