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

    // Add Delete headers if elevated
    const thead = document.querySelector('#income-table thead tr');
    if (thead.cells.length === 4) {
        const th = document.createElement('th');
        th.innerText = 'Action';
        th.style.textAlign = 'right';
        thead.appendChild(th);
    }

    sorted.forEach((item) => {
        total += item.amount;
        const tr = document.createElement('tr');

        const dateObj = new Date(item.date);
        const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Find true original index in the unsorted array
        const realIndex = income.findIndex(x => x.id === item.id);

        let deleteBtnHtml = '';
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
            const user = JSON.parse(userStr);
            const hasElevated = user.role === 'admin' || (user.permissions && user.permissions.delete);
            if (hasElevated) {
                deleteBtnHtml = `<button class="btn btn-end" style="padding: 0.2rem 0.6rem; font-size: 0.8rem; margin-left: 1rem;" onclick="deleteIncomeEntry(${realIndex})">Delete</button>`;
            }
        }

        tr.innerHTML = `
            <td>${timeStr}</td>
            <td><strong>${item.playerName}</strong></td>
            <td style="color: var(--accent-green); font-weight: 500;">Rs. ${item.amount}</td>
            <td style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.8rem; padding: 0.2rem 0.5rem; background: rgba(0,0,0,0.2); border-radius: 4px; border: 1px solid var(--border-color);">
                    ${item.mode}
                </span>
                ${deleteBtnHtml}
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('total-income').innerText = `Total: Rs. ${total}`;
};

window.deleteIncomeEntry = (index) => {
    if (confirm("Are you sure you want to Delete this income entry?")) {
        let income = getDailyIncome();
        income.splice(index, 1);
        localStorage.setItem('dailyIncome', JSON.stringify(income));
        renderIncomePortal();
        updateNetProfit();
        showToast("Income record deleted.", "error");
        window.dispatchEvent(new Event('storage'));
    }
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
            li.style.display = 'flex';
            li.style.gap = '10px';
            li.style.alignItems = 'center';
            li.style.marginBottom = '8px';
            const photoSrc = m.photo || 'logo.png';
            li.innerHTML = `
                <img src="${photoSrc}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid var(--accent-blue);">
                <div>
                    <strong>${m.name} <span style="color:var(--accent-blue)">(${m.member_id})</span></strong><br>
                    <span style="font-size:0.75rem; color:var(--text-secondary);">Exp: ${new Date(m.expiry_date).toLocaleDateString()}</span>
                </div>
            `;
            annualList.appendChild(li);
        });
    }

    if (tourList) {
        tourList.innerHTML = '';
        [...tours].reverse().slice(0, 5).forEach(m => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.gap = '10px';
            li.style.alignItems = 'center';
            li.style.marginBottom = '8px';
            const photoSrc = m.photo || 'logo.png';
            li.innerHTML = `
                <img src="${photoSrc}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid var(--accent-warning);">
                <div>
                    <strong>${m.name} <span style="color:#eab308">(${m.member_id})</span></strong><br>
                    <span style="font-size:0.75rem; color:var(--text-secondary);">${m.tournament_id}</span>
                    <span style="float:right; color:${m.status === 'Paid' ? 'var(--accent-green)' : 'var(--accent-red)'}">${m.status}</span>
                </div>
            `;
            tourList.appendChild(li);
        });
    }
};

const calculateAnnualExpiry = () => {
    const startInput = document.getElementById('annual-start').value;
    const expiryDisplay = document.getElementById('annual-expiry');
    if (startInput) {
        const start = new Date(startInput);
        const expiry = new Date(start);
        expiry.setFullYear(start.getFullYear() + 1);
        expiryDisplay.value = expiry.toLocaleDateString();
    }
};

const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
};

const addAnnualMember = async () => {
    const name = document.getElementById('annual-name').value.trim();
    const phone = document.getElementById('annual-phone').value.trim();
    const startDateInput = document.getElementById('annual-start').value;
    const photoInput = document.getElementById('annual-photo').files[0];

    if (!name || !phone || !startDateInput) {
        showToast("Please fill all fields.", "error");
        return;
    }

    let photoBase64 = null;
    if (photoInput) {
        photoBase64 = await fileToBase64(photoInput);
    }

    const members = getAnnualMembers();
    const startDateObj = new Date(startDateInput);
    startDateObj.setHours(0, 0, 0, 0);
    const startDate = startDateObj.getTime();
    const expiryDate = startDate + (365 * 24 * 60 * 60 * 1000);

    let nextNum = 1;
    if (members.length > 0) {
        const sortedIds = members.map(m => {
            const parts = (m.member_id || '').split('-');
            return parts.length === 3 ? parseInt(parts[2], 10) : 0;
        }).filter(n => !isNaN(n));
        if (sortedIds.length > 0) nextNum = Math.max(...sortedIds) + 1;
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
        expiry_date: expiryDate,
        photo: photoBase64
    });

    saveAnnualMembers(members);
    showToast(`Registered Annual Member: ${name}`);

    // Reset Form
    document.getElementById('annual-name').value = '';
    document.getElementById('annual-phone').value = '';
    document.getElementById('annual-start').value = '';
    document.getElementById('annual-expiry').value = '';
    document.getElementById('annual-photo').value = '';

    renderLibraryLogs();
    renderMemberDirectory();
};

const addTournamentMember = async () => {
    const name = document.getElementById('tour-name').value.trim();
    const tourId = document.getElementById('tour-id').value.trim();
    const status = document.getElementById('tour-status').value;
    const photoInput = document.getElementById('tour-photo').files[0];

    if (!name || !tourId) {
        showToast("Please fill all fields.", "error");
        return;
    }

    let photoBase64 = null;
    if (photoInput) {
        photoBase64 = await fileToBase64(photoInput);
    }

    const members = getTournamentMembers();
    let nextNum = 5001;
    if (members.length > 0) {
        const sortedIds = members.map(m => {
            const parts = (m.member_id || '').split('-');
            return parts.length === 3 ? parseInt(parts[2], 10) : 5000;
        }).filter(n => !isNaN(n));
        if (sortedIds.length > 0) nextNum = Math.max(...sortedIds) + 1;
    }
    const memberId = `JR-T-${nextNum}`;

    members.push({
        id: Date.now(),
        member_id: memberId,
        name,
        tournament_id: tourId,
        type: 'Tournament',
        fee: 1500,
        status,
        photo: photoBase64
    });

    saveTournamentMembers(members);
    showToast(`Registered Tournament Participant: ${name}`);

    document.getElementById('tour-name').value = '';
    document.getElementById('tour-id').value = '';
    document.getElementById('tour-photo').value = '';

    renderLibraryLogs();
    renderMemberDirectory();
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

        const aMatch = annuals.find(m => m.name && typeof m.name === 'string' && m.name.toLowerCase() === String(nameField).toLowerCase());
        if (aMatch) {
            status = 'Member';
            nameField = `${aMatch.name} (${aMatch.member_id})`;
        } else {
            const tMatch = tours.find(m => m.name && typeof m.name === 'string' && m.name.toLowerCase() === String(nameField).toLowerCase());
            if (tMatch) {
                status = 'Member';
                nameField = `${tMatch.name} (${tMatch.member_id})`;
            }
        }

        // CSV Escape for nameField
        const safeNameStr = String(nameField || '');
        const safeName = `"${safeNameStr.replace(/"/g, '""')}"`;

        csv += `${sno++},${dateStr},${timeStr},${safeName},${status},${item.amount || 0},,,${item.mode || 'Cash'},\n`;
    });

    // Process Expenses
    expenses.forEach(item => {
        const d = new Date(item.id);
        const dateStr = d.toLocaleDateString();
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const catStr = String(item.category || 'Unknown');
        const safeCategory = `"${catStr.replace(/"/g, '""')}"`;

        csv += `${sno++},${dateStr},${timeStr},,,-,${safeCategory},${item.amount || 0},-,\n`;
    });

    return csv;
};

