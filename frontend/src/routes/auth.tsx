import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { api, getMe } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in" }, { name: "robots", content: "noindex" }] }),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getMe().then((me) => {
      if (me) navigate({ to: "/admin" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("POST", mode === "signup" ? "/api/auth/signup" : "/api/auth/login", { email, password });
      setBusy(false);
      if (mode === "signup") toast.success("Account created. You're signed in.");
      navigate({ to: "/admin" });
    } catch (err) {
      setBusy(false);
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-card border border-[color:var(--gold)]/40 p-8 shadow-[var(--shadow-elegant)]">
        <h1 className="text-3xl font-serif text-center text-[color:var(--maroon)] mb-1">
          {mode === "signin" ? "Sign In" : "Create Admin"}
        </h1>
        <p className="text-center text-xs text-muted-foreground tracking-wider uppercase mb-6">
          Admin access
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy} className="w-full rounded-none">
            {busy ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
          </Button>
        </form>
        <button
          type="button"
          className="block mx-auto mt-4 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
        >
          {mode === "signin" ? "First time? Create an admin account" : "Already have an account? Sign in"}
        </button>
        <Link to="/" className="block mt-4 text-center text-xs text-muted-foreground hover:text-foreground">
          ← Back to biodata
        </Link>
      </div>
    </main>
  );
}
