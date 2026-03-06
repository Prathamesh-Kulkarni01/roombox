/**
 * RTK Query API Slice
 * Single source of truth for all server data fetching.
 * Backed by the shared /api/* routes that support BYODB.
 * Provides automatic caching, tag-based invalidation, and auto-refetch.
 */
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { PG, Guest, Complaint, Expense, Staff } from '@/lib/types';

// ─── Response Types ────────────────────────────────────────────────────────────

export interface PropertyResponse {
    success: boolean;
    buildings?: PG[];
    stats?: any;
    error?: string;
}

export interface TenantResponse {
    success: boolean;
    tenants?: Guest[];
    summary?: { expected: number; collected: number; pending: number };
    error?: string;
}

export interface RentSummaryResponse {
    success: boolean;
    summary?: { expected: number; collected: number; pending: number };
    pendingTenants?: Guest[];
    error?: string;
}

export interface PaymentResponse {
    success: boolean;
    ledgerEntry?: any;
    newBalance?: number;
    newStatus?: string;
    error?: string;
}

export interface GuestsResponse {
    success: boolean;
    guests?: Guest[];
    error?: string;
}

export interface ComplaintsResponse {
    success: boolean;
    complaints?: Complaint[];
    error?: string;
}

export interface ExpensesResponse {
    success: boolean;
    expenses?: Expense[];
    error?: string;
}

export interface StaffResponse {
    success: boolean;
    staff?: Staff[];
    error?: string;
}

// ─── API Slice ─────────────────────────────────────────────────────────────────

