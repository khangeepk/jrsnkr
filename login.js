// Simple Mock Authentication Logic

// Seed mock users if not present
const seedUsers = () => {
    const users = JSON.parse(localStorage.getItem('sys_users'));
    if (!users) {
        const defaultUsers = [
            { username: 'admin', password: 'password', role: 'admin' },
            { username: 'manager', password: 'password', role: 'manager' },
            { username: 'cashier', password: 'password', role: 'cashier' }
        ];
        localStorage.setItem('sys_users', JSON.stringify(defaultUsers));
    }
};

const handleLogin = (e) => {
    e.preventDefault();
    const userIn = document.getElementById('username').value.trim();
    const passIn = document.getElementById('password').value.trim();

    const users = JSON.parse(localStorage.getItem('sys_users')) || [];

    // Hardcoded fallback just in case
    const match = users.find(u => u.username === userIn && u.password === passIn) ||
        (userIn === 'admin' && passIn === 'password' ? { username: 'admin', role: 'admin' } : null) ||
        (userIn === 'manager' && passIn === 'password' ? { username: 'manager', role: 'manager' } : null) ||
        (userIn === 'cashier' && passIn === 'password' ? { username: 'cashier', role: 'cashier' } : null);

    if (match) {
        // Fallback for older data or hardcoded users
        let perms = match.permissions;
        if (!perms) {
            if (match.role === 'admin') {
                perms = { add: true, edit: true, delete: true };
            } else {
                perms = { add: true, edit: false, delete: false }; // Staff legacy default
            }
        }

        const sessionPayload = {
            username: match.username,
            role: match.role,
            permissions: perms,
            loginTime: Date.now()
        };
        localStorage.setItem('currentUser', JSON.stringify(sessionPayload));

        showToast('Login successful! Redirecting...', 'success');

        setTimeout(() => {
            window.location.href = '/';
        }, 800);
    } else {
        showToast('Invalid username or password', 'error');
    }
};

// Toast notification function (duplicated for login context)
const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

document.addEventListener('DOMContentLoaded', () => {
    seedUsers();

    // If already logged in, skip login
    const current = localStorage.getItem('currentUser');
    if (current) {
        window.location.href = '/';
    }

    const form = document.getElementById('login-form');
    if (form) {
        form.addEventListener('submit', handleLogin);
    }
});
