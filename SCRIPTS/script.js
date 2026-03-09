/**
 * LinkedOut Core Logic
 * Handles all central modal alerts for the Tech Nxxt Beta.
 */

function triggerAlert(title, message) {
    const modal = document.getElementById('globalModal');
    const titleElement = document.getElementById('modalTitle');
    const bodyElement = document.getElementById('modalBody');

    // Update content
    titleElement.innerText = title;
    bodyElement.innerText = message;

    // Show modal
    modal.classList.remove('hidden');
    
    // Log for debugging
    console.log(`Alert Triggered: ${title}`);
}

function closeModal() {
    const modal = document.getElementById('globalModal');
    
    // Hide modal
    modal.classList.add('hidden');
}

// Close modal if user clicks outside of the white box
window.onclick = function(event) {
    const modal = document.getElementById('globalModal');
    if (event.target == modal) {
        closeModal();
    }
}
// SIDE MENU LOGIC
function toggleSideMenu() {
    const sideMenu = document.getElementById('sideMenu');
    // We toggle the 'active' class to trigger the CSS transform
    if (sideMenu.classList.contains('active')) {
        sideMenu.classList.remove('active');
        setTimeout(() => sideMenu.classList.add('hidden'), 300); // Hide after animation
    } else {
        sideMenu.classList.remove('hidden');
        // Small delay to allow the removal of 'hidden' to register before animating
        setTimeout(() => sideMenu.classList.add('active'), 10);
    }
}

// CENTRAL MODAL LOGIC (Existing)
function triggerAlert(title, message) {
    // If side menu is open, close it first so it doesn't overlap
    const sideMenu = document.getElementById('sideMenu');
    if (sideMenu.classList.contains('active')) toggleSideMenu();

    const modal = document.getElementById('globalModal');
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalBody').innerText = message;
    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('globalModal').classList.add('hidden');
}

// Close modals on outside click
window.onclick = function(event) {
    const globalModal = document.getElementById('globalModal');
    const sideMenu = document.getElementById('sideMenu');
    
    if (event.target == globalModal) closeModal();
    if (event.target == sideMenu) toggleSideMenu();
}