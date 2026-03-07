// Phase 8: Authentication Guard
const enforceAuth = () => {
    const user = localStorage.getItem('currentUser');
    if (!user) {
        window.location.href = 'login.html';
    }
};
enforceAuth();

const logout = () => {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
};

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

// Reports Logic for JR Snooker Lounge

const getDailyIncome = () => JSON.parse(localStorage.getItem('dailyIncome') || '[]');
const getExpenses = () => JSON.parse(localStorage.getItem('expenses') || '[]');
const getStaff = () => JSON.parse(localStorage.getItem('staff') || '[]');
const saveStaff = (staff) => localStorage.setItem('staff', JSON.stringify(staff));

const getAnnualMembers = () => JSON.parse(localStorage.getItem('annual_members') || '[]');
const saveAnnualMembers = (members) => localStorage.setItem('annual_members', JSON.stringify(members));

const getTournamentMembers = () => JSON.parse(localStorage.getItem('tournament_members') || '[]');
const saveTournamentMembers = (members) => localStorage.setItem('tournament_members', JSON.stringify(members));

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

const renderIncomePortal = () => {
    const income = getDailyIncome();
    const tbody = document.querySelector('#income-table tbody');
    tbody.innerHTML = '';

    // Sort newest first
    const sorted = [...income].sort((a, b) => b.id - a.id);
    let total = 0;

    sorted.forEach(item => {
        total += item.amount;
        const tr = document.createElement('tr');

        const dateObj = new Date(item.date);
        const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        tr.innerHTML = `
            <td>${timeStr}</td>
            <td><strong>${item.playerName}</strong></td>
            <td style="color: var(--accent-green); font-weight: 500;">Rs. ${item.amount}</td>
            <td>
                <span style="font-size: 0.8rem; padding: 0.2rem 0.5rem; background: rgba(0,0,0,0.2); border-radius: 4px; border: 1px solid var(--border-color);">
                    ${item.mode}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('total-income').innerText = `Total: Rs. ${total}`;
};

const renderExpenses = () => {
    const expenses = getExpenses();
    const list = document.getElementById('expense-list');
    list.innerHTML = '';

    let total = 0;
    expenses.forEach(exp => {
        total += exp.amount;

        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.padding = '0.75rem';
        div.style.background = 'rgba(0,0,0,0.2)';
        div.style.borderRadius = '8px';
        div.style.border = '1px solid var(--border-color)';

        div.innerHTML = `
            <div>
                <strong style="color: var(--text-primary); font-size: 0.95rem;">${exp.category}</strong>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">${new Date(exp.id).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <strong style="color: var(--accent-red);">Rs. ${exp.amount}</strong>
        `;
        list.appendChild(div);
    });

    document.getElementById('total-expense').innerText = `Expenses: Rs. ${total}`;
};

const updateNetProfit = () => {
    const income = getDailyIncome().reduce((sum, item) => sum + item.amount, 0);
    const expenses = getExpenses().reduce((sum, item) => sum + item.amount, 0);

    const profit = income - expenses;
    document.getElementById('net-profit-badge').innerText = `Net Profit: Rs. ${profit}`;
};

const addExpense = () => {
    const cat = document.getElementById('exp-category').value;
    const amountStr = document.getElementById('exp-amount').value;
    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount <= 0) {
        showToast("Please enter a valid expense amount.", "error");
        return;
    }

    const expenses = getExpenses();
    expenses.push({
        id: Date.now(),
        category: cat,
        amount: amount
    });

    localStorage.setItem('expenses', JSON.stringify(expenses));
    showToast(`Added expense: Rs. ${amount} for ${cat}`);

    // Clear input
    document.getElementById('exp-amount').value = '';

    // Re-render
    renderExpenses();
    updateNetProfit();
};

// --- Phase 4: Staff Payroll & Advances ---

const renderPayroll = () => {
    const staff = getStaff();

    // Populate dropdown
    const select = document.getElementById('adv-staff');
    if (select && select.options.length <= 1) { // Prevent duplicate options on re-render
        select.innerHTML = '<option value="">-- Select --</option>';
        staff.forEach(s => {
            select.innerHTML += `<option value="${s.name}">${s.name}</option>`;
        });
    }

    // Populate Report Table
    const tbody = document.querySelector('#payroll-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    staff.forEach((s, index) => {
        const netPayable = s.base_salary - (s.advance_taken || 0);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${s.name}</strong></td>
            <td>Rs. ${s.base_salary}</td>
            <td style="color: #f59e0b;">Rs. ${s.advance_taken || 0}</td>
            <td style="color: var(--accent-green); font-weight: 600;">Rs. ${netPayable}</td>
            <td>
                <button class="btn btn-end" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="paySalary('${s.name}', ${netPayable})">Pay Salary</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

const logAdvance = () => {
    const staffName = document.getElementById('adv-staff').value;
    const amountStr = document.getElementById('adv-amount').value;
    const amount = parseFloat(amountStr);

    if (!staffName) {
        showToast("Please select a staff member.", "error");
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        showToast("Enter a valid advance amount.", "error");
        return;
    }

    const staff = getStaff();
    const index = staff.findIndex(s => s.name === staffName);

    if (index !== -1) {
        staff[index].advance_taken = (staff[index].advance_taken || 0) + amount;
        saveStaff(staff);

        showToast(`Logged Rs. ${amount} advance for ${staffName}.`);
        document.getElementById('adv-amount').value = '';

        renderPayroll();
        updateNetProfit();
    }
};

const paySalary = (staffName, netPayable) => {
    if (!confirm(`Confirm Salary Payment of Rs. ${netPayable} for ${staffName}?`)) return;

    // 1. Zero out their advance
    const staff = getStaff();
    const index = staff.findIndex(s => s.name === staffName);
    if (index !== -1) {
        staff[index].advance_taken = 0;
        saveStaff(staff);
    }

    // 2. Log it as an official Expense so it leaves the physical Net Cash pool
    const expenses = getExpenses();
    expenses.push({
        id: Date.now(),
        category: 'Salaries',
        amount: netPayable
    });
    localStorage.setItem('expenses', JSON.stringify(expenses));

    showToast(`Salary Paid to ${staffName}. Ledger Updated.`);

    // 3. Re-render all elements
    renderExpenses();
    renderPayroll();
    updateNetProfit();
};

// --- Phase 6: The Library (Backend Data Architecture) ---

const renderLibraryLogs = () => {
    const annuals = getAnnualMembers();
    const tours = getTournamentMembers();

    const annualList = document.getElementById('annual-list');
    const tourList = document.getElementById('tour-list');

    if (annualList) {
        annualList.innerHTML = '';
        [...annuals].reverse().slice(0, 5).forEach(m => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${m.name} <span style="color:var(--accent-blue)">(${m.member_id})</span></strong> - ${m.phone} <br><span style="font-size:0.75rem;">Exp: ${new Date(m.expiry_date).toLocaleDateString()}</span>`;
            annualList.appendChild(li);
        });
    }

    if (tourList) {
        tourList.innerHTML = '';
        [...tours].reverse().slice(0, 5).forEach(m => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${m.name} <span style="color:#eab308">(${m.member_id})</span></strong> - ${m.tournament_id} <span style="float:right; color:${m.status === 'Paid' ? 'var(--accent-green)' : 'var(--accent-red)'}">${m.status}</span>`;
            tourList.appendChild(li);
        });
    }
};

const addAnnualMember = () => {
    const name = document.getElementById('annual-name').value.trim();
    const phone = document.getElementById('annual-phone').value.trim();
    const startDateInput = document.getElementById('annual-start').value;

    if (!name || !phone || !startDateInput) {
        showToast("Please fill all fields.", "error");
        return;
    }

    const members = getAnnualMembers();

    // Convert YYYY-MM-DD input to timestamp
    const startDateObj = new Date(startDateInput);
    // Explicitly set time to midnight to avoid timezone shifting issues
    startDateObj.setHours(0, 0, 0, 0);
    const startDate = startDateObj.getTime();

    // 1 Year from chosen start date (approx 365 days)
    const expiryDate = startDate + (365 * 24 * 60 * 60 * 1000);

    // Auto-generate JR-A-XXXX
    let nextNum = 1;
    if (members.length > 0) {
        const lastMember = members[members.length - 1];
        if (lastMember.member_id) {
            const parts = lastMember.member_id.split('-');
            if (parts.length === 3) {
                nextNum = parseInt(parts[2], 10) + 1;
            } else {
                nextNum = members.length + 1;
            }
        }
    }
    const memberId = `JR-A-${nextNum.toString().padStart(4, '0')}`;

    members.push({
        id: Date.now(),
        member_id: memberId,
        name,
        phone,
        type: 'Annual',
        fee: 3000,
        start_date: startDate,
        expiry_date: expiryDate
    });

    saveAnnualMembers(members);
    showToast(`Registered Annual Member: ${name}`);

    document.getElementById('annual-name').value = '';
    document.getElementById('annual-phone').value = '';
    document.getElementById('annual-start').value = '';

    renderLibraryLogs();
};

const addTournamentMember = () => {
    const name = document.getElementById('tour-name').value.trim();
    const tourId = document.getElementById('tour-id').value.trim();
    const status = document.getElementById('tour-status').value;

    if (!name || !tourId) {
        showToast("Please fill all fields.", "error");
        return;
    }

    const members = getTournamentMembers();

    // Auto-generate JR-T-500X
    let nextNum = 5001;
    if (members.length > 0) {
        const lastMember = members[members.length - 1];
        if (lastMember.member_id) {
            const parts = lastMember.member_id.split('-');
            if (parts.length === 3) {
                nextNum = parseInt(parts[2], 10) + 1;
            } else {
                nextNum = 5000 + members.length + 1;
            }
        }
    }
    const memberId = `JR-T-${nextNum}`;

    members.push({
        id: Date.now(),
        member_id: memberId,
        name,
        tournament_id: tourId,
        type: 'Tournament',
        fee: 1500,
        status
    });

    saveTournamentMembers(members);
    showToast(`Registered Tournament Participant: ${name}`);

    document.getElementById('tour-name').value = '';
    document.getElementById('tour-id').value = '';

    renderLibraryLogs();
};

// --- Phase 7: CSV Generation & Daily Reset ---

const generateCSVString = () => {
    const income = getDailyIncome();
    const expenses = getExpenses();

    // Headers: S.No, Date, Time, Player_ID/Name, Status, Income_Amount, Expense_Category, Expense_Amount, Payment_Mode, Remarks
    let csv = "S.No,Date,Time,Player_ID/Name,Status,Income_Amount,Expense_Category,Expense_Amount,Payment_Mode,Remarks\n";
    let sno = 1;

    // Process Income
    income.forEach(item => {
        const d = new Date(item.date);
        const dateStr = d.toLocaleDateString();
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Since profile extraction isn't imported from app.js easily here, we'll try to find if they are A/T members by searching the arrays directly to attach the ID to the CSV log.
        let status = 'Non-Member';
        let nameField = item.playerName || 'Unknown';

        const annuals = getAnnualMembers();
        const tours = getTournamentMembers();

        const aMatch = annuals.find(m => m.name.toLowerCase() === nameField.toLowerCase());
        if (aMatch) {
            status = 'Member';
            nameField = `${aMatch.name} (${aMatch.member_id})`;
        } else {
            const tMatch = tours.find(m => m.name.toLowerCase() === nameField.toLowerCase());
            if (tMatch) {
                status = 'Member';
                nameField = `${tMatch.name} (${tMatch.member_id})`;
            }
        }

        // CSV Escape for nameField
        const safeName = `"${nameField.replace(/"/g, '""')}"`;

        csv += `${sno++},${dateStr},${timeStr},${safeName},${status},${item.amount},,,${item.mode},\n`;
    });

    // Process Expenses
    expenses.forEach(item => {
        const d = new Date(item.id);
        const dateStr = d.toLocaleDateString();
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const safeCategory = `"${item.category.replace(/"/g, '""')}"`;

        csv += `${sno++},${dateStr},${timeStr},,,-,${safeCategory},${item.amount},-,\n`;
    });

    return csv;
};

