
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
                    <article 
                        className="prose dark:prose-invert max-w-none 
                        prose-headings:font-bold prose-headings:text-foreground 
                        prose-h1:text-4xl prose-h2:text-2xl
                        prose-p:text-muted-foreground prose-p:leading-relaxed
                        prose-a:text-primary hover:prose-a:underline
                        prose-strong:text-foreground
                        prose-ul:list-disc prose-ul:pl-6 prose-li:text-muted-foreground
                        prose-ol:list-decimal prose-ol:pl-6 prose-li:text-muted-foreground"
                    >
                        {children}
                    </article>
                </CardContent>
            </Card>
        </div>
    </div>
  )
}
