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

const showCCTVModal = () => {
    const modal = document.getElementById('cctv-modal');
    if (modal) modal.style.display = 'block';
};

const closeCCTVModal = () => {
    const modal = document.getElementById('cctv-modal');
    if (modal) modal.style.display = 'none';
};

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
    if (!tbody) return;
    tbody.innerHTML = '';

    // Sort newest first
    const sorted = [...income].sort((a, b) => b.id - a.id);
    let totalReceived = 0;
    let totalPending = 0;

    const userStr = localStorage.getItem('currentUser');
    const user = userStr ? JSON.parse(userStr) : null;
    const hasElevated = user && (user.role === 'admin' || (user.permissions && user.permissions.delete));

    sorted.forEach((item) => {
        const isPending = item.is_pending === true;
        if (isPending) {
            totalPending += item.amount;
        } else {
            totalReceived += item.amount;
        }

        const tr = document.createElement('tr');
        if (isPending) {
            tr.style.background = 'rgba(255, 51, 51, 0.05)';
        }

        const dateObj = new Date(item.date);
        const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const realIndex = income.findIndex(x => x.id === item.id);

        let deleteBtnHtml = '';
        if (hasElevated) {
            deleteBtnHtml = `<button class="btn btn-end" style="padding: 0.2rem 0.6rem; font-size: 0.8rem;" onclick="deleteIncomeEntry(${realIndex})">Delete</button>`;
        }

        const amountColor = isPending ? 'var(--accent-red)' : 'var(--accent-green)';
        const duesText = isPending ? `Rs. ${item.amount}` : '-';
        const receivedText = isPending ? '-' : `Rs. ${item.amount}`;

        let proofBtnHtml = '';
        if (item.mode === 'Online' && item.proof_image) {
            proofBtnHtml = `<br><button class="btn btn-online" style="margin-top: 0.3rem; padding: 0.2rem 0.4rem; font-size: 0.75rem; width: 100%; text-align: center;" onclick="showProofModal('${item.id}')">View Proof</button>`;
        }

        tr.innerHTML = `
            <td>${timeStr}</td>
            <td><strong>${item.playerName}</strong></td>
            <td style="color: ${isPending ? 'var(--text-secondary)' : 'var(--accent-green)'}; font-weight: 500;">${receivedText}</td>
            <td style="color: var(--accent-red); font-weight: 600;">${duesText}</td>
            <td>
                <span style="font-size: 0.8rem; padding: 0.2rem 0.5rem; background: var(--bg-input); border-radius: 4px; border: 1px solid var(--border-color);">
                    ${item.mode}
                </span>
                ${proofBtnHtml}
            </td>
            <td>${deleteBtnHtml}</td>
        `;
        tbody.appendChild(tr);
    });

    const receivedEl = document.getElementById('total-received');
    const pendingEl = document.getElementById('total-pending');
    
    // Phase 3: Total Pending is now strictly read from the Global Ledger (players array) aggregated balances
    let aggregatedPending = 0;
    const players = JSON.parse(localStorage.getItem('players') || '[]');
    players.forEach(p => { if(p.balance > 0) aggregatedPending += p.balance; });
    
    // Fallback addition incase old pending dailyIncome rows exist
    totalPending += aggregatedPending;

    if (receivedEl) receivedEl.innerText = `Received: Rs. ${totalReceived}`;
    if (pendingEl) pendingEl.innerText = `Pending: Rs. ${totalPending}`;
    
    // Fallback for old UI components
    const oldIncomeEl = document.getElementById('total-income');
    if (oldIncomeEl) oldIncomeEl.innerText = `Total: Rs. ${totalReceived + totalPending}`;
};

window.showProofModal = (transactionId) => {
    const income = getDailyIncome();
    const entry = income.find(x => x.id == transactionId);
    if (entry && entry.proof_image) {
        document.getElementById('proof-modal-img').src = entry.proof_image;
        document.getElementById('proof-modal').style.display = 'block';
    } else {
        showToast("Proof image not found or corrupted.", "error");
    }
};

