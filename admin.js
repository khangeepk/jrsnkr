// Phase 9: Admin Master Control Logic

// --- Authentication Guard (Admin & Authorized Staff) ---
const hasPerm = (action) => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) return false;
    const user = JSON.parse(userStr);
    if (user.role === 'admin') return true;
    return user.permissions && user.permissions[action] === true;
};

const enforceAuth = () => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
        window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') {
        // Staff accessing Admin panel - must have edit or delete perms
        const hasElevated = (user.permissions && (user.permissions.edit || user.permissions.delete));
        if (!hasElevated) {
            alert("ACCESS DENIED: Master Admin or Edit/Delete Privileges Required.");
            window.location.href = 'index.html';
        }
    }
};

enforceAuth();

const setupTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    }

    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
        toggleBtn.textContent = savedTheme === 'light' ? '🌙' : '☀️';
        toggleBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const newTheme = current === 'light' ? 'dark' : 'light';

            if (newTheme === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
            localStorage.setItem('theme', newTheme);
            toggleBtn.textContent = newTheme === 'light' ? '🌙' : '☀️';
        });
    }
};

const logout = () => {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
};

// --- Utils ---
const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        ${type === 'success' ? '✅' : '⚠️'}
        <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

// ==========================================
// 1. SYSTEM USER MANAGEMENT
// ==========================================

const renderUsersTable = () => {
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = '';

    // Ensure array exists
    if (!localStorage.getItem('sys_users')) {
        localStorage.setItem('sys_users', JSON.stringify([
            { username: 'admin', password: 'password', role: 'admin' },
            { username: 'staff', password: 'password', role: 'staff' }
        ]));
    }

    const users = JSON.parse(localStorage.getItem('sys_users'));

    users.forEach((u, index) => {
        const isMaster = u.role === 'admin';
        let permText = 'All Rights';
        if (!isMaster && u.permissions) {
            const p = [];
            if (u.permissions.add) p.push('Add');
            if (u.permissions.edit) p.push('Edit');
            if (u.permissions.delete) p.push('Delete');
            permText = p.length > 0 ? p.join(', ') : 'None';
        } else if (!isMaster) {
            permText = 'Add (Legacy)';
        }

        tbody.innerHTML += `
            <tr>
                <td><strong>${u.username}</strong></td>
                <td>
                    <span class="status-badge ${isMaster ? 'active' : 'idle'}">${u.role.toUpperCase()}</span>
                    ${!isMaster ? `<br><small style="color:var(--text-secondary)">${permText}</small>` : ''}
                </td>
                <td style="font-family: monospace; color: var(--text-secondary);">••••••••</td>
                <td>
                    ${!isMaster ? `<button class="btn btn-end" style="padding: 0.2rem 0.6rem; font-size: 0.8rem;" onclick="deleteUser(${index})">Revoke Access</button>` : '<span style="color: var(--text-secondary); font-size: 0.8rem;">Protected</span>'}
                </td>
            </tr>
        `;
    });
};

const handleAdminPassChange = (e) => {
    e.preventDefault();
    const newPass = document.getElementById('new-admin-pass').value.trim();
    if (!newPass) return;

    if (confirm("WARNING: Changing the Master Password will require you to log back in immediately. Proceed?")) {
        let users = JSON.parse(localStorage.getItem('sys_users') || '[]');
        const adminIndex = users.findIndex(u => u.role === 'admin');
        if (adminIndex !== -1) {
            users[adminIndex].password = newPass;
            localStorage.setItem('sys_users', JSON.stringify(users));
            showToast("Master Password Updated! Logging out...", "success");
            setTimeout(() => {
                logout();
            }, 1000);
        } else {
            showToast("Critical Error: Admin account missing from registry", "error");
        }
    }
};

