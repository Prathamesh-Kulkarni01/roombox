/**
 * apiError.ts — Centralized API error handling
 * Use this in all API routes for consistent error responses.
 */
import { NextResponse } from 'next/server';

export interface ApiErrorResponse {
    success: false;
    error: string;
    code?: string;
}

export interface ApiSuccessResponse<T = unknown> {
    success: true;
    data?: T;
}

/** Return a structured 400 Bad Request */
export function badRequest(message: string): NextResponse<ApiErrorResponse> {
    return NextResponse.json({ success: false, error: message }, { status: 400 });
}

/** Return a structured 404 Not Found */
export function notFound(message: string = 'Not found'): NextResponse<ApiErrorResponse> {
    return NextResponse.json({ success: false, error: message }, { status: 404 });
}

/** Return a structured 500 Internal Server Error */
export function serverError(error: unknown, context?: string): NextResponse<ApiErrorResponse> {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    if (context) console.error(`[${context}]`, error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
}


/** Return a structured 403 Forbidden */
export function forbidden(message: string = 'Forbidden'): NextResponse<ApiErrorResponse> {
    return NextResponse.json({ success: false, error: message }, { status: 403 });
}

/** Return a structured 401 Unauthorized */
export function unauthorized(message?: string | null): NextResponse<ApiErrorResponse> {
    return NextResponse.json({ success: false, error: message || 'Unauthorized' }, { status: 401 });
}

/** Wraps an async API route handler with automatic error catching */
export function withErrorHandling(context: string, handler: () => Promise<NextResponse>) {
    return async () => {
        try {
            return await handler();
        } catch (error) {
            return serverError(error, context);
        }
    };
}
