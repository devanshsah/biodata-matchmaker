import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Download, ShieldCheck } from "lucide-react";
import { BiodataDocument } from "@/components/BiodataDocument";
import { DownloadDialog } from "@/components/DownloadDialog";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Devansh Sah · Matrimonial Biodata" },
      {
        name: "description",
        content:
          "Matrimonial biodata of Devansh Sah — Software Engineer, Pune. Jain family from Jaipur.",
      },
    ],
  }),
});

function Index() {
  const [open, setOpen] = useState(false);

  const triggerDownload = () => {
    window.print();
  };

  return (
    <main className="min-h-screen py-10 md:py-16 px-4">
      <div className="no-print mx-auto max-w-3xl mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-[color:var(--gold)]">
            Matrimonial
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold text-[color:var(--maroon)]">
            Devansh Sah · Biodata
          </h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin">
              <ShieldCheck className="size-4" />
              Admin
            </Link>
          </Button>
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Download className="size-4" />
            Download PDF
          </Button>
        </div>
      </div>

      <BiodataDocument />

      <div className="no-print mx-auto max-w-3xl mt-8 text-center">
        <Button onClick={() => setOpen(true)} size="lg" className="gap-2">
          <Download className="size-5" />
          Download Biodata as PDF
        </Button>
        <p className="text-sm text-muted-foreground mt-3">
          A short form will appear before download.
        </p>
      </div>

      <DownloadDialog open={open} onOpenChange={setOpen} onConfirmed={triggerDownload} />
    </main>
  );
}
