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
            placeholder.innerHTML = '<p class="text-slate-500 text-center py-8">No loafs yet. Be the first!</p>';
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
    const btn = document.querySelector('button[onclick="submitLoaf()"]');
    const content = input?.value?.trim();
    if (!content) return;

    // Loading State
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Login first");

    const { error } = await supabase.from('posts').insert([{
        user_id: user.id,
        content: content,
        title: "Loaf",
        category: "General"
    }]);

    btn.disabled = false;
    btn.innerHTML = originalText;

    if (error) {
        console.error(error);
        window.showModal?.("Error", error.message, false);
    } else {
        input.value = '';
        // Note: 'renderFeed()' is no longer needed here because Realtime handles it!
    }
}

function showDeleteConfirmModal(postId) {
    let modal = document.getElementById('premiumDeleteModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'premiumDeleteModal';
        modal.className = 'fixed inset-0 z-[2000] flex items-center justify-center p-6';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="absolute inset-0 bg-slate-900/80 backdrop-blur-md"></div>
        <div class="relative bg-white w-full max-w-sm rounded-[44px] p-10 text-center shadow-2xl animate-in zoom-in duration-300">
            <div class="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <i class="fa-solid fa-trash-can text-2xl"></i>
            </div>
            <h2 class="text-xl font-black italic tracking-tighter uppercase mb-2">Trash this Loaf?</h2>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-10">
                Once deleted, this loaf is gone from the grid forever.
            </p>
            <div class="flex flex-col gap-3">
                <button onclick="performDelete(${postId})" class="w-full py-5 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all shadow-lg shadow-red-200">
                    Yes, Delete Forever
                </button>
                <button onclick="document.getElementById('premiumDeleteModal').remove()" class="w-full py-5 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all">
                    No, Keep it
                </button>
            </div>
        </div>
    `;
    document.body.style.overflow = 'hidden';
}

async function performDelete(id) {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    const modal = document.getElementById('premiumDeleteModal');
    if (modal) modal.remove();
    document.body.style.overflow = 'auto';

    if (error) {
        window.showModal?.("Error", error.message, false);
    }
    // Again, 'renderFeed()' is handled by the 'on(DELETE)' listener!
}
function initRealtime() {
    supabase
        .channel('public:posts')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
            // When a new post is inserted, fetch that specific user's profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', payload.new.user_id)
                .single();
            
            const { data: { user } } = await supabase.auth.getUser();
            const isOwner = user?.id === payload.new.user_id;
            
            // Add it to the top of the UI
            appendNewPost(payload.new, profile, isOwner);
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
            // Remove the deleted post from the UI automatically
            const postEl = document.querySelector(`[data-post-id="${payload.old.id}"]`);
            if (postEl) postEl.remove();
        })
        .subscribe();
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
