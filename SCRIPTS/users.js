document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get('id');

    if (!targetUserId) {
        window.location.href = '/PAGES/recommendations.html';
        return;
    }

    await loadUserProfile(targetUserId);
});

async function loadUserProfile(userId) {
    // 1. Fetch User Info
    const { data: user, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error || !user) {
        console.error("User not found");
        return;
    }

    // 2. Update UI
    document.getElementById('navUserName').innerText = user.full_name;
    document.getElementById('userFullName').innerText = user.full_name;
    document.getElementById('userRole').innerText = user.role || 'Professional Loafer';
    document.getElementById('userAvatar').src = user.avatar_url || '/IMG/Logo.jpeg';

    // 3. Fetch Follower Counts (Uses the table we discussed)
    const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

    document.getElementById('statFollowers').innerText = followers || 0;
}
