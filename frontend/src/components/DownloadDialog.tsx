import { useState } from "react";
import { z } from "zod";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  phone: z.string().trim().min(10, "Please enter your phone number").max(10),
  message: z.string().trim().max(500).optional().or(z.literal("")),
});

type Action = "view" | "download";

export function DownloadDialog({
  open,
  onOpenChange,
  onConfirmed,
  action = "download",
  title,
  description,
  cta,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmed: () => void;
  action?: Action;
  title?: string;
  description?: string;
  cta?: string;
}) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    let error: unknown = null;
    try {
      await api("POST", "/api/downloads", {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        message: parsed.data.message || null,
        action,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
      });
    } catch (e) {
      error = e;
    }
    setSubmitting(false);
    if (error) {
      toast.error("Could not submit. Please try again.");
      return;
    }
    toast.success(action === "download" ? "Thank you! Preparing your download…" : "Thank you!");
    onOpenChange(false);
    setTimeout(onConfirmed, 200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title ?? (action === "download" ? "Download Biodata" : "View Biodata")}</DialogTitle>
          <DialogDescription>
            {description ?? "Please share a few details to continue."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">Your Name *</Label>
            <Input id="name" value={form.name} onChange={update("name")} required maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" value={form.email} onChange={update("email")} required maxLength={255} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone *</Label>
            <Input id="phone" type="tel" value={form.phone} onChange={update("phone")} required maxLength={30} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="message">Relation / Message (optional)</Label>
            <Textarea id="message" value={form.message} onChange={update("message")} maxLength={500} rows={3} />
          </div>
          <DialogFooter className="pt-2">
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Please wait…" : cta ?? (action === "download" ? "Continue & Download" : "View Biodata")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