// ==========================================================
// Phase 7: XLS Export Engine (SheetJS)
// ==========================================================

const downloadDailyXLS = () => {
    const income = getDailyIncome();
    const expenses = getExpenses();
    const d = new Date();
    const dateStamp = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

    if (!window.XLSX) {
        showToast('Excel library not loaded. Check internet connection.', 'error');
        return;
    }

    // --- Income Sheet ---
    const incomeRows = [
        ['#', 'Time', 'Player / Name', 'Member Status', 'Amount (PKR)', 'Payment Mode']
    ];
    const annuals = getAnnualMembers();
    const tours = getTournamentMembers();

    income.forEach((item, i) => {
        const dt = new Date(item.date);
        const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        let status = 'Non-Member';
        let nameField = String(item.playerName || 'Unknown');

        const aMatch = annuals.find(m => m.name && m.name.toLowerCase() === nameField.toLowerCase());
        if (aMatch) { status = 'Annual Member'; nameField = `${aMatch.name} (${aMatch.member_id})`; }
        else {
            const tMatch = tours.find(m => m.name && m.name.toLowerCase() === nameField.toLowerCase());
            if (tMatch) { status = 'Tournament'; nameField = `${tMatch.name} (${tMatch.member_id})`; }
        }
        incomeRows.push([i + 1, timeStr, nameField, status, item.amount || 0, item.mode || 'Cash']);
    });

    // Totals row
    const totalIncome = income.reduce((sum, x) => sum + (x.amount || 0), 0);
    incomeRows.push([]);
    incomeRows.push(['', '', '', 'TOTAL INCOME', totalIncome, '']);

    // --- Expense Sheet ---
    const expenseRows = [
        ['#', 'Time', 'Category', 'Amount (PKR)']
    ];
    expenses.forEach((item, i) => {
        const dt = new Date(item.id);
        const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        expenseRows.push([i + 1, timeStr, item.category || 'Unknown', item.amount || 0]);
    });
    const totalExpenses = expenses.reduce((sum, x) => sum + (x.amount || 0), 0);
    expenseRows.push([]);
    expenseRows.push(['', '', 'TOTAL EXPENSES', totalExpenses]);

    // Build workbook
    const wb = XLSX.utils.book_new();
    const wsIncome = XLSX.utils.aoa_to_sheet(incomeRows);
    const wsExpenses = XLSX.utils.aoa_to_sheet(expenseRows);
    XLSX.utils.book_append_sheet(wb, wsIncome, 'Daily Income');
    XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expenses');

    XLSX.writeFile(wb, `JR_Snooker_Daily_Report_${dateStamp}.xlsx`);
    showToast('Daily Report exported as Excel!', 'success');
};

