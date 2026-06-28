// src/lib/providers/index.ts

export interface ITimeProvider {
    now(): number;
    date(): Date;
}

export const SystemTimeProvider: ITimeProvider = {
    now: () => Date.now(),
    date: () => new Date()
};

// In a real execution, we would resolve this via Context or headers.
// For now, we default to System time in the actual App, while the RentLab engine injects VirtualTimeProvider.
export function resolveTimeProvider(): ITimeProvider {
    return SystemTimeProvider;
}
