import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Downloads — Admin" }, { name: "robots", content: "noindex" }] }),
});

type DownloadRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  action: string | null;
  created_at: string;
};

function AdminPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<DownloadRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("downloads")
      .select("id, name, email, phone, message, created_at")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error("You don't have access. Sign in as admin.");
      navigate({ to: "/auth" });
      return;
    }
    setRows((data ?? []) as DownloadRow[]);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth" });
        return;
      }
      load();
    });
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <main className="min-h-screen px-4 py-10 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif text-[color:var(--maroon)]">Download Records</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] mt-1">
            People who downloaded the biodata
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/" className="text-sm underline-offset-4 hover:underline">View biodata</Link>
          <Button variant="outline" onClick={load} className="rounded-none">Refresh</Button>
          <Button variant="ghost" onClick={signOut} className="rounded-none">Sign out</Button>
        </div>
      </header>

      <div className="border border-[color:var(--gold)]/40 bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[color:var(--gold)]/10 text-[color:var(--maroon)]">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Message</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!loading && rows && rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No downloads yet.</td></tr>
            )}
            {rows?.map((r) => (
              <tr key={r.id} className="border-t border-[color:var(--rule)]/40 align-top">
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3">{r.name}</td>
                <td className="px-4 py-3">
                  <a href={`mailto:${r.email}`} className="hover:underline">{r.email}</a>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {r.phone ? <a href={`tel:${r.phone}`} className="hover:underline">{r.phone}</a> : "—"}
                </td>
                <td className="px-4 py-3 max-w-md">{r.message || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
