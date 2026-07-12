'use client';

import { useState, useEffect } from 'react';
import { useAccessibleNav } from '@/lib/hooks/use-accessible-nav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Share2, Copy, BarChart3, Link as LinkIcon, ExternalLink, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function MarketingDashboardClient() {
  const { currentUser, pgs } = useAccessibleNav();
  const [selectedPgId, setSelectedPgId] = useState<string>('');
  const [stats, setStats] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (pgs && pgs.length > 0 && !selectedPgId) {
      setSelectedPgId(pgs[0].id);
    }
  }, [pgs, selectedPgId]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/marketing/stats');
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
        }
      } catch (err) {
        console.error('Failed to fetch marketing stats', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const selectedPg = pgs.find(p => p.id === selectedPgId);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  
  const generateLink = (source: string) => {
    if (!selectedPgId) return '';
    return `${baseUrl}/p/${selectedPgId}?source=${source}`;
  };

  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: `${description} copied to clipboard.` });
  };

  const pgStats = stats[selectedPgId] || { views: 0, leads: 0, sources: {} };
  
  const chartData = Object.entries(pgStats.sources).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    views: value
  }));

  const nobrokerSnippet = `Looking for a premium ${selectedPg?.gender || 'PG'} accommodation? 
Check out ${selectedPg?.name || 'our property'} in ${selectedPg?.location || 'this area'}. 
✨ Fully furnished & managed
🧹 Daily housekeeping
📶 High-speed WiFi
💰 Rent starting at ₹${selectedPg?.priceRange?.min || 'XXX'}

👉 View photos and book a visit instantly: ${generateLink('nobroker')}
  `;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Marketing & Syndication</h1>
          <p className="text-muted-foreground mt-1">Generate shareable links, cross-post to portals, and track leads.</p>
        </div>
        <div className="w-full md:w-64">
          <Select value={selectedPgId} onValueChange={setSelectedPgId}>
            <SelectTrigger className="bg-background/50">
              <SelectValue placeholder="Select Property" />
            </SelectTrigger>
            <SelectContent>
              {pgs.map(pg => (
                <SelectItem key={pg.id} value={pg.id}>{pg.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Analytics Summary */}
        <Card className="lg:col-span-2 border-primary/10 bg-surface-container/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> Traffic Analytics
            </CardTitle>
            <CardDescription>Track page views and lead conversions by source.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-sm text-muted-foreground mb-1">Total Views</p>
                <p className="text-3xl font-bold text-primary">{pgStats.views}</p>
              </div>
              <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                <p className="text-sm text-muted-foreground mb-1">Leads Captured</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{pgStats.leads}</p>
              </div>
            </div>
            
            <div className="h-[250px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                    <Bar dataKey="views" fill="#8884d8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                  No tracking data yet. Share your links to start tracking!
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Link Generator */}
        <Card className="border-primary/10 bg-surface-container/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" /> Share & Syndication
            </CardTitle>
            <CardDescription>Generate tracked links for portals and social media.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="direct" className="w-full">
              <TabsList className="w-full grid grid-cols-3 mb-4">
                <TabsTrigger value="direct">Direct</TabsTrigger>
                <TabsTrigger value="portals">Portals</TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
              </TabsList>
              
              <TabsContent value="direct" className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Standard Public Link</p>
                  <div className="flex gap-2">
                    <input 
                      readOnly 
                      value={generateLink('direct')} 
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                    />
                    <Button size="icon" onClick={() => copyToClipboard(generateLink('direct'), 'Direct link')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <a href={generateLink('direct')} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" /> Preview Public Page
                  </a>
                </Button>
              </TabsContent>

              <TabsContent value="portals" className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">NoBroker / MagicBricks Description</p>
                  <p className="text-xs text-muted-foreground">Copy and paste this snippet into the "Property Description" box on portal websites.</p>
                  <textarea 
                    readOnly 
                    value={nobrokerSnippet} 
                    className="flex min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                  />
                  <Button className="w-full" onClick={() => copyToClipboard(nobrokerSnippet, 'Syndication snippet')}>
                    <Copy className="h-4 w-4 mr-2" /> Copy Full Snippet
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="social" className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">WhatsApp / Facebook Link</p>
                  <div className="flex gap-2">
                    <input 
                      readOnly 
                      value={generateLink('social')} 
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                    />
                    <Button size="icon" onClick={() => copyToClipboard(generateLink('social'), 'Social link')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white" asChild>
                  <a href={`https://wa.me/?text=Checkout%20this%20property:%20${encodeURIComponent(generateLink('whatsapp'))}`} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-4 w-4 mr-2" /> Share via WhatsApp
                  </a>
                </Button>
              </TabsContent>

            </Tabs>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
