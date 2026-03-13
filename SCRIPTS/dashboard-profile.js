async function toggleProfileMenu() {
    const profileMenu = document.getElementById('profileDropdown');
    const isHidden = profileMenu.classList.contains('hidden');
    
    // Close other overlays
    const loafModal = document.getElementById('loafModalOverlay');
    if (loafModal) loafModal.classList.add('hidden');
    
    if (isHidden) {
        // --- ADDED: Link the "View Profile" button to the current user's ID ---
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

// Improved "Click Outside" Logic
window.addEventListener('click', function(e) {
    const profileMenu = document.getElementById('profileDropdown');
    
    // If menu is open AND the click happened outside the menu AND outside the toggle button
    if (profileMenu && !profileMenu.classList.contains('hidden')) {
        const isClickInsideMenu = profileMenu.contains(e.target);
        const isClickOnToggleButton = e.target.closest('#dashPfpNav') || e.target.closest('.profile-toggle-btn');

        if (!isClickInsideMenu && !isClickOnToggleButton) {
            profileMenu.classList.add('hidden');
            document.body.classList.remove('profile-open');
        }
    }
});
