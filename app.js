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

// JR Snooker Lounge App Logic

// --- 1. Database Mock & Constants (Ultra-Light) ---

const PRICING = {
    Member: { base: 250, perMinute: 12 },
    "Non-Member": { base: 350, perMinute: 15 }
};

const THRESHOLDS = {
    Single: 25,
    Double: 35,
    Century: 35
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
    const grid = document.getElementById('tables-grid');
    grid.innerHTML = ''; // Clear existing

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
            <div class="card-header">
                <span class="table-title">Table ${table.id}</span>
                <span class="status-badge ${isRunning ? 'active' : 'idle'}">${isRunning ? 'In Use' : 'Available'}</span>
            </div>

            <div class="form-group" style="margin-bottom: 0.5rem;">
                <label for="mode-${table.id}">Game Mode</label>
                <select id="mode-${table.id}" ${isRunning ? 'disabled' : ''} onchange="handleModeChange(${table.id}, this.value)">
                    <option value="Single" ${table.gameMode === 'Single' ? 'selected' : ''}>Single (25m Limit)</option>
                    <option value="Double" ${table.gameMode === 'Double' ? 'selected' : ''}>Double (35m Limit)</option>
                    <option value="Century" ${table.gameMode === 'Century' ? 'selected' : ''}>Century (No Limit)</option>
                </select>
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

            <div class="actions" style="margin-top: auto; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                ${isRunning ?
                `
                <button class="btn btn-cash" style="flex: 1; padding: 0.5rem;" onclick="openTransferModal(${table.id})">Transfer</button>
                <button class="btn btn-end" style="flex: 2; padding: 0.5rem;" onclick="endSession(${table.id})">End Session</button>
                ` :
                (hasPerm('add') ? `<button class="btn btn-start" id="start-btn-${table.id}" style="flex: 1; padding: 0.5rem;" onclick="startSession(${table.id})" disabled>Start Session</button>` : `<button class="btn" disabled style="opacity:0.5; cursor:not-allowed; flex: 1;">Access Restricted</button>`)
            }
            </div>
            
            <div class="results-container" id="results-${table.id}"></div>
        `;

        grid.appendChild(card);

        if (!isRunning) {
            // Need a slight delay to ensure DOM is fully painted before checking inputs by ID
            setTimeout(() => updateStartButtonState(table.id), 0);
        }
    });

    document.getElementById('active-tables-count').textContent = `Active Tables: ${activeCount}`;

    // Close autocomplete lists when clicking outside
    document.addEventListener("click", function (e) {
        closeAllAutocompleteLists(e.target);
    });

    // Start interval for elapsed time update if any table is active
    updateElapsedTimes();
};

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

    // Flexible Player Boxes logic: Minimum 2 players required to start any game
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
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
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

        // Membership Expiry Warning (10 Days or less)
        const annualMatch = annuals.find(a => a.name.toLowerCase() === pName.toLowerCase() || a.member_id === profile.member_id);
        if (annualMatch) {
            const timeRemaining = annualMatch.expiry_date - now;
            if (timeRemaining > 0 && timeRemaining <= tenDaysMs) {
                const daysLeft = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
                setTimeout(() => {
                    alert(`WARNING: ${profile.name}'s Annual Membership expires in ${daysLeft} days!`);
                }, 1000);
            } else if (timeRemaining <= 0) {
                setTimeout(() => {
                    alert(`WARNING: ${profile.name}'s Annual Membership HAS EXPIRED!`);
                }, 1000);
            }
        }
    });
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

    let totalBill = 0;

    // Universal 5-Minute Rule
    if (sessionData.totalMinutes <= 5) {
        totalBill = 0;
        sessionData.baseRateApplied = true;
    } else {
        // Double Mode Fixed Rates
        if (sessionData.gameMode === 'Double') {
            // Count Members vs Non-Members in the active game
            let memberCount = 0;
            let nonMemberCount = 0;

            sessionData.activePlayers.forEach(p => {
                const pInfo = getUnifiedPlayerProfile(p);
                if (pInfo.status === 'Member') memberCount++;
                else nonMemberCount++;
            });

            // Majority rules the fixed base rate for the table
            const baseFixedRate = (memberCount >= nonMemberCount && memberCount > 0) ? 500 : 700;

            if (sessionData.totalMinutes <= 35) {
                totalBill = baseFixedRate;
                sessionData.baseRateApplied = true;
            } else {
                const overtime = sessionData.totalMinutes - 35;
                // Mixed rate calculation for overtime part
                let overtimeBill = 0;

                if (memberCount > 0 && nonMemberCount > 0) {
                    // Split the overtime proportionately if mixed
                    const memberShare = overtime * 12 * (memberCount / sessionData.activePlayers.length);
                    const nonMemberShare = overtime * 15 * (nonMemberCount / sessionData.activePlayers.length);
                    overtimeBill = memberShare + nonMemberShare;
                } else if (memberCount > 0) {
                    overtimeBill = overtime * 12;
                } else {
                    overtimeBill = overtime * 15;
                }

                totalBill = baseFixedRate + overtimeBill;
                sessionData.baseRateApplied = false;
            }
        } else {
            // Single / Century Modes (Mixed Player Validations)
            let memberCount = 0;
            let nonMemberCount = 0;

            sessionData.activePlayers.forEach(p => {
                const pInfo = getUnifiedPlayerProfile(p);
                if (pInfo.status === 'Member') memberCount++;
                else nonMemberCount++;
            });

            if (sessionData.totalMinutes <= sessionData.limit) {
                // Determine base rate based on majority
                const baseRate = (memberCount >= nonMemberCount && memberCount > 0) ? PRICING["Member"].base : PRICING["Non-Member"].base;
                totalBill = baseRate;
                sessionData.baseRateApplied = true;
            } else {
                // Calculate mixed per-minute total
                if (memberCount > 0 && nonMemberCount > 0) {
                    const memberShare = sessionData.totalMinutes * 12 * (memberCount / sessionData.activePlayers.length);
                    const nonMemberShare = sessionData.totalMinutes * 15 * (nonMemberCount / sessionData.activePlayers.length);
                    totalBill = memberShare + nonMemberShare;
                } else if (memberCount > 0) {
                    totalBill = sessionData.totalMinutes * 12;
                } else {
                    totalBill = sessionData.totalMinutes * 15;
                }
                sessionData.baseRateApplied = false;
            }
        }
    }

    totalBill = Math.ceil(totalBill);

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
            <span>TOTAL AMOUNT DUE:</span>
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
            <button class="btn btn-cash" style="flex: 1; min-width: 30%;" onclick="finalizeSession(${tableId}, 'Cash')">Cash</button>
            <button class="btn btn-online" style="flex: 1; min-width: 30%;" onclick="finalizeSession(${tableId}, 'Online')">Online</button>
            <button class="btn btn-credit" style="flex: 1; min-width: 30%;" onclick="finalizeSession(${tableId}, 'Credit')">Credit</button>
            <button class="btn btn-transfer" style="flex: 1 1 100%;" onclick="showTransferModal(${tableId}, '${sessionData.playerName.replace(/'/g, "\\'")}', ${totalBill})">Transfer to Opponent</button>
        </div>
        <button class="btn btn-end" style="width: 100%; margin-top: 0.5rem; background: var(--bg-card); color: var(--text-main);" onclick="document.getElementById('results-${tableId}').innerHTML = ''; const act = document.querySelector('#table-card-${tableId} .actions'); if(act) act.style.display='flex';">Cancel Checkout</button>
