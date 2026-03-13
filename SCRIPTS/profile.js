/**
 * LINKEDOUT IDENTITY ENGINE
 * Manages Profile Viewing, Editing, and Supabase Sync
 */

document.addEventListener('DOMContentLoaded', async () => {
    await fetchCurrentIdentity();
});

// 1. FETCH DATA FROM SUPABASE
async function fetchCurrentIdentity() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return window.location.href = '/SCRIPTS/auth.js';

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, role') // Ensure 'role' column exists in SQL
        .eq('id', user.id)
        .single();

    if (profile) {
        // Update View State
        document.getElementById('dashName').innerText = profile.full_name || "New Loafer";
        document.getElementById('displayRole').innerText = profile.role || "Professional Loafer";
        if (profile.avatar_url) document.getElementById('displayPfp').src = profile.avatar_url;

        // Pre-fill Edit Inputs
        document.getElementById('editName').value = profile.full_name || "";
        document.getElementById('editRole').value = profile.role || "";
        
        // Update Tier Badge
        updateTierBadge('verified');
    }
}

// 2. TOGGLE EDIT MODE
window.enableEditMode = function() {
    document.getElementById('viewState').classList.add('hidden');
    document.getElementById('editState').classList.remove('hidden');
    document.getElementById('actionControls').classList.remove('hidden');
    document.getElementById('pfpUploadBtn').classList.remove('hidden');
    document.getElementById('pfpUploadBtn').classList.add('flex');
    document.getElementById('editBtn').classList.add('hidden');
};

window.cancelEdit = function() {
    document.getElementById('viewState').classList.remove('hidden');
    document.getElementById('editState').classList.add('hidden');
    document.getElementById('actionControls').classList.add('hidden');
    document.getElementById('pfpUploadBtn').classList.add('hidden');
    document.getElementById('pfpUploadBtn').classList.remove('flex');
    document.getElementById('editBtn').classList.remove('hidden');
};

// 3. SAVE TO SUPABASE
window.saveIdentity = async function() {
    const overlay = document.getElementById('loadingOverlay');
    const newName = document.getElementById('editName').value.trim();
    const newRole = document.getElementById('editRole').value.trim();

    if (!newName) return alert("Name is required.");

    overlay.classList.remove('hidden');
    overlay.classList.add('flex');

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            full_name: newName,
            role: newRole,
            updated_at: new Date()
        });

    overlay.classList.add('hidden');
    overlay.classList.remove('flex');

    if (error) {
        console.error(error);
        alert("Sync Failed: " + error.message);
    } else {
        // Show the success modal you have in your HTML
        document.getElementById('successModal').classList.remove('hidden');
        document.getElementById('successModal').classList.add('flex');
    }
};

// 4. PREVIEW IMAGE (Local only until save)
window.previewImage = function(event) {
    const reader = new FileReader();
    reader.onload = function() {
        const output = document.getElementById('displayPfp');
        output.src = reader.result;
    };
    reader.readAsDataURL(event.target.files[0]);
};

function updateTierBadge(status) {
    const badge = document.getElementById('tierBadge');
    const text = document.getElementById('tierText');
    if (status === 'verified') {
        badge.className = "inline-flex items-center gap-2 px-3 py-1.5 rounded-full mt-3 bg-blue-50 text-blue-600 border border-blue-100";
        text.innerText = "Verified Identity";
    }
}
