
'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield } from 'lucide-react';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { currentUser } = useAppSelector((state) => state.user);
  const { isLoading } = useAppSelector((state) => state.app);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!currentUser || currentUser.role !== 'admin')) {
      router.replace('/login');
    }
  }, [isLoading, currentUser, router]);

  if (isLoading || !currentUser || currentUser.role !== 'admin') {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
            <Skeleton className="h-48 w-full max-w-md" />
        </div>
    );
  }

  return (
    <div className="flex min-h-screen">
       <aside className="w-64 flex-col border-r bg-card hidden md:flex">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold text-primary">
                    <Shield className="h-6 w-6" />
                    <span className="text-lg">Admin Panel</span>
                </Link>
            </div>
            <nav className="flex flex-col gap-1 p-4">
                <Link href="/admin/dashboard" className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-primary transition-all hover:text-primary">
                    Dashboard
                </Link>
            </nav>
        </aside>
      <main className="flex-1 p-4 md:p-8 bg-muted/40 overflow-auto">
        {children}
      </main>
    </div>
  )
}
