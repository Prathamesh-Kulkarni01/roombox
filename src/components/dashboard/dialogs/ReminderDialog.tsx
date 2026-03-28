
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Copy, MessageCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

type ReminderDialogProps = Pick<UseDashboardReturn, 'isReminderDialogOpen' | 'setIsReminderDialogOpen' | 'selectedGuestForReminder' | 'reminderMessage' | 'isGeneratingReminder' | 'setReminderMessage'>

export default function ReminderDialog({ isReminderDialogOpen, setIsReminderDialogOpen, selectedGuestForReminder, reminderMessage, isGeneratingReminder, setReminderMessage }: ReminderDialogProps) {
  const { toast } = useToast()
  
  return (
    <Dialog open={isReminderDialogOpen} onOpenChange={(open) => {
        setIsReminderDialogOpen(open);
        if (!open && setReminderMessage) {
            setReminderMessage(''); // Clear message on close
        }
    }}>
      <DialogContent className="sm:max-w-md p-0 flex flex-col max-h-[90dvh]">
        <DialogHeader className="p-6 pb-2 flex-shrink-0">
          <DialogTitle>Send Rent Reminder</DialogTitle>
          <DialogDescription>A reminder message has been generated for {selectedGuestForReminder?.name}. You can edit it before sending.</DialogDescription>
        </DialogHeader>
        <div className="p-6 pt-0 flex-1 overflow-y-auto space-y-2">
            <Label htmlFor="reminder-message" className="text-sm font-medium">Reminder Message</Label>
            {isGeneratingReminder ? (
                <div className="space-y-2 py-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
            ) : (
                <Textarea id="reminder-message" value={reminderMessage} onChange={(e) => setReminderMessage ? setReminderMessage(e.target.value) : null} rows={8} className="bg-muted/50 resize-none" />
            )}
        </div>
        <DialogFooter className="p-6 pt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2 border-t flex-shrink-0">
          <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(reminderMessage); toast({ title: "Copied!", description: "Reminder message copied to clipboard." }) }} className="w-full sm:w-auto">
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
