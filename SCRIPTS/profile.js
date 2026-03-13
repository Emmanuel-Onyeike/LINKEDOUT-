/**
 * LINKEDOUT IDENTITY ENGINE v2.2
 * Final Path Fix & Auth Script Routing
 */

let selectedFile = null;

document.addEventListener('DOMContentLoaded', async () => {
    await fetchCurrentIdentity();
});

async function fetchCurrentIdentity() {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Redirect to your auth script if no user is found
    if (!user) return window.location.href = '/SCRIPTS/auth.js';

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, role')
        .eq('id', user.id)
        .single();

    if (profile) {
        document.getElementById('dashName').innerText = profile.full_name || "New Loafer";
        document.getElementById('displayRole').innerText = profile.role || "Professional Loafer";
        
        // Cache-busting timestamp ensures the new image shows immediately
        const pfpUrl = profile.avatar_url ? `${profile.avatar_url}?t=${Date.now()}` : '/IMG/Logo.jpeg';
        document.getElementById('displayPfp').src = pfpUrl;

        document.getElementById('editName').value = profile.full_name || "";
        document.getElementById('editRole').value = profile.role || "";
        
        updateTierBadge('verified');
    }
}

// TOGGLE UI MODES
window.enableEditMode = function() {
    document.getElementById('viewState').classList.add('hidden');
    document.getElementById('editState').classList.remove('hidden');
    document.getElementById('actionControls').classList.remove('hidden');
    document.getElementById('pfpUploadBtn').classList.replace('hidden', 'flex');
    document.getElementById('editBtn').classList.add('hidden');
};

window.cancelEdit = function() {
    document.getElementById('viewState').classList.remove('hidden');
    document.getElementById('editState').classList.add('hidden');
    document.getElementById('actionControls').classList.add('hidden');
    document.getElementById('pfpUploadBtn').classList.replace('flex', 'hidden');
    document.getElementById('editBtn').classList.remove('hidden');
    selectedFile = null;
};

// PREVIEW SELECTION
window.handleFileInput = function(event) {
    selectedFile = event.target.files[0];
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (e) => document.getElementById('displayPfp').src = e.target.result;
    reader.readAsDataURL(selectedFile);
};

// MASTER SYNC FUNCTION
window.saveIdentity = async function() {
    const overlay = document.getElementById('loadingOverlay');
    const newName = document.getElementById('editName').value.trim();
    const newRole = document.getElementById('editRole').value.trim();

    if (!newName) return alert("Identity requires a name.");

    overlay.classList.replace('hidden', 'flex');

    const { data: { user } } = await supabase.auth.getUser();
    let finalAvatarUrl = document.getElementById('displayPfp').src.split('?')[0];

    // --- STORAGE UPLOAD (DIRECT ROOT) ---
    if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${user.id}.${fileExt}`; 

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, selectedFile, { upsert: true });

        if (uploadError) {
            overlay.classList.replace('flex', 'hidden');
            console.error("Storage Error:", uploadError);
            return alert("PFP Sync Failed: " + uploadError.message);
        }

        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        finalAvatarUrl = publicUrlData.publicUrl;
    }

    // --- PROFILES TABLE SYNC ---
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            full_name: newName,
            role: newRole,
            avatar_url: finalAvatarUrl,
            updated_at: new Date()
        });

    overlay.classList.replace('flex', 'hidden');

    if (profileError) {
        alert("Sync Failed: " + profileError.message);
    } else {
        document.getElementById('successModal').classList.replace('hidden', 'flex');
        selectedFile = null;
    }
};

function updateTierBadge(status) {
    const badge = document.getElementById('tierBadge');
    const text = document.getElementById('tierText');
    if (status === 'verified' && badge && text) {
        badge.className = "inline-flex items-center gap-2 px-3 py-1.5 rounded-full mt-3 bg-blue-50 text-blue-600 border border-blue-100";
        text.innerText = "Verified Identity";
    }
}
