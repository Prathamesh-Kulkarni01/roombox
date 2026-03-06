/**
 * /api/expenses — Shared API for expense management
 * Used by RTK Query (web UI) and WhatsApp bot.
 */
import { NextRequest, NextResponse } from 'next/server';
import { selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';

function badRequest(msg: string) {
    return NextResponse.json({ error: msg }, { status: 400 });
}

// GET /api/expenses?ownerId=xxx[&pgId=xxx][&category=maintenance]
export async function GET(req: NextRequest) {
    const ownerId = req.nextUrl.searchParams.get('ownerId');
    const pgId = req.nextUrl.searchParams.get('pgId') || undefined;
    const category = req.nextUrl.searchParams.get('category') || undefined;
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '100', 10);

    if (!ownerId) return badRequest('ownerId is required');

    try {
        const db = await selectOwnerDataAdminDb(ownerId);
        let query = db.collection('users_data').doc(ownerId).collection('expenses')
            .orderBy('date', 'desc')
            .limit(limit) as FirebaseFirestore.Query;

        if (pgId) query = query.where('pgId', '==', pgId);
        if (category) query = query.where('category', '==', category);

        const snapshot = await query.get();
        const expenses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        return NextResponse.json({ success: true, expenses });
    } catch (error: any) {
        console.error('GET /api/expenses error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch expenses' }, { status: 500 });
    }
}

// POST /api/expenses — create an expense
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { ownerId, expense } = body;
        if (!ownerId || !expense) return badRequest('ownerId and expense are required');

        const { description, amount, category, pgId, date } = expense;
        if (!description || !amount || !category) {
            return badRequest('description, amount, and category are required');
        }

        const db = await selectOwnerDataAdminDb(ownerId);
        const id = `exp-${Date.now()}`;
        const newExpense = {
            id,
            ownerId,
            description,
            amount: Number(amount),
            category,
            pgId: pgId || null,
            date: date || new Date().toISOString(),
            createdAt: Date.now(),
        };

        await db.collection('users_data').doc(ownerId).collection('expenses').doc(id).set(newExpense);

        return NextResponse.json({ success: true, expense: newExpense }, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/expenses error:', error);
        return NextResponse.json({ error: error.message || 'Failed to create expense' }, { status: 500 });
    }
}

// DELETE /api/expenses — delete an expense
export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { ownerId, expenseId } = body;
        if (!ownerId || !expenseId) return badRequest('ownerId and expenseId are required');

        const db = await selectOwnerDataAdminDb(ownerId);
        await db.collection('users_data').doc(ownerId).collection('expenses').doc(expenseId).delete();

        return NextResponse.json({ success: true, expenseId });
    } catch (error: any) {
        console.error('DELETE /api/expenses error:', error);
        return NextResponse.json({ error: error.message || 'Failed to delete expense' }, { status: 500 });
    }
}