const handleStaffCreate = (e) => {
    e.preventDefault();
    const username = document.getElementById('new-staff-user').value.trim().toLowerCase();
    const password = document.getElementById('new-staff-pass').value.trim();

    const canAdd = document.getElementById('perm-add').checked;
    const canEdit = document.getElementById('perm-edit').checked;
    const canDelete = document.getElementById('perm-delete').checked;

    const permissions = { add: canAdd, edit: canEdit, delete: canDelete };

    if (!username || !password) return;

    let users = JSON.parse(localStorage.getItem('sys_users') || '[]');

    if (users.find(u => u.username === username)) {
        showToast("Error: Username already exists in registry.", "error");
        return;
    }

    users.push({ username: username, password: password, role: 'staff', permissions: permissions });
    localStorage.setItem('sys_users', JSON.stringify(users));

    document.getElementById('create-staff-form').reset();
    renderUsersTable();
    showToast(`Staff account '${username}' provisioned.`);
};

const deleteUser = (index) => {
    if (confirm("REVOKE ACCESS: Are you sure you want to permanently delete this Staff account?")) {
        let users = JSON.parse(localStorage.getItem('sys_users') || '[]');
        if (users[index].role === 'admin') {
            showToast("Error: Cannot delete Master Admin.", "error");
            return;
        }
        const removed = users.splice(index, 1);
        localStorage.setItem('sys_users', JSON.stringify(users));
        renderUsersTable();
        showToast(`Account '${removed[0].username}' revoked.`, 'error');
    }
};


// ==========================================
// 2. DATA OVERRIDE: DAILY INCOME
// ==========================================

const renderIncomeOverride = () => {
    const tbody = document.getElementById('income-override-tbody');
    tbody.innerHTML = '';
    const income = JSON.parse(localStorage.getItem('dailyIncome') || '[]');

    income.forEach((entry, index) => {
        const d = new Date(entry.date);
        tbody.innerHTML += `
            <tr>
                <td>${d.toLocaleDateString()} <span style="color: var(--text-secondary); font-size: 0.8rem;">${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></td>
                <td><strong>${entry.playerName || 'Table Session'}</strong></td>
                <td style="color: var(--accent-green); font-weight: bold;">Rs. ${entry.amount}</td>
                <td><span class="status-badge" style="background: transparent; border: 1px solid var(--border-color);">${entry.mode}</span></td>
                <td>
                    <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                        ${hasPerm('edit') ? `<button class="btn btn-online" style="padding: 0.2rem 0.6rem; font-size: 0.8rem;" onclick="openEditModal('income', ${index})">Edit</button>` : `<button class="btn btn-online" style="padding: 0.2rem 0.6rem; font-size: 0.8rem; opacity: 0.5; cursor: not-allowed;" disabled>No Edit</button>`}
                        ${hasPerm('delete') ? `<button class="btn btn-end" style="padding: 0.2rem 0.6rem; font-size: 0.8rem;" onclick="deleteIncomeRow(${index})">Delete</button>` : `<button class="btn btn-end" style="padding: 0.2rem 0.6rem; font-size: 0.8rem; opacity: 0.5; cursor: not-allowed;" disabled>No Delete</button>`}
                    </div>
                </td>
            </tr>
        `;
    });
};

const deleteIncomeRow = (index) => {
    if (confirm("DANGER: Deleting this income row permanently alters today's calculated revenue. Proceed?")) {
        let income = JSON.parse(localStorage.getItem('dailyIncome') || '[]');
        income.splice(index, 1);
        localStorage.setItem('dailyIncome', JSON.stringify(income));
        renderIncomeOverride();
        showToast("Income row eradicated.", "error");
    }
};

// ==========================================
// 3. DATA OVERRIDE: EXPENSES
// ==========================================

