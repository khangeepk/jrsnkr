import { pgTable, serial, varchar, decimal, boolean, timestamp, integer, text, jsonb } from 'drizzle-orm/pg-core';
import { members } from './members';
import { tables } from './tables';

/**
 * Game Sessions — Enhanced replacement for table_sessions
 * Supports Single, Double, Century (Individual/Team/Group) game types
 * with per-game and per-minute billing modes
 */
export const gameSessions = pgTable('game_sessions', {
    id: serial('id').primaryKey(),
    tableId: integer('table_id').references(() => tables.id).notNull(),

    // Game type
    // single: 1-6 players, base 20min + 5min grace
    // double: team-based, base 30min + 5min grace
    // century_individual: loser pays all
    // century_team: losing team pays all
    // century_group: nominated player pays all
    gameType: varchar('game_type', { length: 30 }).notNull().default('single'),

    // Players stored as JSON: [{name, memberId, isMember, role, teamSide}]
    // role: 'player' | 'nominated_payer'
    // teamSide: 'A' | 'B' (for double/century_team)
    players: text('players').notNull(), // JSON string

    // For century_group: ID or name of nominated payer
    nominatedPayerName: varchar('nominated_payer_name', { length: 100 }),
    nominatedPayerMemberId: integer('nominated_payer_member_id').references(() => members.id),

    // Timing
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time'),
    actualDurationMinutes: integer('actual_duration_minutes'),

    // Billing
    graceApplied: boolean('grace_applied').default(false), // true = no charge (ended within 5 mins)
    billingMode: varchar('billing_mode', { length: 20 }).default('per_game'), // 'per_game' | 'per_minute'
    overtimeTriggered: boolean('overtime_triggered').default(false),
    overtimeResumedAt: timestamp('overtime_resumed_at'), // when user clicked "Resume"

    // Rates used
    baseRateMember: decimal('base_rate_member', { precision: 10, scale: 2 }).default('250'),
    baseRateNonMember: decimal('base_rate_non_member', { precision: 10, scale: 2 }).default('350'),
    perMinuteRateMember: decimal('per_minute_rate_member', { precision: 10, scale: 2 }).default('12'),
    perMinuteRateNonMember: decimal('per_minute_rate_non_member', { precision: 10, scale: 2 }).default('15'),

    // Calculated amounts
    calculatedAmount: decimal('calculated_amount', { precision: 10, scale: 2 }),
    finalAmount: decimal('final_amount', { precision: 10, scale: 2 }),

    // Payment
    paymentStatus: varchar('payment_status', { length: 20 }).default('pending'), // pending | paid | credit
    paymentMethod: varchar('payment_method', { length: 30 }), // cash | online | credit | transfer

    // For 'transfer' payment: who received the transfer
    transferToPlayerName: varchar('transfer_to_player_name', { length: 100 }),

    status: varchar('status', { length: 20 }).default('active'), // active | completed | cancelled
    notes: text('notes'),
    staffId: integer('staff_id'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export type GameSession = typeof gameSessions.$inferSelect;
export type NewGameSession = typeof gameSessions.$inferInsert;

// Type helpers for the players JSON
export interface GamePlayer {
    name: string;
    memberId?: number | null;
    isMember: boolean;
    role: 'player' | 'nominated_payer';
    teamSide?: 'A' | 'B';
}
