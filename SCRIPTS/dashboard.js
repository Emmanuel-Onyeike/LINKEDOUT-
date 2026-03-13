/**
 * LINKEDOUT DASHBOARD - FIXED VERSION (no syntax errors, reliable feed)
 */
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof syncAllIdentityElements === 'function') {
        await syncAllIdentityElements();
    }
    await renderFeed();
    syncSidebarCommunities();
    checkSavedTheme();
    updateDashboardStats();
});

async function renderFeed() {
    const feedContainer = document.getElementById('mainFeed');
    const placeholder = document.getElementById('feedPlaceholder');
    if (!feedContainer) return;

    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user ? user.id : null;

    // Simple fetch - no join, no error
    const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Feed error:", error);
        if (placeholder) {
            placeholder.innerHTML = '<p class="text-red-500 text-center py-8">Feed error: ' + (error.message || 'Unknown') + '</p>';
            placeholder.style.display = 'block';
        }
        return;
    }
if (!posts || posts.length === 0) {
        if (placeholder) {
            placeholder.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20 px-6 animate-in fade-in duration-700">
                    <div class="w-20 h-20 bg-white border border-slate-100 rounded-[32px] flex items-center justify-center shadow-sm mb-6">
                        <i class="fa-solid fa-mug-hot text-slate-200 text-2xl"></i>
                    </div>
                    
                    <h3 class="text-[11px] font-black text-slate-800 uppercase tracking-[0.3em] mb-2">
                        Grid is Empty
                    </h3>
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] max-w-[220px] leading-relaxed text-center">
                        No loafs detected in the wild. Start the movement.
                    </p>

                    <div class="mt-8 opacity-20">
                        <div class="w-1 h-12 bg-gradient-to-b from-slate-400 to-transparent rounded-full"></div>
                    </div>
                </div>
            `;
            placeholder.style.display = 'block';
        }
        return;
    }

    if (placeholder) placeholder.style.display = 'none';

    let postWrapper = document.getElementById('postWrapper');
    if (!postWrapper) {
        postWrapper = document.createElement('div');
        postWrapper.id = 'postWrapper';
        postWrapper.className = 'space-y-4';
        feedContainer.appendChild(postWrapper);
    }

    // Get profiles separately
    const userIds = [...new Set(posts.map(p => p.user_id))];
    const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

    const profileMap = {};
    profilesData?.forEach(p => profileMap[p.id] = p);

    postWrapper.innerHTML = posts.map(post => {
        const profile = profileMap[post.user_id] || {};
        const isOwner = currentUserId === post.user_id;

        return `
            <div class="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <img src="${profile.avatar_url || '/IMG/Logo.jpeg'}" class="w-10 h-10 rounded-full border border-slate-100 object-cover">
                            <div>
                                <h4 class="text-xs font-black text-slate-800">${profile.full_name || 'Anonymous'}</h4>
                                <p class="text-[9px] font-bold text-slate-400">${new Date(post.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                        ${isOwner ? `<button onclick="deleteLoaf(${post.id})" class="text-red-500"><i class="fa-solid fa-trash"></i></button>` : ''}
                    </div>
                    <p class="text-sm text-slate-700">${post.content}</p>
                </div>
            </div>
        `;
    }).join('');
}

async function submitLoaf() {
    const input = document.getElementById('postInput');
    const content = input?.value?.trim();
    if (!content) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Login first");

    const { error } = await supabase.from('posts').insert([{
        user_id: user.id,
        content: content,
        title: "Loaf",
        category: "General"
    }]);

    if (error) {
        console.error(error);
        alert("Post failed: " + error.message);
    } else {
        input.value = '';
        await renderFeed();
        alert("Posted!");
    }
}


window.deleteLoaf = async function(id) {
    // Show custom yes/no modal
    showDeleteConfirmModal(id);
};

// New function: shows centered yes/no modal
function showDeleteConfirmModal(postId) {
    const modal = document.getElementById('globalModal');
    if (!modal) {
        if (confirm("Delete this loaf forever?")) {
            performDelete(postId);
        }
        return;
    }

    // Customize modal for delete confirmation
    document.getElementById('modalTitle').textContent = "Delete Loaf";
    document.getElementById('modalBody').innerHTML = `
        Are you sure you want to delete this loaf?<br>
        <small>This action cannot be undone.</small>
    `;
    document.getElementById('modalEmoji').textContent = '🗑️';

    // Replace the single "Understood" button with Yes/No
    const buttonContainer = document.querySelector('#globalModal button')?.parentElement;
    if (buttonContainer) {
        buttonContainer.innerHTML = `
            <div class="flex flex-col gap-3 w-full mt-2">
        <button onclick="performDelete(${postId}); closeModal()" 
            class="w-full py-5 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl 
            hover:bg-red-700 hover:shadow-lg hover:shadow-red-200 active:scale-95 transition-all duration-200">
            Confirm Deletion
        </button>

        <button onclick="closeModal()" 
            class="w-full py-5 bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl 
            hover:bg-slate-100 hover:text-slate-600 active:scale-95 transition-all duration-200">
            Keep this Loaf
        </button>
    </div>
        `;
    }

    // Show the modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
}

// The actual delete logic
async function performDelete(id) {
    const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);

    if (error) {
        console.error("Delete failed:", error);
        window.showModal?.("Error", "Could not delete: " + error.message, false);
    } else {
        await renderFeed();
        window.showModal?.("Deleted", "Loaf removed successfully.", true);

    }
}

// --- 3. UI, THEME & STATS ---
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
    window.showModal?.('Theme Switched', `System is now in ${isDark ? "Night Shift" : "Daylight"} mode.`);
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

// --- 4. COMMUNITIES ---
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

function toggleLinkedOutModal() {
  const overlay = document.getElementById('linkedOutModalOverlay');
  if (!overlay) {
    console.error("Overlay not found");
    return;
  }

  if (overlay.classList.contains('hidden')) {
    // Open - exact steps from your working console test
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    overlay.style.opacity = '1';

    const content = document.getElementById('linkedOutDropdown');
    if (content) {
      content.classList.remove('scale-95', 'opacity-0');
      content.classList.add('scale-100', 'opacity-100');
    }

    document.body.style.overflow = 'hidden';
  } else {
    // Close
    overlay.style.opacity = '0';

    const content = document.getElementById('linkedOutDropdown');
    if (content) {
      content.classList.remove('scale-100', 'opacity-100');
      content.classList.add('scale-95', 'opacity-0');
    }

    // Hide after fade (simple delay)
    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.classList.remove('flex');
      document.body.style.overflow = '';
    }, 300);
  }

  console.log("Modal toggle called - current hidden:", overlay.classList.contains('hidden'));
}
window.showModal = function(title, message, isSuccess = true) {
    const modal = document.getElementById('globalModal');
    if (!modal) return alert(message); // fallback

    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').textContent = message;
    document.getElementById('modalEmoji').textContent = isSuccess ? '🛋️' : '⚠️';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
};

function closeModal() {
    const modal = document.getElementById('globalModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
}
async function loadRecommendations() {
    const listContainer = document.getElementById('recommendationList');
    if (!listContainer) return;

    // 1. Fetch profiles (limiting to 5 for the sidebar)
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .limit(5);

    if (error) {
        console.error("Recs Error:", error);
        return;
    }

    // 2. Clear loading state
    listContainer.innerHTML = '';

    // 3. Render each user
    profiles.forEach(profile => {
        const userCard = document.createElement('div');
        userCard.className = "flex items-center justify-between group cursor-pointer";
        
        userCard.innerHTML = `
            <div class="flex items-center gap-4" onclick="window.location.href='/PAGES/view-profile.html?id=${profile.id}'">
                <div class="relative">
                    <img src="${profile.avatar_url || '/IMG/Logo.jpeg'}" 
                         class="w-12 h-12 rounded-2xl object-cover border-2 border-transparent group-hover:border-cyan-500 transition-all">
                </div>
                <div>
                    <h4 class="text-xs font-black text-slate-800 uppercase tracking-tighter">${profile.full_name || 'Anonymous'}</h4>
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${profile.role || 'Loafer'}</p>
                </div>
            </div>
            <button onclick="followUser('${profile.id}')" 
                class="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all">
                <i class="fa-solid fa-plus text-[10px]"></i>
            </button>
        `;
        listContainer.appendChild(userCard);
    });
}

// Run on load
document.addEventListener('DOMContentLoaded', loadRecommendations);
