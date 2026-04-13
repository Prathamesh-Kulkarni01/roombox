import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { ActivityLogsService } from '@/lib/activity-logs-service';
import { CURRENT_SCHEMA_VERSION, type Expense, type PerformerInfo } from '@/lib/types';

/**
 * Service to manage property and operational expenses.
 */
export class ExpenseService {
    /**
     * Creates a new expense record with audit logging.
     */
    static async createExpense(db: Firestore, ownerId: string, input: any, performer: PerformerInfo): Promise<Expense> {
        const { description, amount, category, pgId, date, paymentMode } = input;
        
        const id = `exp-${Date.now()}`;
        const now = new Date().toISOString();
        
        const newExpense: Expense = {
            id,
            ownerId,
            description,
            amount: Number(amount),
            category,
            pgId: pgId || 'all',
            pgName: input.pgName || 'General',
            date: date || now,
            paymentMode: paymentMode || 'cash',
            createdAt: now,
            createdBy: performer,
            updatedAt: now,
            updatedBy: performer,
            schemaVersion: CURRENT_SCHEMA_VERSION,
        };

        await db.collection('users_data').doc(ownerId).collection('expenses').doc(id).set(newExpense);

        await ActivityLogsService.logActivity({
            ownerId,
            activityType: 'EXPENSE_ADDED',
            module: 'financials',
            details: `Added ${category} expense: ${description} (₹${amount})`,
            targetId: id,
            targetType: 'expense',
            status: 'success',
            performedBy: performer,
            metadata: { expenseId: id, amount, category }
        });

        return newExpense;
    }

    /**
     * Deletes an expense record with audit logging.
     */
    static async deleteExpense(db: Firestore, ownerId: string, expenseId: string, performer: PerformerInfo): Promise<void> {
        const expenseRef = db.collection('users_data').doc(ownerId).collection('expenses').doc(expenseId);
        const snap = await expenseRef.get();
        if (!snap.exists) throw new Error('Expense not found');
        
        const expense = snap.data() as Expense;
        
        await expenseRef.delete();

        await ActivityLogsService.logActivity({
            ownerId,
            activityType: 'EXPENSE_DELETED',
            module: 'financials',
            details: `Deleted expense: ${expense.description} (₹${expense.amount})`,
            targetId: expenseId,
            targetType: 'expense',
            status: 'warning',
            performedBy: performer,
            metadata: { deletedExpense: expense }
        });
    }

    /**
     * Lists expenses for an owner with optional filters.
     */
    static async listExpenses(db: Firestore, ownerId: string, filters: { pgId?: string, category?: string, limit?: number, pgIds?: string[] } = {}) {
        const { pgId, category, limit = 100, pgIds } = filters;
        
        let query = db.collection('users_data').doc(ownerId).collection('expenses')
            .orderBy('date', 'desc')
            .limit(limit) as FirebaseFirestore.Query;

        if (pgIds && pgIds.length > 0) {
            if (pgId) {
                if (!pgIds.includes(pgId)) throw new Error('Access denied to this property');
                query = query.where('pgId', '==', pgId);
            } else {
                query = query.where('pgId', 'in', pgIds.slice(0, 10));
            }
        } else if (pgId) {
            query = query.where('pgId', '==', pgId);
        }

        if (category) query = query.where('category', '==', category);

        const snapshot = await query.get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Expense[];
    }
}
