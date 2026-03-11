import { pgTable, serial, varchar, decimal, integer, timestamp, text } from 'drizzle-orm/pg-core';
import { members } from './members';
import { gameSessions } from './game-sessions';

/**
 * Credit Ledger — Tracks outstanding credit balances per player
 * When a player chooses 'Credit' at checkout, an entry is created here.
 */
export const creditLedger = pgTable('credit_ledger', {
    id: serial('id').primaryKey(),

    // Player identity (can be member or walk-in)
    playerName: varchar('player_name', { length: 100 }).notNull(),
    memberId: integer('member_id').references(() => members.id), // null for non-members

    // Linked game session
    gameSessionId: integer('game_session_id').references(() => gameSessions.id),

    // Amounts
    creditAmount: decimal('credit_amount', { precision: 10, scale: 2 }).notNull(), // Total credit taken
    paidAmount: decimal('paid_amount', { precision: 10, scale: 2 }).default('0'), // Amount repaid
    outstandingBalance: decimal('outstanding_balance', { precision: 10, scale: 2 }).notNull(), // Remaining

    // Status
    status: varchar('status', { length: 20 }).default('outstanding'), // outstanding | partially_paid | paid

    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
    paidAt: timestamp('paid_at'), // When fully settled
    updatedAt: timestamp('updated_at').defaultNow(),
});

export type CreditLedger = typeof creditLedger.$inferSelect;
export type NewCreditLedger = typeof creditLedger.$inferInsert;
