document.addEventListener('DOMContentLoaded', async () => {
    // 1. Safety Guard: Only run if we are actually on the Profile page
    const nameDisplay = document.getElementById('userFullName');
    if (!nameDisplay) return; 

    // 2. Extract User ID from the URL (?id=...)
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('id');

    if (!userId) {
        console.warn("No user ID found, returning to recommendations...");
        window.location.href = '/PAGES/recommendations.html';
        return;
    }

    // 3. Load the Profile Data
    await loadUserProfile(userId);
    
    // 4. Check initial follow status to set button UI
    checkInitialFollowStatus(userId);
});

// --- NOTIFICATION LOGIC ---
async function createFollowNotification(myId, theirId) {
    try {
        const { data: myProfile } = await supabase.from('profiles').select('full_name').eq('id', myId).single();
        const followerName = myProfile ? myProfile.full_name : "A Loafer";

        await supabase.from('notifications').insert([{
            user_id: theirId,
            actor_id: myId,
            type: 'follow',
            content: `${followerName} started following your loafs!`,
            is_read: false
        }]);
    } catch (err) {
        console.error("Notification Error:", err);
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

        // Update UI
        document.getElementById('navUserName').innerText = profile.full_name;
        document.getElementById('userFullName').innerText = profile.full_name;
        document.getElementById('userRole').innerText = profile.role || 'Professional Loafer';
        document.getElementById('userAvatar').src = profile.avatar_url || '/IMG/Logo.jpeg';

        // Load stats (Followers/Following/Loafs)
        await loadProfileStats(userId);

    } catch (err) {
        console.error("Critical Profile Error:", err.message);
    }
}

// --- STATS REFRESH ---
async function loadProfileStats(userId) {
    // Get Follower Count
    const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

    const followerEl = document.getElementById('statFollowers');
    if (followerEl) followerEl.innerText = followers || 0;
    
    // Note: You can add Following/Loaf counts here later using similar logic
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
        const { error } = await supabase
            .from('follows')
            .delete()
            .eq('follower_id', currentUser.id)
            .eq('following_id', targetUserId);

        if (!error) {
            showModalAlert("UNFOLLOWED SUCCESSFULLY");
            updateFollowButtonUI(false);
            loadProfileStats(targetUserId); 
        }
    } else {
        const { error } = await supabase
            .from('follows')
            .insert([{ follower_id: currentUser.id, following_id: targetUserId }]);

        if (!error) {
            await createFollowNotification(currentUser.id, targetUserId);
            showModalAlert("FOLLOWED SUCCESSFULLY");
            updateFollowButtonUI(true);
            loadProfileStats(targetUserId);
        }
    }
}

// Helper to check status on page load
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
