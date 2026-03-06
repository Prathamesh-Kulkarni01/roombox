// In-memory session store for WhatsApp Bot conversational state.
// Note: In production, this should be backed by Redis or Firebase to survive server restarts.

export type BotState =
    | 'IDLE'
    | 'AWAITING_USER_ROLE'
    | 'SELECTING_PG'
    | 'SELECTING_ROOM'
    | 'SELECTING_BED'
    | 'DYNAMIC_FORM_FILLING'
    | 'AWAITING_COMPLAINT_ACTION'
    | 'ADDING_PG_NAME'
    | 'ADDING_PG_CAPACITY'
    | 'SELECTING_TENANT_LIFECYCLE'
    | 'AWAITING_LIFECYCLE_ACTION'
    | 'EDITING_TENANT_FIELD_SELECTION'
    | 'EDITING_TENANT_VALUE'
    | 'AWAITING_KYC_ACTION'
    | 'AWAITING_OWNER_KYC_UPLOAD_PHOTO'
    | 'AWAITING_OWNER_KYC_UPLOAD_AADHAAR';

interface UserSession {
    state: BotState;
    data: any; // Temporary data collected during a multi-step flow
    lastUpdated: number;
}

const sessions = new Map<string, UserSession>();

const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export function getSession(phoneNumber: string): UserSession {
    const session = sessions.get(phoneNumber);

    // Check timeout
    if (session && (Date.now() - session.lastUpdated > SESSION_TIMEOUT_MS)) {
        clearSession(phoneNumber);
        return { state: 'IDLE', data: {}, lastUpdated: Date.now() };
    }

    return session || { state: 'IDLE', data: {}, lastUpdated: Date.now() };
}

export function updateSession(phoneNumber: string, newState: BotState, newData?: any) {
    const currentSession = getSession(phoneNumber);

    sessions.set(phoneNumber, {
        state: newState,
        data: { ...currentSession.data, ...(newData || {}) },
        lastUpdated: Date.now()
    });
}

export function clearSession(phoneNumber: string) {
    sessions.delete(phoneNumber);
}
