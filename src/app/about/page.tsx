
import { Building2, Goal, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AboutUsPage() {
  return (
    <div className="bg-muted/40 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">About RentSutra</h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            We are a team of property managers, tech enthusiasts, and problem-solvers dedicated to simplifying the rental industry in India.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Goal className="w-6 h-6 text-primary" />
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                To build the operating system for modern rental properties. We empower property owners with the tools they need to automate operations, improve tenant experience, and grow their business with confidence.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-primary" />
                Our Vision
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We envision a future where managing a PG, hostel, or co-living space is as simple as managing an app on your phone. A future where data, not guesswork, drives decisions, and where technology fosters better relationships between owners and tenants.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                Our Team
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Founded by individuals with firsthand experience in the pains of property management, our team combines deep industry knowledge with cutting-edge technology skills to build solutions that truly work.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
