"use client";

import React, { useState } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { Bell, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirebaseTenant } from "@/platform/auth";

interface ManualReminderTriggerProps extends ButtonProps {
  label?: string;
  icon?: React.ReactNode;
}

export function ManualReminderTrigger({ 
  label = "Trigger Rent Reminders", 
  icon = <Bell className="h-4 w-4" />, 
  className, 
  variant = "secondary",
  size,
  ...props 
}: ManualReminderTriggerProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { auth } = useFirebaseTenant();

  const handleTrigger = async () => {
    try {
      setLoading(true);
      if (!auth?.currentUser) {
        throw new Error("Not authenticated");
      }
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/owner/trigger-reminders", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to trigger reminders");
      }

      if (data.sentCount > 0) {
        toast({
          title: "Success",
          description: `Successfully sent ${data.sentCount} reminders!`,
        });
      } else {
        toast({
          title: "Job Completed",
          description: "No reminders were sent. Either no dues are pending, or reminders were already sent recently.",
        });
      }
      
      if (data.errorCount > 0) {
        toast({
          title: "Warning",
          description: `Failed to send ${data.errorCount} reminders. Check logs.`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleTrigger} 
      disabled={loading || props.disabled} 
      variant={variant}
      size={size}
      className={className || "w-full justify-between sm:w-auto"}
      {...props}
    >
      <span className="flex items-center gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        {label}
      </span>
    </Button>
  );
}
