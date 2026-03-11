import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { members } from '@/schema/members';
import { eq } from 'drizzle-orm';

// PUT /api/members/[id] — update a member
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);
        if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        const body = await request.json();
        const {
            name, phone, email,
            membershipType, membershipFee,
            startDate, endDate,
            tournamentStartDate, tournamentEndDate,
            notes, isActive
        } = body;

        const [updated] = await db.update(members)
            .set({
                name: name?.trim(),
                phone: phone?.trim(),
                email: email?.trim() || null,
                membershipType,
                membershipFee: membershipFee?.toString(),
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                tournamentStartDate: tournamentStartDate ? new Date(tournamentStartDate) : null,
                tournamentEndDate: tournamentEndDate ? new Date(tournamentEndDate) : null,
                notes: notes?.trim() || null,
                isActive: isActive !== undefined ? isActive : undefined,
                updatedAt: new Date(),
            })
            .where(eq(members.id, id))
            .returning();

        if (!updated) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

        return NextResponse.json({ member: updated });
    } catch (error) {
        console.error('Failed to update member:', error);
        return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
    }
}

// DELETE /api/members/[id] — delete a member
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);
        if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        await db.delete(members).where(eq(members.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete member:', error);
        return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 });
    }
}

// GET /api/members/[id] — get single member
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);
        if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        const [member] = await db.select().from(members).where(eq(members.id, id));

        if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

        return NextResponse.json({ member });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch member' }, { status: 500 });
    }
}
