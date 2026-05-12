import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { BiodataDocument } from "@/components/BiodataDocument";
import { DownloadDialog } from "@/components/DownloadDialog";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Devansh Sah — Profile" },
      {
        name: "description",
        content:
          "Personal profile of Devansh Sah, Software Engineer based in Pune.",
      },
    ],
  }),
});

function Index() {
  const [open, setOpen] = useState(false);

  const triggerDownload = () => window.print();

  return (
    <main className="min-h-screen px-4 py-12 md:py-20">
      <BiodataDocument />

      <div className="no-print mx-auto max-w-2xl mt-10 flex flex-col items-center">
        <Button onClick={() => setOpen(true)} size="lg" className="gap-2 rounded-none px-8">
          <Download className="size-4" />
          Download as PDF
        </Button>
        <p className="text-xs text-muted-foreground mt-3 tracking-wide">
          A short form will appear before download.
        </p>
        <Link to="/admin" className="mt-6 text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground">
          Admin
        </Link>
      </div>

      <DownloadDialog open={open} onOpenChange={setOpen} onConfirmed={triggerDownload} />
    </main>
  );
}
