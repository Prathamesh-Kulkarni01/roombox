
'use client';

import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import React from "react";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Extract the innerHTML from the child div passed by the page component
  const htmlContent = (children as React.ReactElement)?.props?.dangerouslySetInnerHTML?.__html;

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
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                    >
                    </article>
                </CardContent>
            </Card>
        </div>
    </div>
  )
}
