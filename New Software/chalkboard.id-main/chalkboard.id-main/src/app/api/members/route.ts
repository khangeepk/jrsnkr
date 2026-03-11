import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { members } from '@/schema/members';
import { eq, desc, like, or } from 'drizzle-orm';

// GET /api/members — list all members, optionally filter by search
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const type = searchParams.get('type') || '';

        let query = db.select().from(members).orderBy(desc(members.createdAt));

        const allMembers = await db.select().from(members).orderBy(desc(members.createdAt));

        let filtered = allMembers;

        if (search) {
            const s = search.toLowerCase();
            filtered = filtered.filter(m =>
                m.name.toLowerCase().includes(s) ||
                m.phone.toLowerCase().includes(s) ||
                (m.email?.toLowerCase().includes(s) ?? false)
            );
        }

        if (type && type !== 'all') {
            if (type === 'active') {
                filtered = filtered.filter(m => m.isActive && new Date(m.endDate) >= new Date());
            } else if (type === 'expired') {
                filtered = filtered.filter(m => new Date(m.endDate) < new Date());
            } else if (type === 'annual' || type === 'tournament') {
                filtered = filtered.filter(m => m.membershipType === type);
            }
        }

        return NextResponse.json({ members: filtered });
    } catch (error) {
        console.error('Failed to fetch members:', error);
        return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }
}

// POST /api/members — create a new member
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            name, phone, email,
            membershipType, membershipFee,
            startDate, endDate,
            tournamentStartDate, tournamentEndDate,
            notes
        } = body;

        if (!name || !phone || !membershipType || !startDate || !endDate) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const [newMember] = await db.insert(members).values({
            name: name.trim(),
            phone: phone.trim(),
            email: email?.trim() || null,
            membershipType,
            membershipFee: membershipFee?.toString() || (membershipType === 'annual' ? '3000' : '1500'),
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            tournamentStartDate: tournamentStartDate ? new Date(tournamentStartDate) : null,
            tournamentEndDate: tournamentEndDate ? new Date(tournamentEndDate) : null,
            notes: notes?.trim() || null,
            isActive: true,
        }).returning();

        return NextResponse.json({ member: newMember }, { status: 201 });
    } catch (error) {
        console.error('Failed to create member:', error);
        return NextResponse.json({ error: 'Failed to create member' }, { status: 500 });
    }
}
