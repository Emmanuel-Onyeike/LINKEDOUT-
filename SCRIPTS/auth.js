/**
 * LINKEDOUT AUTH LOGIC v5.8
 */
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');

    // REGISTRATION
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('regFullName').value;
            const email = document.getElementById('regEmail').value;
            const pass = document.getElementById('regPass').value;

            const { data, error } = await window.supabase.auth.signUp({ email, password: pass });
            if (error) return window.showModal("Error", error.message, false);
            
            // Insert profile
            await window.supabase.from('profiles').insert([{ id: data.user.id, full_name: name }]);
            window.location.href = '/PAGES/dashboard.html';
        });
    }

    // LOGIN
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail')?.value || document.getElementById('loginUser')?.value;
            const pass = document.getElementById('loginPass').value;

            const { data, error } = await window.supabase.auth.signInWithPassword({ email, password: pass });
            if (error) return window.showModal("Error", error.message, false);
            
            window.location.href = '/PAGES/dashboard.html';
        });
    }
});