const downloadDailyCSV = () => {
    const csvContent = generateCSVString();

    // Create a Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const d = new Date();
    const dateStamp = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `JR_Snooker_Daily_Report_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Report generated successfully!', 'success');
};

const closeDay = () => {
    if (!confirm("Are you sure you want to CLOSE THE DAY? This will generate a final report and clear the active income/expenses ledgers. Memberships are NOT affected.")) return;

    // 1. Download Final Report
    downloadDailyCSV();

    // 2. Archive to History (Optional local browser backup)
    const history = JSON.parse(localStorage.getItem('report_history') || '[]');
    const todayData = {
        date: Date.now(),
        income: getDailyIncome(),
        expenses: getExpenses()
    };
    history.push(todayData);
    localStorage.setItem('report_history', JSON.stringify(history));

    // 3. Wipe current day
    localStorage.setItem('dailyIncome', JSON.stringify([]));
    localStorage.setItem('expenses', JSON.stringify([]));

    // 4. Reload Views
    renderIncomePortal();
    renderExpenses();
    updateNetProfit();

    showToast('Day closed. Ledgers wiped for a new day.', 'success');
};

document.addEventListener('DOMContentLoaded', () => {
    setupTheme();

    // Phase 8 RBAC
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
        const user = JSON.parse(userStr);
        if (user.role === 'staff') {
            const netProfitBadge = document.getElementById('net-profit-badge');
            const expensePanel = document.getElementById('expense-panel');
            const staffPanel = document.getElementById('staff-panel');
            const csvActionsPanel = document.getElementById('csv-actions-panel');

            if (netProfitBadge) netProfitBadge.style.display = 'none';
            if (expensePanel) expensePanel.style.display = 'none';
            if (staffPanel) staffPanel.style.display = 'none';
            if (csvActionsPanel) csvActionsPanel.style.display = 'none';
        }

        const hasElevated = user.role === 'admin' || (user.permissions && (user.permissions.edit || user.permissions.delete));
        if (hasElevated) {
            // Inject Admin link dynamically into the nav bar
            const nav = document.querySelector('.app-nav');
            if (nav) {
                const logoutLink = nav.querySelector('a[onclick*="logout"]');
                const adminLink = document.createElement('a');
                adminLink.href = 'admin.html';
                adminLink.className = 'nav-link';
                adminLink.textContent = 'Admin Panel';
                adminLink.style.color = 'var(--accent-blue)';
                if (logoutLink) {
                    nav.insertBefore(adminLink, logoutLink);
                } else {
                    nav.appendChild(adminLink);
                }
            }
        }
    }

    renderIncomePortal();
    renderExpenses();
    renderPayroll();
    renderLibraryLogs();
    updateNetProfit();
});