export const api = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({ baseUrl: '/' }),
    tagTypes: ['Properties', 'Tenants', 'Rent', 'Guests', 'Complaints', 'Expenses', 'Staff'],
    endpoints: (builder) => ({

        // ─── Properties ────────────────────────────────────────────────
        getProperties: builder.query<PropertyResponse, string>({
            query: (ownerId) => `api/properties?ownerId=${ownerId}`,
            providesTags: ['Properties'],
        }),

        createProperty: builder.mutation<{ success: boolean; pg: PG }, {
            ownerId: string;
            name: string;
            location: string;
            city: string;
            gender: 'male' | 'female' | 'co-living';
            autoSetup?: boolean;
            floorCount?: number;
            roomsPerFloor?: number;
        }>({
            query: (body) => ({ url: 'api/properties', method: 'POST', body }),
            invalidatesTags: ['Properties'],
        }),

        deleteProperty: builder.mutation<{ success: boolean }, { ownerId: string; pgId: string }>({
            query: ({ ownerId, pgId }) => ({
                url: `api/properties?ownerId=${ownerId}&pgId=${pgId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Properties'],
        }),

        // ─── Tenants (via /api/tenants) ─────────────────────────────────
        getTenants: builder.query<TenantResponse, { ownerId: string; status?: string; limit?: number }>({
            query: ({ ownerId, status, limit }) => {
                let url = `api/tenants?ownerId=${ownerId}`;
                if (status) url += `&status=${status}`;
                if (limit) url += `&limit=${limit}`;
                return url;
            },
            providesTags: ['Tenants'],
        }),

        getRentSummary: builder.query<TenantResponse, string>({
            query: (ownerId) => `api/tenants?ownerId=${ownerId}&summary=true`,
            providesTags: ['Rent'],
        }),

        createTenant: builder.mutation<{ success: boolean; guest: Guest }, {
            ownerId: string;
            guestData: Partial<Guest>;
        }>({
            query: (body) => ({ url: 'api/tenants', method: 'POST', body }),
            invalidatesTags: ['Tenants', 'Properties', 'Guests'],
        }),

        // ─── Guests (via /api/guests — full client-side data) ───────────
        getGuests: builder.query<GuestsResponse, { ownerId: string; pgId?: string; vacated?: boolean }>({
            query: ({ ownerId, pgId, vacated }) => {
                let url = `api/guests?ownerId=${ownerId}`;
                if (pgId) url += `&pgId=${pgId}`;
                if (vacated !== undefined) url += `&vacated=${vacated}`;
                return url;
            },
            providesTags: ['Guests'],
        }),

        updateGuest: builder.mutation<{ success: boolean; guest: Guest }, {
            ownerId: string;
            guestId: string;
            updates: Partial<Guest>;
        }>({
            query: (body) => ({ url: 'api/guests', method: 'PATCH', body }),
            invalidatesTags: ['Guests', 'Tenants'],
        }),

        vacateGuest: builder.mutation<{ success: boolean; guestId: string }, {
            ownerId: string;
            guestId: string;
        }>({
            query: (body) => ({ url: 'api/guests', method: 'DELETE', body }),
            invalidatesTags: ['Guests', 'Tenants', 'Properties'],
        }),

        // ─── Rent & Payments ─────────────────────────────────────────────
        getRentDetails: builder.query<RentSummaryResponse, string>({
            query: (ownerId) => `api/rent?ownerId=${ownerId}`,
            providesTags: ['Rent'],
        }),

        getTenantRent: builder.query<{ success: boolean; guest: Guest; ledger: any[] }, { ownerId: string; guestId: string }>({
            query: ({ ownerId, guestId }) => `api/rent?ownerId=${ownerId}&guestId=${guestId}`,
            providesTags: ['Rent'],
        }),

        recordPayment: builder.mutation<PaymentResponse, {
            ownerId: string;
            guestId: string;
            amount: number;
            paymentMode?: string;
            notes?: string;
        }>({
            query: (body) => ({ url: 'api/rent', method: 'POST', body }),
            invalidatesTags: ['Rent', 'Tenants', 'Guests'],
        }),

        // ─── Complaints ──────────────────────────────────────────────────
        getComplaints: builder.query<ComplaintsResponse, { ownerId: string; pgId?: string; status?: string }>({
            query: ({ ownerId, pgId, status }) => {
                let url = `api/complaints?ownerId=${ownerId}`;
                if (pgId) url += `&pgId=${pgId}`;
                if (status) url += `&status=${status}`;
                return url;
            },
            providesTags: ['Complaints'],
        }),

        updateComplaint: builder.mutation<{ success: boolean; complaint: Complaint }, {
            ownerId: string;
            complaintId: string;
            updates: Partial<Complaint>;
        }>({
            query: (body) => ({ url: 'api/complaints', method: 'PATCH', body }),
            invalidatesTags: ['Complaints'],
        }),

        // ─── Expenses ────────────────────────────────────────────────────
        getExpenses: builder.query<ExpensesResponse, { ownerId: string; pgId?: string; category?: string }>({
            query: ({ ownerId, pgId, category }) => {
                let url = `api/expenses?ownerId=${ownerId}`;
                if (pgId) url += `&pgId=${pgId}`;
                if (category) url += `&category=${category}`;
                return url;
            },
            providesTags: ['Expenses'],
        }),

        addExpenseApi: builder.mutation<{ success: boolean; expense: Expense }, {
            ownerId: string;
            expense: Partial<Expense>;
        }>({
            query: (body) => ({ url: 'api/expenses', method: 'POST', body }),
            invalidatesTags: ['Expenses'],
        }),

        deleteExpense: builder.mutation<{ success: boolean; expenseId: string }, {
            ownerId: string;
            expenseId: string;
        }>({
            query: (body) => ({ url: 'api/expenses', method: 'DELETE', body }),
            invalidatesTags: ['Expenses'],
        }),

        // ─── Staff ───────────────────────────────────────────────────────
        getStaff: builder.query<StaffResponse, { ownerId: string; pgId?: string; role?: string }>({
            query: ({ ownerId, pgId, role }) => {
                let url = `api/staff?ownerId=${ownerId}`;
                if (pgId) url += `&pgId=${pgId}`;
                if (role) url += `&role=${role}`;
                return url;
            },
            providesTags: ['Staff'],
        }),

        updateStaffApi: builder.mutation<{ success: boolean; staff: Staff }, {
            ownerId: string;
            staffId: string;
            updates: Partial<Staff>;
        }>({
            query: (body) => ({ url: 'api/staff', method: 'PATCH', body }),
            invalidatesTags: ['Staff'],
        }),

        deleteStaffApi: builder.mutation<{ success: boolean; staffId: string }, {
            ownerId: string;
            staffId: string;
        }>({
            query: (body) => ({ url: 'api/staff', method: 'DELETE', body }),
            invalidatesTags: ['Staff'],
        }),
    }),
});

export const {
    // Properties
    useGetPropertiesQuery,
    useCreatePropertyMutation,
    useDeletePropertyMutation,
    // Tenants (via /api/tenants)
    useGetTenantsQuery,
    useGetRentSummaryQuery,
    useCreateTenantMutation,
    // Guests (via /api/guests)
    useGetGuestsQuery,
    useUpdateGuestMutation,
    useVacateGuestMutation,
    // Rent & Payments
    useGetRentDetailsQuery,
    useGetTenantRentQuery,
    useRecordPaymentMutation,
    // Complaints
    useGetComplaintsQuery,
    useUpdateComplaintMutation,
    // Expenses
    useGetExpensesQuery,
    useAddExpenseApiMutation,
    useDeleteExpenseMutation,
    // Staff
    useGetStaffQuery,
    useUpdateStaffApiMutation,
    useDeleteStaffApiMutation,
} = api;
