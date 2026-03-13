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
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Safety Check: Only run if these elements exist on the page
    const nameDisplay = document.getElementById('userFullName');
    if (!nameDisplay) return; 

    // 2. Get the ID from the URL
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('id');

    if (!userId) {
        console.error("No user ID provided in URL");
        return;
    }

    // 3. Fetch Data
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error || !profile) {
        nameDisplay.innerText = "User Not Found";
        return;
    }

    // 4. Update UI
    document.getElementById('navUserName').innerText = profile.full_name;
    document.getElementById('userFullName').innerText = profile.full_name;
    document.getElementById('userRole').innerText = profile.role || 'Professional Loafer';
    document.getElementById('userAvatar').src = profile.avatar_url || '/IMG/Logo.jpeg';
});
