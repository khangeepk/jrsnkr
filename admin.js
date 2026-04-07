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
    
    // Hard restrictions for Cashier
    if (user.role === 'cashier') {
        window.location.href = '/';
        return;
    }
    
    if (user.role !== 'admin' && user.role !== 'manager') {
        // Staff accessing Admin panel - must have edit or delete perms
        const hasElevated = (user.permissions && (user.permissions.edit || user.permissions.delete));
        if (!hasElevated) {
            alert("ACCESS DENIED: Master Admin or Edit/Delete Privileges Required.");
            window.location.href = '/';
        }
    }
};

enforceAuth();

const setupTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
        toggleBtn.textContent = savedTheme === 'light' ? '🌙' : '☀️';
    }
};

const toggleTheme = () => {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    
    // Update all theme toggle buttons across the DOM
    document.querySelectorAll('#theme-toggle').forEach(btn => {
        btn.textContent = isLight ? '🌙' : '☀️';
    });
};

const logout = () => {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
};

const showCCTVModal = () => {
    const modal = document.getElementById('cctv-modal');
    if (modal) modal.style.display = 'block';
};

const closeCCTVModal = () => {
    const modal = document.getElementById('cctv-modal');
    if (modal) modal.style.display = 'none';
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

    if (!localStorage.getItem('sys_users')) {
        localStorage.setItem('sys_users', JSON.stringify([
            { username: 'admin', password: 'password', role: 'admin' },
            { username: 'manager', password: 'password', role: 'manager' },
            { username: 'cashier', password: 'password', role: 'cashier' }
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

// ==========================================
// 1.5 LIVE FEED & BROADCAST MANAGEMENT
// ==========================================

const handleLiveFeedUpdate = (e) => {
    e.preventDefault();
    const textArea = document.getElementById('live-feed-text');
    if (!textArea) return;

    const rawText = textArea.value.trim();
    // Default fallback if empty
    const finalFeed = rawText || "Welcome to JR Snooker Lounge | Enjoy your premium experience | Book your tables at the counter.";

    // Store in localStorage
    localStorage.setItem('liveFeedText', finalFeed);
    showToast("Live Feed Broadcast Updated!", "success");

    // Attempt graceful dispatch to dashboard if open
    window.dispatchEvent(new Event('storage'));
};

// Initialize Admin Form with existing feed data
document.addEventListener('DOMContentLoaded', () => {
    const textArea = document.getElementById('live-feed-text');
    if (textArea) {
        const currentFeed = localStorage.getItem('liveFeedText');
        if (currentFeed) {
            textArea.value = currentFeed;
        }
    }
});

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
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (user.role !== 'admin') {
        showToast("Access Denied: Only Administrators can cancel games or delete entries.", "error");
        return;
    }
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
// 1.8 PAYMENT SETTINGS MANAGEMENT
// ==========================================

const handlePaymentSettingsSave = async (e) => {
    e.preventDefault();
    const bankName = document.getElementById('pay-bank-name').value.trim();
    const accountTitle = document.getElementById('pay-account-title').value.trim();
    const accountNumber = document.getElementById('pay-account-number').value.trim();
    const easypaisa = document.getElementById('pay-easypaisa').value.trim();
    const qrUploadInput = document.getElementById('pay-qr-upload');

    let settings = JSON.parse(localStorage.getItem('paymentSettings') || '{}');
    settings.bankName = bankName;
    settings.accountTitle = accountTitle;
    settings.accountNumber = accountNumber;
    settings.easypaisa = easypaisa;

    if (qrUploadInput && qrUploadInput.files.length > 0) {
        try {
            const base64 = await processAdminImage(qrUploadInput.files[0]);
            settings.qrCodeBase64 = base64;
            
            // Update preview instantly
            const previewDiv = document.getElementById('pay-qr-preview');
            if(previewDiv) {
                previewDiv.innerHTML = `<img src="${base64}" style="max-height: 100px; border-radius: 8px; border: 1px solid var(--border-color);">`;
            }
        } catch (err) {
            console.error(err);
            showToast("Failed to process QR code image.", "error");
            return;
        }
    }

    localStorage.setItem('paymentSettings', JSON.stringify(settings));
    showToast("Global Payment Settings Saved!", "success");
};

const processAdminImage = (file) => {
    return new Promise((resolve, reject) => {
        if (!file) { resolve(null); return; }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 500;
                const MAX_HEIGHT = 500;
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
};

const loadPaymentSettings = () => {
    const settings = JSON.parse(localStorage.getItem('paymentSettings') || '{}');
    const bankNameInput = document.getElementById('pay-bank-name');
    if (bankNameInput) bankNameInput.value = settings.bankName || '';
    
    const accTitleInput = document.getElementById('pay-account-title');
    if (accTitleInput) accTitleInput.value = settings.accountTitle || '';
    
    const accNumberInput = document.getElementById('pay-account-number');
    if (accNumberInput) accNumberInput.value = settings.accountNumber || '';
    
    const epInput = document.getElementById('pay-easypaisa');
    if (epInput) epInput.value = settings.easypaisa || '';
    
    const qrPreview = document.getElementById('pay-qr-preview');
    if (settings.qrCodeBase64 && qrPreview) {
        qrPreview.innerHTML = `<img src="${settings.qrCodeBase64}" style="max-height: 100px; border-radius: 8px; border: 1px solid var(--border-color);">`;
    }
};

window.handlePaymentSettingsSave = handlePaymentSettingsSave;

// ==========================================
// 2. DATA OVERRIDE: DAILY INCOME
// ==========================================

const renderIncomeOverride = () => {
    const tbody = document.getElementById('income-override-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const income = JSON.parse(localStorage.getItem('dailyIncome') || '[]');

    income.forEach((entry, index) => {
        const d = new Date(entry.date);
        const tr = document.createElement('tr');

        const canEdit = hasPerm('edit');
        const canDelete = hasPerm('delete');

        const editBtn = canEdit
            ? `<button class="btn btn-online" style="padding: 0.2rem 0.6rem; font-size: 0.8rem;" onclick="openEditModal('income', ${index})">Edit</button>`
            : `<button class="btn btn-online" style="padding: 0.2rem 0.6rem; font-size: 0.8rem; opacity: 0.5; cursor: not-allowed;" disabled>No Edit</button>`;

        const delBtn = canDelete
            ? `<button class="btn btn-end" style="padding: 0.2rem 0.6rem; font-size: 0.8rem;" data-id="${entry.id}">Delete</button>`
            : ``;

        let proofBtnHtml = '';
        if (entry.mode === 'Online' && entry.proof_image) {
            proofBtnHtml = `<br><button class="btn btn-online" style="margin-top: 0.3rem; padding: 0.2rem 0.4rem; font-size: 0.75rem;" onclick="showProofModal('${entry.id}')">View Proof</button>`;
        }

        tr.innerHTML = `
            <td>${d.toLocaleDateString()} <span style="color: var(--text-secondary); font-size: 0.8rem;">${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></td>
            <td><strong>${entry.playerName || 'Table Session'}</strong></td>
            <td style="color: var(--accent-green); font-weight: bold;">Rs. ${entry.amount}</td>
            <td>
                <span class="status-badge" style="background: transparent; border: 1px solid var(--border-color);">${entry.mode}</span>
                ${proofBtnHtml}
            </td>
            <td>
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    ${editBtn}
                    ${delBtn}
                </div>
            </td>
        `;

        tbody.appendChild(tr);
        if (canDelete) {
            const btn = tr.querySelector('[data-id]');
            if (btn) {
                btn.addEventListener('click', () => deleteIncomeByID(entry.id));
            }
        }
    });
};

const deleteIncomeByID = (entryId) => {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (user.role !== 'admin') {
        showToast("Access Denied: Only Administrators can cancel games or delete entries.", "error");
        return;
    }
    if (confirm("DANGER: Deleting this income row permanently alters today's revenue. Proceed?")) {
        let income = JSON.parse(localStorage.getItem('dailyIncome') || '[]');
        income = income.filter(e => e.id !== entryId);
        localStorage.setItem('dailyIncome', JSON.stringify(income));
        renderIncomeOverride();
        showToast("Income row deleted.", "error");
        window.dispatchEvent(new Event('storage'));
    }
};
window.deleteIncomeByID = deleteIncomeByID;

// ==========================================
// 3. DATA OVERRIDE: EXPENSES
// ==========================================

const renderExpenseOverride = () => {
    const tbody = document.getElementById('expense-override-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');

    expenses.forEach((entry) => {
        const catMap = {
            'office': 'Office Utility', 'utility': 'Utility Bills',
            'repair': 'Repair/Maintenance', 'tax': 'Tax', 'salary': 'Staff Salary'
        };
        const displayCat = catMap[entry.category] || entry.category || 'Unknown';
        const d = new Date(entry.id || entry.date);

        const canEdit = hasPerm('edit');
        const canDelete = hasPerm('delete');

        const editBtn = canEdit
            ? `<button class="btn btn-online" style="padding: 0.2rem 0.6rem; font-size: 0.8rem;" onclick="openEditModal('expense', ${expenses.indexOf(entry)})">Edit</button>`
            : `<button class="btn btn-online" style="padding: 0.2rem 0.6rem; font-size: 0.8rem; opacity: 0.5; cursor: not-allowed;" disabled>No Edit</button>`;

        const delBtn = canDelete
            ? `<button class="btn btn-end" style="padding: 0.2rem 0.6rem; font-size: 0.8rem;" data-expid="${entry.id}">Delete</button>`
            : ``;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${d.toLocaleDateString()}</td>
            <td><strong>${displayCat}</strong></td>
            <td><span style="color: var(--text-secondary);">${entry.description || '-'}</span></td>
            <td style="color: var(--accent-red); font-weight: bold;">Rs. ${entry.amount}</td>
            <td>
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    ${editBtn}
                    ${delBtn}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
        if (canDelete) {
            const btn = tr.querySelector('[data-expid]');
            if (btn) btn.addEventListener('click', () => deleteExpenseByID(entry.id));
        }
    });
};

const deleteExpenseByID = (entryId) => {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (user.role !== 'admin') {
        showToast("Access Denied: Only Administrators can cancel games or delete entries.", "error");
        return;
    }
    if (confirm("DANGER: Deleting this expense adjusts the Net Profit permanently. Proceed?")) {
        let expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
        expenses = expenses.filter(e => e.id !== entryId);
        localStorage.setItem('expenses', JSON.stringify(expenses));
        renderExpenseOverride();
        showToast("Expense row deleted.", "error");
        window.dispatchEvent(new Event('storage'));
    }
};
window.deleteExpenseByID = deleteExpenseByID;

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
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button class="btn btn-cash" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; flex: 1;" onclick="settlePlayerDebt('${p.name}', 'Cash', ${p.balance})">Cash</button>
                        <button class="btn btn-online" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; flex: 1;" onclick="openLedgerOnlineModal('${p.name}', ${p.balance})">Online</button>
                        <button class="btn btn-transfer" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; flex: 1; background: transparent; border: 1px solid var(--accent-blue); color: var(--accent-blue);" onclick="keepAsCredit('${p.name}', ${p.balance})">Keep as Credit</button>
                    </div>
                </td>
            </tr>
        `;
    });
};

const settlePlayerDebt = (playerName, mode, amount) => {
    if (confirm(`Settle ${playerName}'s debt of Rs. ${amount} via ${mode}? This WILL add money to today's Daily Income.`)) {
        let players = JSON.parse(localStorage.getItem('players') || '[]');
        const pIndex = players.findIndex(p => p.name === playerName);

        if (pIndex !== -1) {
            players[pIndex].balance = 0;
            localStorage.setItem('players', JSON.stringify(players));
            
            // Log to dailyIncome
            const dailyIncome = JSON.parse(localStorage.getItem('dailyIncome') || '[]');
            dailyIncome.push({
                id: Date.now(),
                date: new Date().toISOString(),
                playerName: playerName + ' (Ledger Settlement)',
                amount: amount,
                mode: mode,
                is_pending: false
            });
            localStorage.setItem('dailyIncome', JSON.stringify(dailyIncome));
            
            renderPlayerLedger();
            showToast(`Rs. ${amount} debt cleared & collected via ${mode}.`, 'success');
        } else {
            showToast("Player record not found.", 'error');
        }
    }
};

let activeLedgerOnlineTarget = null;
let activeLedgerOnlineAmount = 0;

window.openLedgerOnlineModal = (playerName, amount) => {
    activeLedgerOnlineTarget = playerName;
    activeLedgerOnlineAmount = amount;
    document.getElementById('ledger-online-player').textContent = playerName;
    document.getElementById('ledger-online-amount').textContent = amount;
    document.getElementById('ledger-online-proof').value = '';
    document.getElementById('ledger-online-modal').style.display = 'block';
};

window.closeLedgerOnlineModal = () => {
    document.getElementById('ledger-online-modal').style.display = 'none';
    activeLedgerOnlineTarget = null;
};

window.executeLedgerOnlinePayment = async () => {
    if (!activeLedgerOnlineTarget) return;
    const fileInput = document.getElementById('ledger-online-proof');
    if (!fileInput.files || fileInput.files.length === 0) {
        showToast("Please select a screenshot proving payment.", "error");
        return;
    }

    try {
        const base64 = await processAdminImage(fileInput.files[0]);
        let players = JSON.parse(localStorage.getItem('players') || '[]');
        const pIndex = players.findIndex(p => p.name === activeLedgerOnlineTarget);

        if (pIndex !== -1) {
            players[pIndex].balance = 0;
            localStorage.setItem('players', JSON.stringify(players));
            
            // Log to dailyIncome
            const dailyIncome = JSON.parse(localStorage.getItem('dailyIncome') || '[]');
            dailyIncome.push({
                id: Date.now(),
                date: new Date().toISOString(),
                playerName: activeLedgerOnlineTarget + ' (Ledger Settlement)',
                amount: activeLedgerOnlineAmount,
                mode: 'Online',
                is_pending: false,
                proof_image: base64
            });
            localStorage.setItem('dailyIncome', JSON.stringify(dailyIncome));
            
            renderPlayerLedger();
            closeLedgerOnlineModal();
            showToast(`Rs. ${activeLedgerOnlineAmount} debt cleared & collected via Online.`, 'success');
        }
    } catch(err) {
        showToast("Failed to process proof image.", "error");
    }
};

const keepAsCredit = (playerName, amount) => {
    // Credit action: acknowledge the outstanding balance WITHOUT clearing it.
    // The debt remains safely stored in the player's ledger as a payable balance.
    showToast(`Rs. ${amount} kept as outstanding credit for ${playerName}. Balance preserved.`, 'success');
    // Re-render to reflect any UI state changes (no state mutation occurs)
    renderPlayerLedger();
};
window.keepAsCredit = keepAsCredit;

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

    if (user.role === 'staff' || user.role === 'manager') {
        const userMgmtPanel = document.getElementById('user-mgmt-panel');
        if (userMgmtPanel) userMgmtPanel.remove(); // System Settings/User Mgmt -> Removed

        const statBadge = document.querySelector('.stats .stat-badge');
        if (statBadge) statBadge.textContent = 'DATA OVERRIDE MODE';
        
        if (user.role === 'manager') {
            // "Manager View Restrictions... HIDE any "Delete Entry", "Cancel Game", or "System Settings" buttons."
            // Manager shouldn't even see the DB overrides or payment settings
            // Because they shouldn't edit/delete. Let's remove them all except player ledger!
            const allPanels = document.querySelectorAll('.report-panel');
            allPanels.forEach(panel => {
                if (panel.id !== 'player-ledger-panel') {
                    panel.remove();
                }
            });
            // Also ensure we remove any straggling delete buttons! (Though theoretically handled below)
        }
    }

    renderUsersTable();
    renderIncomeOverride();
    renderExpenseOverride();
    renderPlayerLedger();
    loadPaymentSettings();
});

const showProofModal = (transactionId) => {
    const income = JSON.parse(localStorage.getItem('dailyIncome') || '[]');
    const entry = income.find(x => x.id == transactionId);
    if (entry && entry.proof_image) {
        document.getElementById('proof-modal-img').src = entry.proof_image;
        document.getElementById('proof-modal').style.display = 'block';
    } else {
        showToast("Proof image not found or corrupted.", "error");
    }
};

const closeProofModal = () => {
    document.getElementById('proof-modal').style.display = 'none';
    document.getElementById('proof-modal-img').src = '';
};

window.showProofModal = showProofModal;
window.closeProofModal = closeProofModal;
window.showCCTVModal = showCCTVModal;
window.closeCCTVModal = closeCCTVModal;
window.logout = logout;
window.toggleTheme = toggleTheme;
window.setupTheme = setupTheme;
