document.addEventListener('DOMContentLoaded', async () => {
    // 1. Safety Guard: Only run if we are actually on the Profile page
    const nameDisplay = document.getElementById('userFullName');
    if (!nameDisplay) return; 

    // 2. Extract User ID from the URL (?id=...)
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('id');

    // 3. If no ID is found, redirect back to recommendations to avoid a blank page
    if (!userId) {
        console.warn("No user ID found, returning to recommendations...");
        window.location.href = '/PAGES/recommendations.html';
        return;
    }

    // 4. Load the Profile Data
    await loadUserProfile(userId);
});

async function loadUserProfile(userId) {
    try {
        // Fetch profile info from the 'profiles' table
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !profile) {
            document.getElementById('userFullName').innerText = "User Not Found";
            return;
        }

        // Update UI with Profile Data
        document.getElementById('navUserName').innerText = profile.full_name;
        document.getElementById('userFullName').innerText = profile.full_name;
        document.getElementById('userRole').innerText = profile.role || 'Professional Loafer';
        document.getElementById('userAvatar').src = profile.avatar_url || '/IMG/Logo.jpeg';

        // 5. Fetch Follower Counts (from the 'follows' table)
        const { count: followers, error: followError } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', userId);

        if (!followError) {
            document.getElementById('statFollowers').innerText = followers || 0;
        }

    } catch (err) {
        console.error("Critical Profile Error:", err.message);
    }
}
async function toggleFollow(targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return showModalAlert("Please sign in to follow others.");
    if (user.id === targetUserId) return showModalAlert("You cannot follow yourself!");

    // 1. Check if already following
    const { data: existingFollow } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .single();

    if (existingFollow) {
        // --- UNFOLLOW LOGIC ---
        const { error } = await supabase
            .from('follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', targetUserId);

        if (!error) {
            showModalAlert("Unfollowed successfully.");
            // Refresh counts if on dashboard/profile
            if (typeof loadFollowerCount === 'function') loadFollowerCount(targetUserId);
        }
    } else {
        // --- FOLLOW LOGIC ---
        const { error } = await supabase
            .from('follows')
            .insert([{ follower_id: user.id, following_id: targetUserId }]);

        if (!error) {
            // 2. CREATE NOTIFICATION
            await createFollowNotification(user.id, targetUserId);
            showModalAlert("Followed successfully!");
            if (typeof loadFollowerCount === 'function') loadFollowerCount(targetUserId);
        }
    }
}
// This function runs when someone clicks the Follow button on users.html
async function handleFollowAction() {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    // 1. Get the ID of the profile being viewed from the URL
    const params = new URLSearchParams(window.location.search);
    const targetUserId = params.get('id');

    if (!currentUser) return showModalAlert("LOG IN TO FOLLOW THIS LOAFER");
    if (currentUser.id === targetUserId) return showModalAlert("YOU CANNOT FOLLOW YOURSELF");

    // 2. Check if already following
    const { data: existingFollow } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', currentUser.id)
        .eq('following_id', targetUserId)
        .single();

    const followBtn = document.getElementById('followBtn');

    if (existingFollow) {
        // --- UNFOLLOW ---
        const { error } = await supabase
            .from('follows')
            .delete()
            .eq('follower_id', currentUser.id)
            .eq('following_id', targetUserId);

        if (!error) {
            showModalAlert("UNFOLLOWED SUCCESSFULLY");
            updateFollowButtonUI(false);
            // Refresh the follower count on the page
            loadProfileStats(targetUserId); 
        }
    } else {
        // --- FOLLOW ---
        const { error } = await supabase
            .from('follows')
            .insert([{ follower_id: currentUser.id, following_id: targetUserId }]);

        if (!error) {
            // Send the notification alert
            await createFollowNotification(currentUser.id, targetUserId);
            showModalAlert("FOLLOWED SUCCESSFULLY");
            updateFollowButtonUI(true);
            loadProfileStats(targetUserId);
        }
    }
}

// Simple function to change the button look instantly
function updateFollowButtonUI(isFollowing) {
    const btn = document.getElementById('followBtn');
    if (!btn) return;
    
    if (isFollowing) {
        btn.innerHTML = '<i class="fa-solid fa-user-check mr-2"></i> FOLLOWING';
        btn.classList.add('bg-slate-100', 'text-slate-600');
        btn.classList.remove('bg-cyan-500', 'text-white');
    } else {
        btn.innerHTML = '<i class="fa-solid fa-user-plus mr-2"></i> FOLLOW';
        btn.classList.add('bg-cyan-500', 'text-white');
        btn.classList.remove('bg-slate-100', 'text-slate-600');
    }
}