window.closeProofModal = () => {
    document.getElementById('proof-modal').style.display = 'none';
    document.getElementById('proof-modal-img').src = '';
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
        div.style.background = 'var(--bg-input)';
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

// Utility to process, compress and convert image to Base64
const processImage = (file) => {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve(null);
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400; // Limit size for localStorage safety
                const MAX_HEIGHT = 400;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Compress to 0.7 quality
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                resolve(compressedBase64);
            };
            img.onerror = (err) => {
                console.error("Image load error:", err);
                reject(err);
            };
        };
        reader.onerror = (err) => {
            console.error("FileReader error:", err);
            reject(err);
        };
    });
};

const addAnnualMember = async (event) => {
    if (event) event.preventDefault();
    
    try {
        const name = document.getElementById('annual-name').value.trim();
        const phone = document.getElementById('annual-phone').value.trim();
        const startDateInput = document.getElementById('annual-start').value;
        const photoInput = document.getElementById('annual-photo').files[0];

        if (!name || !phone || !startDateInput) {
            showToast("Please fill all fields.", "error");
            return;
        }

        const annuals = getAnnualMembers();
        const tours = getTournamentMembers();
        const allMembers = [...annuals, ...tours];
        
        if (allMembers.some(m => m.phone === phone)) {
            alert(`Error: The mobile number ${phone} is already registered to another member.`);
            return;
        }

        showToast("Processing registration...", "info");

        // Use the new compression utility
        const photoBase64 = await processImage(photoInput);

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
        
        // Critical UI Feedback
        alert('Member Registered Successfully!');
        showToast(`Registered Annual Member: ${name}`);

        // Reset Form
        document.getElementById('annual-name').value = '';
        document.getElementById('annual-phone').value = '';
        document.getElementById('annual-start').value = '';
        document.getElementById('annual-expiry').value = '';
        document.getElementById('annual-photo').value = '';

        renderLibraryLogs();
        renderMemberDirectory();
    } catch (error) {
        console.error("CRITICAL REGISTRATION ERROR (Annual):", error);
        alert("Registration failed! Check console for details: " + error.message);
    }
};

