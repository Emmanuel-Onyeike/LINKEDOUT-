/**
 * LINKEDOUT IDENTITY ENGINE v2
 * Integrated View/Edit/Sync with Supabase Storage
 */

let selectedFile = null;

document.addEventListener('DOMContentLoaded', async () => {
    await fetchCurrentIdentity();
});

// 1. FETCH & RENDER DATA
async function fetchCurrentIdentity() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return window.location.href = '/PAGES/auth.html';

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, role')
        .eq('id', user.id)
        .single();

    if (profile) {
        // Update UI View State
        document.getElementById('dashName').innerText = profile.full_name || "New Loafer";
        document.getElementById('displayRole').innerText = profile.role || "Professional Loafer";
        
        const pfpUrl = profile.avatar_url || '/IMG/Logo.jpeg';
        document.getElementById('displayPfp').src = pfpUrl;

        // Pre-fill Edit Fields
        document.getElementById('editName').value = profile.full_name || "";
        document.getElementById('editRole').value = profile.role || "";
        
        updateTierBadge('verified');
    }
}

// 2. TOGGLE LOGIC
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
    selectedFile = null; // Clear unsaved file
};

// 3. IMAGE PREVIEW & HANDLING
window.handleFileInput = function(event) {
    selectedFile = event.target.files[0];
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = function() {
        document.getElementById('displayPfp').src = reader.result;
    };
    reader.readAsDataURL(selectedFile);
};

// 4. THE MASTER SAVE FUNCTION
window.saveIdentity = async function() {
    const overlay = document.getElementById('loadingOverlay');
    const newName = document.getElementById('editName').value.trim();
    const newRole = document.getElementById('editRole').value.trim();

    if (!newName) return alert("A name is required to broadcast your signal.");

    overlay.classList.remove('hidden');
    overlay.classList.add('flex');

    const { data: { user } } = await supabase.auth.getUser();
    let finalAvatarUrl = document.getElementById('displayPfp').src;

    // --- STORAGE UPLOAD (Fixed Path) ---
    if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${user.id}.${fileExt}`; 

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, selectedFile, {
                cacheControl: '3600',
                upsert: true 
            });

        if (uploadError) {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
            console.error("Storage Error:", uploadError);
            return alert("PFP Sync Failed: " + uploadError.message);
        }

        const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
        
        finalAvatarUrl = publicUrlData.publicUrl;
    }

    // --- PROFILE UPDATE ---
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            full_name: newName,
            role: newRole,
            avatar_url: finalAvatarUrl,
            updated_at: new Date()
        });

    overlay.classList.add('hidden');
    overlay.classList.remove('flex');

    if (profileError) {
        alert("Identity Sync Failed: " + profileError.message);
    } else {
        document.getElementById('successModal').classList.remove('hidden');
        document.getElementById('successModal').classList.add('flex');
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
