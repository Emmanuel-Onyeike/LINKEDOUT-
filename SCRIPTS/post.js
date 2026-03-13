// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Check for Napping Status
    const isNapping = localStorage.getItem('nappingMode');
    const badge = document.getElementById('statusBadge');
    if (isNapping === 'enabled' && badge) {
        badge.classList.remove('hidden');
    }

    // Character Counter
    const postInput = document.getElementById('postInput');
    const charCounter = document.getElementById('charCounter');
    if (postInput) {
        postInput.addEventListener('input', () => {
            const length = postInput.value.length;
            charCounter.innerText = `${length} / 280`;
            length > 280 ? charCounter.classList.add('text-red-500') : charCounter.classList.remove('text-red-500');
        });
    }
});

// --- MEDIA PREVIEW ---
function previewImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function() {
        const output = document.getElementById('imagePreview');
        const container = document.getElementById('imagePreviewContainer');
        output.src = reader.result;
        container.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function clearMedia() {
    document.getElementById('imagePreviewContainer').classList.add('hidden');
    document.getElementById('fileInput').value = '';
}

// --- DATABASE: PUBLISH LOAF ---
async function handlePublish() {
    const postInput = document.getElementById('postInput');
    const content = postInput.value.trim();
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return triggerAlert('Auth Required', 'Log in to transmit a loaf.', '🔐');

    if (!content && !file) {
        return triggerAlert('Error', 'You can\'t post an empty loaf. Write something lazy!', '✍️');
    }

    try {
        let imageUrl = null;

        // 2. Handle Image Upload (Optional)
        if (file) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `post-images/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('posts') // Ensure you have a 'posts' bucket in Supabase Storage
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: publicUrl } = supabase.storage.from('posts').getPublicUrl(filePath);
            imageUrl = publicUrl.publicUrl;
        }

        // 3. Insert into Supabase
        const { error: insertError } = await supabase
            .from('posts')
            .insert([{
                user_id: user.id,
                content: content,
                image_url: imageUrl,
                created_at: new Date()
            }]);

        if (insertError) throw insertError;

        // 4. Success Sequence
        triggerAlert('Success', 'Loaf transmitted successfully! Synchronizing feed...', '🚀');
        setTimeout(() => {
            window.location.href = '/PAGES/dashboard.html';
        }, 1500);

    } catch (err) {
        console.error("Publish Error:", err.message);
        triggerAlert('System Error', 'Failed to connect to the central terminal.', '❌');
    }
}

// --- ANALYTICS: VIEW COUNTER ---
async function incrementPostView(postId) {
    // RPC requires a Postgres function 'increment_post_views' to be created first
    const { error } = await supabase.rpc('increment_post_views', { target_post_id: postId });
    if (error) console.error("View Count Error:", error.message);
}

// --- SUBSCRIPTION ---
function triggerAISubscribe() {
    triggerAlert('AI Enhancement', 'Subscribe to LinkedOut Pro to unlock AI-powered loafing tools.', '✨');
    setTimeout(() => {
        window.location.href = 'subscription.html';
    }, 2000);
}

// --- MODAL SYSTEM (Centered as per 2025-12-21 Rule) ---
function triggerAlert(title, content, emoji = '🔔') {
    const modal = document.getElementById('globalModal');
    const titleEl = document.getElementById('modalTitle');
    const bodyEl = document.getElementById('modalBody');
    
    if (modal && titleEl && bodyEl) {
        titleEl.innerText = `${emoji} ${title}`;
        bodyEl.innerHTML = content;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    } else {
        alert(`${emoji} ${title}: ${content}`);
    }
}

function closeGlobalModal() {
    const modal = document.getElementById('globalModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}
