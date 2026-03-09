// recommendations.js - LinkedOut Discovery Logic

document.addEventListener('DOMContentLoaded', () => {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('userSearch');

    // 1. FILTER SELECTION LOGIC
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add to clicked
            btn.classList.add('active');
            
            const filterType = btn.getAttribute('data-filter');
            console.log(`📡 Scanning for: ${filterType}`);
            // Logic to fetch/filter will go here
        });
    });

    // 2. SEARCH INPUT LOGIC
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        if(query.length > 0) {
            console.log(`🔍 Searching Grid for: ${query}`);
        }
    });
});