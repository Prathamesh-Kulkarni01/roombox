'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { pgs } from '@/lib/mock-data';
import PgCard from '@/components/pg-card';
import type { PG } from '@/lib/types';

export default function Home() {
  const [filteredPgs, setFilteredPgs] = useState<PG[]>(pgs);

  return (
    <div>
      <section className="bg-primary/10 py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary-foreground-dark mb-4">
            Find Your Perfect PG
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Discover the best paying guest accommodations with all the amenities you need.
          </p>
          <div className="max-w-4xl mx-auto bg-card p-4 rounded-lg shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-2">
                <label htmlFor="location" className="block text-left text-sm font-medium text-foreground mb-1">
                  Location
                </label>
                <Input id="location" placeholder="Search by city or area..." />
              </div>
              <div>
                <label htmlFor="gender" className="block text-left text-sm font-medium text-foreground mb-1">
                  Gender
                </label>
                <Select>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="co-ed">Co-ed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground h-10">
                Search
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Featured PGs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPgs.map((pg) => (
              <PgCard key={pg.id} pg={pg} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