const renderExpenseOverride = () => {
    const tbody = document.getElementById('expense-override-tbody');
    tbody.innerHTML = '';
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');

    expenses.forEach((entry, index) => {
        const d = new Date(entry.date);
        let displayCat = '';
        if (entry.category === 'office') displayCat = 'Office Utility';
        else if (entry.category === 'utility') displayCat = 'Utility Bills';
        else if (entry.category === 'repair') displayCat = 'Repair/Maintenance';
        else if (entry.category === 'tax') displayCat = 'Tax';
        else if (entry.category === 'salary') displayCat = 'Staff Salary';
        else displayCat = entry.category;

        tbody.innerHTML += `
            <tr>
                <td>${d.toLocaleDateString()}</td>
                <td><strong>${displayCat}</strong></td>
                <td><span style="color: var(--text-secondary);">${entry.description || '-'}</span></td>
                <td style="color: var(--accent-red); font-weight: bold;">Rs. ${entry.amount}</td>
                <td>
                    <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                        ${hasPerm('edit') ? `<button class="btn btn-online" style="padding: 0.2rem 0.6rem; font-size: 0.8rem;" onclick="openEditModal('expense', ${index})">Edit</button>` : `<button class="btn btn-online" style="padding: 0.2rem 0.6rem; font-size: 0.8rem; opacity: 0.5; cursor: not-allowed;" disabled>No Edit</button>`}
                        ${hasPerm('delete') ? `<button class="btn btn-end" style="padding: 0.2rem 0.6rem; font-size: 0.8rem;" onclick="deleteExpenseRow(${index})">Delete</button>` : `<button class="btn btn-end" style="padding: 0.2rem 0.6rem; font-size: 0.8rem; opacity: 0.5; cursor: not-allowed;" disabled>No Delete</button>`}
                    </div>
                </td>
            </tr>
        `;
    });
};

const deleteExpenseRow = (index) => {
    if (confirm("DANGER: Deleting this expense adjusts the Net Profit permanently. Proceed?")) {
        let expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
        expenses.splice(index, 1);
        localStorage.setItem('expenses', JSON.stringify(expenses));
        renderExpenseOverride();
        showToast("Expense row eradicated.", "error");
    }
};

// ==========================================
// 4. PLAYER LEDGER & DEBTS
// ==========================================

