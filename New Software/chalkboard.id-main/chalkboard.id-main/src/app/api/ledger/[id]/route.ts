import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { creditLedger } from '@/schema/credit-ledger';
import { eq } from 'drizzle-orm';

// PUT /api/ledger/[id] — mark credit as paid or partial payment
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);
        if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        const body = await request.json();
        const { paidAmount, markFullyPaid } = body;

        const [existing] = await db.select().from(creditLedger).where(eq(creditLedger.id, id));
        if (!existing) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

        const totalCredit = Number(existing.creditAmount);
        const alreadyPaid = Number(existing.paidAmount);
        const newPaid = markFullyPaid ? totalCredit : alreadyPaid + Number(paidAmount);
        const newBalance = Math.max(0, totalCredit - newPaid);
        const newStatus = newBalance === 0 ? 'paid' : newPaid > 0 ? 'partially_paid' : 'outstanding';

        const [updated] = await db.update(creditLedger)
            .set({
                paidAmount: newPaid.toString(),
                outstandingBalance: newBalance.toString(),
                status: newStatus,
                paidAt: newStatus === 'paid' ? new Date() : null,
                updatedAt: new Date(),
            })
            .where(eq(creditLedger.id, id))
            .returning();

        return NextResponse.json({ entry: updated });
    } catch (error) {
        console.error('Credit update error:', error);
        return NextResponse.json({ error: 'Failed to update credit' }, { status: 500 });
    }
}
