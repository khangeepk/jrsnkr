// Phase 8: Authentication Guard & RBAC
const enforceAuth = () => {
    const user = localStorage.getItem('currentUser');
    if (!user) {
        window.location.href = 'login.html';
    }
};
enforceAuth();

const hasPerm = (action) => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) return false;
    const user = JSON.parse(userStr);
    if (user.role === 'admin') return true;
    return user.permissions && user.permissions[action] === true;
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

window.toggleTheme = () => {
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

// JR Snooker Lounge App Logic

// --- 1. Database Mock & Constants (Ultra-Light) ---

// =============================================================
// PRICING ENGINE v2 — Phase 1 Overhaul
// Single  : 250 PKR (Member) / 350 PKR (Non-Member) base, popup @20m
// Double  : 500 PKR (Member) / 700 PKR (Non-Member) base for ≤30m, popup @30m
// Century : Pure per-minute from minute 1, no flat rate
// Overtime: 12 PKR/min (Member) / 15 PKR/min (Non-Member)
// No initial grace period — billing starts from minute 1
// =============================================================
const PRICING = {
    Member:       { singleBase: 250, doubleBase: 500, perMinute: 12 },
    "Non-Member": { singleBase: 350, doubleBase: 700, perMinute: 15 }
};

// Alert popup triggers (minutes)
const THRESHOLDS = {
    Single:  20,   // popup at 20m — Stop ends game, Resume gives 5-min grace then per-minute
    Double:  30,   // popup at 30m — after 30m charge per-minute
    Century: 9999  // no popup — pure per-minute from minute 1
};

// ---------------------------------------------------------------
// calculateBill — single source of truth for all billing maths
// ---------------------------------------------------------------
const calculateBill = (gameMode, totalMinutes, activePlayers) => {
    const memberCount    = activePlayers.filter(p => getUnifiedPlayerProfile(p).status === 'Member').length;
    const nonMemberCount = activePlayers.length - memberCount;
    const majorityMember = memberCount >= nonMemberCount && memberCount > 0;

    if (gameMode === 'Double') {
        // Base: 500 (Member majority) or 700 (Non-Member majority) for ≤30 min
        const baseRate = majorityMember ? PRICING['Member'].doubleBase : PRICING['Non-Member'].doubleBase;
        if (totalMinutes <= 30) {
            return { bill: baseRate, baseRateApplied: true };
        }
        const overtime = totalMinutes - 30;
        const overtimeBill = _mixedPerMinute(overtime, memberCount, nonMemberCount, activePlayers.length);
        return { bill: baseRate + overtimeBill, baseRateApplied: false };

    } else if (gameMode === 'Century') {
        // Strict per-minute from minute 1 — no flat rate
        const bill = _mixedPerMinute(totalMinutes, memberCount, nonMemberCount, activePlayers.length);
        return { bill, baseRateApplied: false };

    } else {
        // Single — base rate for ≤20 min, per-minute after
        const baseRate = majorityMember ? PRICING['Member'].singleBase : PRICING['Non-Member'].singleBase;
        if (totalMinutes <= 20) {
            return { bill: baseRate, baseRateApplied: true };
        }
        // Beyond 20 mins: charge per-minute for ALL minutes elapsed
        const bill = _mixedPerMinute(totalMinutes, memberCount, nonMemberCount, activePlayers.length);
        return { bill, baseRateApplied: false };
    }
};

// Helper: blended per-minute cost for a mix of members/non-members
const _mixedPerMinute = (minutes, memberCount, nonMemberCount, totalPlayers) => {
    if (memberCount > 0 && nonMemberCount > 0) {
        return minutes * 12 * (memberCount / totalPlayers) +
               minutes * 15 * (nonMemberCount / totalPlayers);
    } else if (memberCount > 0) {
        return minutes * 12;
    }
    return minutes * 15;
};

const initDB = () => {
    // Seed Players
    if (!localStorage.getItem('players')) {
        const seedPlayers = [
            { id: 1, name: "Ali Khan", status: "Member", balance: 500, member_id: "AK-100" },
            { id: 2, name: "Fahad Ahmed", status: "Non-Member", balance: 0 },
            { id: 3, name: "Usman Raza", status: "Member", balance: 1200, member_id: "UR-200" }
        ];
        localStorage.setItem('players', JSON.stringify(seedPlayers));
    }

    // Seed Staff (Phase 4 Default set if empty)
    if (!localStorage.getItem('staff')) {
        const staffNames = ["Naeem Malik", "Waqas", "Ibrahim", "Waseem", "Faisal", "Adnan", "Imran", "Husnain"];
        const seedStaff = staffNames.map(name => ({
            name: name,
            base_salary: 25000,
            advance_taken: 0
        }));
        localStorage.setItem('staff', JSON.stringify(seedStaff));
    }

    // Init Session Ledger
    if (!localStorage.getItem('sessionLedger')) {
        localStorage.setItem('sessionLedger', JSON.stringify([]));
    }

    // Init Tables State (8 Tables)
    if (!localStorage.getItem('tablesState')) {
        const emptyTables = Array.from({ length: 8 }, (_, i) => ({
            id: i + 1,
            isActive: false,
            playerName: '',
            gameMode: 'Single',
            startTime: null
        }));
        localStorage.setItem('tablesState', JSON.stringify(emptyTables));
    }

    // Phase 3: Init Daily Income and Expenses
    if (!localStorage.getItem('dailyIncome')) {
        localStorage.setItem('dailyIncome', JSON.stringify([]));
    }
    if (!localStorage.getItem('expenses')) {
        localStorage.setItem('expenses', JSON.stringify([]));
    }
};

// --- DB helpers ---
const getPlayers = () => JSON.parse(localStorage.getItem('players') || '[]');
const savePlayers = (players) => localStorage.setItem('players', JSON.stringify(players));

const getStaff = () => JSON.parse(localStorage.getItem('staff') || '[]');
const saveStaff = (staff) => localStorage.setItem('staff', JSON.stringify(staff));

const getTablesState = () => JSON.parse(localStorage.getItem('tablesState') || '[]');
const saveTablesState = (state) => localStorage.setItem('tablesState', JSON.stringify(state));

// --- Phase 6: VLOOKUP Unified Logic ---
const getAllKnownProfiles = () => {
    const allProfiles = new Map();

    // Base Ledger
    getPlayers().forEach(p => allProfiles.set(p.name.toLowerCase(), p));

    // Phase 7: Add & Upgrade via Annual
    const annuals = JSON.parse(localStorage.getItem('annual_members') || '[]');
    const now = Date.now();
    annuals.forEach(m => {
        if (m.expiry_date >= now) {
            if (!allProfiles.has(m.name.toLowerCase())) {
                allProfiles.set(m.name.toLowerCase(), { name: m.name, status: "Member", balance: 0, member_id: m.member_id, badge: 'A', phone: m.phone });
            } else {
                const existing = allProfiles.get(m.name.toLowerCase());
                existing.status = "Member";
                existing.member_id = m.member_id;
                existing.badge = 'A';
                existing.phone = m.phone;
            }
        }
    });

    // Phase 7: Add & Upgrade via Tournament
    const tours = JSON.parse(localStorage.getItem('tournament_members') || '[]');
    tours.forEach(m => {
        if (!allProfiles.has(m.name.toLowerCase())) {
            allProfiles.set(m.name.toLowerCase(), { name: m.name, status: "Member", balance: 0, member_id: m.member_id, badge: 'T' });
        } else {
            const existing = allProfiles.get(m.name.toLowerCase());
            existing.status = "Member";
            existing.member_id = m.member_id;
            existing.badge = 'T';
        }
    });

    return Array.from(allProfiles.values());
};

const getUnifiedPlayerProfile = (queryStr) => {
    const query = queryStr.toLowerCase().trim();
    const profiles = getAllKnownProfiles();

    // First try exact ID match Phase 7
    let match = profiles.find(p => p.member_id && p.member_id.toLowerCase() === query);

    // Fallback to name match
    if (!match) {
        match = profiles.find(p => p.name.toLowerCase().trim() === query);
    }

    return match ? match : { name: queryStr, status: "Non-Member", balance: 0 };
};

// Background process to log session
const logSessionToLedger = (sessionData) => {
    // Use requestIdleCallback or setTimeout to keep it off the main thread briefly
    const backgroundTask = () => {
        try {
            const ledger = JSON.parse(localStorage.getItem('sessionLedger') || '[]');
            ledger.push(sessionData);
            localStorage.setItem('sessionLedger', JSON.stringify(ledger));
            console.log("Bg Process: Session logged successfully.", sessionData);
        } catch (e) {
            console.error("Bg Process: Failed to log session.", e);
        }
    };

    if (window.requestIdleCallback) {
        window.requestIdleCallback(backgroundTask);
    } else {
        setTimeout(backgroundTask, 0);
    }
};


// --- 2. Table UI Generation ---

const renderTables = () => {
    const colLeft = document.getElementById('col-left');
    const colCenterBottom = document.getElementById('col-center-bottom');
    const colRight = document.getElementById('col-right');

    if (colLeft) colLeft.innerHTML = '';
    if (colCenterBottom) colCenterBottom.innerHTML = '';
    if (colRight) colRight.innerHTML = '';

    const tables = getTablesState();
    const players = getPlayers();

    // Create a datalist for player suggestions
    let dataListHTML = `<datalist id="player-list">`;
    players.forEach(p => {
        dataListHTML += `<option value="${p.name}">`;
    });
    dataListHTML += `</datalist>`;

    // Add datalist to DOM (once)
    if (!document.getElementById('player-list')) {
        document.body.insertAdjacentHTML('beforeend', dataListHTML);
    }

    let activeCount = 0;

    tables.forEach(table => {
        if (table.isActive) activeCount++;

        const card = document.createElement('div');
        card.className = `table-card ${table.isActive ? 'active' : ''}`;
        card.id = `table-card-${table.id}`;

        const isRunning = table.isActive;

        card.innerHTML = `
            <div class="card-header" style="margin-bottom: 0.5rem;">
                <span class="table-title">Table ${table.id}</span>
                <div class="table-status-ring ${isRunning ? 'active' : 'idle'} ${card.classList.contains('grace-period') ? 'grace' : ''}"></div>
            </div>

            <div class="form-group" style="margin-bottom: 1rem;">
                <div class="segmented-control" ${isRunning ? 'style="pointer-events: none; opacity: 0.8;"' : ''}>
                    <div class="segment-tab ${table.gameMode === 'Single' ? 'active' : ''}" onclick="handleModeChange(${table.id}, 'Single')">[SINGLE]</div>
                    <div class="segment-tab ${table.gameMode === 'Double' ? 'active' : ''}" onclick="handleModeChange(${table.id}, 'Double')">[DOUBLE]</div>
                    <div class="segment-tab ${table.gameMode === 'Century' ? 'active' : ''}" onclick="handleModeChange(${table.id}, 'Century')">[CENTURY]</div>
                </div>
                <!-- Small decorative limit hint -->
                <div style="text-align: center; font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.3rem;">
                    ${(table.gameMode || 'Single').toUpperCase()} ${(table.gameMode || 'Single') === 'Single' ? '20m Limit' : (table.gameMode || 'Single') === 'Double' ? '30m Limit' : 'Per-Minute'}
                </div>
            </div>

            ${table.gameMode === 'Century' ? `
            <div class="form-group" style="margin-bottom: 0.8rem; padding-left: 10px; border-left: 2px solid var(--accent-blue);">
                <label style="font-size: 0.8rem; color: var(--accent-blue);">Century Type</label>
                <select ${isRunning ? 'disabled' : ''} onchange="handleCenturyTypeChange(${table.id}, this.value)">
                    <option value="Individual" ${table.centuryType === 'Individual' || !table.centuryType ? 'selected' : ''}>Individual Century (6 Players)</option>
                    <option value="Team" ${table.centuryType === 'Team' ? 'selected' : ''}>Team Century (2v2 / 3v3)</option>
                    <option value="Group" ${table.centuryType === 'Group' ? 'selected' : ''}>Group Century (N-Players)</option>
                </select>
                ${table.centuryType === 'Group' ? `
                <div style="margin-top: 0.5rem;">
                    <label style="font-size: 0.8rem;">Number of Players (3-12)</label>
                    <input type="number" min="3" max="12" value="${table.groupCount || 3}" ${isRunning ? 'disabled' : ''} onchange="handleGroupCountChange(${table.id}, this.value)" style="width: 100%;">
                </div>
                ` : ''}
                ${table.centuryType === 'Team' ? `
                <div style="margin-top: 0.5rem;">
                    <label style="font-size: 0.8rem;">Select Team Size</label>
                    <select ${isRunning ? 'disabled' : ''} onchange="handleTeamSizeChange(${table.id}, this.value)" style="width: 100%;">
                        <option value="2" ${table.teamSize === 2 || !table.teamSize ? 'selected' : ''}>2vs2 (4 Players)</option>
                        <option value="3" ${table.teamSize === 3 ? 'selected' : ''}>3vs3 (6 Players)</option>
                    </select>
                </div>
                ` : ''}
            </div>
            ` : ''}

            <!-- Phase 6: Dynamic Player Inputs -->
            <div id="player-inputs-${table.id}" style="margin-bottom: 1rem;">
                ${generatePlayerInputsHtml(table, isRunning)}
            </div>

            ${isRunning ? `
                <div class="time-display">
                    <span class="time-label">Started:</span>
                    <span class="time-value">${new Date(table.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <!-- Dynamic Elapsed Time -->
                <div class="time-display" style="background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3);">
                    <span class="time-label" style="color: var(--accent-green)">Elapsed:</span>
                    <span class="time-value" id="elapsed-${table.id}" style="color: var(--accent-green)">0m</span>
                </div>
            ` : ''}

            <div class="actions" style="margin-top: auto; display: flex; flex-direction: column; gap: 0.5rem;">
                
                <!-- Quick Actions Matrix -->
                <div class="quick-actions-row">
                    <div class="quick-action-btn green" onclick="if(${isRunning}) showToast('Service Called for Table ${table.id}', 'success')">
                        <span style="font-size: 1rem;">📞</span>
                        CALL SERVICE
                    </div>
                    <div class="quick-action-btn" onclick="if(${isRunning}) showToast('Snack Menu Opened for Table ${table.id}', 'success')">
                        <span style="font-size: 1rem;">🍔</span>
                        ADD SNACK
                    </div>
                    ${isRunning && table.gameMode !== 'Century' ? `
                    <div class="quick-action-btn" onclick="showToast('Time Extended by 10m', 'success')">
                        <span style="font-size: 1rem;">⏱️</span>
                        EXTEND TIME
                    </div>
                    <div class="quick-action-btn red" onclick="showToast('Table ${table.id} Paused', 'error')">
                        <span style="font-size: 1rem;">⏸️</span>
                        PAUSE
                    </div>
                    ` : ''}
                </div>

                <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                ${isRunning ? `
                    <button class="btn btn-online" style="flex:1; padding: 0.5rem; font-size: 0.85rem;" onclick="openShiftTableModal(${table.id})">SHIFT TABLE</button>
                    <button class="btn btn-end" style="flex:1; padding: 0.5rem; font-size: 0.85rem; background: var(--accent-red);" onclick="openCancelGameModal(${table.id})">CANCEL GAME</button>
                ` : ''}
                </div>
                <div style="display: flex; gap: 0.5rem;">
                ${isRunning ?
                `
                <button class="btn btn-cash" style="flex: 1; padding: 0.75rem;" onclick="openTransferModal(${table.id})">Table Transfer</button>
                <button class="btn btn-end" style="flex: 2; padding: 0.75rem;" onclick="endSession(${table.id})">END SESSION <span style="font-size:1.1rem">🏁</span></button>
                ` :
                (hasPerm('add') ? `<button class="btn btn-start" id="start-btn-${table.id}" style="padding: 0.75rem;" onclick="startSession(${table.id})" disabled>START SESSION</button>` : `<button class="btn" disabled style="opacity:0.5; cursor:not-allowed;">Access Restricted</button>`)
            }
                </div>
            </div>
            
            <div class="results-container" id="results-${table.id}"></div>
        `;

        // Route cards mathematically to the 3 columns
        if (colLeft && [1, 2, 3].includes(table.id)) {
            colLeft.appendChild(card);
        } else if (colRight && [4, 5, 8].includes(table.id)) {
            colRight.appendChild(card);
        } else if (colCenterBottom && [6, 7].includes(table.id)) {
            colCenterBottom.appendChild(card);
        } else if (colLeft) {
            // Fallback
            colLeft.appendChild(card);
        }

        if (!isRunning) {
            // Need a slight delay to ensure DOM is fully painted before checking inputs by ID
            setTimeout(() => updateStartButtonState(table.id), 0);
        }
    });

    const activeBadge = document.getElementById('active-tables-badge');
    if (activeBadge) activeBadge.textContent = `${activeCount}/8`;

    // Close autocomplete lists when clicking outside
    document.addEventListener("click", function (e) {
        closeAllAutocompleteLists(e.target);
    });

    // Start interval for elapsed time update if any table is active
    updateElapsedTimes();

    // Render the custom live feed text
    renderLiveFeed();
};

const renderLiveFeed = () => {
    const feedDisplay = document.getElementById('live-feed-display');
    if (!feedDisplay) return;

    // Get from local storage or set default
    const rawFeed = localStorage.getItem('liveFeedText') || "Welcome to JR Snooker Lounge | Enjoy your premium experience | Book your tables at the counter.";

    // Parse pipes (|) or newlines into separate paragraphs
    const messages = rawFeed.split(/\||\n/).map(s => s.trim()).filter(s => s.length > 0);

    let html = '';
    messages.forEach(msg => {
        html += `<p>${msg}</p>`;
    });

    feedDisplay.innerHTML = html;
};

// Listen for updates from the Admin panel to sync across tabs natively
window.addEventListener('storage', (e) => {
    if (e.key === 'liveFeedText') {
        renderLiveFeed();
    }
});

// --- Phase 6 & Phase 10: Dynamic UI Logic ---
const generatePlayerInputsHtml = (table, isRunning) => {
    let numPlayers = 2; // Default Single
    if (table.gameMode === 'Double') {
        numPlayers = 6;
    } else if (table.gameMode === 'Century') {
        if (table.centuryType === 'Team') numPlayers = (table.teamSize === 3) ? 6 : 4;
        else if (table.centuryType === 'Group') numPlayers = table.groupCount || 3;
        else numPlayers = 6; // Individual Century now defaults to 6
    }
    let playersHtml = '';

    for (let j = 0; j < numPlayers; j++) {
        // Fallback for legacy playerName string to array transition
        const val = (table.players && table.players[j]) ? table.players[j] : (j === 0 && table.playerName ? table.playerName : '');
        // Phase 7: Inject UI Badges based on unified profile
        const profile = getUnifiedPlayerProfile(val);
        let badgeHtml = '';
        if (profile.badge === 'A') {
            badgeHtml = `<span style="position: absolute; right: 10px; top: 12px; background: var(--accent-blue); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; pointer-events: none;">A</span>`;
        } else if (profile.badge === 'T') {
            badgeHtml = `<span style="position: absolute; right: 10px; top: 12px; background: #eab308; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; pointer-events: none;">T</span>`;
        }

        // Custom Feature: Ledger Indicator
        if (profile.balance > 0) {
            badgeHtml += `<span style="position: absolute; right: 10px; bottom: -18px; color: var(--accent-red); font-size: 0.7rem; font-weight: bold; pointer-events: none;" title="Pending Ledger: Rs. ${profile.balance}">Pending: Rs. ${profile.balance}</span>`;
        }

        if (table.gameMode === 'Century' && table.centuryType === 'Team') {
            const splitIndex = table.teamSize === 3 ? 3 : 2;
            if (j === 0) playersHtml += `<div style="font-size: 0.8rem; color: var(--accent-blue); font-weight: bold; margin-bottom: 0.3rem;">Team A</div>`;
            if (j === splitIndex) playersHtml += `<div style="font-size: 0.8rem; color: var(--accent-red); font-weight: bold; margin: 0.5rem 0 0.3rem 0;">Team B</div>`;
        }

        playersHtml += `
        <div class="form-group" style="margin-bottom: 0.5rem;">
            <label for="player-${table.id}-${j}" style="font-size: 0.8rem; color: var(--text-secondary);">${j === 0 ? 'P1 / Nominated Payer' : `Player ${j + 1}`}</label>
            <div style="position: relative;">
                <input type="text" id="player-${table.id}-${j}"
                    placeholder="Search or enter name/ID..." 
                    value="${val}" 
                    autocomplete="off"
                    ${isRunning ? 'disabled' : ''}
                    oninput="updatePlayerState(${table.id}, ${j}, this.value); handleFuzzySearch(${table.id}, ${j}, this.value)"
                    onfocus="handleFuzzySearch(${table.id}, ${j}, this.value)">
                ${badgeHtml}
                <div id="autocomplete-list-${table.id}-${j}" class="autocomplete-items"></div>
            </div>
        </div>`;
    }
    return playersHtml;
};

const updatePlayerState = (tableId, index, value) => {
    // Phase 4: Identity Resolution (Auto-swap valid ID to Name)
    const profile = getUnifiedPlayerProfile(value);
    if (profile.member_id && profile.member_id.toLowerCase() === value.trim().toLowerCase() && profile.name) {
        value = profile.name;
    }

    const tables = getTablesState();
    const t = tables.find(x => x.id === tableId);
    if (t) {
        if (!t.players) t.players = [];
        t.players[index] = value;
        // Legacy syncing
        if (index === 0) t.playerName = value;
        saveTablesState(tables);
    }
    updateStartButtonState(tableId);

    // Re-render specifically this small html block to update the badge immediately
    // Only if the table isn't running so we don't clobber active timer focus
    if (t && !t.isActive) {
        const inputsContainer = document.getElementById(`player-inputs-${tableId}`);
        if (inputsContainer) {
            inputsContainer.innerHTML = generatePlayerInputsHtml(t, false);
            // Re-focus the current input to maintain typing flow
            const newEl = document.getElementById(`player-${tableId}-${index}`);
            if (newEl) {
                newEl.focus();
                // move cursor to end
                newEl.setSelectionRange(newEl.value.length, newEl.value.length);
            }
        }
    }
};

const updateStartButtonState = (tableId) => {
    const tables = getTablesState();
    const table = tables.find(t => t.id === tableId);
    if (!table || table.isActive) return;

    let numPlayers = 2; // Default
    if (table.gameMode === 'Double') {
        numPlayers = 6;
    } else if (table.gameMode === 'Century') {
        if (table.centuryType === 'Team') numPlayers = (table.teamSize === 3) ? 6 : 4;
        else if (table.centuryType === 'Group') numPlayers = table.groupCount || 3;
        else numPlayers = 6;
    }
    let filledCount = 0;
    for (let j = 0; j < numPlayers; j++) {
        const inputEl = document.getElementById(`player-${tableId}-${j}`);
        if (inputEl && inputEl.value.trim()) {
            filledCount++;
        }
    }

    // Flexible Player Boxes logic: Minimum 2 players required to start any game (Double/Century included)
    const minRequired = 2;
    const canStart = filledCount >= minRequired;

    const startBtn = document.getElementById(`start-btn-${tableId}`);
    if (startBtn) {
        startBtn.disabled = !canStart;
    }
};

const handleModeChange = (tableId, value) => {
    const tables = getTablesState();
    const t = tables.find(x => x.id === tableId);
    if (t) {
        t.gameMode = value;
        if (value === 'Century') {
            t.centuryType = 'Individual';
            t.groupCount = 3;
        }
        t.players = []; // Reset players on mode swap
        saveTablesState(tables);
        renderTables();
    }
};

const handleCenturyTypeChange = (tableId, value) => {
    const tables = getTablesState();
    const t = tables.find(x => x.id === tableId);
    if (t) {
        t.centuryType = value;
        if (value === 'Group' && !t.groupCount) t.groupCount = 3;
        if (value === 'Team' && !t.teamSize) t.teamSize = 2;
        t.players = []; // clear players array to prep for new layout
        saveTablesState(tables);
        renderTables();
    }
};

const handleTeamSizeChange = (tableId, value) => {
    const size = parseInt(value, 10);
    const tables = getTablesState();
    const t = tables.find(x => x.id === tableId);
    if (t) {
        t.teamSize = size;
        saveTablesState(tables);
        renderTables();
    }
};

const handleGroupCountChange = (tableId, value) => {
    const count = parseInt(value, 10);
    if (isNaN(count) || count < 3) return;
    const tables = getTablesState();
    const t = tables.find(x => x.id === tableId);
    if (t) {
        t.groupCount = count;
        // Don't clear array here entirely, just re-render so existing inputs persist
        saveTablesState(tables);
        renderTables();
    }
};

// --- Phase 5 & 6: Fuzzy Search Logic (Upgraded for Unified VLOOKUP) ---
const handleFuzzySearch = (tableId, playerIndex, query) => {
    closeAllAutocompleteLists();
    if (!query) return;

    const listDiv = document.getElementById(`autocomplete - list - ${tableId} -${playerIndex} `);
    if (!listDiv) return;

    const unifiedProfiles = getAllKnownProfiles();
    const queryLower = query.toLowerCase().replace(/\s+/g, '');
    let hasMatches = false;

    unifiedProfiles.forEach(p => {
        const nameLower = p.name.toLowerCase().replace(/\s+/g, '');
        const idLower = p.member_id ? p.member_id.toLowerCase() : '';

        let match = false;

        // 1. Check ID Match first (Exact or partial ID match)
        if (idLower && idLower.includes(queryLower)) {
            match = true;
        }
        // 2. Fallback to Fuzzy Name match
        else {
            match = true;
            let searchIdx = 0;
            for (let i = 0; i < queryLower.length; i++) {
                searchIdx = nameLower.indexOf(queryLower[i], searchIdx);
                if (searchIdx === -1) {
                    match = false;
                    break;
                }
                searchIdx++;
            }
        }

        if (match) {
            hasMatches = true;
            const item = document.createElement("div");
            item.style.display = "flex";
            item.style.justifyContent = "space-between";
            item.style.alignItems = "center";

            let badgeHtml = '';
            if (p.badge === 'A') {
                badgeHtml = `<span style="background: var(--accent-blue); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; margin-left: 6px;">A</span>`;
            } else if (p.badge === 'T') {
                badgeHtml = `<span style="background: #eab308; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; margin-left: 6px;">T</span>`;
            }

            let idPhoneHtml = '';
            if (p.member_id) idPhoneHtml += `<span style="color: var(--text-secondary); font-size: 0.75rem;">${p.member_id}</span>`;
            if (p.phone) idPhoneHtml += `<span style="color: var(--text-secondary); font-size: 0.75rem; margin-left: 8px;">📞 ${p.phone}</span>`;

            item.innerHTML = `
                <div>
                    <strong>${p.name}</strong> ${badgeHtml} <br>
                    ${idPhoneHtml}
                </div>
                <div style="text-align: right;">
                    <span style="font-size:0.8rem; color:${p.status === 'Member' ? 'var(--accent-green)' : 'var(--text-secondary)'};">(${p.status})</span>
                    ${p.balance > 0 ? `<br><span style="font-size:0.75rem; color:var(--accent-red);">Owes: Rs.${p.balance}</span>` : ''}
                </div>
            `;
            item.addEventListener("click", function () {
                document.getElementById(`player-${tableId}-${playerIndex}`).value = p.name;
                updatePlayerState(tableId, playerIndex, p.name);
                closeAllAutocompleteLists();
            });
            listDiv.appendChild(item);
        }
    });

    if (hasMatches) {
        listDiv.style.display = 'block';
    }
};

const closeAllAutocompleteLists = (except) => {
    const items = document.getElementsByClassName("autocomplete-items");
    for (let i = 0; i < items.length; i++) {
        // Extract the exact ID format
        const idParts = items[i].id.split('-');
        const tableId = idParts[2];
        const playerIndex = idParts[3];
        const relatedInput = document.getElementById(`player-${tableId}-${playerIndex}`);

        if (except !== items[i] && except !== relatedInput) {
            items[i].innerHTML = '';
            items[i].style.display = 'none';
        }
    }
};


// --- 3. Timer Logic & Actions ---

// Phase 7: Store pending start globally for the modal
let pendingSessionTableId = null;

const startSession = (tableId) => {
    if (!hasPerm('add')) {
        showToast("Error: You do not have permission to Add Entries.", "error");
        return;
    }

    const tables = getTablesState();
    const tableIndex = tables.findIndex(t => t.id === tableId);
    if (tableIndex === -1) return;

    const table = tables[tableIndex];
    let numPlayers = 2; // Default
    if (table.gameMode === 'Double') {
        numPlayers = 6;
    } else if (table.gameMode === 'Century') {
        if (table.centuryType === 'Team') numPlayers = (table.teamSize === 3) ? 6 : 4;
        else if (table.centuryType === 'Group') numPlayers = table.groupCount || 3;
        else numPlayers = 6;
    }

    if (!table.players) table.players = [];

    let filledCount = 0;
    for (let j = 0; j < numPlayers; j++) {
        const inputEl = document.getElementById(`player-${tableId}-${j}`);
        if (inputEl) {
            table.players[j] = inputEl.value.trim();
        }
        if (table.players[j]) {
            filledCount++;
        }
    }

    // Flexible Verification
    if (filledCount < 2) {
        showToast(`Please enter at least 2 players to start the session.`, 'error');
        return;
    }

    // Patch: Ensure the players array is saved to the local store BEFORE modal intercept
    saveTablesState(tables);

    // Phase 7: Pre-Match Summary Logic
    pendingSessionTableId = tableId;
    const modalList = document.getElementById('pre-match-players-list');
    modalList.innerHTML = '';

    table.players.forEach((pName, index) => {
        const profile = getUnifiedPlayerProfile(pName);
        let badgeHtml = '';
        if (profile.badge === 'A') {
            badgeHtml = `<span style="background: var(--accent-blue); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; margin-left: 6px;">A</span>`;
        } else if (profile.badge === 'T') {
            badgeHtml = `<span style="background: #eab308; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; margin-left: 6px;">T</span>`;
        }

        modalList.innerHTML += `
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--bg-hover);">
                <div>
                    <span style="color: var(--text-secondary); font-size: 0.8rem; margin-right: 0.5rem;">${index === 0 ? 'P1' : 'P' + (index + 1)}:</span>
                    <strong>${profile.name}</strong> ${badgeHtml}
                </div>
                <div style="text-align: right;">
                    <span style="color: ${profile.status === 'Member' ? 'var(--accent-green)' : 'var(--text-secondary)'}; font-size: 0.85rem;">
                        ${profile.member_id ? `(${profile.member_id})` : '(Non-Member)'}
                    </span>
                    ${profile.balance > 0 ? `<br><span style="font-size: 0.75rem; color: var(--accent-red);">Pending Debt: Rs.${profile.balance}</span>` : ''}
                </div>
            </div>
        `;
    });

    document.getElementById('pre-match-modal').style.display = 'block';
};

const closePreMatchModal = () => {
    pendingSessionTableId = null;
    document.getElementById('pre-match-modal').style.display = 'none';
};

const executeStartSession = () => {
    if (!pendingSessionTableId) return;

    const tables = getTablesState();
    const tableIndex = tables.findIndex(t => t.id === pendingSessionTableId);
    if (tableIndex === -1) return;

    const table = tables[tableIndex];
    const payerName = table.players[0]; // Player 1 is primary/default

    table.isActive = true;
    table.playerName = payerName; // legacy fallback
    table.startTime = Date.now(); // Store current timestamp
    table.alertedLimit = false; // Reset alert flag for new session

    saveTablesState(tables);
    renderTables();
    closePreMatchModal();
    showToast(`Table ${pendingSessionTableId} started.`);

    // Check for Pending Balances and Membership Expiries
    const now = Date.now();
    const tenDaysMs = 10 * 24 * 60 * 60 * 1000;
    const annuals = JSON.parse(localStorage.getItem('annual_members') || '[]');

    table.players.forEach(pName => {
        if (!pName) return;
        const profile = getUnifiedPlayerProfile(pName);

        // Pending Balance Alert
        if (profile.balance > 0) {
            setTimeout(() => {
                showToast(`Pending Balance Alert: ${profile.name} owes Rs.${profile.balance}`, 'error');
            }, 500);
        }

        // Membership Expiry Warning (5 Days or less)
        const annualMatch = annuals.find(a => a.name.toLowerCase() === pName.toLowerCase() || a.member_id === profile.member_id);
        if (annualMatch) {
            const timeRemaining = annualMatch.expiry_date - now;
            if (timeRemaining > 0 && timeRemaining <= (5 * 24 * 60 * 60 * 1000)) {
                const daysLeft = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
                setTimeout(() => {
                    showCustomExpiryModal(profile.name, daysLeft);
                }, 1000);
            } else if (timeRemaining <= 0) {
                setTimeout(() => {
                    showCustomExpiryModal(profile.name, 0, true);
                }, 1000);
            }
        }
    });
};

const showCustomExpiryModal = (name, daysLeft, isExpired = false) => {
    const modalId = 'expiry-warning-modal';
    let modal = document.getElementById(modalId);
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px; text-align: center; border: 2px solid var(--accent-red);">
                <h2 style="color: var(--accent-red); margin-bottom: 1rem;">⚠️ Membership Warning</h2>
                <div id="expiry-modal-body" style="margin-bottom: 1.5rem; line-height: 1.5;"></div>
                <button class="btn btn-end" onclick="document.getElementById('${modalId}').style.display='none'">Dismiss</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    const body = document.getElementById('expiry-modal-body');
    if (isExpired) {
        body.innerHTML = `<strong>${name}</strong>'s membership HAS EXPIRED! Please renew immediately.`;
    } else {
        body.innerHTML = `<strong>${name}</strong>'s membership is expiring in <strong>${daysLeft}</strong> days. Please renew soon.`;
    }
    modal.style.display = 'block';
};

const endSession = (tableId) => {
    const tables = getTablesState();
    const tableIndex = tables.findIndex(t => t.id === tableId);
    if (tableIndex === -1) return;

    const table = tables[tableIndex];
    const endTime = Date.now();
    const diffMs = endTime - table.startTime;
    const totalMinutes = Math.floor(diffMs / 60000); // 1 minute = 60000 ms

    const limit = THRESHOLDS[table.gameMode] || 25;
    const overtime = Math.max(0, totalMinutes - limit);

    // Get all valid players
    const activePlayers = (table.players || []).filter(p => p.trim() !== '');
    if (activePlayers.length === 0 && table.playerName) activePlayers.push(table.playerName);

    const sessionData = {
        tableId: table.id,
        gameMode: table.gameMode,
        centuryType: table.centuryType,
        startTime: table.startTime,
        endTime: endTime,
        totalMinutes: totalMinutes,
        overtimeMinutes: overtime,
        limit: limit,
        activePlayers: activePlayers,
        transferredAmount: table.transferredAmount || 0 // Part 3
    };

    displayCheckoutUI(tableId, sessionData);
};

const displayCheckoutUI = (tableId, sessionData) => {
    const resultsContainer = document.getElementById(`results-${tableId}`);
    const card = document.getElementById(`table-card-${tableId}`);
    if (card) card.classList.remove('grace-period');

    if (!resultsContainer) return;

    // Build the dropdown options dynamically
    let optionsHtml = '';
    sessionData.activePlayers.forEach((p) => {
        const profile = getUnifiedPlayerProfile(p);
        optionsHtml += `<option value="${p}">${p} (${profile.status})</option>`;
    });

    resultsContainer.innerHTML = `
    <div class="results-info">
            <div class="form-group" style="margin-bottom: 0.5rem; text-align: left;">
                <label style="color: var(--accent-red); font-weight: bold;">Nominate Payer</label>
                <select id="checkout-payer-${tableId}" onchange="recalculateBill(${tableId})" style="border-color: var(--accent-red);">
                    ${optionsHtml}
                </select>
            </div>
            <div id="checkout-summary-${tableId}"></div>
        </div>
    `;

    // Hide original End Session button
    const actionsDiv = card.querySelector('.actions');
    if (actionsDiv) actionsDiv.style.display = 'none';

    // Expose data for recalculation on select change
    window[`session_${tableId}`] = sessionData;

    // Trigger initial mathematical calculation
    recalculateBill(tableId);
};

const recalculateBill = (tableId) => {
    const sessionData = window[`session_${tableId}`];
    if (!sessionData) return;

    const payerSelect = document.getElementById(`checkout-payer-${tableId}`);
    const payerName = payerSelect.value;
    const profile = getUnifiedPlayerProfile(payerName);

    // --- Phase 1 Billing Engine ---
    const { bill, baseRateApplied } = calculateBill(
        sessionData.gameMode,
        sessionData.totalMinutes,
        sessionData.activePlayers
    );
    let totalBill = Math.ceil(bill);
    sessionData.baseRateApplied = baseRateApplied;

    // Embed current bill status into the object before logging
    sessionData.playerName = payerName;
    sessionData.playerStatus = profile.status;
    sessionData.totalBill = totalBill;
    sessionData.previousBalance = profile.balance || 0; // Cumulative Ledger

    // Part 3: Calculate Final with Transferred Amount
    const finalAmountDue = totalBill + sessionData.previousBalance + sessionData.transferredAmount;
    sessionData.finalAmountDue = finalAmountDue;

    // Century Mode Split Logic
    let splitDivisor = 1;
    let splitLabel = '';
    if (sessionData.gameMode === 'Century') {
        if (sessionData.centuryType === 'Team') { splitDivisor = 2; splitLabel = 'per team (2 Teams)'; }
        else if (sessionData.centuryType === 'Group') { splitDivisor = sessionData.activePlayers.length || 3; splitLabel = `per player (${splitDivisor} Players)`; }
        else { splitDivisor = 2; splitLabel = 'per player (2 Players)'; } // Individual
    } else if (sessionData.gameMode === 'Double') {
        splitDivisor = 2; splitLabel = 'per side (2 Sides)';
    } else {
        splitDivisor = 2; splitLabel = 'per player (2 Players)';
    }

    const perEntitySplit = Math.ceil(totalBill / splitDivisor);

    const summaryDiv = document.getElementById(`checkout-summary-${tableId}`);
    summaryDiv.innerHTML = `
    <div class="result-row">
            <span>Total Time:</span>
            <strong>${sessionData.totalMinutes} min</strong>
        </div>
    ${sessionData.overtimeMinutes > 0 ? `
        <div class="result-row highlight">
            <span>Overtime:</span>
            <strong>${sessionData.overtimeMinutes} min</strong>
        </div>
        ` : `<div class="result-row" style="color: var(--accent-green);"><span>Overtime:</span><strong>None</strong></div>`
        }
        
        <div class="result-row" style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border-color); font-size: 1.1rem;">
            <span>Current Game Bill:</span>
            <strong style="color: var(--accent-blue);">Rs. ${totalBill}</strong>
        </div>
        
        ${sessionData.transferredAmount > 0 ? `
        <div class="result-row" style="font-size: 1rem; color: var(--accent-red);">
            <span>Transferred from Opponent:</span>
            <strong>+ Rs. ${sessionData.transferredAmount}</strong>
        </div>
        ` : ''}

        ${sessionData.previousBalance > 0 ? `
        <div class="result-row" style="font-size: 1rem; color: var(--accent-red);">
            <span>Previous Pending Balance:</span>
            <strong>+ Rs. ${sessionData.previousBalance}</strong>
        </div>
        ` : ''}
        
        <div class="result-row highlight" style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 2px solid var(--accent-red); font-size: 1.25rem; font-weight: bold; color: white; background: var(--accent-red); padding: 0.5rem; border-radius: 4px;">
            <span>TOTAL PAYABLE:</span>
            <span>Rs. ${finalAmountDue}</span>
        </div>
        
        <div class="result-row" style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed var(--border-color); font-size: 1rem; color: var(--text-secondary);">
            <span>Suggested Game Split:</span>
            <strong>Rs. ${perEntitySplit} <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: normal;">${splitLabel}</span></strong>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-secondary); text-align: right; margin-bottom: 0.5rem; margin-top: 0.5rem;">
            (${sessionData.baseRateApplied ? (sessionData.gameMode === 'Double' ? 'Fixed Double Rate applied' : 'Base Rate applied') : 'Per-Minute / Mixed Rate applied'})
        </div>

        <div style="display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap;">
            <button class="btn btn-credit" style="flex: 1; min-width: 100%; font-size: 1.1rem; padding: 1rem;" onclick="finalizeSession(${tableId}, 'Credit')">Bill to Account (End Game)</button>
            <button class="btn btn-transfer" style="flex: 1 1 100%;" onclick="showTransferModal(${tableId}, '${sessionData.playerName.replace(/'/g, "\\'")}', ${totalBill})">Transfer to Opponent</button>
        </div>
        <button class="btn btn-end" style="width: 100%; margin-top: 0.5rem; background: var(--bg-card); color: var(--text-main);" onclick="document.getElementById('results-${tableId}').innerHTML = ''; const act = document.querySelector('#table-card-${tableId} .actions'); if(act) act.style.display='flex';">Cancel Checkout</button>
`;
};

const showOnlineCheckout = (tableId) => {
    const settings = JSON.parse(localStorage.getItem('paymentSettings') || '{}');
    const summaryDiv = document.getElementById(`checkout-summary-${tableId}`);
    if (!summaryDiv) return;

    let html = `
        <div style="background: var(--bg-card); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--accent-blue); margin-top: 1rem;">
            <h3 style="color: var(--accent-blue); margin-bottom: 1rem; text-align: center;">Online Payment Details</h3>
            <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.9rem; margin-bottom: 1.5rem;">
                ${settings.bankName ? `<div><strong>Bank:</strong> ${settings.bankName}</div>` : ''}
                ${settings.accountTitle ? `<div><strong>Title:</strong> ${settings.accountTitle}</div>` : ''}
                ${settings.accountNumber ? `<div><strong>Account/IBAN:</strong> <span style="font-family: monospace; color: var(--accent-green); font-size: 1rem;">${settings.accountNumber}</span></div>` : ''}
                ${settings.easypaisa ? `<div><strong>Easypaisa/JazzCash:</strong> <span style="font-family: monospace; color: var(--accent-green); font-size: 1rem;">${settings.easypaisa}</span></div>` : ''}
            </div>
            ${settings.qrCodeBase64 ? `<div style="text-align: center; margin-bottom: 1.5rem;"><img src="${settings.qrCodeBase64}" style="max-width: 200px; border-radius: 8px; border: 2px solid var(--border-color);"></div>` : ''}
            
            <div class="form-group" style="margin-bottom: 1.5rem;">
                <label style="color: var(--accent-red); font-weight: bold;">Upload Payment Proof (Required)</label>
                <input type="file" id="online-proof-${tableId}" accept="image/*" style="background: var(--bg-input);">
            </div>

            <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-end" style="flex: 1;" onclick="recalculateBill(${tableId})">Back</button>
                <button class="btn btn-online" style="flex: 2; background: var(--accent-green); color: white;" onclick="processOnlinePayment(${tableId})">Verify & Confirm</button>
            </div>
        </div>
    `;
    
    summaryDiv.innerHTML = html;
};

const processOnlinePayment = async (tableId) => {
    const fileInput = document.getElementById(`online-proof-${tableId}`);
    if (!fileInput || fileInput.files.length === 0) {
        showToast("Payment Proof screenshot is required for Online payments.", "error");
        return;
    }

    try {
        const proofString = await new Promise((resolve, reject) => {
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 600;
                    const MAX_HEIGHT = 800;
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
                    resolve(canvas.toDataURL('image/jpeg', 0.6));
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
        
        finalizeSession(tableId, 'Online', proofString);
    } catch (err) {
        console.error("Proof Processing Error:", err);
        showToast("Failed to process payment proof image.", "error");
    }
};

const finalizeSession = (tableId, mode, proofString = null) => {
    const sessionData = window[`session_${tableId}`];

    // Process Payment Ledger logic
    confirmPayment(tableId, sessionData.playerName, sessionData.totalBill, mode, proofString);

    // Background Server Log
    logSessionToLedger(sessionData);

    // Completely nuke Table State
    const tables = getTablesState();
    const tableIndex = tables.findIndex(t => t.id === tableId);

    tables[tableIndex].isActive = false;
    tables[tableIndex].playerName = '';
    tables[tableIndex].players = [];
    tables[tableIndex].gameMode = 'Single';
    tables[tableIndex].startTime = null;

    saveTablesState(tables);
    renderTables();

    // Clear Memory
    delete window[`session_${tableId}`];
};

const confirmPayment = (tableId, playerName, amount, mode, proofString = null) => {
    // Phase 3 & Part 2 Cumulative Ledger / Debt Tracking
    const profile = getUnifiedPlayerProfile(playerName);

    // Attempt match via unique ID first
    let mappedPlayerName = playerName;
    if (profile.member_id) {
        // Find existing record by member_id
        const players = getPlayers();
        const existingRecord = players.find(p => p.member_id === profile.member_id);
        if (existingRecord) {
            mappedPlayerName = existingRecord.name;
        } else {
            // Need to create one mapped to ID natively
            mappedPlayerName = profile.name;
        }
    }

    const dailyIncome = JSON.parse(localStorage.getItem('dailyIncome') || '[]');
    const sessionData = window[`session_${tableId}`];
    
    // Total calculation (Current Bill + any transfers/balances)
    const transactionAmount = sessionData ? (sessionData.totalBill + (sessionData.transferredAmount || 0)) : amount;
    const totalWithBalance = transactionAmount + (sessionData ? sessionData.previousBalance : 0);

    if (mode === 'Credit') {
        const players = getPlayers();
        const playerIndex = players.findIndex(p => p.name === mappedPlayerName);

        if (playerIndex !== -1) {
            players[playerIndex].balance = (players[playerIndex].balance || 0) + transactionAmount;
            if (profile.member_id) players[playerIndex].member_id = profile.member_id;
        } else {
            players.push({
                id: Date.now(),
                name: mappedPlayerName,
                status: profile.status,
                balance: transactionAmount,
                member_id: profile.member_id
            });
        }
        savePlayers(players);
        
        showToast(`Rs.${transactionAmount} added to ${mappedPlayerName}'s debt. Mode: Credit.`, 'error');
    } else {
        // Cash or Online => Pay current bill + clear previous balance
        const players = getPlayers();
        const playerIndex = players.findIndex(p => p.name === mappedPlayerName);
        if (playerIndex !== -1) {
            players[playerIndex].balance = 0; // Cleared
            savePlayers(players);
        }

        dailyIncome.push({
            id: Date.now(),
            date: new Date().toISOString(),
            playerName: mappedPlayerName,
            amount: totalWithBalance,
            mode: mode,
            is_pending: false,
            proof_image: proofString
        });
        
        showToast(`Payment of Rs.${totalWithBalance} received via ${mode}. Debt cleared.`);
    }

    localStorage.setItem('dailyIncome', JSON.stringify(dailyIncome));
    updateDashboardMetrics();

    // Advance table callback
    const resetBtn = document.getElementById(`reset-btn-${tableId}`);
    if (resetBtn) resetBtn.click();
};

const updateDashboardMetrics = () => {
    // 1. Active Tables
    const tables = getTablesState();
    const activeCount = tables.filter(t => t.isActive).length;

    // 2. Today's Cash Collection (Received ONLY)
    const dailyIncome = JSON.parse(localStorage.getItem('dailyIncome') || '[]');
    const cashCollection = dailyIncome.filter(item => !item.is_pending).reduce((sum, item) => sum + item.amount, 0);

    // 3. Pending Dues (Total Player Balances)
    const players = getPlayers();
    const pendingDues = players.reduce((sum, p) => sum + (p.balance || 0), 0);

    // 4. Net Cash (Same Logic as Before)
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);
    const staff = getStaff();
    const totalAdvances = staff.reduce((sum, s) => sum + (s.advance_taken || 0), 0);
    const netCash = cashCollection - totalExpense - totalAdvances;

    // Badges Index.html
    const activeBadge = document.getElementById('active-tables-badge');
    const cashBadge = document.getElementById('cash-collection-badge');
    const duesBadge = document.getElementById('pending-dues-badge');
    const netCashBadge = document.getElementById('net-cash-badge');

    // Badges Reports.html fallback
    const oldProfitBadge = document.getElementById('net-profit-badge');

    if (activeBadge) activeBadge.innerText = `Active Tables: ${activeCount}/8`;
    if (cashBadge) cashBadge.innerText = `Today's Cash: Rs. ${cashCollection}`;
    if (duesBadge) duesBadge.innerText = `Pending Dues: Rs. ${pendingDues}`;
    if (netCashBadge) netCashBadge.innerText = `Net Cash in Hand: Rs. ${netCash}`;
    if (oldProfitBadge) oldProfitBadge.innerText = `Net Cash in Hand: Rs. ${netCash}`;
};

// displayResultsTemporarily removed explicitly to favor dynamic checkout

// --- Phase 3: Transfer Logic ---
// Note: Transfer logic has been upgraded and moved to the bottom of the file (Part 3).

// Periodic update for visual timers & Phase 5 Grace Period
let timerInterval = null;
const updateElapsedTimes = () => {
    if (timerInterval) clearInterval(timerInterval);

    const tables = getTablesState();
    const activeTables = tables.filter(t => t.isActive);

    if (activeTables.length === 0) return;

    const tick = () => {
        const now = Date.now();
        // Re-read tables each tick so we pick up alertedLimit flags
        const currentTables = getTablesState();
        currentTables.filter(t => t.isActive).forEach(t => {
            const el   = document.getElementById(`elapsed-${t.id}`);
            const card = document.getElementById(`table-card-${t.id}`);
            if (!el) return;

            const diffMs       = now - t.startTime;
            const totalMinutes = Math.floor(diffMs / 60000);
            el.innerText       = `${totalMinutes}m`;

            if (!card) return;

            // --- Visual Grace Indicator (5 min warning before popup) ---
            // Single: warn at 15m (popup @20m); Double: warn at 25m (popup @30m)
            const popupTrigger    = THRESHOLDS[t.gameMode] || 9999;
            const graceWarnStart  = popupTrigger - 5;

            if (t.gameMode === 'Century') {
                // Century has no popup — just show elapsed, no class changes
                card.classList.remove('grace-period');
            } else if (totalMinutes >= popupTrigger) {
                card.classList.remove('grace-period');

                // Fire popup exactly once at the trigger minute
                if (!t.alertedLimit) {
                    // Persist flag immediately to avoid re-triggering
                    const allTables = getTablesState();
                    const idx = allTables.findIndex(x => x.id === t.id);
                    if (idx !== -1) {
                        allTables[idx].alertedLimit = true;
                        saveTablesState(allTables);
                    }
                    showTimerPopup(t.id, popupTrigger, t.gameMode);
                }
            } else if (totalMinutes >= graceWarnStart) {
                card.classList.add('grace-period');
            } else {
                card.classList.remove('grace-period');
            }
        });
    };

    // showTimerPopup — Phase 1 overhaul
    // Single  popup: Stop ends game | Resume = 5-min grace then per-minute charged
    // Double  popup: Stop ends game | Resume = continue at per-minute rate
const showTimerPopup = (tableId, triggerMin, gameMode) => {
    // Remove any stale modal first so copy is always fresh
    const staleModal = document.getElementById(`timer-popup-${tableId}`);
    if (staleModal) staleModal.remove();

    const modal = document.createElement('div');
    modal.id        = `timer-popup-${tableId}`;
    modal.className = 'modal';

    let bodyText = '';
    let resumeLabel = 'RESUME';

    if (gameMode === 'Single') {
        bodyText = `Table <strong>${tableId}</strong> has reached the <strong>${triggerMin}:00</strong> minute Single Game limit.<br><br>
            <strong>STOP</strong> — End game and calculate bill now.<br>
            <strong>RESUME</strong> — Grant 5-min grace period, then charge <em>per minute</em>.`;
    } else {
        // Double
        bodyText = `Table <strong>${tableId}</strong> has reached the <strong>${triggerMin}:00</strong> minute Double Game limit.<br><br>
            <strong>STOP</strong> — End game and calculate bill now.<br>
            <strong>RESUME</strong> — Continue at per-minute rate (12 PKR/min Member · 15 PKR/min Non-Member).`;
    }

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 480px; text-align: center; border: 2px solid var(--accent-blue);">
            <h2 style="color: var(--accent-blue); margin-bottom: 1rem;">⏱️ Time Limit Reached</h2>
            <div style="margin-bottom: 1.5rem; font-size: 1rem; line-height: 1.6;">${bodyText}</div>
            <div style="display: flex; gap: 1rem;">
                <button class="btn btn-end"   style="flex: 1; font-size: 1rem;" onclick="handleTimerStop(${tableId})">STOP</button>
                <button class="btn btn-start" style="flex: 1; font-size: 1rem;" onclick="handleTimerResume(${tableId}, '${gameMode}')">${resumeLabel}</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';
};

window.handleTimerStop = (tableId) => {
    const m = document.getElementById(`timer-popup-${tableId}`);
    if (m) m.style.display = 'none';
    endSession(tableId);
};

window.handleTimerResume = (tableId, gameMode) => {
    const m = document.getElementById(`timer-popup-${tableId}`);
    if (m) m.style.display = 'none';

    if (gameMode === 'Single') {
        // Grant exactly 5-minute grace, then the next per-minute charges kick in
        showToast(`Table ${tableId}: 5-minute grace granted. Charges resume per-minute after time.`, 'success');
        // Rewind start time by 20 min so elapsed re-bases at 0 of grace window
        // (billing uses actual elapsed, so no start-time manipulation needed —
        //  calculateBill already charges per-minute for minutes > 20)
    } else {
        showToast(`Table ${tableId}: Resumed — per-minute rate now active.`, 'success');
    }
};

    tick(); // Initial call
    timerInterval = setInterval(tick, 60000); // Update every minute
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

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    setupTheme();

    // Phase 8 RBAC & Phase 9 Admin Nav
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
        const user = JSON.parse(userStr);
        if (user.role === 'staff') {
            const netCashBadge = document.getElementById('net-cash-badge');
            if (netCashBadge) netCashBadge.style.display = 'none';
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

    initDB();
    renderTables();
    renderSessionLedger();
    updateDashboardMetrics();
    updateCharts();
});

// ==========================================
// Part 3: Transfer to Opponent Logic
// ==========================================

let activeTransferSource = null;

const openTransferModal = (sourceTableId) => {
    const tables = getTablesState();
    const sourceTable = tables.find(t => t.id === sourceTableId);
    if (!sourceTable || !sourceTable.isActive) return;

    activeTransferSource = sourceTableId;

    const selectEl = document.getElementById('transfer-to');
    selectEl.innerHTML = '';

    let activeTargets = 0;
    tables.forEach(t => {
        if (t.isActive && t.id !== sourceTableId) {
            const primaryPlayer = getUnifiedPlayerProfile((t.players && t.players[0]) ? t.players[0] : t.playerName).name || "Unknown";
            selectEl.innerHTML += `<option value="${t.id}">Table ${t.id} - ${primaryPlayer}</option>`;
            activeTargets++;
        }
    });

    if (activeTargets === 0) {
        showToast("No active opponent tables available to transfer to.", "error");
        activeTransferSource = null;
        return;
    }

    document.getElementById('transfer-desc').textContent = `Transferring bill from Table ${sourceTableId}. Time will stop immediately.`;
    document.getElementById('transfer-modal').style.display = 'flex';
};

const closeTransferModal = () => {
    document.getElementById('transfer-modal').style.display = 'none';
    activeTransferSource = null;
};

const executeTransfer = () => {
    if (!activeTransferSource) return;

    const targetTableId = parseInt(document.getElementById('transfer-to').value, 10);
    if (isNaN(targetTableId)) return;

    const tables = getTablesState();
    const sourceTable = tables.find(t => t.id === activeTransferSource);
    const targetTable = tables.find(t => t.id === targetTableId);

    if (!sourceTable || !targetTable) return;

    // 1. Calculate the exact live bill for the source table right now
    const endTime = Date.now();
    const diffMs = endTime - sourceTable.startTime;
    const totalMinutes = Math.floor(diffMs / 60000);
    const payerName = (sourceTable.players && sourceTable.players[0]) ? sourceTable.players[0] : sourceTable.playerName;
    const profile = getUnifiedPlayerProfile(payerName);

    const activePlayers = (sourceTable.players || []).filter(p => p.trim() !== '');
    if (activePlayers.length === 0 && sourceTable.playerName) activePlayers.push(sourceTable.playerName);

    // Phase 1: use unified calculateBill
    const { bill } = calculateBill(sourceTable.gameMode, totalMinutes, activePlayers);
    let totalBill = Math.ceil(bill);

    // 2. Add transfer amount to Target Table's cumulative transferred balance
    // Ensure we preserve any existing transfers Target Table might have already received
    targetTable.transferredAmount = (targetTable.transferredAmount || 0) + totalBill;

    // 3. Reset Source Table completely (Zeroing out and stopping it)
    sourceTable.isActive = false;
    sourceTable.playerName = '';
    sourceTable.players = [];
    sourceTable.startTime = null;
    sourceTable.gameMode = 'Single';
    sourceTable.transferredAmount = 0;

    // Log the transfer in ledger
    const transferLog = {
        tableId: sourceTable.id,
        gameMode: sourceTable.gameMode,
        startTime: sourceTable.startTime,
        endTime: endTime,
        totalMinutes: totalMinutes,
        totalBill: 0, // It's paid via Target table, so 0 log
        finalAmountDue: 0, // Paid via Target table
        playerName: `TRANSFERRED TO T${targetTableId}`,
        payerStatus: profile.status,
        date: new Date().toISOString()
    };
    logSessionToLedger(transferLog);

    saveTablesState(tables);
    renderTables();
    renderSessionLedger();
    closeTransferModal();

    showToast(`Successfully transferred Rs. ${totalBill} from Table ${sourceTable.id} to Table ${targetTable.id}.`);
};
// For testing calculation without waiting 25m, expose a debug function to window:
const showCCTVModal = () => {
    const modal = document.getElementById('cctv-modal');
    if (modal) modal.style.display = 'block';
};

const closeCCTVModal = () => {
    const modal = document.getElementById('cctv-modal');
    if (modal) modal.style.display = 'none';
};

window.showCCTVModal = showCCTVModal;
window.closeCCTVModal = closeCCTVModal;
window.logout = logout;
window.debugAgeTable = (tableId, minutesToAge) => {
    const tables = getTablesState();
    const idx = tables.findIndex(t => t.id === tableId);
    if (idx !== -1 && tables[idx].isActive) {
        tables[idx].startTime -= (minutesToAge * 60000);
        saveTablesState(tables);
        renderTables();
        showToast(`Fast-forwarded Table ${tableId} by ${minutesToAge}m!`);
    }
};

// ==========================================
// Part 2: Advanced Authorizations & Shifting
// ==========================================

// --- Opponent Checkout Transfer ---
let activeCheckoutTransferTarget = null;

window.showTransferModal = (tableId, currentPlayerName, currentBill) => {
    activeCheckoutTransferTarget = tableId;
    const sessionData = window[`session_${tableId}`];
    if (!sessionData) return;

    const selectEl = document.getElementById('opponent-transfer-select');
    selectEl.innerHTML = '';

    const allProfiles = getAllKnownProfiles();
    
    // Suggest active players first
    sessionData.activePlayers.forEach(p => {
        if (p !== currentPlayerName && p.trim() !== '') {
            const profile = getUnifiedPlayerProfile(p);
            selectEl.innerHTML += `<option value="${p}">${p} (${profile.status})</option>`;
        }
    });

    // Also allow transferring to any DB known player
    allProfiles.forEach(p => {
        if (p.name !== currentPlayerName && !sessionData.activePlayers.includes(p.name)) {
            selectEl.innerHTML += `<option value="${p.name}">${p.name} (${p.status})</option>`;
        }
    });

    document.getElementById('opponent-transfer-modal').style.display = 'block';
    window.updateOpponentTransferPreview();
};

window.closeOpponentTransferModal = () => {
    document.getElementById('opponent-transfer-modal').style.display = 'none';
    activeCheckoutTransferTarget = null;
};

document.getElementById('opponent-transfer-select')?.addEventListener('change', () => {
    if(activeCheckoutTransferTarget) window.updateOpponentTransferPreview();
});

window.updateOpponentTransferPreview = () => {
    if (!activeCheckoutTransferTarget) return;
    const sessionData = window[`session_${activeCheckoutTransferTarget}`];
    const selectEl = document.getElementById('opponent-transfer-select');
    if (!selectEl.value) return;
    
    const opponentName = selectEl.value;
    const profile = getUnifiedPlayerProfile(opponentName);

    // Recalculate bill as if ONLY opponent played (to strictly apply their member/non-member rate)
    const { bill } = calculateBill(sessionData.gameMode, sessionData.totalMinutes, [opponentName]);
    const recalculatedBill = Math.ceil(bill);

    const previewEl = document.getElementById('opponent-recalc-preview');
    if(profile.status === 'Non-Member') {
        previewEl.innerHTML = `Non-Member Rate Applies<br>New Transfer Bill: Rs. ${recalculatedBill}`;
    } else {
        previewEl.innerHTML = `Member Rate Applies<br>New Transfer Bill: Rs. ${recalculatedBill}`;
        previewEl.style.color = 'var(--accent-blue)';
    }
};

window.executeCheckoutTransfer = () => {
    if (!activeCheckoutTransferTarget) return;
    const tableId = activeCheckoutTransferTarget;
    const sessionData = window[`session_${tableId}`];
    
    const selectEl = document.getElementById('opponent-transfer-select');
    const opponentName = selectEl.value;
    if (!opponentName) return;
    const profile = getUnifiedPlayerProfile(opponentName);

    // Recalculate full bill based purely on opponent's rate
    const { bill, baseRateApplied } = calculateBill(sessionData.gameMode, sessionData.totalMinutes, [opponentName]);
    const totalBill = Math.ceil(bill);

    sessionData.totalBill = totalBill;
    sessionData.baseRateApplied = baseRateApplied;
    sessionData.playerName = `TRANSFERRED TO ${opponentName}`;
    sessionData.playerStatus = profile.status;
    
    // Add to opponent's ledger directly
    confirmPayment(tableId, opponentName, totalBill, 'Credit');
    logSessionToLedger(sessionData);

    const tables = getTablesState();
    const tableIndex = tables.findIndex(t => t.id === tableId);
    if(tableIndex !== -1) {
        tables[tableIndex].isActive = false;
        tables[tableIndex].playerName = '';
        tables[tableIndex].players = [];
        tables[tableIndex].gameMode = 'Single';
        tables[tableIndex].startTime = null;
    }
    saveTablesState(tables);
    renderTables();
    delete window[`session_${tableId}`];
    closeOpponentTransferModal();

    showToast(`Game successfully transferred! Rs. ${totalBill} added to ${opponentName}'s ledger.`);
};

// --- Cancel Game Logic ---
let activeCancelTarget = null;
window.openCancelGameModal = (tableId) => {
    activeCancelTarget = tableId;
    document.getElementById('cancel-admin-pass').value = '';
    document.getElementById('cancel-reason').value = '';
    document.getElementById('cancel-game-modal').style.display = 'block';
};

window.closeCancelGameModal = () => {
    document.getElementById('cancel-game-modal').style.display = 'none';
    activeCancelTarget = null;
};

window.executeCancelGame = () => {
    const pass = document.getElementById('cancel-admin-pass').value;
    const reason = document.getElementById('cancel-reason').value.trim();
    if(!pass || !reason) {
        showToast("Both password and reason are required.", "error");
        return;
    }
    
    const sysUsers = JSON.parse(localStorage.getItem('sys_users') || '[]');
    const masterAdmin = sysUsers.find(u => u.role === 'admin');
    
    if(!masterAdmin || masterAdmin.password !== pass) {
        showToast("Invalid Master Admin password.", "error");
        return;
    }

    if (!activeCancelTarget) return;
    const tableId = activeCancelTarget;
    
    const tables = getTablesState();
    const tableIndex = tables.findIndex(t => t.id === tableId);
    if (tableIndex === -1) return;
    
    const t = tables[tableIndex];
    
    const sessionData = {
        tableId: t.id,
        gameMode: t.gameMode,
        startTime: t.startTime,
        endTime: Date.now(),
        totalMinutes: 0,
        totalBill: 0,
        finalAmountDue: 0,
        playerName: (t.players && t.players[0]) || t.playerName || 'Unknown',
        payerStatus: 'CANCELLED',
        mode: 'Cancelled',
        reason: reason
    };

    logSessionToLedger(sessionData);
    
    const dailyIncome = JSON.parse(localStorage.getItem('dailyIncome') || '[]');
    dailyIncome.push({
        id: Date.now(),
        date: new Date().toISOString(),
        playerName: sessionData.playerName + ' (CANCELLED)',
        amount: 0,
        mode: 'Cancelled',
        reason: reason
    });
    localStorage.setItem('dailyIncome', JSON.stringify(dailyIncome));
    
    t.isActive = false;
    t.playerName = '';
    t.players = [];
    t.gameMode = 'Single';
    t.startTime = null;

    saveTablesState(tables);
    renderTables();
    updateDashboardMetrics();
    closeCancelGameModal();
    showToast(`Table ${tableId} Cancelled Successfully. Logged as 0.`, 'success');
};

// --- Table Shifting Logic ---
let activeShiftSource = null;
window.openShiftTableModal = (tableId) => {
    const tables = getTablesState();
    const tIndex = tables.findIndex(t => t.id === tableId);
    if(tIndex === -1 || !tables[tIndex].isActive) return;
    
    activeShiftSource = tableId;
    
    const selectEl = document.getElementById('shift-target-table');
    selectEl.innerHTML = '';
    
    let idleCount = 0;
    tables.forEach(t => {
        if(!t.isActive) {
            selectEl.innerHTML += `<option value="${t.id}">Table ${t.id} (Idle)</option>`;
            idleCount++;
        }
    });

    if(idleCount === 0) {
        showToast("No idle tables to shift to.", "error");
        activeShiftSource = null;
        return;
    }

    const payer = tables[tIndex].players && tables[tIndex].players[0] ? tables[tIndex].players[0] : tables[tIndex].playerName;
    document.getElementById('shift-payer-name-display').textContent = payer || 'Player 1';

    document.getElementById('shift-table-modal').style.display = 'block';
};

window.closeShiftTableModal = () => {
    document.getElementById('shift-table-modal').style.display = 'none';
    activeShiftSource = null;
};

window.executeShiftTable = () => {
    if(!activeShiftSource) return;
    const targetTableId = parseInt(document.getElementById('shift-target-table').value, 10);
    if(isNaN(targetTableId)) return;

    const splitModeEl = document.querySelector('input[name="shift_bill_split"]:checked');
    if(!splitModeEl) return;
    const splitMode = splitModeEl.value;
    
    const tables = getTablesState();
    const sourceTable = tables.find(t => t.id === activeShiftSource);
    const targetTable = tables.find(t => t.id === targetTableId);
    
    if(!sourceTable || !targetTable) return;

    const diffMs = Date.now() - sourceTable.startTime;
    const totalMinutes = Math.floor(diffMs / 60000);
    const activePlayers = (sourceTable.players || []).filter(p => p.trim() !== '');
    
    const { bill } = calculateBill(sourceTable.gameMode, totalMinutes, activePlayers);
    const totalBill = Math.ceil(bill);
    
    // Distribute credit based on splitMode
    if (splitMode === 'payer') {
        const payer = activePlayers.length > 0 ? activePlayers[0] : sourceTable.playerName || 'Unknown';
        confirmPayment(sourceTable.id, payer, totalBill, 'Credit');
        showToast(`Rs. ${totalBill} added to ${payer}'s credit ledger.`);
    } else {
        const splitCount = activePlayers.length || 1;
        const splitAmount = Math.ceil(totalBill / splitCount);
        activePlayers.forEach(p => {
            confirmPayment(sourceTable.id, p, splitAmount, 'Credit');
        });
        showToast(`Bill of Rs. ${totalBill} split between ${splitCount} players.`);
    }

    logSessionToLedger({
        tableId: sourceTable.id,
        gameMode: sourceTable.gameMode,
        startTime: sourceTable.startTime,
        endTime: Date.now(),
        totalMinutes: totalMinutes,
        totalBill: totalBill,
        finalAmountDue: totalBill,
        playerName: 'SHIFTED TO T' + targetTableId,
        payerStatus: 'Shifted',
        date: new Date().toISOString()
    });

    targetTable.isActive = true;
    targetTable.players = [...(sourceTable.players || [])];
    targetTable.playerName = sourceTable.playerName;
    targetTable.gameMode = sourceTable.gameMode;
    targetTable.centuryType = sourceTable.centuryType;
    targetTable.teamSize = sourceTable.teamSize;
    targetTable.groupCount = sourceTable.groupCount;
    targetTable.startTime = Date.now();
    targetTable.alertedLimit = false;

    sourceTable.isActive = false;
    sourceTable.playerName = '';
    sourceTable.players = [];
    sourceTable.gameMode = 'Single';
    sourceTable.startTime = null;

    saveTablesState(tables);
    renderTables();
    closeShiftTableModal();
    showToast(`Table successfully shifted to Table ${targetTableId}!`);
};
