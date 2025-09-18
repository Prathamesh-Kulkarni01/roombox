'use client';

import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-muted/40">
        <div className="container mx-auto px-4 py-8 md:py-12">
            <Link href="/dashboard/training" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6">
                <ArrowLeft className="w-4 h-4" />
                Back to Training Center
            </Link>
            <Card>
                <CardContent className="p-6 md:p-8">
                    <article className="prose dark:prose-invert max-w-none">
                        {children}
                    </article>
                </CardContent>
            </Card>
        </div>
    </div>
  )
}
