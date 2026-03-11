import { pgTable, serial, varchar, decimal, boolean, timestamp, text, integer } from 'drizzle-orm/pg-core';

export const members = pgTable('members', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    phone: varchar('phone', { length: 20 }).notNull(),
    email: varchar('email', { length: 255 }),
    membershipType: varchar('membership_type', { length: 20 }).notNull().default('annual'), // 'annual' | 'tournament'
    membershipFee: decimal('membership_fee', { precision: 10, scale: 2 }).notNull(),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    // Tournament-specific fields (only relevant when membershipType = 'tournament')
    tournamentStartDate: timestamp('tournament_start_date'),
    tournamentEndDate: timestamp('tournament_end_date'),
    notes: text('notes'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
