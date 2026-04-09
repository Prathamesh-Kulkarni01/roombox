/**
 * /api/expenses — Shared API for expense management
 * Used by RTK Query (web UI) and WhatsApp bot.
 */
import { NextRequest, NextResponse } from 'next/server';
import { selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { enforcePermission } from '@/lib/rbac-middleware';
import { badRequest, serverError } from '@/lib/api/apiError';
import { ExpenseService } from '@/services/expenseService';

// GET /api/expenses?[pgId=xxx][&category=maintenance]
export async function GET(req: NextRequest) {
    const result = await enforcePermission(req, 'finances', 'view', 'GET /api/expenses');
    if (!result.authorized) return result.response;
    const { ownerId } = result;

    const pgId = req.nextUrl.searchParams.get('pgId') || undefined;
    const category = req.nextUrl.searchParams.get('category') || undefined;
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '100', 10);

    try {
        const db = await selectOwnerDataAdminDb(ownerId);
        const expenses = await ExpenseService.listExpenses(db, ownerId, { pgId, category, limit });
        return NextResponse.json({ success: true, expenses });
    } catch (error: any) {
        return serverError(error, 'GET /api/expenses');
    }
}

// POST /api/expenses — create an expense
export async function POST(req: NextRequest) {
    const result = await enforcePermission(req, 'finances', 'add', 'POST /api/expenses');
    if (!result.authorized) return result.response;
    const { ownerId, userId, name } = result;
    const performer = { userId, name: name || 'Unknown User' };

    try {
        const body = await req.json();
        const { expense } = body;
        if (!expense) return badRequest('expense data is required');

        const db = await selectOwnerDataAdminDb(ownerId);
        const newExpense = await ExpenseService.createExpense(db, ownerId, expense, performer);

        return NextResponse.json({ success: true, expense: newExpense }, { status: 201 });
    } catch (error: any) {
        return serverError(error, 'POST /api/expenses');
    }
}

// DELETE /api/expenses — delete an expense
export async function DELETE(req: NextRequest) {
    const result = await enforcePermission(req, 'finances', 'add', 'DELETE /api/expenses');
    if (!result.authorized) return result.response;
    const { ownerId, userId, name } = result;
    const performer = { userId, name: name || 'Unknown User' };

    try {
        const body = await req.json();
        const { expenseId } = body;
        if (!expenseId) return badRequest('expenseId is required');

        const db = await selectOwnerDataAdminDb(ownerId);
        await ExpenseService.deleteExpense(db, ownerId, expenseId, performer);

        return NextResponse.json({ success: true, expenseId });
    } catch (error: any) {
        return serverError(error, 'DELETE /api/expenses');
    }
}
