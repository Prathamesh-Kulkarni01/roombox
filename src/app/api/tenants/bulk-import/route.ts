import { NextRequest, NextResponse } from 'next/server';
import { selectOwnerDataAdminDb, getAdminDb } from '@/lib/firebaseAdmin';
import { TenantService } from '@/services/tenantService';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { unauthorized, serverError } from '@/lib/api/apiError';

/**
 * POST /api/tenants/bulk-import
 *
 * Accepts a CSV file upload and batch-creates tenants.
 *
 * Expected CSV columns (case-insensitive):
 *   Name, Phone, Rent, Deposit, PgId, PgName, RoomNumber, JoinDate
 *
 * Optional columns:
 *   Email, BedId, RoomId, RoomName
 *
 * Returns:
 *   { success: true, created: N, failed: [ { row, error } ] }
 */
export async function POST(req: NextRequest) {
    const { ownerId, error } = await getVerifiedOwnerId(req);
    if (!ownerId) return unauthorized(error);

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided. Use multipart/form-data with key "file".' }, { status: 400 });
        }

        const text = await file.text();
        const rows = parseCsv(text);

        if (rows.length === 0) {
            return NextResponse.json({ error: 'CSV file is empty or has no valid data rows.' }, { status: 400 });
        }
        if (rows.length > 200) {
            return NextResponse.json({ error: 'Maximum 200 tenants per upload.' }, { status: 400 });
        }

        const db = await selectOwnerDataAdminDb(ownerId);
        const appDb = await getAdminDb();

        let created = 0;
        const failed: { row: number; name: string; error: string }[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2; // 1-indexed, +1 for header

            try {
                // Validate required fields
                if (!row.name) throw new Error('Name is required');
                if (!row.phone) throw new Error('Phone is required');
                if (!row.pgid) throw new Error('PgId is required');
                if (!row.rent || isNaN(Number(row.rent))) throw new Error('Rent must be a valid number');

                await TenantService.onboardTenant(db, appDb, {
                    ownerId,
                    name: row.name.trim(),
                    phone: row.phone.trim(),
                    email: row.email?.trim() || '',
                    pgId: row.pgid.trim(),
                    pgName: row.pgname?.trim() || '',
                    bedId: row.bedid?.trim() || '',
                    roomId: row.roomid?.trim() || '',
                    roomName: row.roomname?.trim() || row.roomnumber?.trim() || '',
                    rentAmount: Number(row.rent),
                    deposit: Number(row.deposit || 0),
                    joinDate: row.joindate?.trim() || new Date().toISOString().split('T')[0],
                    dueDate: row.duedate?.trim() || '',
                });
                created++;
            } catch (err: any) {
                failed.push({ row: rowNum, name: row.name || `Row ${rowNum}`, error: err.message });
            }
        }

        return NextResponse.json({
            success: true,
            created,
            failed,
            message: `${created} tenant(s) imported successfully${failed.length > 0 ? `, ${failed.length} failed` : ''}.`,
        });

    } catch (err: any) {
        return serverError(err, 'POST /api/tenants/bulk-import');
    }
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseCsv(text: string): Record<string, string>[] {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];

    // Normalize headers: lowercase, remove spaces/special chars
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));

    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
        const values = splitCsvLine(lines[i]);
        if (values.every(v => !v.trim())) continue; // skip blank lines

        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
            row[h] = values[idx]?.trim() || '';
        });
        rows.push(row);
    }
    return rows;
}

/** Handles quoted CSV fields with embedded commas. */
function splitCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current);
    return result;
}
