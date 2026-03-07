export const tables = [
    { id: 1, name: "Table 1", status: "active", players: 2, maxPlayers: 2, startTime: "2026-02-27T10:00:00Z" },
    { id: 2, name: "Table 2", status: "available", players: 0, maxPlayers: 2, startTime: null },
    { id: 3, name: "Table 3", status: "active", players: 3, maxPlayers: 3, startTime: "2026-02-27T11:15:00Z" },
    { id: 4, name: "Table 4", status: "maintenance", players: 0, maxPlayers: 2, startTime: null },
    { id: 5, name: "VIP Table 1", status: "active", players: 2, maxPlayers: 2, startTime: "2026-02-27T09:30:00Z" },
    { id: 6, name: "VIP Table 2", status: "available", players: 0, maxPlayers: 2, startTime: null },
];

export const players = [
    { id: 1, name: "Ronnie O'Sullivan", rank: "Master", points: 12500, gamesPlayed: 450 },
    { id: 2, name: "Judd Trump", rank: "Pro", points: 9800, gamesPlayed: 320 },
    { id: 3, name: "Mark Selby", rank: "Pro", points: 8700, gamesPlayed: 310 },
    { id: 4, name: "Neil Robertson", rank: "Pro", points: 8500, gamesPlayed: 290 },
    { id: 5, name: "John Higgins", rank: "Master", points: 11200, gamesPlayed: 410 },
];

export const recentTransactions = [
    { id: "TX-1001", type: "Table Fee", amount: 45.00, date: "2026-02-27T10:30:00Z", status: "completed" },
    { id: "TX-1002", type: "Snacks", amount: 12.50, date: "2026-02-27T10:45:00Z", status: "completed" },
    { id: "TX-1003", type: "Cue Maintenance", amount: 25.00, date: "2026-02-27T11:00:00Z", status: "completed" },
    { id: "TX-1004", type: "Table Fee", amount: 60.00, date: "2026-02-27T11:30:00Z", status: "pending" },
];
