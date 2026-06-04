import React, { useCallback, useState } from 'react';
import { useDropzone, DropzoneOptions } from 'react-dropzone';
import { Camera, CheckCircle2, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageDropzoneProps {
    value: string[];
    onChange: (files: string[]) => void;
    multiple?: boolean;
    label?: string;
    sublabel?: string;
    className?: string;
    isIcon?: boolean;
}

export function ImageDropzone({ 
    value, 
    onChange, 
    multiple = false,
    label = "Upload Image",
    sublabel,
    className,
    isIcon = false
}: ImageDropzoneProps) {
    const [uploading, setUploading] = useState(false);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;
        setUploading(true);

        const promises = acceptedFiles.map(file => {
            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
        });

        Promise.all(promises).then(results => {
            if (multiple) {
                onChange([...value, ...results]);
            } else {
                onChange([results[0]]);
            }
            setUploading(false);
        });
    }, [onChange, value, multiple]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': []
        },
        multiple,
    });

    const removeImage = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        if (multiple) {
            onChange(value.filter((_, i) => i !== index));
        } else {
            onChange([]);
        }
    };

    if (value.length > 0 && !multiple) {
        return (
            <div className={cn("relative overflow-hidden group border-2 border-primary/30 bg-primary/5 shadow-inner cursor-pointer flex flex-col items-center justify-center transition-all", className)} {...getRootProps()}>
                <input {...getInputProps()} />
                {isIcon ? (
                     <img src={value[0]} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                     <img src={value[0]} alt="Preview" className="h-full object-contain p-2" />
                )}
                
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <button 
                        type="button"
                        onClick={(e) => removeImage(e, 0)}
                        className="bg-destructive text-destructive-foreground p-2 rounded-full hover:scale-110 transition-transform"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <span className="text-xs font-semibold text-white">Change Image</span>
                </div>
            </div>
        );
    }

    if (multiple) {
        return (
            <div className="space-y-4 w-full">
                {value.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {value.map((img, i) => (
                            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border group shadow-sm">
                                <img src={img} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                                <button 
                                    type="button"
                                    onClick={(e) => removeImage(e, i)}
                                    className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:scale-110"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <div 
                    {...getRootProps()} 
                    className={cn(
                        "relative border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center overflow-hidden cursor-pointer group py-8",
                        isDragActive ? "border-primary bg-primary/10" : "border-primary/20 bg-muted/20 hover:bg-muted/40",
                        className
                    )}
                >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center gap-4 text-muted-foreground group-hover:text-primary transition-colors">
                        <div className="w-14 h-14 rounded-2xl bg-secondary-container/20 border border-primary/10 shadow-lg flex items-center justify-center group-hover:scale-105 transition-all duration-300">
                            {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                        </div>
                        <div className="text-center px-4">
                            <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{value.length > 0 ? "Add More Photos" : label}</p>
                            <p className="text-xs font-medium text-muted-foreground mt-0.5">{sublabel || "Drag & drop or click to upload"}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div 
            {...getRootProps()} 
            className={cn(
                "relative border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden cursor-pointer group",
                isDragActive ? "border-primary bg-primary/10" : "border-primary/10 bg-black/40 hover:bg-[#201f1f]/40 hover:border-primary/20",
                className
            )}
        >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4 text-muted-foreground group-hover:text-primary transition-colors">
                <div className={cn("flex items-center justify-center", !className?.includes('h-20') && "w-14 h-14 rounded-2xl bg-secondary-container/20 border border-primary/10 shadow-lg group-hover:scale-105 transition-all duration-300")}>
                    {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                </div>
                {!className?.includes('h-20') ? (
                    <div className="text-center px-4">
                        <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{label}</p>
                        {sublabel && <p className="text-xs font-medium text-muted-foreground mt-0.5">{sublabel}</p>}
                    </div>
                ) : (
                    <span className="text-[10px] font-semibold">{label}</span>
                )}
            </div>
        </div>
    );
}
