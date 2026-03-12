/**
 * LINKEDOUT DASHBOARD v5.1 - FIXED Feed Embed + Modal Safety
 * Handlers: Feed Engine, Community Sync, Dark Mode, & Live Auth
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Core Data Fetching
    if (typeof syncAllIdentityElements === 'function') {
        await syncAllIdentityElements(); // From global.js
    } else {
        console.warn("syncAllIdentityElements not available - skipping identity sync");
    }
    await renderFeed();

    // 2. UI Initialization
    syncSidebarCommunities();
    checkSavedTheme();
    updateDashboardStats();
});

// --- 1. CORE FEED ENGINE (Supabase Driven) ---
async function renderFeed() {
    const feedContainer = document.getElementById('mainFeed');
    const placeholder = document.getElementById('feedPlaceholder');

    if (!feedContainer) return;

    // 1. Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user ? user.id : null;

    // 2. Fetch posts with EXPLICIT relationship hint to fix PGRST200
    // Adjust 'posts_user_id_fkey' if your FK constraint name is different
    // (check Supabase Table Editor > posts > Relationships tab)
    const { data: posts, error } = await supabase
        .from('posts')
        .select(`
            *,
            profiles!posts_user_id_fkey (
                full_name,
                avatar_url
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Feed Fetch Error:", error);
        if (error.code === 'PGRST200') {
            console.warn("PGRST200: Try running 'NOTIFY pgrst, \"reload schema\";' in SQL Editor again, or confirm FK name.");
        }
        if (placeholder) {
            placeholder.innerHTML = '<p class="text-slate-500">Failed to load feed. Try refreshing.</p>';
        }
        return;
    }

    if (posts && posts.length > 0) {
        if (placeholder) placeholder.style.display = 'none';

        let postWrapper = document.getElementById('postWrapper');
        if (!postWrapper) {
            postWrapper = document.createElement('div');
            postWrapper.id = 'postWrapper';
            postWrapper.className = 'space-y-4';
            feedContainer.appendChild(postWrapper);
        }

        // 3. Render posts
        postWrapper.innerHTML = posts.map(post => {
            const isOwner = currentUserId === post.user_id;
            return `
                <div class="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm animate-modal-pop">
                    <div class="p-6">
                        <div class="flex items-center justify-between mb-4">
                            <div class="flex items-center gap-3">
                                <img src="${post.profiles?.avatar_url || '/IMG/Logo.jpeg'}" class="w-10 h-10 rounded-full border border-slate-100 object-cover">
                                <div>
                                    <h4 class="text-xs font-black text-slate-800 uppercase tracking-tighter">${post.profiles?.full_name || 'Anonymous Loafer'}</h4>
                                    <p class="text-[9px] font-bold text-slate-400 uppercase">${new Date(post.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                           
                            ${isOwner ? `
                                <button onclick="deleteLoaf(${post.id})" class="text-slate-300 hover:text-red-500 transition">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            ` : ''}
                        </div>
                        <p class="text-sm text-slate-700 leading-relaxed font-medium mb-4">${post.content}</p>
                        <div class="flex items-center gap-6 pt-2 border-t border-slate-50">
                            <button onclick="toggleLike(this)" class="flex items-center gap-2 text-slate-400 hover:text-cyan-500 transition">
                                <i class="fa-regular fa-heart"></i> <span class="text-[10px] font-black uppercase">Appreciate</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        if (placeholder) {
            placeholder.innerHTML = '<p class="text-slate-500 text-center py-8">No loafs yet. Start broadcasting!</p>';
            placeholder.style.display = 'block';
        }
    }
}

// --- 2. SUBMITTING A NEW LOAF (POST) ---
async function submitLoaf() {
    const input = document.getElementById('postInput');
    const content = input.value.trim();

    if (!content) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        if (typeof window.showModal === 'function') {
            window.showModal("Auth Error", "Please log in to broadcast.", false);
        }
        return;
    }

    const { error } = await supabase.from('posts').insert([
        {
            user_id: user.id,
            content: content,
            title: "Quick Transmission", // Default title
            category: "General"
        }
    ]);

    if (error) {
        if (typeof window.showModal === 'function') {
            window.showModal("Transmission Failed", error.message, false);
        }
    } else {
        input.value = '';
        input.style.height = "auto";
        document.getElementById('postActions')?.classList.add('hidden');

        await renderFeed(); // Refresh feed
        if (typeof window.showModal === 'function') {
            window.showModal("Loaf Published", "Your thoughts have entered the professional void.", true);
        }
    }
}

async function deleteLoaf(id) {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (!error) {
        renderFeed();
        if (typeof window.showModal === 'function') {
            window.showModal("Scrubbed", "Transmission successfully removed from the grid.", true);
        }
    } else {
        console.error("Delete error:", error);
    }
}

// --- 3. UI, THEME & STATS --- (unchanged except modal safety)
function handlePostInput(el) {
    const postActions = document.getElementById('postActions');
    const counter = document.getElementById('charCounter');
    const maxLength = 500;

    if (el.value.length > maxLength) el.value = el.value.substring(0, maxLength);
    if (counter) counter.innerText = `${el.value.length} / ${maxLength}`;
    el.style.height = "auto";
    el.style.height = (el.scrollHeight) + "px";
    if (el.value.trim().length > 0) {
        postActions?.classList.remove('hidden');
        postActions?.classList.add('flex');
    } else {
        postActions?.classList.add('hidden');
        postActions?.classList.remove('flex');
    }
}

async function updateDashboardStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Fetch post count for this user
    const { count } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
    const appCountElement = document.getElementById('appCount');
    if (appCountElement) appCountElement.innerText = count || 0;
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
    if (typeof window.showModal === 'function') {
        window.showModal('Theme Switched', `System is now in ${isDark ? "Night Shift" : "Daylight"} mode.`);
    }
}

function checkSavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        updateThemeIcon(true);
    }
}

function updateThemeIcon(isDark) {
    const icon = document.getElementById('themeIcon');
    if (!icon) return;
    if (isDark) {
        icon.classList.replace('fa-moon', 'fa-sun');
        icon.classList.add('text-amber-400');
    } else {
        icon.classList.replace('fa-sun', 'fa-moon');
        icon.classList.remove('text-amber-400');
    }
}

// --- 4. COMMUNITIES (unchanged) ---
function syncSidebarCommunities() {
    const communityList = JSON.parse(localStorage.getItem('userCommunities')) || [];
    const sidebarCard = document.getElementById('myCommunitiesCard');
    if (!sidebarCard) return;
    let listWrapper = document.getElementById('sidebarCommList');
    if (!listWrapper) {
        listWrapper = document.createElement('div');
        listWrapper.id = 'sidebarCommList';
        listWrapper.className = 'space-y-3 mb-4';
        sidebarCard.querySelector('.flex.justify-between').insertAdjacentElement('afterend', listWrapper);
    }
    listWrapper.innerHTML = communityList.slice(0, 3).map(comm => `
        <div class="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
            <div class="flex items-center gap-3">
                <img src="${comm.image || '/IMG/Logo.jpeg'}" class="w-10 h-10 rounded-xl object-cover">
                <h4 class="text-[10px] font-black text-slate-800 uppercase truncate max-w-[80px]">${comm.name}</h4>
            </div>
            <button onclick="window.location.href='/PAGES/open_comms.html?id=${comm.id}'" class="bg-slate-50 text-slate-800 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase">Open</button>
        </div>
    `).join('');
}
