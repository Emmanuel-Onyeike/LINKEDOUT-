function toggleProfileMenu() {
    const profileMenu = document.getElementById('profileDropdown');
    const isHidden = profileMenu.classList.contains('hidden');
    
    // Close other menus first
    document.getElementById('loafModalOverlay').classList.add('hidden');
    
    if (isHidden) {
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
    const profileBtn = e.target.closest('button');
    
    if (profileMenu && !profileMenu.classList.contains('hidden')) {
        // If the click is not on the menu and not on the profile button
        if (!e.target.closest('#profileDropdown') && !e.target.closest('button')) {
            profileMenu.classList.add('hidden');
            document.body.classList.remove('profile-open');
        }
    }
});