`;
};

const finalizeSession = (tableId, mode) => {
    const sessionData = window[`session_${tableId}`];

    // Process Payment Ledger logic
    confirmPayment(tableId, sessionData.playerName, sessionData.totalBill, mode);

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

const confirmPayment = (tableId, playerName, amount, mode) => {
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

    if (mode === 'Credit') {
        const players = getPlayers();
        const playerIndex = players.findIndex(p => p.name === mappedPlayerName);

        const sessionData = window[`session_${tableId}`];
        // If they chose credit again, they are adding the NEW CURRENT BILL to their existing debt
        const newDebtAmount = sessionData ? sessionData.totalBill : amount;

        if (playerIndex !== -1) {
            players[playerIndex].balance = (players[playerIndex].balance || 0) + newDebtAmount;
            if (profile.member_id) players[playerIndex].member_id = profile.member_id; // link it
        } else {
            // Create a record
            players.push({
                id: Date.now(),
                name: mappedPlayerName,
                status: profile.status,
                balance: newDebtAmount,
                member_id: profile.member_id
            });
        }
        savePlayers(players);
        showToast(`Rs.${newDebtAmount} added to ${mappedPlayerName}'s pending balance.`, 'error');
    } else {
        // Cash or Online => Daily Income Portal
        const sessionData = window[`session_${tableId}`];
        const actualAmountCollected = sessionData ? sessionData.finalAmountDue : amount;

        // Clear their debt because they paid the Cumulative Total
        const players = getPlayers();
        const playerIndex = players.findIndex(p => p.name === mappedPlayerName);
        if (playerIndex !== -1) {
            players[playerIndex].balance = 0; // Cleared
            savePlayers(players);
        }

        const dailyIncome = JSON.parse(localStorage.getItem('dailyIncome') || '[]');
        dailyIncome.push({
            id: Date.now(),
            date: new Date().toISOString(),
            playerName: mappedPlayerName,
            amount: actualAmountCollected,
            mode: mode
        });
        localStorage.setItem('dailyIncome', JSON.stringify(dailyIncome));
        showToast(`Payment of Rs.${actualAmountCollected} received via ${mode}. Debt cleared if any.`);
        updateDashboardMetrics();
    }

    // Advance table callback
    const resetBtn = document.getElementById(`reset-btn-${tableId}`);
    if (resetBtn) resetBtn.click();
};

