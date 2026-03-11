import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { incomeLedger } from '@/schema/income-ledger';
import { creditLedger } from '@/schema/credit-ledger';
import { desc, eq, sum } from 'drizzle-orm';

// GET /api/ledger?tab=income|credit
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tab = searchParams.get('tab') || 'income';

        if (tab === 'income') {
            const entries = await db.select().from(incomeLedger).orderBy(desc(incomeLedger.createdAt));
            return NextResponse.json({ entries });
        }

        if (tab === 'credit') {
            const entries = await db.select().from(creditLedger).orderBy(desc(creditLedger.createdAt));

            // Group by player name for outstanding balances
            const playerBalances: Record<string, number> = {};
            for (const entry of entries) {
                if (!playerBalances[entry.playerName]) playerBalances[entry.playerName] = 0;
                playerBalances[entry.playerName] += Number(entry.outstandingBalance);
            }

            return NextResponse.json({ entries, playerBalances });
        }

        return NextResponse.json({ error: 'Invalid tab' }, { status: 400 });
    } catch (error) {
        console.error('Ledger fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch ledger' }, { status: 500 });
    }
}

// POST /api/ledger — add income or credit entry
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, ...data } = body;

        if (type === 'income') {
            const [entry] = await db.insert(incomeLedger).values({
                gameSessionId: data.gameSessionId || null,
                playerName: data.playerName,
                tableId: data.tableId || null,
                tableName: data.tableName || null,
                gameType: data.gameType || null,
                durationMinutes: data.durationMinutes || null,
                amount: data.amount.toString(),
                paymentMethod: data.paymentMethod, // cash | online
                notes: data.notes || null,
                staffId: data.staffId || null,
            }).returning();
            return NextResponse.json({ entry }, { status: 201 });
        }

        if (type === 'credit') {
            const [entry] = await db.insert(creditLedger).values({
                playerName: data.playerName,
                memberId: data.memberId || null,
                gameSessionId: data.gameSessionId || null,
                creditAmount: data.amount.toString(),
                paidAmount: '0',
                outstandingBalance: data.amount.toString(),
                status: 'outstanding',
                notes: data.notes || null,
            }).returning();
            return NextResponse.json({ entry }, { status: 201 });
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    } catch (error) {
        console.error('Ledger post error:', error);
        return NextResponse.json({ error: 'Failed to create ledger entry' }, { status: 500 });
    }
}
