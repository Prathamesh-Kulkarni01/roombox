/**
 * /api/expenses — Shared API for expense management
 * Used by RTK Query (web UI) and WhatsApp bot.
 */
import { NextRequest, NextResponse } from 'next/server';
import { selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { badRequest, serverError, unauthorized } from '@/lib/api/apiError';

// GET /api/expenses?[pgId=xxx][&category=maintenance]
export async function GET(req: NextRequest) {
    const { ownerId, error } = await getVerifiedOwnerId(req);
    if (!ownerId) return unauthorized(error);

    const pgId = req.nextUrl.searchParams.get('pgId') || undefined;
    const category = req.nextUrl.searchParams.get('category') || undefined;
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '100', 10);

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
        return serverError(error, 'GET /api/expenses');
    }
}

// POST /api/expenses — create an expense
export async function POST(req: NextRequest) {
    const { ownerId, error } = await getVerifiedOwnerId(req);
    if (!ownerId) return unauthorized(error);

    try {
        const body = await req.json();
        const { expense } = body;
        if (!expense) return badRequest('expense data is required');

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
        return serverError(error, 'POST /api/expenses');
    }
}

// DELETE /api/expenses — delete an expense
export async function DELETE(req: NextRequest) {
    const { ownerId, error } = await getVerifiedOwnerId(req);
    if (!ownerId) return unauthorized(error);

    try {
        const body = await req.json();
        const { expenseId } = body;
        if (!expenseId) return badRequest('expenseId is required');

        const db = await selectOwnerDataAdminDb(ownerId);
        await db.collection('users_data').doc(ownerId).collection('expenses').doc(expenseId).delete();

        return NextResponse.json({ success: true, expenseId });
    } catch (error: any) {
        return serverError(error, 'DELETE /api/expenses');
    }
}
