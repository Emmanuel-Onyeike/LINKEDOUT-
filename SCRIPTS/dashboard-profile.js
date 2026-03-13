// --- INITIALIZATION: Runs as soon as the dashboard loads ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Get the current logged-in user from Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        console.error("Auth session missing");
        return;
    }

    // 2. Fix the Sidebar Profile Card Link
    const sidebarLink = document.getElementById('dashProfileLink');
    if (sidebarLink) {
        // This swaps the "#" for the real URL so the click works immediately
        sidebarLink.href = `/PAGES/users.html?id=${user.id}`;
    }

    // 3. Load Profile Stats (Followers, Views, etc.)
    await loadDashboardStats(user.id);
});

// --- LOAD STATS: Fills in the numbers on your profile card ---
async function loadDashboardStats(userId) {
    // Fetch profile data
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, avatar_url')
        .eq('id', userId)
        .single();

    if (profile) {
        document.getElementById('dashName').innerText = profile.full_name;
        document.getElementById('dashRole').innerText = profile.role || 'Professional Loafer';
        document.getElementById('dashPfpLarge').src = profile.avatar_url || '/IMG/Logo.jpeg';
    }

    // Fetch Follower Count
    const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

    if (document.getElementById('followerCount')) {
        document.getElementById('followerCount').innerText = followers || 0;
    }
}

// --- YOUR DROPDOWN LOGIC (Kept exactly as it was) ---
async function toggleProfileMenu() {
    const profileMenu = document.getElementById('profileDropdown');
    const isHidden = profileMenu.classList.contains('hidden');
    
    const loafModal = document.getElementById('loafModalOverlay');
    if (loafModal) loafModal.classList.add('hidden');
    
    if (isHidden) {
        const { data: { user } } = await supabase.auth.getUser();
        const viewProfileBtn = profileMenu.querySelector('a[href*="users.html"]');
        if (user && viewProfileBtn) {
            viewProfileBtn.href = `/PAGES/users.html?id=${user.id}`;
        }

        profileMenu.classList.remove('hidden');
        document.body.classList.add('profile-open');
    } else {
        profileMenu.classList.add('hidden');
        document.body.classList.remove('profile-open');
    }
}

// Close menus when clicking outside
window.addEventListener('click', function(e) {
    const profileMenu = document.getElementById('profileDropdown');
    if (profileMenu && !profileMenu.classList.contains('hidden')) {
        const isClickInsideMenu = profileMenu.contains(e.target);
        const isClickOnToggleButton = e.target.closest('#dashPfpNav') || e.target.closest('.profile-toggle-btn');

        if (!isClickInsideMenu && !isClickOnToggleButton) {
            profileMenu.classList.add('hidden');
            document.body.classList.remove('profile-open');
        }
    }
});
