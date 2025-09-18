
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Copy, MessageCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"
import { useEffect } from "react"
import { Label } from "@/components/ui/label"

type ReminderDialogProps = Pick<UseDashboardReturn, 'isReminderDialogOpen' | 'setIsReminderDialogOpen' | 'selectedGuestForReminder' | 'isGeneratingReminder' | 'reminderMessage' | 'handleOpenReminderDialog' | 'setReminderMessage'>

export default function ReminderDialog({ isReminderDialogOpen, setIsReminderDialogOpen, selectedGuestForReminder, isGeneratingReminder, reminderMessage, handleOpenReminderDialog, setReminderMessage }: ReminderDialogProps) {
  const { toast } = useToast()

  useEffect(() => {
    if (selectedGuestForReminder && isReminderDialogOpen && !reminderMessage) {
        handleOpenReminderDialog(selectedGuestForReminder);
    }
  }, [isReminderDialogOpen, selectedGuestForReminder]);
  
  return (
    <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Rent Reminder</DialogTitle>
          <DialogDescription>A reminder message has been generated for {selectedGuestForReminder?.name}. You can edit it before sending.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
            <Label htmlFor="reminder-message">Reminder Message</Label>
            {isGeneratingReminder ? (
                <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
            ) : (
                <Textarea id="reminder-message" value={reminderMessage} onChange={(e) => setReminderMessage(e.target.value)} rows={8} className="bg-muted/50" />
            )}
        </div>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(reminderMessage); toast({ title: "Copied!", description: "Reminder message copied to clipboard." }) }}>
            <Copy className="mr-2 h-4 w-4" /> Copy
          </Button>
          <a href={`https://wa.me/${selectedGuestForReminder?.phone}?text=${encodeURIComponent(reminderMessage)}`} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
            <Button className="w-full bg-green-500 hover:bg-green-600 text-white"><MessageCircle className="mr-2 h-4 w-4" /> Send on WhatsApp</Button>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
