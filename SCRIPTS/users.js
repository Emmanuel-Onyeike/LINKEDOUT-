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

// --- BACKGROUND NOTIFICATION (Non-blocking) ---
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

        await loadProfileStats(userId);
    } catch (err) {
        console.error("Profile Load Error:", err.message);
    }
}

// --- STATS REFRESH ---
async function loadProfileStats(userId) {
    const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

    const followerEl = document.getElementById('statFollowers');
    if (followerEl) followerEl.innerText = followers || 0;
}

// --- FOLLOW ACTION (Optimized for Speed) ---
async function handleFollowAction() {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const params = new URLSearchParams(window.location.search);
    const targetUserId = params.get('id');

    if (!currentUser) return showModalAlert("LOG IN TO FOLLOW THIS LOAFER");
    if (currentUser.id === targetUserId) return showModalAlert("YOU CANNOT FOLLOW YOURSELF");

    // Check current state
    const { data: existingFollow } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', currentUser.id)
        .eq('following_id', targetUserId)
        .single();

    if (existingFollow) {
        // 1. Update UI Instantly
        updateFollowButtonUI(false);
        
        // 2. Perform DB action
        const { error } = await supabase
            .from('follows')
            .delete()
            .eq('follower_id', currentUser.id)
            .eq('following_id', targetUserId);

        if (error) {
            updateFollowButtonUI(true); // Revert on error
            showModalAlert("ACTION FAILED");
        } else {
            showModalAlert("UNFOLLOWED");
            loadProfileStats(targetUserId); 
        }
    } else {
        // 1. Update UI Instantly
        updateFollowButtonUI(true);
        
        // 2. Perform DB action
        const { error } = await supabase
            .from('follows')
            .insert([{ follower_id: currentUser.id, following_id: targetUserId }]);

        if (error) {
            updateFollowButtonUI(false); // Revert on error
            showModalAlert("FOLLOW FAILED");
        } else {
            showModalAlert("FOLLOWED SUCCESSFULLY");
            loadProfileStats(targetUserId);
            
            // 3. Fire-and-forget notification (No 'await' so it doesn't lag the UI)
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
