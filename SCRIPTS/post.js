// On Load: Check for Napping Status from Settings
document.addEventListener('DOMContentLoaded', () => {
    const isNapping = localStorage.getItem('nappingMode');
    const badge = document.getElementById('statusBadge');
    
    if (isNapping === 'enabled' && badge) {
        badge.classList.remove('hidden');
    }
});

// Character Counter Logic
const postInput = document.getElementById('postInput');
const charCounter = document.getElementById('charCounter');

postInput.addEventListener('input', () => {
    const length = postInput.value.length;
    charCounter.innerText = `${length} / 280`;

    if (length > 280) {
        charCounter.classList.add('limit-reached');
    } else {
        charCounter.classList.remove('limit-reached');
    }
});

// Image Preview Logic
function previewImage(event) {
    const reader = new FileReader();
    reader.onload = function() {
        const output = document.getElementById('imagePreview');
        const container = document.getElementById('imagePreviewContainer');
        output.src = reader.result;
        container.classList.remove('hidden');
    };
    reader.readAsDataURL(event.target.files[0]);
}

function clearMedia() {
    document.getElementById('imagePreviewContainer').classList.add('hidden');
    document.getElementById('fileInput').value = '';
}

// Publish Logic
function handlePublish() {
    const content = postInput.value.trim();
    
    if (!content) {
        triggerAlert('Error', 'You can\'t post an empty loaf. Write something lazy!', '✍️');
        return;
    }

    if (content.length > 280) {
        triggerAlert('Too Long', 'This post is too productive. Keep it under 280 chars.', '⏳');
        return;
    }

    // Success Sequence
    triggerAlert('Success', 'Loaf posted! Redirecting to feed...', '🚀');
    
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 2000);
}

// Modal System
function triggerAlert(title, content, emoji = '🔔') {
    const modal = document.getElementById('globalModal');
    document.getElementById('modalTitle').innerText = `${emoji} ${title}`;
    document.getElementById('modalBody').innerHTML = content;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeGlobalModal() {
    document.getElementById('globalModal').classList.add('hidden');
    document.getElementById('globalModal').classList.remove('flex');
}
// post.js

function handlePublish() {
    const postInput = document.getElementById('postInput');
    const content = postInput.value.trim();
    const imagePreview = document.getElementById('imagePreview').src;
    const hasImage = !document.getElementById('imagePreviewContainer').classList.contains('hidden');

    if (!content && !hasImage) {
        triggerAlert('Error', 'You can\'t post an empty loaf. Write something lazy!', '✍️');
        return;
    }

    // Create the Post Object
    const newPost = {
        id: Date.now(),
        author: "Loafer #1",
        handle: "@loafer_one",
        text: content,
        image: hasImage ? imagePreview : null,
        timestamp: "Just now",
        likes: 0
    };

    // Get existing posts or start new array
    const existingPosts = JSON.parse(localStorage.getItem('userPosts')) || [];
    existingPosts.unshift(newPost); // Add to the top
    localStorage.setItem('userPosts', JSON.stringify(existingPosts));

    // Success Sequence
    triggerAlert('Success', 'Loaf posted! Redirecting to feed...', '🚀');
    
    setTimeout(() => {
        window.location.href = '/PAGES/dashboard.html';
    }, 1500);
}

// post.js

function triggerAISubscribe() {
    // 1. Show the centered modal as requested
    triggerAlert(
        'AI Enhancement', 
        'Subscribe to LinkedOut Pro to feel more comfortable and unlock AI-powered loafing tools.', 
        '✨'
    );

    // 2. Auto-redirection after 2 seconds
    // This gives the user enough time to read the modal message
    setTimeout(() => {
        window.location.href = 'subscription.html';
    }, 2000);
}