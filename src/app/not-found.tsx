import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MapPinOff, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex items-center justify-center rounded-full bg-muted p-6 text-muted-foreground">
        <MapPinOff size={48} />
      </div>
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground md:text-5xl">
        404 - Page Not Found
      </h1>
      <p className="mb-8 max-w-md text-muted-foreground text-lg">
        The floor you're looking for doesn't exist. Maybe it was moved, or you've found a secret guest room!
      </p>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button variant="default" asChild size="lg" className="flex items-center gap-2">
          <Link href="/">
            <Home size={20} />
            Take me Home
          </Link>
        </Button>
        <Button variant="outline" size="lg" className="flex items-center gap-2" onClick="window.history.back()">
          <ArrowLeft size={20} />
          Go Back
        </Button>
      </div>
    </div>
  );
}
