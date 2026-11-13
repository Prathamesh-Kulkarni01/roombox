"use client";

import { Mic, Camera } from 'lucide-react';

interface QuickOrderActionsProps {
  storePhone?: string;
  storeName?: string;
  language: "mr" | "en";
}

export function QuickOrderActions({
  storePhone = "919876543210",
  storeName = "Bazar",
  language,
}: QuickOrderActionsProps) {
  const handleVoiceOrder = () => {
    const text = encodeURIComponent(
      `नमस्कार, मला ${storeName} मधून सामान ऑर्डर करायचे आहे. मी व्हॉइस नोट पाठवत आहे:`,
    );
    window.open(`https://wa.me/${storePhone}?text=${text}`, "_blank");
  };

  const handlePhotoOrder = () => {
    const text = encodeURIComponent(
      `नमस्कार, ${storeName} साठी माझ्या किराणा यादीचा फोटो खालीलप्रमाणे आहे:`,
    );
    window.open(`https://wa.me/${storePhone}?text=${text}`, "_blank");
  };

  return (
    <div className="px-2 pb-3">
      <div className="grid grid-cols-2 gap-2.5">
        {/* Voice Order Button */}
        <button
          onClick={handleVoiceOrder}
          className="flex items-center gap-2.5 p-3 rounded-2xl bg-card border border-border/80 text-left hover:border-primary/50 transition-all active:scale-[0.98] shadow-xs"
        >
          <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
            <Mic className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-xs text-foreground">
              {language === "mr" ? "बोलून ऑर्डर करा" : "Voice Order"}
            </p>
            <p className="text-[10px] text-muted-foreground line-clamp-1">
              {language === "mr" ? "व्हॉट्सअ‍ॅप ऑडिओ" : "Send WhatsApp note"}
            </p>
          </div>
        </button>

        {/* Photo List Order Button */}
        <button
          onClick={handlePhotoOrder}
          className="flex items-center gap-2.5 p-3 rounded-2xl bg-card border border-border/80 text-left hover:border-primary/50 transition-all active:scale-[0.98] shadow-xs"
        >
          <div className="h-9 w-9 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center shrink-0 shadow-xs border border-border/60">
            <Camera className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-bold text-xs text-foreground">
              {language === "mr" ? "यादीचा फोटो" : "Photo Order"}
            </p>
            <p className="text-[10px] text-muted-foreground line-clamp-1">
              {language === "mr" ? "किराणा चिठ्ठी पाठवा" : "Upload slip photo"}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