const updateDashboardMetrics = () => {
    // 1. Active Tables
    const tables = getTablesState();
    const activeCount = tables.filter(t => t.isActive).length;

    // 2. Today's Cash Collection
    const dailyIncome = JSON.parse(localStorage.getItem('dailyIncome') || '[]');
    const cashCollection = dailyIncome.reduce((sum, item) => sum + item.amount, 0);

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
        activeTables.forEach(t => {
            const el = document.getElementById(`elapsed-${t.id}`);
            const card = document.getElementById(`table-card-${t.id}`);
            if (el) {
                const diffMs = now - t.startTime;
                const totalMinutes = Math.floor(diffMs / 60000);
                el.innerText = `${totalMinutes}m`;

                // Phase 5 Grace Period Class Logic & Phase 10 Visual Limit Popups
                if (card) {
                    const limit = THRESHOLDS[t.gameMode] || 25;
                    const graceThreshold = limit - 5;

                    if (totalMinutes >= limit) {
                        card.classList.remove('grace-period');
                        // Time-Limit Popup Check
                        if (!t.alertedLimit && t.gameMode !== 'Century') {
                            t.alertedLimit = true;
                            saveTablesState(tables); // persist the flag

                            // Slight delay to ensure UI paints
                            setTimeout(() => {
                                const continueGame = confirm(`Table ${t.id} - Time Limit Reached (${limit} mins).\n\nContinue Game?`);
                                if (!continueGame) {
                                    endSession(t.id);
                                }
                            }, 500);
                        }
                    } else if (totalMinutes >= graceThreshold) {
                        card.classList.add('grace-period');
                    } else {
                        card.classList.remove('grace-period');
                    }
                }
            }
        });
    };

    tick(); // Initial call
    timerInterval = setInterval(tick, 60000); // Only update every minute to save CPU
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
    const limit = THRESHOLDS[sourceTable.gameMode] || 25;

    let totalBill = 0;
    const payerName = (sourceTable.players && sourceTable.players[0]) ? sourceTable.players[0] : sourceTable.playerName;
    const profile = getUnifiedPlayerProfile(payerName);

    if (totalMinutes <= 5) {
        totalBill = 0;
    } else {
        if (sourceTable.gameMode === 'Double') {
            let memberCount = 0;
            let nonMemberCount = 0;

            const activePlayers = (sourceTable.players || []).filter(p => p.trim() !== '');
            if (activePlayers.length === 0 && sourceTable.playerName) activePlayers.push(sourceTable.playerName);

            activePlayers.forEach(p => {
                const pInfo = getUnifiedPlayerProfile(p);
                if (pInfo.status === 'Member') memberCount++;
                else nonMemberCount++;
            });

            const baseFixedRate = (memberCount >= nonMemberCount && memberCount > 0) ? 500 : 700;

            if (totalMinutes <= 35) {
                totalBill = baseFixedRate;
            } else {
                const overtime = totalMinutes - 35;
                let overtimeBill = 0;
                if (memberCount > 0 && nonMemberCount > 0) {
                    const memberShare = overtime * 12 * (memberCount / activePlayers.length);
                    const nonMemberShare = overtime * 15 * (nonMemberCount / activePlayers.length);
                    overtimeBill = memberShare + nonMemberShare;
                } else if (memberCount > 0) {
                    overtimeBill = overtime * 12;
                } else {
                    overtimeBill = overtime * 15;
                }
                totalBill = baseFixedRate + overtimeBill;
            }
        } else {
            let memberCount = 0;
            let nonMemberCount = 0;

            const activePlayers = (sourceTable.players || []).filter(p => p.trim() !== '');
            if (activePlayers.length === 0 && sourceTable.playerName) activePlayers.push(sourceTable.playerName);

            activePlayers.forEach(p => {
                const pInfo = getUnifiedPlayerProfile(p);
                if (pInfo.status === 'Member') memberCount++;
                else nonMemberCount++;
            });

            if (totalMinutes <= limit) {
                const baseRate = (memberCount >= nonMemberCount && memberCount > 0) ? PRICING["Member"].base : PRICING["Non-Member"].base;
                totalBill = baseRate;
            } else {
                if (memberCount > 0 && nonMemberCount > 0) {
                    const memberShare = totalMinutes * 12 * (memberCount / activePlayers.length);
                    const nonMemberShare = totalMinutes * 15 * (nonMemberCount / activePlayers.length);
                    totalBill = memberShare + nonMemberShare;
                } else if (memberCount > 0) {
                    totalBill = totalMinutes * 12;
                } else {
                    totalBill = totalMinutes * 15;
                }
            }
        }
    }
    totalBill = Math.ceil(totalBill);

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