const addTournamentMember = async (event) => {
    if (event) event.preventDefault();

    try {
        const name = document.getElementById('tour-name').value.trim();
        const tourId = document.getElementById('tour-id').value.trim();
        const phone = document.getElementById('tour-phone').value.trim();
        const status = document.getElementById('tour-status').value;
        const photoInput = document.getElementById('tour-photo').files[0];

        if (!name || !phone || !tourId) {
            showToast("Please fill all fields.", "error");
            return;
        }

        const annuals = getAnnualMembers();
        const tours = getTournamentMembers();
        const allMembers = [...annuals, ...tours];
        
        if (allMembers.some(m => m.phone === phone)) {
            alert(`Error: The mobile number ${phone} is already registered to another member.`);
            return;
        }

        showToast("Processing registration...", "info");

        // Use the new compression utility
        const photoBase64 = await processImage(photoInput);

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
            phone,
            tournament_id: tourId,
            type: 'Tournament',
            fee: 1500,
            status,
            photo: photoBase64
        });

        saveTournamentMembers(members);
        
        // Critical UI Feedback
        alert('Participant Registered Successfully!');
        showToast(`Registered Tournament Participant: ${name}`);

        document.getElementById('tour-name').value = '';
        document.getElementById('tour-phone').value = '';
        document.getElementById('tour-id').value = '';
        document.getElementById('tour-photo').value = '';

        renderLibraryLogs();
        renderMemberDirectory();
    } catch (error) {
        console.error("CRITICAL REGISTRATION ERROR (Tournament):", error);
        alert("Registration failed! Check console for details: " + error.message);
    }
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
            const players = JSON.parse(localStorage.getItem('players') || '[]');

            annuals.forEach(m => {
                const startDate = m.start_date ? new Date(m.start_date).toLocaleDateString() : '-';
                const expiryDate = m.expiry_date ? new Date(m.expiry_date).toLocaleDateString() : (m.start_date ? new Date(new Date(m.start_date).setFullYear(new Date(m.start_date).getFullYear() + 1)).toLocaleDateString() : '-');
                const now = new Date();
                const expiry = m.expiry_date ? new Date(m.expiry_date) : (m.start_date ? new Date(new Date(m.start_date).setFullYear(new Date(m.start_date).getFullYear() + 1)) : null);
                const isExpired = expiry && expiry < now;
                const statusColor = isExpired ? 'var(--accent-red)' : 'var(--accent-green)';
                const statusText = isExpired ? 'Expired' : 'Active';

                // Lookup balance
                const player = players.find(p => (p.member_id && p.member_id === m.member_id) || (p.name && p.name.toLowerCase() === m.name.toLowerCase()));
                const balance = player ? (player.balance || 0) : 0;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><code style="color: var(--accent-blue);">${m.member_id || '-'}</code></td>
                    <td><strong style="cursor: pointer; color: var(--accent-blue); text-decoration: underline;" onclick="openMemberProfile('${m.member_id}', 'Annual')">${m.name || '-'}</strong></td>
                    <td>${m.phone || '-'}</td>
                    <td>${startDate}</td>
                    <td>${expiryDate}</td>
                    <td><span style="color: ${statusColor}; font-weight: 600;">${statusText}</span></td>
                    <td style="color: ${balance > 0 ? 'var(--accent-red)' : 'var(--text-secondary)'}; font-weight: 600;">Rs. ${balance}</td>
                    <td>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn btn-online" style="width:auto; padding:0.25rem 0.5rem; font-size: 0.8rem;" onclick="viewDigitalID('${m.member_id}', 'Annual')" title="View Card">🪪</button>
                            <button class="btn btn-online" style="width:auto; padding:0.25rem 0.5rem; font-size: 0.8rem; background: var(--accent-blue);" onclick="openEditMemberModal('${m.member_id}', 'Annual')" title="Edit Member">✏️</button>
                            <button class="btn btn-end" style="width:auto; padding:0.25rem 0.5rem; font-size: 0.8rem;" onclick="deleteMember('${m.member_id}', 'Annual')" title="Delete Member">🗑️</button>
                        </div>
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
            const players = JSON.parse(localStorage.getItem('players') || '[]');

            tours.forEach(m => {
                const isPaid = (m.status || '').toLowerCase() === 'paid';
                const badgeColor = isPaid ? 'var(--accent-green)' : 'var(--accent-warning)';

                // Lookup balance by member_id or name
                const player = players.find(p => (p.member_id && p.member_id === m.member_id) || (p.name && p.name.toLowerCase() === m.name.toLowerCase()));
                const balance = player ? (player.balance || 0) : 0;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><code style="color: var(--accent-warning);">${m.member_id || '-'}</code></td>
                    <td><strong style="cursor: pointer; color: var(--accent-blue); text-decoration: underline;" onclick="openMemberProfile('${m.member_id}', 'Tournament')">${m.name || '-'}</strong></td>
                    <td>${m.tournament_id || '-'}</td>
                    <td><span style="color: ${badgeColor}; font-weight: 600;">${m.status || 'Unknown'}</span></td>
                    <td style="color: ${balance > 0 ? 'var(--accent-red)' : 'var(--text-secondary)'}; font-weight: 600;">Rs. ${balance}</td>
                    <td>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn btn-online" style="width:auto; padding:0.25rem 0.5rem; font-size: 0.8rem;" onclick="viewDigitalID('${m.member_id}', 'Tournament')" title="View Card">🪪</button>
                            <button class="btn btn-online" style="width:auto; padding:0.25rem 0.5rem; font-size: 0.8rem; background: var(--accent-blue);" onclick="openEditMemberModal('${m.member_id}', 'Tournament')" title="Edit Member">✏️</button>
                            <button class="btn btn-end" style="width:auto; padding:0.25rem 0.5rem; font-size: 0.8rem;" onclick="deleteMember('${m.member_id}', 'Tournament')" title="Delete Member">🗑️</button>
                        </div>
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

// ==========================================
// Member Directory CRUD Logic
// ==========================================

const deleteMember = (memberId, type) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete member ${memberId}? This action cannot be undone.`)) return;

    if (type === 'Annual') {
        let members = getAnnualMembers();
        members = members.filter(m => m.member_id !== memberId);
        saveAnnualMembers(members);
    } else {
        let members = getTournamentMembers();
        members = members.filter(m => m.member_id !== memberId);
        saveTournamentMembers(members);
    }

    renderMemberDirectory();
    renderLibraryLogs();
    showToast(`Member ${memberId} deleted successfully.`, "error");
};

const openEditMemberModal = (memberId, type) => {
    const titleEl = document.getElementById('edit-member-title');
    const modal = document.getElementById('edit-member-modal');
    const annualFields = document.getElementById('annual-edit-fields');
    const tourFields = document.getElementById('tour-edit-fields');

    document.getElementById('edit-member-id').value = memberId;
    document.getElementById('edit-member-type').value = type;

    if (type === 'Annual') {
        const members = getAnnualMembers();
        const member = members.find(m => m.member_id === memberId);
        if (!member) return;

        titleEl.textContent = "Edit Annual Member";
        document.getElementById('edit-member-name').value = member.name;
        document.getElementById('edit-member-phone').value = member.phone || '';
        if (member.start_date) {
            const d = new Date(member.start_date);
            document.getElementById('edit-member-start').value = d.toISOString().split('T')[0];
        }

        annualFields.style.display = 'block';
        tourFields.style.display = 'none';
    } else {
        const members = getTournamentMembers();
        const member = members.find(m => m.member_id === memberId);
        if (!member) return;

        titleEl.textContent = "Edit Tournament Participant";
        document.getElementById('edit-member-name').value = member.name;
        document.getElementById('edit-member-tour-id').value = member.tournament_id || '';
        document.getElementById('edit-member-status').value = member.status || 'Paid';

        annualFields.style.display = 'none';
        tourFields.style.display = 'block';
    }

    modal.style.display = 'block';
};

const closeEditMemberModal = () => {
    document.getElementById('edit-member-modal').style.display = 'none';
};

// Handle Form Submission
document.getElementById('edit-member-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const memberId = document.getElementById('edit-member-id').value;
    const type = document.getElementById('edit-member-type').value;

    if (type === 'Annual') {
        let members = getAnnualMembers();
        const index = members.findIndex(m => m.member_id === memberId);
        if (index !== -1) {
            members[index].name = document.getElementById('edit-member-name').value;
            members[index].phone = document.getElementById('edit-member-phone').value;
            const startDate = document.getElementById('edit-member-start').value;
            if (startDate) {
                const start = new Date(startDate);
                members[index].start_date = start.getTime();
                const expiry = new Date(start);
                expiry.setFullYear(start.getFullYear() + 1);
                members[index].expiry_date = expiry.getTime();
            }
            saveAnnualMembers(members);
        }
    } else {
        let members = getTournamentMembers();
        const index = members.findIndex(m => m.member_id === memberId);
        if (index !== -1) {
            members[index].name = document.getElementById('edit-member-name').value;
            members[index].tournament_id = document.getElementById('edit-member-tour-id').value;
            members[index].status = document.getElementById('edit-member-status').value;
            saveTournamentMembers(members);
        }
    }

    closeEditMemberModal();
    renderMemberDirectory();
    renderLibraryLogs();
    showToast("Member details updated successfully.");
});

// ==========================================
// Phase 1: Universal Search & Profile Dashboard
// ==========================================

// Attach event listener directly to search bar if it exists
document.addEventListener('DOMContentLoaded', () => {
    const searchBar = document.getElementById('member-search-bar');
    if (searchBar) {
        searchBar.addEventListener('input', filterMemberDirectory);
    }
});

const filterMemberDirectory = () => {
    const input = document.getElementById('member-search-bar');
    if (!input) return;
    
    const filter = input.value.toLowerCase().trim();

    // Tables to filter
    const annualTable = document.getElementById('dir-annual-tbody');
    const tourTable = document.getElementById('dir-tour-tbody');

    const tables = [annualTable, tourTable];

    tables.forEach(tbody => {
        if (!tbody) return;
        const trs = tbody.getElementsByTagName('tr');
        for (let i = 0; i < trs.length; i++) {
            // Only look at the first two columns (ID and Name) generally
            const tdId = trs[i].getElementsByTagName('td')[0];
            const tdName = trs[i].getElementsByTagName('td')[1];

            if (tdId && tdName) {
                const idValue = tdId.textContent || tdId.innerText;
                const nameValue = tdName.textContent || tdName.innerText;

                if (idValue.toLowerCase().indexOf(filter) > -1 || nameValue.toLowerCase().indexOf(filter) > -1) {
                    trs[i].style.display = "";
                } else {
                    trs[i].style.display = "none";
                }
            }
        }
    });
};

const openMemberProfile = (memberId, type) => {
    let member = null;

    if (type === 'Annual') {
        const members = getAnnualMembers();
        member = members.find(m => m.member_id === memberId);
    } else {
        const members = getTournamentMembers();
        member = members.find(m => m.member_id === memberId);
    }

    if (!member) {
        showToast("Error locating member properties.", "error");
        return;
    }

    document.getElementById('profile-name').textContent = member.name || 'Unknown';
    document.getElementById('profile-id').textContent = `ID: ${member.member_id}`;
    
    const d = member.start_date ? new Date(member.start_date) : new Date(member.id || Date.now());
    document.getElementById('profile-join-date').textContent = `Join Date: ${d.toLocaleDateString()}`;
    
    const typeBadge = document.getElementById('profile-type');
    typeBadge.textContent = type;
    if (type === 'Annual') {
        typeBadge.style.backgroundColor = "rgba(56,189,248,0.2)";
        typeBadge.style.color = "var(--accent-blue)";
    } else {
        typeBadge.style.backgroundColor = "rgba(234,179,8,0.2)";
        typeBadge.style.color = "var(--accent-warning)";
    }

    const photoEl = document.getElementById('profile-photo');
    if (member.photo) {
        photoEl.src = member.photo;
        photoEl.style.display = 'block';
    } else {
        photoEl.src = '';
        photoEl.style.display = 'none';
    }

    // Modal view triggers
    document.getElementById('member-profile-modal').style.display = 'block';
};

const closeMemberProfileModal = () => {
    document.getElementById('member-profile-modal').style.display = 'none';
};

window.calculateAnnualExpiry = calculateAnnualExpiry;
window.processImage = processImage;
window.addAnnualMember = addAnnualMember;
window.addTournamentMember = addTournamentMember;
window.viewDigitalID = viewDigitalID;
window.closeIDCardModal = closeIDCardModal;
window.printIDCard = printIDCard;
window.deleteMember = deleteMember;
window.openEditMemberModal = openEditMemberModal;
window.closeEditMemberModal = closeEditMemberModal;
window.filterMemberDirectory = filterMemberDirectory;
window.openMemberProfile = openMemberProfile;
window.closeMemberProfileModal = closeMemberProfileModal;
window.logout = logout;
window.showCCTVModal = showCCTVModal;
window.closeCCTVModal = closeCCTVModal;
window.toggleTheme = toggleTheme;
window.setupTheme = setupTheme;
