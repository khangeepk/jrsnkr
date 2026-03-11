import { pgTable, serial, varchar, decimal, integer, timestamp, text } from 'drizzle-orm/pg-core';
import { gameSessions } from './game-sessions';

/**
 * Income Ledger — Real-time tracking of all Cash and Online payments
 * Updated automatically when a game session is paid via Cash or Online.
 */
export const incomeLedger = pgTable('income_ledger', {
    id: serial('id').primaryKey(),

    // Source
    gameSessionId: integer('game_session_id').references(() => gameSessions.id),

    // Player/customer details
    playerName: varchar('player_name', { length: 100 }).notNull(),
    tableId: integer('table_id'),
    tableName: varchar('table_name', { length: 50 }),

    // Game info for display
    gameType: varchar('game_type', { length: 30 }), // single | double | century_*
    durationMinutes: integer('duration_minutes'),

    // Payment
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    paymentMethod: varchar('payment_method', { length: 20 }).notNull(), // cash | online

    notes: text('notes'),
    staffId: integer('staff_id'),
    createdAt: timestamp('created_at').defaultNow(),
});

export type IncomeLedger = typeof incomeLedger.$inferSelect;
export type NewIncomeLedger = typeof incomeLedger.$inferInsert;
