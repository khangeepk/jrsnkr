// cloud-sync.js
// Phase 4: Auto-Synchronizes LocalStorage state with a Centralized Firebase Realtime Database

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getDatabase, ref, onValue, set, get, child } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";

// ==========================================
// TO SECURELY ACTIVATE GLOBAL SYNC:
// Replace this dummy configuration with your actual Firebase Project config.
// ==========================================
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT.firebaseio.com",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};

let db = null;
let isSyncingFromServer = false;

// The keys we want to sync
const SYNC_KEYS = [
    'tablesState',
    'dailyIncome',
    'expenses',
    'players',
    'annual_members',
    'tournament_members',
    'sessionLedger',
    'staff',
    'sys_users',
    'liveFeedText'
];

try {
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    console.log("[Cloud] Firebase initialized successfully.");
    initCloudSync();
} catch (error) {
    console.warn("[Cloud] Firebase initialization failed. You are running in Offline/Local Mode.", error.message);
}

function initCloudSync() {
    const dbRef = ref(db, 'snooker_state');

    // 1. Initial Load & Realtime Listener
    onValue(dbRef, (snapshot) => {
        if (!snapshot.exists()) return;

        const serverData = snapshot.val();
        isSyncingFromServer = true;

        let requiresRerender = false;

        SYNC_KEYS.forEach(key => {
            if (serverData[key] !== undefined) {
                const localData = localStorage.getItem(key);
                const serverString = typeof serverData[key] === 'string' ? serverData[key] : JSON.stringify(serverData[key]);
                
                // Only override if different to prevent infinite loops
                if (localData !== serverString) {
                    localStorage.setItem(key, serverString);
                    requiresRerender = true;
                }
            }
        });

        isSyncingFromServer = false;

        // Force UI updates if data shifted remotely
        if (requiresRerender) {
            console.log("[Cloud] New state received from server. Refreshing UI...");
            triggerGlobalUIRefresh();
        }
    });

    // 2. Intercept local writes (Overriding localStorage.setItem)
    const originalSetItem = localStorage.setItem;
    
    // We override the prototype directly to catch ALL saves across the entire app
    Storage.prototype.setItem = function(key, value) {
        // Execute the physical local save first
        originalSetItem.apply(this, arguments);

        // If this save was triggered by the user (not by the incoming Firebase sync)
        // and it's an important key, push it up to Firebase.
        if (!isSyncingFromServer && SYNC_KEYS.includes(key)) {
            pushToCloud(key, value);
        }
    };
}

// Debounce the cloud push to avoid spamming the DB on rapid keystrokes
let syncTimeouts = {};
function pushToCloud(key, valueStr) {
    if (!db) return;
    
    if (syncTimeouts[key]) clearTimeout(syncTimeouts[key]);
    
    syncTimeouts[key] = setTimeout(() => {
        try {
            // Attempt to parse string arrays back to JSON for cleaner Firebase tree
            const parsed = JSON.parse(valueStr);
            set(ref(db, `snooker_state/${key}`), parsed);
        } catch(e) {
            // Fallback to storing string
            set(ref(db, `snooker_state/${key}`), valueStr);
        }
    }, 500); // 500ms delay
}

function triggerGlobalUIRefresh() {
    // If we are on index.html
    if (typeof renderTables === 'function') {
        renderTables();
        if (typeof updateDashboardMetrics === 'function') updateDashboardMetrics();
    }
    
    // If we are on admin.html
    if (typeof renderPlayerLedger === 'function') {
        renderPlayerLedger();
    }
    
    // If we are on reports.html
    if (typeof renderIncomePortal === 'function') {
        renderIncomePortal(JSON.parse(localStorage.getItem('dailyIncome') || '[]'));
        renderMemberDirectory();
    }
}
