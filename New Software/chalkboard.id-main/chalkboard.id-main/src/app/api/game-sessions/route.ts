import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { gameSessions } from '@/schema/game-sessions';
import { incomeLedger } from '@/schema/income-ledger';
import { creditLedger } from '@/schema/credit-ledger';
import { tables } from '@/schema/tables';
import { eq, desc } from 'drizzle-orm';
import { calculateBilling, Player, GameType, BillingMode } from '@/lib/game-engine';

// GET /api/game-sessions — list active and recent sessions
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'active';

        const sessions = await db.select().from(gameSessions)
            .where(status === 'all' ? undefined : eq(gameSessions.status, status))
            .orderBy(desc(gameSessions.createdAt));

        return NextResponse.json({ sessions });
    } catch (error) {
        console.error('Game sessions fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }
}

// POST /api/game-sessions — start a new game session
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            tableId, gameType, players,
            nominatedPayerName, nominatedPayerMemberId,
            staffId, notes
        } = body;

        if (!tableId || !gameType || !players || players.length === 0) {
            return NextResponse.json({ error: 'tableId, gameType, and players are required' }, { status: 400 });
        }

        // Mark table as occupied
        await db.update(tables).set({ status: 'occupied' }).where(eq(tables.id, tableId));

        const [session] = await db.insert(gameSessions).values({
            tableId,
            gameType,
            players: JSON.stringify(players),
            nominatedPayerName: nominatedPayerName || null,
            nominatedPayerMemberId: nominatedPayerMemberId || null,
            startTime: new Date(),
            billingMode: 'per_game',
            status: 'active',
            staffId: staffId || null,
            notes: notes || null,
        }).returning();

        return NextResponse.json({ session }, { status: 201 });
    } catch (error) {
        console.error('Start game session error:', error);
        return NextResponse.json({ error: 'Failed to start game session' }, { status: 500 });
    }
}

// PATCH /api/game-sessions — end a game session with payment
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { sessionId, action, billingMode } = body;

        if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

        const [session] = await db.select().from(gameSessions).where(eq(gameSessions.id, sessionId));
        if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

        // Switch to per-minute billing (user clicked "Resume" on overtime popup)
        if (action === 'switch_to_per_minute') {
            const [updated] = await db.update(gameSessions).set({
                billingMode: 'per_minute',
                overtimeTriggered: true,
                overtimeResumedAt: new Date(),
                updatedAt: new Date(),
            }).where(eq(gameSessions.id, sessionId)).returning();

            return NextResponse.json({ session: updated });
        }

        // End game and process payment
        if (action === 'end_game') {
            const { paymentMethod, loserPlayerName, transferToPlayerName } = body;

            const endTime = new Date();
            const endMs = Date.now();
            const startMs = new Date(session.startTime).getTime();
            const durationMs = endMs - startMs;

            // High-precision flooring/ceiling to minutes bounds
            const durationMinutes = Math.ceil(durationMs / 60000);

            const players: Player[] = JSON.parse(session.players);

            // Calculate billing
            const billing = calculateBilling({
                gameType: session.gameType as GameType,
                players,
                billingMode: (session.billingMode as BillingMode) || 'per_game',
                durationMinutes,
                nominatedPayerName: session.nominatedPayerName || undefined,
            });

            if (billing.isGrace) {
                // Grace period — no charge
                await db.update(gameSessions).set({
                    endTime,
                    actualDurationMinutes: durationMinutes,
                    graceApplied: true,
                    finalAmount: '0',
                    paymentStatus: 'paid',
                    paymentMethod: 'cash',
                    status: 'completed',
                    updatedAt: new Date(),
                }).where(eq(gameSessions.id, sessionId));

                // Mark table as available
                await db.update(tables).set({ status: 'available' }).where(eq(tables.id, session.tableId));

                return NextResponse.json({ session: { id: sessionId, graceApplied: true, amountDue: 0 } });
            }

            // Determine display player name (for ledger)
            const payerName = loserPlayerName || players[0]?.name || 'Unknown';

            await db.update(gameSessions).set({
                endTime,
                actualDurationMinutes: durationMinutes,
                finalAmount: billing.amountDue.toString(),
                paymentStatus: paymentMethod === 'credit' ? 'credit' : 'paid',
                paymentMethod: paymentMethod || 'cash',
                transferToPlayerName: transferToPlayerName || null,
                status: 'completed',
                updatedAt: new Date(),
            }).where(eq(gameSessions.id, sessionId));

            // Mark table as available
            await db.update(tables).set({ status: 'available' }).where(eq(tables.id, session.tableId));

            // Create ledger entries
            if (paymentMethod === 'cash' || paymentMethod === 'online') {
                // Get table name for display
                const [table] = await db.select().from(tables).where(eq(tables.id, session.tableId));

                await db.insert(incomeLedger).values({
                    gameSessionId: sessionId,
                    playerName: payerName,
                    tableId: session.tableId,
                    tableName: table?.name || null,
                    gameType: session.gameType || null,
                    durationMinutes,
                    amount: billing.amountDue.toString(),
                    paymentMethod,
                });
            } else if (paymentMethod === 'credit') {
                await db.insert(creditLedger).values({
                    playerName: payerName,
                    memberId: null,
                    gameSessionId: sessionId,
                    creditAmount: billing.amountDue.toString(),
                    paidAmount: '0',
                    outstandingBalance: billing.amountDue.toString(),
                    status: 'outstanding',
                });
            }

            return NextResponse.json({
                session: { id: sessionId, amountDue: billing.amountDue, breakdown: billing.breakdown },
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Game session action error:', error);
        return NextResponse.json({ error: 'Failed to process game session action' }, { status: 500 });
    }
}
