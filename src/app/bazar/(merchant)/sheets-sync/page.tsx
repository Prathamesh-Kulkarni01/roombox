'use client';

import { useState } from 'react';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Download,
  Info
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { syncGoogleSheetAction, getCsvTemplateAction } from '@/modules/bazar/actions';
import { useToast } from '@/hooks/use-toast';

export default function GoogleSheetsSyncPage() {
  const { toast } = useToast();
  const [sheetUrl, setSheetUrl] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    importedCount: number;
    errors: string[];
  } | null>(null);

  const handleSync = async () => {
    if (!sheetUrl.trim()) {
      toast({
        title: 'Please enter Sheet URL or ID',
        variant: 'destructive',
      });
      return;
    }

    setSyncing(true);
    setSyncResult(null);

    try {
      const res = await syncGoogleSheetAction('default_store', sheetUrl.trim());
      setSyncResult(res);
      if (res.success) {
        toast({
          title: 'Sync Completed Successfully!',
          description: `Updated/Imported ${res.importedCount} products from Google Sheet.`,
        });
      } else {
        toast({
          title: 'Sync Failed',
          description: res.errors[0] || 'Could not fetch or parse sheet.',
          variant: 'destructive',
        });
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleCopyTemplate = async () => {
    const template = await getCsvTemplateAction();
    navigator.clipboard.writeText(template);
    toast({
      title: 'Template Copied to Clipboard!',
      description: 'Paste it into a new Google Sheet to get started.',
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
          Google Sheets Live Inventory Bridge
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Zero-effort inventory management. Keep your stock, prices, and Marathi names updated in Google Sheets on your phone or computer.
        </p>
      </div>

      {/* Guide Banner */}
      <Alert className="bg-emerald-50 border-emerald-200 text-emerald-900 rounded-2xl">
        <Info className="h-4 w-4 text-emerald-700" />
        <AlertTitle className="font-semibold text-sm">How to use with Google Sheets (100% Free & No Setup)</AlertTitle>
        <AlertDescription className="text-xs text-emerald-800 space-y-2 mt-1">
          <p>
            You can either download our official Excel/CSV template and open it in Google Drive, or create a blank Google Sheet with these 8 exact columns:
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-100 h-8 text-xs font-semibold"
              asChild
            >
              <a 
                href="/api/bazar/inventory-template" 
                download="roombox_bazar_inventory_master.csv"
              >
                <Download className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                Download Ready-to-Use Master CSV (25+ Items)
              </a>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-100 h-8 text-xs"
              asChild
            >
              <a 
                href="https://sheets.new" 
                target="_blank" 
                rel="noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                Open Blank Google Sheet (sheets.new)
              </a>
            </Button>
          </div>
          <p className="pt-1">
            • <strong>How to upload to Google Drive:</strong> Open Google Drive &gt; <em>File Upload</em> &gt; select the downloaded file &gt; <em>Open with Google Sheets</em>.
          </p>
          <p>
            • <strong>Set Permissions:</strong> In Google Sheets, click <em>Share</em> (top-right) &gt; change to <strong>&quot;Anyone with the link can view&quot;</strong> &gt; Copy link.
          </p>
          <p>
            • <strong>Sync:</strong> Paste your Google Sheet link in the box below and click <strong>&quot;Sync Now&quot;</strong>.
          </p>
        </AlertDescription>
      </Alert>

      {/* Sync Card */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Connect Google Sheet</CardTitle>
          <CardDescription>
            Enter your Google Sheet URL (e.g. https://docs.google.com/spreadsheets/d/...)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sheetUrl">Google Spreadsheet URL or ID</Label>
            <div className="flex gap-2">
              <Input
                id="sheetUrl"
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                disabled={syncing}
              />
              <Button onClick={handleSync} disabled={syncing} className="shrink-0 bg-emerald-600 hover:bg-emerald-700">
                {syncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Now
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Sync Results Feedback */}
          {syncResult && (
            <div className="mt-4 p-4 rounded-xl border">
              {syncResult.success ? (
                <div className="flex items-center gap-3 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Sync Successful</p>
                    <p className="text-xs text-muted-foreground">
                      Successfully processed {syncResult.importedCount} items into your store catalog.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 text-destructive">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Sync Error</p>
                    <ul className="text-xs text-muted-foreground list-disc list-inside mt-1">
                      {syncResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template & Formats Card */}
      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Sample Column Format</CardTitle>
              <CardDescription className="text-xs">
                Columns supported automatically (English or Marathi headers)
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyTemplate}>
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copy CSV Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-xl overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-2.5 font-medium">Item Name</th>
                  <th className="p-2.5 font-medium">Marathi Name</th>
                  <th className="p-2.5 font-medium">Category</th>
                  <th className="p-2.5 font-medium">Pack Unit</th>
                  <th className="p-2.5 font-medium">MRP (₹)</th>
                  <th className="p-2.5 font-medium">Sale Price (₹)</th>
                  <th className="p-2.5 font-medium">In Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="p-2.5">Wada Kolam Rice 1kg</td>
                  <td className="p-2.5">वाडा कोलम तांदूळ १ किलो</td>
                  <td className="p-2.5">Grains</td>
                  <td className="p-2.5">1 kg</td>
                  <td className="p-2.5">85</td>
                  <td className="p-2.5 font-bold text-emerald-600">74</td>
                  <td className="p-2.5"><span className="text-emerald-600 font-bold">YES</span></td>
                </tr>
                <tr>
                  <td className="p-2.5">Gemini Sunflower Oil 1L</td>
                  <td className="p-2.5">जेमिनी सूर्यफूल तेल १ लिटर</td>
                  <td className="p-2.5">Edible Oils</td>
                  <td className="p-2.5">1 L</td>
                  <td className="p-2.5">155</td>
                  <td className="p-2.5 font-bold text-emerald-600">138</td>
                  <td className="p-2.5"><span className="text-emerald-600 font-bold">YES</span></td>
                </tr>
                <tr>
                  <td className="p-2.5">Kolhapuri Gul 1kg</td>
                  <td className="p-2.5">कोल्हापुरी गूळ ढेप १ किलो</td>
                  <td className="p-2.5">Sweeteners</td>
                  <td className="p-2.5">1 kg</td>
                  <td className="p-2.5">75</td>
                  <td className="p-2.5 font-bold text-emerald-600">62</td>
                  <td className="p-2.5"><span className="text-emerald-600 font-bold">YES</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

