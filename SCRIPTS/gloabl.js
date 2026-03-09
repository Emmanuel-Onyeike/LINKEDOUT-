/**
 * LINKEDOUT GLOBAL IDENTITY SYNC
 * Centralized script to maintain user persistence across all pages.
 */

document.addEventListener('DOMContentLoaded', () => {
    syncAllIdentityElements();
});

function syncAllIdentityElements() {
    // 1. Retrieve Data from LocalStorage
    const savedName = localStorage.getItem('linkedOut_name') || "Loafer #1";
    const savedRole = localStorage.getItem('linkedOut_role') || "Professional Napper @ LinkedOut";
    const savedPfp = localStorage.getItem('linkedOut_pfp') || "/IMG/Logo.jpeg";

    // 2. Identify Target Elements (Across any page)
    const nameElements = document.querySelectorAll('#dashName, #navName, #profileDisplayName');
    const roleElements = document.querySelectorAll('#dashRole, #navRole, #profileDisplayRole');
    const pfpElements = document.querySelectorAll('#dashPfp, #navPfp, #displayPfp');

    // 3. Update Text Content
    nameElements.forEach(el => {
        // Logic: Use full name for profile, but first name for dashboard if desired
        if (el.id === 'dashName') {
            const firstName = savedName.split(' ')[0];
            el.innerText = firstName;
        } else {
            el.innerText = savedName;
        }
    });

    // 4. Update Roles
    roleElements.forEach(el => {
        el.innerText = savedRole;
    });

    // 5. Update Profile Pictures
    pfpElements.forEach(img => {
        img.src = savedPfp;
    });

    console.log(`%c[SYSTEM]: Global Identity Sync Complete for ${savedName}`, "color: #06b6d4; font-weight: bold;");
}