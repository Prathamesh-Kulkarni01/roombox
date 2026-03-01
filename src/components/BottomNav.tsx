'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Building2, User, Settings, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/tenants/my-pg', icon: Building2, label: 'My PG' },
    { href: '/dashboard/pg-management', icon: Settings, label: 'Manage' },
    { href: '/complete-profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
    const pathname = usePathname();

    // Only show on mobile and only on specific routes if needed
    // For now, let's keep it simple and hide it on larger screens via Tailwind
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 block md:hidden glass border-t border-border/50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-around h-16">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-200 active:scale-90",
                                isActive ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5", isActive && "fill-primary/10")} />
                            <span className="text-[10px] font-medium leading-none">{item.label}</span>
                            {isActive && (
                                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
