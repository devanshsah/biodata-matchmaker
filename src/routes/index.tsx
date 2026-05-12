import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Download, Eye } from "lucide-react";
import { BiodataDocument } from "@/components/BiodataDocument";
import { DownloadDialog } from "@/components/DownloadDialog";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Devansh Sah" },
    ],
    links: [
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg",
      },
    ],
  }),
});

function Index() {
  const [viewOpen, setViewOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const triggerDownload = () => {
    const original = document.title;
    document.title = "Devansh Sah- Biodata";
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = original;
      }, 1000);
    }, 600);
  };

  if (!unlocked) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="max-w-xl w-full text-center bg-card border border-[color:var(--gold)]/40 px-8 py-14 shadow-[var(--shadow-elegant)]">
          <h1 className="text-4xl md:text-5xl font-serif text-[color:var(--maroon)] mb-3">
            Devansh Sah
          </h1>
          <p className="text-sm text-muted-foreground mb-8 tracking-wide">
            Software Engineer · Pune
          </p>
          <Button onClick={() => setViewOpen(true)} size="lg" className="gap-2 rounded-none px-8">
            <Eye className="size-4" />
            View
          </Button>
        </div>

        <DownloadDialog
          open={viewOpen}
          onOpenChange={setViewOpen}
          onConfirmed={() => setUnlocked(true)}
          action="view"
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-12 md:py-20">
      <BiodataDocument />

      <div className="no-print mx-auto max-w-2xl mt-10 flex flex-col items-center">
        <Button onClick={() => setDownloadOpen(true)} size="lg" className="gap-2 rounded-none px-8">
          <Download className="size-4" />
          Download as PDF
        </Button>
      </div>

      <DownloadDialog
        open={downloadOpen}
        onOpenChange={setDownloadOpen}
        onConfirmed={triggerDownload}
        action="download"
      />
    </main>
  );
}
