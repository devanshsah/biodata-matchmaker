import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LogOut, Home, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Downloads · Admin" }] }),
});

type Download = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  created_at: string;
};

function AdminPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Download[]>([]);

  const load = async () => {
    setLoading(true);
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      navigate({ to: "/auth" });
      return;
    }
    const { data, error } = await supabase
      .from("downloads")
      .select("id,name,email,phone,message,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message.includes("permission") ? "You are not an admin." : error.message);
      setRows([]);
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-[color:var(--maroon)]">
              Biodata Downloads
            </h1>
            <p className="text-sm text-muted-foreground">
              Everyone who has downloaded the biodata.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/"><Home className="size-4" />Home</Link>
            </Button>
            <Button onClick={load} variant="outline" size="sm"><RefreshCw className="size-4" />Refresh</Button>
            <Button onClick={handleSignOut} variant="outline" size="sm"><LogOut className="size-4" />Sign out</Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>{rows.length} download{rows.length === 1 ? "" : "s"}</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground py-6 text-center">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center">No downloads yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{r.email}</TableCell>
                        <TableCell>{r.phone || "—"}</TableCell>
                        <TableCell className="max-w-xs truncate">{r.message || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
