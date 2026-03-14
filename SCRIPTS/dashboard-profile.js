// --- INITIALIZATION: Runs as soon as the dashboard loads ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error("Auth session missing or error:", authError);
        return;
    }

    // 2. Fix Sidebar Profile Link (safe check)
    const sidebarLink = document.getElementById('dashProfileLink');
    if (sidebarLink) {
        sidebarLink.href = `/PAGES/users.html?id=${user.id}`;
    }

    // 3. Load stats only if we're on a page that needs them
    await loadDashboardStats(user.id);
});

// --- LOAD ALL PROFILE STATS SAFELY ---
async function loadDashboardStats(userId) {
    // Fetch profile data
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, role, avatar_url')
        .eq('id', userId)
        .single();

    if (profileError) {
        console.warn("Could not load profile:", profileError.message);
    }

    // Update name (only if element exists)
    const nameEl = document.getElementById('dashName');
    if (nameEl && profile?.full_name) {
        nameEl.innerText = profile.full_name;
    }

    // Update role
    const roleEl = document.getElementById('dashRole');
    if (roleEl) {
        roleEl.innerText = profile?.role || 'Professional Loafer';
    }

    // Update large profile picture
    const pfpLarge = document.getElementById('dashPfpLarge');
    if (pfpLarge) {
        pfpLarge.src = profile?.avatar_url || '/IMG/Logo.jpeg';
        // Optional: add fallback if image fails to load
        pfpLarge.onerror = () => {
            pfpLarge.src = '/IMG/Logo.jpeg';
        };
    }

    // Fetch & update follower count
    const { count: followers, error: followError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

    if (followError) {
        console.warn("Followers count failed:", followError.message);
    }

    const followerEl = document.getElementById('followerCount');
    if (followerEl) {
        followerEl.innerText = followers || 0;
    }
}

// --- OPTIONAL: Separate follower count function if you still want it ---
async function loadFollowerCount(userId) {
    const followerEl = document.getElementById('followerCount');
    if (!followerEl) return; // ← safety: skip if no element

    const { count, error } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

    if (error) {
        console.error("Error fetching followers:", error.message);
        return;
    }

    followerEl.innerText = count || 0;
}

// --- NEW: Profile Views (safe version) ---
async function loadProfileViews(userId) {
    const viewEl = document.getElementById('viewCount');
    if (!viewEl) return; // ← skip if no element

    const { data, error } = await supabase
        .from('profiles')
        .select('views')
        .eq('id', userId)
        .single();

    if (error) {
        console.error("Error fetching views:", error.message);
        return;
    }

    viewEl.innerText = data?.views || 0;
}

// --- DROPDOWN / MENU LOGIC (unchanged but safer) ---
async function toggleProfileMenu() {
    const profileMenu = document.getElementById('profileDropdown');
    if (!profileMenu) return;

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

// Close menus on outside click
window.addEventListener('click', function(e) {
    const profileMenu = document.getElementById('profileDropdown');
    if (!profileMenu || profileMenu.classList.contains('hidden')) return;

    const clickedInside = profileMenu.contains(e.target);
    const clickedToggle = e.target.closest('#dashPfpNav') || e.target.closest('.profile-toggle-btn');

    if (!clickedInside && !clickedToggle) {
        profileMenu.classList.add('hidden');
        document.body.classList.remove('profile-open');
    }
});
