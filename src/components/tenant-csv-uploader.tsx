'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TenantCsvUploaderProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

interface UploadResult {
    created: number;
    failed: { row: number; name: string; error: string }[];
    message: string;
}

const CSV_TEMPLATE = `Name,Phone,PgId,PgName,Rent,Deposit,Email,RoomNumber,JoinDate
Rahul Sharma,9876543210,pg-xxxxx,Gokul PG,8000,16000,rahul@email.com,101,2024-01-01
Priya Patel,9123456789,pg-xxxxx,Gokul PG,7500,15000,,102,2024-01-15`;

export default function TenantCsvUploader({ open, onOpenChange, onSuccess }: TenantCsvUploaderProps) {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<UploadResult | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileSelect = (file: File) => {
        if (!file.name.endsWith('.csv')) {
            toast({ variant: 'destructive', title: 'Invalid file', description: 'Please upload a .csv file.' });
            return;
        }
        setSelectedFile(file);
        setResult(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setLoading(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const res = await fetch('/api/tenants/bulk-import', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            setResult(data);

            if (data.created > 0) {
                toast({
                    title: '✅ Import Complete',
                    description: data.message,
                });
                onSuccess();
            }
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Import Failed', description: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadTemplate = () => {
        const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tenant-import-template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleClose = () => {
        if (!loading) {
            setSelectedFile(null);
            setResult(null);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg p-0 flex flex-col max-h-[90dvh]">
                <DialogHeader className="p-6 pb-2 flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-primary" />
                        Bulk Import Tenants
                    </DialogTitle>
                    <DialogDescription>
                        Upload a CSV file to add multiple tenants at once. Each tenant will be added with <code>isOnboarded: false</code> so they complete their profile via WhatsApp.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 pt-0 flex-1 overflow-y-auto space-y-4">
                    {/* Download Template */}
                    <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleDownloadTemplate}>
                        <Download className="w-4 h-4" />
                        Download CSV Template
                    </Button>

                    {/* File Drop Zone */}
                    <div
                        className={cn(
                            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
                            selectedFile ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' : ''
                        )}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                        />
                        {selectedFile ? (
                            <div className="flex flex-col items-center gap-2">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                <p className="font-medium text-sm">{selectedFile.name}</p>
                                <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB — Click to change</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <Upload className="w-8 h-8" />
                                <p className="text-sm font-medium">Drop your CSV file here</p>
                                <p className="text-xs">or click to browse</p>
                            </div>
                        )}
                    </div>

                    {/* Required Columns Info */}
                    <div className="text-xs text-muted-foreground space-y-1 rounded-md bg-muted px-3 py-2">
                        <p className="font-medium text-foreground">Required columns:</p>
                        <p><span className="text-red-500">*</span> Name, Phone, PgId, Rent</p>
                        <p>Optional: Email, PgName, RoomNumber, Deposit, JoinDate, BedId</p>
                    </div>

                    {/* Result Summary */}
                    {result && (
                        <div className="rounded-lg border p-3 space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                {result.created > 0
                                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    : <AlertCircle className="w-4 h-4 text-amber-500" />
                                }
                                {result.message}
                            </div>
                            {result.failed.length > 0 && (
                                <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                                    {result.failed.map((f) => (
                                        <div key={f.row} className="flex gap-2 text-destructive">
                                            <span className="font-medium shrink-0">Row {f.row} ({f.name}):</span>
                                            <span>{f.error}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 pt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2 border-t flex-shrink-0">
                    <Button variant="outline" onClick={handleClose} disabled={loading} className="w-full sm:w-auto">Cancel</Button>
                    <Button onClick={handleUpload} disabled={!selectedFile || loading} className="w-full sm:w-auto">
                        {loading
                            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</>
                            : <><Upload className="mr-2 h-4 w-4" /> Import Tenants</>
                        }
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
