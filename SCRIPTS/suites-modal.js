// suites-modal.js - LinkedOut Suites Dropdown (V1)
window.toggleLinkedOutModalV1 = function(e) {
    if (e) e.preventDefault();

    const overlay = document.getElementById('linkedOutModalOverlayV1');
    const content = document.getElementById('linkedOutDropdownV1');

    if (!overlay) {
        console.error("Modal Overlay 'linkedOutModalOverlayV1' not found");
        return;
    }

    const isOpening = overlay.classList.contains('hidden');

    if (isOpening) {
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');

        requestAnimationFrame(() => {
            overlay.classList.add('opacity-100');
            if (content) {
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }
        });

        document.body.style.overflow = 'hidden';
    } else {
        overlay.classList.remove('opacity-100');
        if (content) {
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
        }

        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
            document.body.style.overflow = '';
        }, 300);
    }
};

// Wire the button safely after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('suitesTriggerBtnV1');
    if (btn) {
        btn.addEventListener('click', toggleLinkedOutModalV1);
        console.log("Suites button wired (event listener)");
    } else {
        console.warn("Suites trigger button not found in DOM");
    }
});
