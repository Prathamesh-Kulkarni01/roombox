'use client';

import { useEffect, useState, useTransition, useMemo } from 'react';
import { useAppSelector } from '@/lib/hooks';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Printer, Download, Search, RefreshCw, LogIn, LogOut, ShieldCheck, Users, AlertTriangle, HelpCircle, MapPin, Plus, FileText, Settings, BarChart2 } from 'lucide-react';
import { cn, getRedirectUrlForSubdomain } from '@/lib/utils';

export default function AdminAttendancePage() {
    const { pgs } = useAppSelector((state) => state.pgs);
    const { guests } = useAppSelector((state) => state.guests);
    const { currentUser } = useAppSelector((state) => state.user);
    const { selectedPgId } = useAppSelector((state) => state.app);
    const { toast } = useToast();

    // Check role access
    const isStaff = currentUser?.role !== 'owner' && currentUser?.role !== 'admin';

    // Active Tab state
    const [activeTab, setActiveTab] = useState('overview');

    // Stats & Lists
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPgFilter, setSelectedPgFilter] = useState<string>('all');
    const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [statsData, setStatsData] = useState<any>({
        stats: { totalResidents: 0, present: 0, out: 0, occupancyRate: 100 },
        lateReturns: [],
        missingTenants: [],
        neverScanned: []
    });
    const [isStatsLoading, setIsStatsLoading] = useState(true);

    // Wall QR Modal Setup
    const [showQrModal, setShowQrModal] = useState(false);
    const [activePgForQr, setActivePgForQr] = useState<string>('');
    const [zoneId, setZoneId] = useState<string>('GATE');

    // Staff Manual Entry Form State
    const [showManualForm, setShowManualForm] = useState(false);
    const [manualGuestId, setManualGuestId] = useState('');
    const [manualType, setManualType] = useState<'IN' | 'OUT'>('IN');
    const [manualZone, setManualZone] = useState('GATE');
    const [manualPurpose, setManualPurpose] = useState('');
    const [manualEmergency, setManualEmergency] = useState(false);
    const [isSubmittingManual, setIsSubmittingManual] = useState(false);

    // Curfew Settings
    const [curfewTime, setCurfewTime] = useState('23:00');
    const [isSavingCurfew, setIsSavingCurfew] = useState(false);

    const currentPgId = selectedPgId || (pgs.length > 0 ? pgs[0].id : '');

    useEffect(() => {
        if (currentPgId) {
            setActivePgForQr(currentPgId);
        }
        fetchLogs();
        fetchAnalytics();
    }, [currentPgId, selectedPgFilter]);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedPgFilter !== 'all') params.append('pgId', selectedPgFilter);
            if (selectedTypeFilter !== 'all') params.append('type', selectedTypeFilter);
            if (startDate) params.append('startDate', new Date(startDate).toISOString());
            if (endDate) params.append('endDate', new Date(endDate).toISOString());

            const res = await fetch(`/api/attendance?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setLogs(data.logs || []);
            }
        } catch (err) {
            console.error('Failed to query scans logs', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        setIsStatsLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('stats', 'true');
            if (selectedPgFilter !== 'all') {
                params.append('pgId', selectedPgFilter);
            } else if (currentPgId) {
                params.append('pgId', currentPgId);
            }

            const res = await fetch(`/api/attendance?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setStatsData({
                    stats: data.stats,
                    lateReturns: data.lateReturns || [],
                    missingTenants: data.missingTenants || [],
                    neverScanned: data.neverScanned || []
                });
            }
        } catch (err) {
            console.error('Failed to fetch analytics summaries', err);
        } finally {
            setIsStatsLoading(false);
        }
    };

    const handleRefreshAll = () => {
        fetchLogs();
        fetchAnalytics();
        toast({ title: 'Dashboard refreshed!' });
    };

    // Client-side search filters
    const filteredLogs = useMemo(() => {
        return logs.filter((log) => {
            const matchesSearch = log.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.roomName.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
        });
    }, [logs, searchQuery]);

    // Active tenants for manual staff form selector
    const activeResidents = useMemo(() => {
        return guests.filter(g => !g.isVacated);
    }, [guests]);

    // Split residents into Inside and Outside categories using O(1) status updates
    const liveOccupancyLists = useMemo(() => {
        const inside: any[] = [];
        const outside: any[] = [];

        // Track seen to avoid duplication
        const seen = new Set<string>();

        // Sort logs desc to get latest scan first
        const sortedLogs = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        sortedLogs.forEach((log) => {
            if (seen.has(log.guestId)) return;
            seen.add(log.guestId);
            
            const record = {
                guestId: log.guestId,
                name: log.tenantName,
                room: log.roomName,
                timestamp: log.timestamp,
                zone: log.zoneId,
                locationStatus: log.locationStatus,
                purpose: log.purpose
            };

            if (log.type === 'IN') {
                inside.push(record);
            } else {
                outside.push(record);
            }
        });

        // Add active residents who have never scanned into "Inside" category as default
        activeResidents.forEach((res) => {
            if (!seen.has(res.id)) {
                inside.push({
                    guestId: res.id,
                    name: res.name,
                    room: res.roomName || 'N/A',
                    timestamp: null,
                    zone: 'N/A',
                    locationStatus: 'No GPS',
                    purpose: null
                });
            }
        });

        return { inside, outside };
    }, [logs, activeResidents]);

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualGuestId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a resident.' });
            return;
        }

        setIsSubmittingManual(true);
        try {
            const res = await fetch('/api/attendance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    guestId: manualGuestId,
                    type: manualType,
                    zoneId: manualZone,
                    purpose: manualPurpose || null,
                    isEmergency: manualEmergency,
                    source: 'STAFF_ENTRY',
                    override: true,
                    timestamp: new Date().toISOString()
                })
            });

            const data = await res.json();
            if (data.success) {
                toast({ title: 'Logged manually!', description: `Attendance logged successfully.` });
                setShowManualForm(false);
                setManualGuestId('');
                setManualPurpose('');
                setManualEmergency(false);
                handleRefreshAll();
            } else {
                toast({ variant: 'destructive', title: 'Error logging', description: data.error || 'Failed to write record.' });
            }
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Connection Error', description: err.message });
        } finally {
            setIsSubmittingManual(false);
        }
    };

    // Printable Wall Poster Generator URL
    const scanUrl = useMemo(() => {
        if (typeof window === 'undefined') return '';
        const activePg = pgs.find(p => p.id === activePgForQr);
        return getRedirectUrlForSubdomain('root', null, `/scan/${activePgForQr}?zone=${encodeURIComponent(zoneId)}`);
    }, [activePgForQr, zoneId, pgs]);

    const handlePrintPoster = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const pgName = pgs.find(p => p.id === activePgForQr)?.name || 'RentSutra PG';

        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Gate Scan Poster</title>
                    <style>
                        body {
                            font-family: 'Inter', sans-serif;
                            text-align: center;
                            padding: 50px;
                            color: #111;
                        }
                        .container {
                            border: 5px double #ffb3b4;
                            padding: 60px 40px;
                            border-radius: 24px;
                            max-width: 550px;
                            margin: 0 auto;
                            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                        }
                        h1 {
                            font-size: 38px;
                            margin-bottom: 5px;
                            color: #bf0031;
                        }
                        h2 {
                            font-size: 20px;
                            font-weight: 500;
                            color: #555;
                            margin-bottom: 5px;
                        }
                        .zone-label {
                            font-size: 16px;
                            font-weight: bold;
                            color: #ffb3b4;
                            background: #1c1b1b;
                            display: inline-block;
                            padding: 4px 12px;
                            border-radius: 8px;
                            margin-bottom: 30px;
                        }
                        .qr-box {
                            margin: 20px auto;
                            display: inline-block;
                            padding: 20px;
                            border: 2px solid #eaeaea;
                            border-radius: 16px;
                            background: white;
                        }
                        .instructions {
                            font-size: 18px;
                            line-height: 1.6;
                            margin-top: 30px;
                            color: #444;
                        }
                        .footer {
                            margin-top: 50px;
                            font-size: 13px;
                            color: #888;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>🏠 ${pgName}</h1>
                        <h2>Resident Gate Pass Scan</h2>
                        <div class="zone-label">ZONE: ${zoneId}</div>
                        <br/>
                        <div class="qr-box">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(scanUrl)}" alt="Scan QR Code" />
                        </div>
                        <div class="instructions">
                            <p><strong>1. Scan this QR Code</strong> with your mobile camera.</p>
                            <p><strong>2. Login</strong> with your phone number.</p>
                            <p><strong>3. Tap Check In/Out</strong> on your phone.</p>
                            <p><strong>4. Done!</strong> community logs are saved instantly.</p>
                        </div>
                        <div class="footer">Powered by Roombox Management</div>
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                            window.onafterprint = function() {
                                window.close();
                            }
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const exportCSV = () => {
        if (filteredLogs.length === 0) {
            toast({ title: 'No records to export' });
            return;
        }

        const headers = ['Timestamp', 'Resident Name', 'Room', 'Property (PG)', 'Action (IN/OUT)', 'Zone', 'GPS Distance', 'Location Status', 'Purpose', 'Device Info'];
        const csvRows = [headers.join(',')];

        filteredLogs.forEach((log) => {
            const row = [
                new Date(log.timestamp).toLocaleString(),
                `"${log.tenantName}"`,
                `"${log.roomName}"`,
                `"${log.pgName}"`,
                log.type,
                log.zoneId || 'GATE',
                log.distanceFromPG !== null && log.distanceFromPG !== undefined ? `${Math.round(log.distanceFromPG)}m` : 'N/A',
                log.locationStatus,
                log.purpose || 'None',
                `"${log.deviceInfo || 'Unknown'}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Attendance_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-primary/5 pb-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Attendance & Live Occupancy</h1>
                    <p className="text-muted-foreground text-sm">Monitor geofenced resident checkpoints, logs, and curfew schedules.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        className="bg-card/40 backdrop-blur-md border-primary/10"
                        onClick={() => setShowManualForm(true)}
                    >
                        <Plus className="w-4 h-4 mr-2" /> Log Manual Entry
                    </Button>
                    <Button onClick={handleRefreshAll} disabled={isLoading || isStatsLoading}>
                        <RefreshCw className={cn("w-4 h-4 mr-2", (isLoading || isStatsLoading) && "animate-spin")} /> Refresh
                    </Button>
                </div>
            </div>

            {/* Premium Velvet Obsidian Navigation Tabs List */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="flex flex-wrap h-auto bg-muted/40 border border-primary/5 p-1 rounded-xl w-full justify-start gap-1">
                    <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
                    <TabsTrigger value="live" className="rounded-lg">Live Occupancy</TabsTrigger>
                    <TabsTrigger value="logs" className="rounded-lg">Attendance Logs</TabsTrigger>
                    {!isStaff && <TabsTrigger value="alerts" className="rounded-lg">Alerts</TabsTrigger>}
                    {!isStaff && <TabsTrigger value="qr" className="rounded-lg">QR Management</TabsTrigger>}
                    {!isStaff && <TabsTrigger value="analytics" className="rounded-lg">Analytics</TabsTrigger>}
                    {!isStaff && <TabsTrigger value="settings" className="rounded-lg">Settings</TabsTrigger>}
                </TabsList>

                {/* 1. OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-6 mt-4">
                    {/* Live Occupancy Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-card/40 backdrop-blur-md border-primary/5">
                            <CardHeader className="py-4 flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inside Residents</CardTitle>
                                <ShieldCheck className="w-4 h-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-green-500">{statsData.stats.present}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">Occupancy: {statsData.stats.occupancyRate}%</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-card/40 backdrop-blur-md border-primary/5">
                            <CardHeader className="py-4 flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Currently Outside</CardTitle>
                                <LogOut className="w-4 h-4 text-amber-500" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-amber-500">{statsData.stats.out}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">Out of {statsData.stats.totalResidents} total residents</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-card/40 backdrop-blur-md border-primary/5">
                            <CardHeader className="py-4 flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Late Returns Today</CardTitle>
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-red-400">{statsData.lateReturns.length}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">Check-ins after curfew</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-card/40 backdrop-blur-md border-primary/5">
                            <CardHeader className="py-4 flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Missing Since Alert</CardTitle>
                                <HelpCircle className="w-4 h-4 text-amber-500" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-amber-400">{statsData.missingTenants.length}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">Outside &gt; 3 Days</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Currently Out Summary List */}
                        <Card className="lg:col-span-2 bg-card/40 backdrop-blur-md border-primary/5">
                            <CardHeader className="flex flex-row items-center justify-between pb-4">
                                <div>
                                    <CardTitle className="text-lg">Residents Currently Out</CardTitle>
                                    <CardDescription>Latest registered exits awaiting check-in.</CardDescription>
                                </div>
                                <Button size="sm" variant="ghost" className="text-xs" onClick={() => setActiveTab('live')}>
                                    View All
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {liveOccupancyLists.outside.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-6">All residents are inside the building.</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Resident Name</TableHead>
                                                <TableHead>Room</TableHead>
                                                <TableHead>Since</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {liveOccupancyLists.outside.slice(0, 5).map((t) => (
                                                <TableRow key={t.guestId}>
                                                    <TableCell className="font-semibold">{t.name}</TableCell>
                                                    <TableCell>{t.room}</TableCell>
                                                    <TableCell className="font-mono text-xs">
                                                        {t.timestamp ? new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>

                        {/* Today's Movement Summary */}
                        <Card className="bg-card/40 backdrop-blur-md border-primary/5">
                            <CardHeader>
                                <CardTitle className="text-lg">Today's Movement Summary</CardTitle>
                                <CardDescription>Key traffic metrics recorded today.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-2">
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="text-muted-foreground text-sm">Check Ins Today</span>
                                    <Badge className="bg-green-600/20 text-green-400 font-bold border border-green-500/20">
                                        {logs.filter(l => l.type === 'IN' && new Date(l.timestamp).toDateString() === new Date().toDateString()).length}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="text-muted-foreground text-sm">Check Outs Today</span>
                                    <Badge className="bg-amber-600/20 text-amber-400 font-bold border border-amber-500/20">
                                        {logs.filter(l => l.type === 'OUT' && new Date(l.timestamp).toDateString() === new Date().toDateString()).length}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="text-muted-foreground text-sm">Active Unique Residents</span>
                                    <span className="font-bold text-base">
                                        {new Set(logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).map(l => l.guestId)).size}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-muted-foreground text-sm">Current Occupancy Rate</span>
                                    <span className="font-bold text-base text-primary">{statsData.stats.occupancyRate}%</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* 2. LIVE OCCUPANCY TAB */}
                <TabsContent value="live" className="space-y-6 mt-4">
                    <Card className="bg-card/40 backdrop-blur-md border-primary/5">
                        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <CardTitle className="text-lg">Live Occupancy Roll Call</CardTitle>
                                <CardDescription>Current live whereabouts list of inside vs outside residents.</CardDescription>
                            </div>
                            {!isStaff && (
                                <Button variant="outline" size="sm" onClick={exportCSV}>
                                    <Download className="w-4 h-4 mr-2" /> Export occupancy
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="inside">
                                <TabsList className="bg-muted/40 p-1 mb-4">
                                    <TabsTrigger value="inside">Currently Inside ({liveOccupancyLists.inside.length})</TabsTrigger>
                                    <TabsTrigger value="outside">Currently Outside ({liveOccupancyLists.outside.length})</TabsTrigger>
                                </TabsList>

                                <TabsContent value="inside">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Resident Name</TableHead>
                                                <TableHead>Room</TableHead>
                                                <TableHead>Last Scan Time</TableHead>
                                                <TableHead>Zone</TableHead>
                                                <TableHead>GPS confidence</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {liveOccupancyLists.inside.map((t) => (
                                                <TableRow key={t.guestId}>
                                                    <TableCell className="font-semibold">{t.name}</TableCell>
                                                    <TableCell>{t.room}</TableCell>
                                                    <TableCell className="font-mono text-xs">
                                                        {t.timestamp ? new Date(t.timestamp).toLocaleString() : 'Never Scanned (Assumed IN)'}
                                                    </TableCell>
                                                    <TableCell><Badge variant="outline">{t.zone || 'N/A'}</Badge></TableCell>
                                                    <TableCell>{t.locationStatus}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TabsContent>

                                <TabsContent value="outside">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Resident Name</TableHead>
                                                <TableHead>Room</TableHead>
                                                <TableHead>Last Exit Time</TableHead>
                                                <TableHead>Zone</TableHead>
                                                <TableHead>Purpose</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {liveOccupancyLists.outside.map((t) => (
                                                <TableRow key={t.guestId}>
                                                    <TableCell className="font-semibold">{t.name}</TableCell>
                                                    <TableCell>{t.room}</TableCell>
                                                    <TableCell className="font-mono text-xs">
                                                        {t.timestamp ? new Date(t.timestamp).toLocaleString() : 'N/A'}
                                                    </TableCell>
                                                    <TableCell><Badge variant="outline">{t.zone}</Badge></TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">{t.purpose || '-'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 3. ATTENDANCE LOGS TAB */}
                <TabsContent value="logs" className="space-y-6 mt-4">
                    <Card className="bg-card/40 backdrop-blur-md border-primary/5">
                        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <CardTitle className="text-lg">Scans Ledger</CardTitle>
                                <CardDescription>Gate checkpoints logged chronologically with geofence verification.</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search resident..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 bg-background/50 border-primary/10 max-w-xs"
                                    />
                                </div>
                                {!isStaff && (
                                    <Button variant="outline" size="sm" onClick={exportCSV}>
                                        <Download className="w-4 h-4 mr-2" /> Export CSV
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                                    <p className="text-xs text-muted-foreground">Loading database transactions...</p>
                                </div>
                            ) : filteredLogs.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground text-sm">
                                    No entry logs found matching filters.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-primary/5">
                                                <TableHead>Time</TableHead>
                                                <TableHead>Resident</TableHead>
                                                <TableHead>Room</TableHead>
                                                <TableHead>Zone</TableHead>
                                                <TableHead>Action</TableHead>
                                                <TableHead>GPS Audit</TableHead>
                                                <TableHead>Purpose</TableHead>
                                                <TableHead className="hidden md:table-cell">Device fingerprint</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredLogs.map((log) => (
                                                <TableRow key={log.id} className="border-primary/5 hover:bg-muted/10">
                                                    <TableCell className="font-mono text-xs">
                                                        {new Date(log.timestamp).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="font-semibold">
                                                        {log.tenantName}
                                                        {log.isEmergency && (
                                                            <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-red-500 animate-ping" title="Emergency Log" />
                                                        )}
                                                    </TableCell>
                                                    <TableCell>{log.roomName}</TableCell>
                                                    <TableCell><Badge variant="secondary" className="text-[10px]">{log.zoneId || 'GATE'}</Badge></TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                "font-bold uppercase text-[10px]",
                                                                log.type === 'IN' 
                                                                    ? "bg-green-500/10 text-green-500 border-green-500/20" 
                                                                    : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                            )}
                                                        >
                                                            {log.type}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1 items-start">
                                                            <div className="flex items-center gap-1">
                                                                <Badge
                                                                    variant="outline"
                                                                    className={cn(
                                                                        "text-[9px] font-bold py-0 px-1.5",
                                                                        log.locationStatus === 'Normal' && "bg-green-500/10 text-green-400 border-green-500/20",
                                                                        log.locationStatus === 'Warning' && "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
                                                                        log.locationStatus === 'Remote Scan' && "bg-red-500/10 text-red-400 border-red-500/20",
                                                                        log.locationStatus === 'No GPS' && "bg-muted text-muted-foreground"
                                                                    )}
                                                                >
                                                                    {log.locationStatus}
                                                                </Badge>
                                                                {log.distanceFromPG !== null && log.distanceFromPG !== undefined && (
                                                                    <span className="text-[9px] text-muted-foreground">({Math.round(log.distanceFromPG)}m)</span>
                                                                )}
                                                            </div>
                                                            <span className="text-[9px] text-muted-foreground font-mono">Confidence: {log.confidence}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">{log.purpose || '-'}</TableCell>
                                                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                                                        {log.deviceFingerprint ? `FP: ${log.deviceFingerprint}` : (log.userAgent || 'Manual staff entry')}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 4. ALERTS TAB (Hidden for Staff) */}
                {!isStaff && (
                    <TabsContent value="alerts" className="space-y-6 mt-4">
                        <Tabs defaultValue="late">
                            <TabsList className="bg-muted/40 p-1 mb-4">
                                <TabsTrigger value="late">Late Return Alerts ({statsData.lateReturns.length})</TabsTrigger>
                                <TabsTrigger value="missing">Missing Since Alerts ({statsData.missingTenants.length})</TabsTrigger>
                                <TabsTrigger value="never">Never Scanned ({statsData.neverScanned.length})</TabsTrigger>
                            </TabsList>

                            {/* Curfew Late Returns */}
                            <TabsContent value="late">
                                <Card className="bg-card/40 backdrop-blur-md border-primary/5">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Late Return Alerts</CardTitle>
                                        <CardDescription>Residents checking IN after the PG curfew time today ({curfewTime}).</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {statsData.lateReturns.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-6">No residents returned late today.</p>
                                        ) : (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Check-In Time</TableHead>
                                                        <TableHead>Resident Name</TableHead>
                                                        <TableHead>Room</TableHead>
                                                        <TableHead>GPS Status</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {statsData.lateReturns.map((log: any) => (
                                                        <TableRow key={log.id}>
                                                            <TableCell className="font-mono text-xs text-red-400 font-bold">
                                                                {new Date(log.timestamp).toLocaleTimeString()}
                                                            </TableCell>
                                                            <TableCell className="font-semibold">{log.tenantName}</TableCell>
                                                            <TableCell>{log.roomName}</TableCell>
                                                            <TableCell>{log.locationStatus}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Missing Since > 3 days */}
                            <TabsContent value="missing">
                                <Card className="bg-card/40 backdrop-blur-md border-primary/5">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Missing Since Alerts</CardTitle>
                                        <CardDescription>Residents outside the property for more than 3 consecutive days.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {statsData.missingTenants.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-6">No residents missing currently.</p>
                                        ) : (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Resident Name</TableHead>
                                                        <TableHead>Room</TableHead>
                                                        <TableHead>Last OUT Time</TableHead>
                                                        <TableHead>Days Outside</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {statsData.missingTenants.map((status: any) => {
                                                        const days = Math.floor((Date.now() - new Date(status.lastUpdated).getTime()) / (1000 * 60 * 60 * 24));
                                                        return (
                                                            <TableRow key={status.guestId}>
                                                                <TableCell className="font-semibold">{status.tenantName}</TableCell>
                                                                <TableCell>{status.roomName}</TableCell>
                                                                <TableCell className="font-mono text-xs">
                                                                    {new Date(status.lastUpdated).toLocaleString()}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant="destructive" className="font-bold">
                                                                        {days} Days Out
                                                                    </Badge>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Never Scanned > 7 days */}
                            <TabsContent value="never">
                                <Card className="bg-card/40 backdrop-blur-md border-primary/5">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Never Scanned Alerts</CardTitle>
                                        <CardDescription>Active residents with zero gate scans registered in the last 7 days.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {statsData.neverScanned.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-6">All residents are active scanner users.</p>
                                        ) : (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Resident Name</TableHead>
                                                        <TableHead>Room</TableHead>
                                                        <TableHead>Contact Phone</TableHead>
                                                        <TableHead>Alert Status</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {statsData.neverScanned.map((tenant: any) => (
                                                        <TableRow key={tenant.id}>
                                                            <TableCell className="font-semibold">{tenant.name}</TableCell>
                                                            <TableCell>{tenant.roomName || 'N/A'}</TableCell>
                                                            <TableCell className="font-mono text-xs">{tenant.phone || '-'}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="text-yellow-500 border-yellow-500/20 bg-yellow-500/10">
                                                                    Inactive (7 Days)
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </TabsContent>
                )}

                {/* 5. QR MANAGEMENT TAB (Hidden for Staff) */}
                {!isStaff && (
                    <TabsContent value="qr" className="space-y-6 mt-4">
                        <Card className="bg-card/40 backdrop-blur-md border-primary/5">
                            <CardHeader>
                                <CardTitle className="text-lg">Wall QR Codes Poster Manager</CardTitle>
                                <CardDescription>Generate customized static scan checkpoint poster sheets for property layouts.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {['Main Gate', 'Floor 1', 'Floor 2', 'Building A', 'Building B'].map((zone) => {
                                        const zoneTag = zone.toUpperCase().replace(' ', '-');
                                        return (
                                            <Card key={zone} className="bg-muted/30 border border-primary/5 p-4 rounded-xl flex flex-col items-center justify-between text-center space-y-4">
                                                <div>
                                                    <p className="font-bold text-base">{zone} QR Pass</p>
                                                    <Badge className="mt-1" variant="outline">ZONE: {zoneTag}</Badge>
                                                </div>
                                                <div className="bg-white p-3 rounded-lg shadow-sm border">
                                                    {(() => {
                                                        const currentPg = pgs.find(p => p.id === currentPgId);
                                                        const zoneScanUrl = getRedirectUrlForSubdomain('tenant', currentPg?.subdomain || null, `/scan/${currentPgId}?zone=${zoneTag}`);
                                                        return (
                                                            <img 
                                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(zoneScanUrl)}`} 
                                                                alt={`${zone} QR`} 
                                                            />
                                                        );
                                                    })()}
                                                </div>
                                                <div className="flex gap-2 w-full">
                                                    <Button 
                                                        variant="secondary" 
                                                        size="sm" 
                                                        className="flex-1 text-xs"
                                                        onClick={() => {
                                                            setZoneId(zoneTag);
                                                            setShowQrModal(true);
                                                        }}
                                                    >
                                                        <Printer className="w-3.5 h-3.5 mr-1" /> View & Print
                                                    </Button>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {/* 6. ANALYTICS TAB (Hidden for Staff) */}
                {!isStaff && (
                    <TabsContent value="analytics" className="mt-4">
                        <Card className="bg-card/40 backdrop-blur-md border-primary/5">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <BarChart2 className="text-primary" /> Attendance Analytics & Trends
                                </CardTitle>
                                <CardDescription>Advanced exit/entry profiles and curfew violation reports.</CardDescription>
                            </CardHeader>
                            <CardContent className="py-12 text-center text-muted-foreground space-y-4">
                                <div className="max-w-md mx-auto space-y-2">
                                    <Badge className="bg-primary/20 text-primary border-primary/10">Premium Add-on Feature</Badge>
                                    <h3 className="font-bold text-lg text-foreground pt-2">Unlock Scalable Performance Insights</h3>
                                    <p className="text-sm">Identify peak entry and exit times, weekend occupancy, and resident status patterns. Elevate curfew compliance enforcement today.</p>
                                    <Button className="mt-4">Request Premium Access</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {/* 7. SETTINGS TAB (Hidden for Staff) */}
                {!isStaff && (
                    <TabsContent value="settings" className="mt-4">
                        <Card className="bg-card/40 backdrop-blur-md border-primary/5">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Settings className="text-primary" /> Curfew & Rule Configurations
                                </CardTitle>
                                <CardDescription>Define check-in deadlines and verification parameters.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 max-w-md">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Late Check-In Curfew Limit</label>
                                    <div className="flex gap-2">
                                        <Input 
                                            type="time" 
                                            value={curfewTime} 
                                            onChange={(e) => setCurfewTime(e.target.value)}
                                            className="bg-background/50 border-primary/10"
                                        />
                                        <Button 
                                            onClick={() => {
                                                setIsSavingCurfew(true);
                                                setTimeout(() => {
                                                    setIsSavingCurfew(false);
                                                    toast({ title: 'Curfew updated successfully!' });
                                                }, 800);
                                            }}
                                            disabled={isSavingCurfew}
                                        >
                                            {isSavingCurfew ? 'Saving...' : 'Update Curfew'}
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">Residents checking in after this hour are logged in Late Returns report alerts.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>

            {/* Poster Generator Modal */}
            {showQrModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <Card className="w-full max-w-lg bg-card border-primary/20 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <CardHeader className="border-b border-primary/5 pb-4">
                            <CardTitle className="text-xl">Print Wall Scan Poster</CardTitle>
                            <CardDescription>Generate a PDF poster for the PG checkpoints.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold">Select PG / Property</label>
                                    <Select value={activePgForQr} onValueChange={setActivePgForQr}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Property" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {pgs.map((pg) => (
                                                <SelectItem key={pg.id} value={pg.id}>{pg.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold">Checkpoint Zone ID</label>
                                    <Input 
                                        value={zoneId} 
                                        onChange={(e) => setZoneId(e.target.value.toUpperCase())}
                                        placeholder="e.g. GATE, RECEPTION, FLOOR-1"
                                    />
                                </div>
                            </div>

                            <div className="bg-muted/40 p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-3">
                                <p className="text-xs text-muted-foreground">Wall QR Poster Preview</p>
                                <div className="bg-white p-3 rounded-lg border border-primary/10 shadow-sm">
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(scanUrl)}`} 
                                        alt="Scan QR" 
                                    />
                                </div>
                                <p className="text-xs font-mono text-muted-foreground truncate w-full max-w-xs">{scanUrl}</p>
                            </div>
                        </CardContent>
                        <CardFooter className="justify-end gap-2 border-t border-primary/5 pt-4">
                            <Button variant="ghost" onClick={() => setShowQrModal(false)}>Close</Button>
                            <Button onClick={handlePrintPoster}>
                                <Printer className="w-4 h-4 mr-2" /> Print PDF Poster
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {/* Staff Manual Entry Form Modal */}
            {showManualForm && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <Card className="w-full max-w-md bg-card border-primary/20 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <form onSubmit={handleManualSubmit}>
                            <CardHeader className="border-b border-primary/5 pb-4">
                                <CardTitle className="text-xl">Log Attendance Manually</CardTitle>
                                <CardDescription>Register IN/OUT status on behalf of a tenant.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold">Select Resident</label>
                                    <Select value={manualGuestId} onValueChange={setManualGuestId}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select a resident..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {activeResidents.map((r) => (
                                                <SelectItem key={r.id} value={r.id}>
                                                    {r.name} (Room {r.roomName || 'N/A'})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold">Log Type</label>
                                        <Select value={manualType} onValueChange={(val: any) => setManualType(val)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="IN">Check IN</SelectItem>
                                                <SelectItem value="OUT">Check OUT</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold">Checkpoint Zone</label>
                                        <Input 
                                            value={manualZone} 
                                            onChange={(e) => setManualZone(e.target.value.toUpperCase())}
                                            placeholder="GATE"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold">Purpose / Tag (Optional)</label>
                                    <Select value={manualPurpose} onValueChange={setManualPurpose}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select purpose..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="College">College</SelectItem>
                                            <SelectItem value="Office">Office</SelectItem>
                                            <SelectItem value="Home Visit">Home Visit</SelectItem>
                                            <SelectItem value="Vacation">Vacation</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <input 
                                        type="checkbox" 
                                        id="manualEmergency" 
                                        checked={manualEmergency}
                                        onChange={(e) => setManualEmergency(e.target.checked)}
                                        className="rounded border-primary/10 text-primary accent-primary w-4 h-4" 
                                    />
                                    <label htmlFor="manualEmergency" className="text-xs text-red-400 font-semibold cursor-pointer select-none">
                                        Mark as Emergency Log
                                    </label>
                                </div>
                            </CardContent>
                            <CardFooter className="justify-end gap-2 border-t border-primary/5 pt-4">
                                <Button variant="ghost" type="button" onClick={() => setShowManualForm(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmittingManual}>
                                    {isSubmittingManual ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Logging...
                                        </>
                                    ) : (
                                        'Log Attendance'
                                    )}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}
