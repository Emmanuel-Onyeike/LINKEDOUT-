/**
 * LINKEDOUT GLOBAL ENGINE v5.0
 * Handlers: Supabase Auth, Persistence, Session Protection, & Multi-ID UI Sync
 */

// 1. DATABASE INITIALIZATION
const _supabaseUrl = 'https://wfhpypkuwhssjnvcsapo.supabase.co';
const _supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmaHB5cGt1d2hzc2pudmNzYXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODM1OTEsImV4cCI6MjA4ODc1OTU5MX0.DdAJ-N7EWysvAiuLCGhknZaU8AgMXr4EgylBnAEp6nI';
const supabase = supabasejs.createClient(_supabaseUrl, _supabaseKey);

// 2. LIFECYCLE BOOTSTRAP
document.addEventListener('DOMContentLoaded', async () => {
    // Check if the user is allowed to be on this page
    await checkSession();
    // Synchronize the UI with the latest Database state
    await syncAllIdentityElements();
});

/**
 * SESSION GUARD
 * Ensures users are authenticated to see the app
 */
async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    const isAuthPage = window.location.pathname.includes('auth.html');

    if (!session && !isAuthPage) {
        // Kick unauthorized users to the entry point
        window.location.href = '/PAGES/auth.html';
    } else if (session && isAuthPage) {
        // Logged in users shouldn't see the login page
        window.location.href = '/PAGES/dashboard.html';
    }
}

/**
 * UNIVERSAL IDENTITY SYNC
 * Connects Database 'profiles' to all specific HTML IDs
 */
async function syncAllIdentityElements() {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Default system fallbacks
    let userName = "Loafer #1";
    let userRole = "Professional Napper @ LinkedOut";
    let userPfp = "/IMG/Logo.jpeg";

    if (user) {
        // Reach into the Supabase 'profiles' table we created in SQL
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profile) {
            userName = profile.full_name || userName;
            userRole = profile.role || userRole;
            userPfp = profile.avatar_url || userPfp;
        }
    }

    // TARGET IDENTIFIER LIST (Matches your Sidebar, Nav, and Profile Page)
    const nameElements = document.querySelectorAll('#dashName, #navName, #profileDisplayName, #displayName');
    const roleElements = document.querySelectorAll('#dashRole, #navRole, #profileDisplayRole, #displayRole');
    const pfpElements = document.querySelectorAll('#dashPfp, #navPfp, #displayPfp');

    // Sync Names (Split logic for Dashboard vs Full Display)
    nameElements.forEach(el => {
        if (el.id === 'dashName') {
            el.innerText = userName.split(' ')[0]; // Returns 'Emmanuel' if name is 'Emmanuel X'
        } else {
            el.innerText = userName; // Returns full name
        }
    });

    // Sync Roles
    roleElements.forEach(el => el.innerText = userRole);

    // Sync Profile Pictures
    pfpElements.forEach(img => img.src = userPfp);

    console.log(`%c[CORE]: Syncing Identity for ${userName}`, "color: #0ea5e9; font-weight: 900;");
}

/**
 * SYSTEM MODAL (Centered instruction)
 * Used for Alerts, Successes, and Errors
 */
function showModal(title, message, isSuccess = true) {
    let modal = document.getElementById('systemModal');
    
    // Inject if not present
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="systemModal" class="fixed inset-0 z-[1000] flex items-center justify-center p-6 hidden">
                <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
                <div class="relative bg-white w-full max-w-sm rounded-[44px] p-12 text-center shadow-2xl scale-90 opacity-0 transition-all duration-300" id="modalBox">
                    <div class="w-20 h-20 ${isSuccess ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'} rounded-full flex items-center justify-center mx-auto mb-8">
                        <i class="fa-solid ${isSuccess ? 'fa-check' : 'fa-triangle-exclamation'} text-2xl"></i>
                    </div>
                    <h2 class="text-xl font-black uppercase italic tracking-tighter mb-2">${title}</h2>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-10">${message}</p>
                    <button onclick="closeSystemModal()" class="w-full py-5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-2xl shadow-lg">Acknowledge</button>
                </div>
            </div>
        `);
        modal = document.getElementById('systemModal');
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('modalBox').classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeSystemModal() {
    const box = document.getElementById('modalBox');
    if (box) {
        box.classList.remove('scale-100', 'opacity-100');
        setTimeout(() => {
            document.getElementById('systemModal').classList.add('hidden');
        }, 300);
    }
}

/**
 * AUTH UTILITY: LOGOUT
 */
async function logoutSignal() {
    const { error } = await supabase.auth.signOut();
    if (!error) window.location.href = '/PAGES/auth.html';
}