// Keep old CSV as fallback (used by closeDay archiving)
const downloadDailyCSV = () => downloadDailyXLS();

const closeDay = () => {
    if (!confirm("Are you sure you want to CLOSE THE DAY? This will generate a final report and clear the active income/expenses ledgers. Memberships are NOT affected.")) return;

    // 1. Download Final Report as XLS
    downloadDailyXLS();

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
            // Un-hide Admin link in the sidebar
            const adminIcon = document.getElementById('admin-nav-icon');
            if (adminIcon) {
                adminIcon.style.display = 'flex';
            }
        }
    }

    renderIncomePortal();
    renderExpenses();
    renderPayroll();
    renderLibraryLogs();
    renderMemberDirectory();
    updateNetProfit();
});

// ==========================================================
// Member Directory Render
// ==========================================================

const renderMemberDirectory = () => {
    const annuals = getAnnualMembers();
    const tours = getTournamentMembers();

    // --- Annual Members Table ---
    const annualTbody = document.getElementById('dir-annual-tbody');
    if (annualTbody) {
        annualTbody.innerHTML = '';
        if (annuals.length === 0) {
            annualTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-secondary);">No Annual Members registered yet.</td></tr>`;
        } else {
            annuals.forEach(m => {
                const startDate = m.start_date ? new Date(m.start_date).toLocaleDateString() : '-';
                const expiryDate = m.expiry_date ? new Date(m.expiry_date).toLocaleDateString() : (m.start_date ? new Date(new Date(m.start_date).setFullYear(new Date(m.start_date).getFullYear() + 1)).toLocaleDateString() : '-');
                const now = new Date();
                const expiry = m.expiry_date ? new Date(m.expiry_date) : (m.start_date ? new Date(new Date(m.start_date).setFullYear(new Date(m.start_date).getFullYear() + 1)) : null);
                const isExpired = expiry && expiry < now;
                const statusColor = isExpired ? 'var(--accent-red)' : 'var(--accent-green)';
                const statusText = isExpired ? 'Expired' : 'Active';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><code style="color: var(--accent-blue);">${m.member_id || '-'}</code></td>
                    <td><strong>${m.name || '-'}</strong></td>
                    <td>${m.phone || '-'}</td>
                    <td>${startDate}</td>
                    <td>${expiryDate}</td>
                    <td><span style="color: ${statusColor}; font-weight: 600; margin-right: 1rem;">${statusText}</span>
                        <button class="btn btn-online" style="display:inline-block; width:auto; padding:0.25rem 0.75rem; font-size: 0.75rem;" onclick="viewDigitalID('${m.member_id}', 'Annual')">View Card</button>
                    </td>
                `;
                annualTbody.appendChild(tr);
            });
        }
    }

    // --- Tournament Members Table ---
    const tourTbody = document.getElementById('dir-tour-tbody');
    if (tourTbody) {
        tourTbody.innerHTML = '';
        if (tours.length === 0) {
            tourTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-secondary);">No Tournament Participants registered yet.</td></tr>`;
        } else {
            tours.forEach(m => {
                const isPaid = (m.status || '').toLowerCase() === 'paid';
                const badgeColor = isPaid ? 'var(--accent-green)' : 'var(--accent-warning)';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><code style="color: var(--accent-warning);">${m.member_id || '-'}</code></td>
                    <td><strong>${m.name || '-'}</strong></td>
                    <td>${m.tournament_id || '-'}</td>
                    <td style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: ${badgeColor}; font-weight: 600;">${m.status || 'Unknown'}</span>
                        <button class="btn btn-online" style="display:inline-block; width:auto; padding:0.25rem 0.75rem; font-size: 0.75rem;" onclick="viewDigitalID('${m.member_id}', 'Tournament')">View Card</button>
                    </td>
                `;
                tourTbody.appendChild(tr);
            });
        }
    }
};

// Member Directory Export (.xlsx)
const exportMembersXLS = () => {
    if (!window.XLSX) {
        showToast('Excel library not loaded. Check internet connection.', 'error');
        return;
    }

    const annuals = getAnnualMembers();
    const tours = getTournamentMembers();
    const d = new Date();
    const dateStamp = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

    // Annual sheet
    const annualRows = [['Member ID', 'Name', 'Phone', 'Start Date', 'Expiry Date', 'Status']];
    annuals.forEach(m => {
        const startDate = m.start_date ? new Date(m.start_date).toLocaleDateString() : '-';
        const expiry = m.expiry_date ? new Date(m.expiry_date) : (m.start_date ? new Date(new Date(m.start_date).setFullYear(new Date(m.start_date).getFullYear() + 1)) : null);
        const expiryStr = expiry ? expiry.toLocaleDateString() : '-';
        const status = expiry && expiry < new Date() ? 'Expired' : 'Active';
        annualRows.push([m.member_id || '', m.name || '', m.phone || '', startDate, expiryStr, status]);
    });

    // Tournament sheet
    const tourRows = [['Member ID', 'Name', 'Tournament / ID', 'Payment Status']];
    tours.forEach(m => {
        tourRows.push([m.member_id || '', m.name || '', m.tournament_id || '', m.status || 'Unknown']);
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(annualRows), 'Annual Members');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tourRows), 'Tournament');
    XLSX.writeFile(wb, `JR_Snooker_Members_${dateStamp}.xlsx`);
    showToast('Member Directory exported as Excel!', 'success');
};
const viewDigitalID = (memberId, type) => {
    let member = null;
    if (type === 'Annual') {
        member = getAnnualMembers().find(m => m.member_id === memberId);
    } else {
        member = getTournamentMembers().find(m => m.member_id === memberId);
    }

    if (!member) return;

    const renderArea = document.getElementById('id-card-render-area');
    const photoSrc = member.photo || 'logo.png';
    const accentColor = type === 'Annual' ? 'var(--accent-blue)' : 'var(--accent-warning)';

    renderArea.innerHTML = `
        <div class="digital-id-card glass printable-card" id="printable-id-card">
            <div class="id-card-inner">
                <div class="id-card-header">
                    <img src="logo.png" alt="JR Logo" class="id-card-logo">
                    <div class="id-card-club-name">
                        <span style="color: white; font-weight: 700; font-size: 1.2rem;">JR Snooker Lounge</span>
                        <span style="color: ${accentColor}; font-size: 0.7rem; letter-spacing: 1px;">PREMIUM MEMBER</span>
                    </div>
                </div>
                
                <div class="id-card-body">
                    <div class="id-card-photo-box" style="border-color: ${accentColor}">
                        <img src="${photoSrc}" alt="Photo">
                    </div>
                    <div class="id-card-details">
                        <h2 style="color: white; margin-bottom: 0.25rem;">${member.name}</h2>
                        <div style="font-family: monospace; font-size: 0.9rem; color: ${accentColor}; margin-bottom: 0.5rem; letter-spacing: 1px;">${member.member_id}</h2>
                        
                        <div class="id-detail-row">
                            <span class="id-detail-label">TYPE:</span>
                            <span class="id-detail-val">${type.toUpperCase()}</span>
                        </div>
                        ${member.phone ? `
                        <div class="id-detail-row">
                            <span class="id-detail-label">PHONE:</span>
                            <span class="id-detail-val">${member.phone}</span>
                        </div>` : ''}
                        ${member.expiry_date ? `
                        <div class="id-detail-row" style="color: var(--accent-red)">
                            <span class="id-detail-label">EXPIRY:</span>
                            <span class="id-detail-val">${new Date(member.expiry_date).toLocaleDateString()}</span>
                        </div>` : ''}
                    </div>
                </div>
                
                <div class="id-card-footer">
                    <div class="id-card-seal" style="background: ${accentColor}">JR</div>
                    <div style="font-size: 0.6rem; color: var(--text-secondary);">VALID AT ALL BRANCHES</div>
                </div>
            </div>
            
            <div class="id-card-glow" style="background: ${accentColor}"></div>
        </div>
    `;

    document.getElementById('id-card-modal').style.display = 'flex';
};

const closeIDCardModal = () => {
    document.getElementById('id-card-modal').style.display = 'none';
};

const printIDCard = () => {
    window.print();
};

window.calculateAnnualExpiry = calculateAnnualExpiry;
window.viewDigitalID = viewDigitalID;
window.closeIDCardModal = closeIDCardModal;
window.printIDCard = printIDCard;