const renderPlayerLedger = () => {
    const tbody = document.getElementById('player-ledger-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const players = JSON.parse(localStorage.getItem('players') || '[]');

    // Filter purely for those with active debt
    const debtors = players.filter(p => p.balance && p.balance > 0);

    if (debtors.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">No active debts found in the system.</td></tr>`;
        return;
    }

    debtors.forEach((p, index) => {
        const idDisplay = p.member_id ? `<br><small style="color:var(--text-secondary)">ID: ${p.member_id}</small>` : '';
        const badgeColor = p.status === 'Member' ? 'var(--accent-blue)' : 'var(--text-secondary)';

        tbody.innerHTML += `
            <tr>
                <td><strong>${p.name}</strong>${idDisplay}</td>
                <td><span class="status-badge" style="border: 1px solid ${badgeColor}; color: ${badgeColor}; background: transparent;">${p.status}</span></td>
                <td style="color: var(--accent-red); font-weight: bold; font-size: 1.1rem;">Rs. ${p.balance}</td>
                <td>
                    <button class="btn btn-cash" style="padding: 0.3rem 0.8rem; font-size: 0.85rem;" onclick="clearPlayerDebt('${p.name}')">Clear Debt manually</button>
                </td>
            </tr>
        `;
    });
};

const clearPlayerDebt = (playerName) => {
    if (confirm(`ACTION REQUIRED: Are you manually clearing the debt for ${playerName}? This will NOT add money to the Daily Income portal.`)) {
        let players = JSON.parse(localStorage.getItem('players') || '[]');
        const pIndex = players.findIndex(p => p.name === playerName);

        if (pIndex !== -1) {
            players[pIndex].balance = 0;
            localStorage.setItem('players', JSON.stringify(players));
            renderPlayerLedger();
            showToast(`Debt cleared for ${playerName}.`, 'success');
        } else {
            showToast("Player record not found.", 'error');
        }
    }
};

// ==========================================
// 5. GENERIC EDIT MODAL LOGIC
// ==========================================

let editingContext = { type: null, index: null };

const openEditModal = (type, index) => {
    editingContext = { type, index };
    const titleEl = document.getElementById('edit-modal-title');
    const containerEl = document.getElementById('edit-form-container');
    const modal = document.getElementById('edit-row-modal');

    if (type === 'income') {
        const income = JSON.parse(localStorage.getItem('dailyIncome') || '[]');
        const entry = income[index];
        titleEl.textContent = "Edit Income Record";
        containerEl.innerHTML = `
            <div class="form-group" style="margin-bottom: 1rem;">
                <label>Player Name / Tab</label>
                <input type="text" id="edit-income-player" value="${entry.playerName}" placeholder="e.g. Ali Khan">
            </div>
            <div class="form-group" style="margin-bottom: 1rem;">
                <label>Revenue Amount (PKR)</label>
                <input type="number" id="edit-income-amount" value="${entry.amount}" required>
            </div>
            <div class="form-group" style="margin-bottom: 1rem;">
                <label>Mode of Payment</label>
                <select id="edit-income-mode">
                    <option value="Cash" ${entry.mode === 'Cash' ? 'selected' : ''}>Cash</option>
                    <option value="Online" ${entry.mode === 'Online' ? 'selected' : ''}>Online</option>
                </select>
            </div>
        `;
    } else if (type === 'expense') {
        const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
        const entry = expenses[index];
        titleEl.textContent = "Edit Expense Record";
        containerEl.innerHTML = `
            <div class="form-group" style="margin-bottom: 1rem;">
                <label>Amount (PKR)</label>
                <input type="number" id="edit-expense-amount" value="${entry.amount}" required>
            </div>
            <div class="form-group" style="margin-bottom: 1rem;">
                <label>Sub-category / Description</label>
                <input type="text" id="edit-expense-desc" value="${entry.description || ''}">
            </div>
        `;
    }

    modal.style.display = 'block';

    // Map confirm action
    document.getElementById('confirm-edit-btn').onclick = saveEditChanges;
};

const closeEditModal = () => {
    document.getElementById('edit-row-modal').style.display = 'none';
    editingContext = { type: null, index: null };
};

const saveEditChanges = () => {
    if (editingContext.type === 'income') {
        let income = JSON.parse(localStorage.getItem('dailyIncome') || '[]');
        income[editingContext.index].playerName = document.getElementById('edit-income-player').value.trim();
        income[editingContext.index].amount = parseFloat(document.getElementById('edit-income-amount').value) || 0;
        income[editingContext.index].mode = document.getElementById('edit-income-mode').value;

        localStorage.setItem('dailyIncome', JSON.stringify(income));
        renderIncomeOverride();
        showToast("Income record updated.");
    }
    else if (editingContext.type === 'expense') {
        let expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
        expenses[editingContext.index].amount = parseFloat(document.getElementById('edit-expense-amount').value) || 0;
        expenses[editingContext.index].description = document.getElementById('edit-expense-desc').value.trim();

        localStorage.setItem('expenses', JSON.stringify(expenses));
        renderExpenseOverride();
        showToast("Expense record updated.");
    }

    closeEditModal();
};

const confirmClearLocalData = () => {
    if (confirm("🚨 CRITICAL WARNING 🚨\n\nAre you absolutely sure you want to clear ALL local data?\nThis will erase tables, income, expenses, and staff accounts.\nYou will be logged out immediately.")) {

        // Keep master admin 'admin' credentials intact if we want, or just nuke everything.
        // Nuke everything is simplest and ensures a real factory reset.
        localStorage.clear();

        alert("Database has been reset. You are being redirected to login.");
        window.location.href = 'login.html';
    }
};

// Initial Render
document.addEventListener('DOMContentLoaded', () => {
    setupTheme();

    const userStr = localStorage.getItem('currentUser');
    const user = JSON.parse(userStr || '{}');

    if (user.role === 'staff') {
        const userMgmtPanel = document.getElementById('user-mgmt-panel');
        if (userMgmtPanel) userMgmtPanel.style.display = 'none';

        const statBadge = document.querySelector('.stats .stat-badge');
        if (statBadge) statBadge.textContent = 'DATA OVERRIDE MODE';
    }

    renderUsersTable();
    renderIncomeOverride();
    renderExpenseOverride();
    renderPlayerLedger();
});
