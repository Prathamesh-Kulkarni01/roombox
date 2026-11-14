'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/hooks';
import { 
  Store, 
  MapPin, 
  Phone, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { saveStoreAction, importRegionalMasterCatalogAction } from '@/modules/bazar/actions';

const TOWNS = ['Palus', 'Tasgaon', 'Islampur', 'Sangli', 'Ashta', 'Kundal', 'Bhilawadi'];
const CATEGORIES = [
  'किराणा & सुपरमार्केट (Grocery & Supermarket)',
  'डेअरी & दुग्ध व्यवसाय (Dairy & Milk)',
  'फळे & भाजीपाला (Fruits & Vegetables)',
  'बेकरी & स्नॅक्स (Bakery & Snacks)',
  'इतर (General Store)'
];

export default function BazarMerchantOnboardingPage() {
  const router = useRouter();
  const { currentUser } = useAppSelector((state) => state.user);
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storeNameMarathi, setStoreNameMarathi] = useState('');
  const [town, setTown] = useState('Palus');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [importMaster, setImportMaster] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !phone.trim()) {
      toast({
        variant: 'destructive',
        title: 'माहिती अपूर्ण आहे (Incomplete Info)',
        description: 'कृपया दुकानाचे नाव आणि संपर्क नंबर भरा.',
      });
      return;
    }

    setLoading(true);
    try {
      const ownerId = currentUser?.id || (currentUser as unknown as { uid?: string })?.uid || `owner_${Date.now()}`;
      const slug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `store-${Date.now()}`;
      
      const saveRes = await saveStoreAction({
        ownerId,
        name: storeName.trim(),
        nameMarathi: storeNameMarathi.trim() || storeName.trim(),
        slug,
        town,
        address: address.trim() || `${town}, Sangli`,
        phone: phone.trim(),
        category,
        isActive: true,
      });

      if (!saveRes.success || !saveRes.storeId) {
        throw new Error(saveRes.error || 'Failed to register store');
      }

      // If user selected instant regional master catalog import
      if (importMaster) {
        await importRegionalMasterCatalogAction(saveRes.storeId);
      }

      toast({
        title: 'अभिनंदन! दुकान नोंदणी यशस्वी 🎉',
        description: `${storeName} आता ऑनलाइन सुरू झाले आहे.`,
      });

      router.push('/bazar/dashboard');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'नोंदणी अयशस्वी',
        description: err.message || 'दुकान तयार करताना त्रुटी आली.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-6 px-4">
      <Card className="w-full max-w-xl shadow-lg border-emerald-100 rounded-3xl overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white text-center">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-xs rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">आपले दुकान सुरू करा (Setup Your Store)</h1>
          <p className="text-emerald-100 text-xs mt-1">
            फक्त 1 मिनिटात Palus Local Bazar वर ऑनलाइन स्टोअर आणि POS सुरू करा.
          </p>
        </div>

        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-2">
              <Label htmlFor="storeName" className="font-semibold text-sm">
                दुकानाचे नाव (Shop Name in English) *
              </Label>
              <Input
                id="storeName"
                placeholder="उदा. Shree Mahalakshmi Super Bazar"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="storeNameMarathi" className="font-semibold text-sm text-muted-foreground">
                मराठीतील नाव (Shop Name in Marathi)
              </Label>
              <Input
                id="storeNameMarathi"
                placeholder="उदा. श्री महालक्ष्मी सुपर बझार"
                value={storeNameMarathi}
                onChange={(e) => setStoreNameMarathi(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="font-semibold text-sm">गाव / शहर (Town / City) *</Label>
                <Select value={town} onValueChange={setTown}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="शहर निवडा" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOWNS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone" className="font-semibold text-sm">
                  व्हॉट्सअ‍ॅप / संपर्क नंबर (WhatsApp Phone) *
                </Label>
                <Input
                  id="phone"
                  placeholder="उदा. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="font-semibold text-sm">दुकानाचा प्रकार (Category)</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="प्रकार निवडा" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address" className="font-semibold text-sm">
                दुकानाचा पत्ता (Full Address)
              </Label>
              <Input
                id="address"
                placeholder="उदा. मेन रोड, बस स्थानकाजवळ, पलूस"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-emerald-950">
                  सांगली/पलूस प्रादेशिक मास्टर कॅटलॉग ऑटो-लोड करा
                </p>
                <p className="text-emerald-800 mt-0.5">
                  दूध, तेल, अंडी, डाळी, साखर यांसारख्या 50+ नेहमी लागणाऱ्या किराणा वस्तू त्वरित मराठी नावांसह जोडल्या जातील.
                </p>
                <label className="flex items-center gap-2 mt-2.5 font-medium cursor-pointer text-emerald-900">
                  <input
                    type="checkbox"
                    checked={importMaster}
                    onChange={(e) => setImportMaster(e.target.checked)}
                    className="rounded accent-emerald-600 h-4 w-4"
                  />
                  होय, सुरुवातीला 50+ किराणा वस्तू जोडा
                </label>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-6 rounded-2xl text-base shadow-md transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  दुकान सुरू होत आहे...
                </>
              ) : (
                <>
                  दुकान सुरू करा आणि डॅशबोर्डवर जा
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

