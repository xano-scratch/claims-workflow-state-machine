import { useState } from "react";
import { ShieldCheck, UserCog, User, Eye, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, login, seedReset, type LoginResponse } from "@/lib/api";
import { ROLE_LABEL, type Role } from "@/lib/claims";

const DEMO_PASSWORD = "demo1234";

const DEMO_ACCOUNTS: {
  email: string;
  name: string;
  role: Role;
  icon: React.ComponentType<{ className?: string }>;
  blurb: string;
}[] = [
  { email: "manager@demo.test", name: "Morgan Reyes", role: "claims_manager", icon: ShieldCheck, blurb: "Approves high-value claims, assigns adjusters, marks paid." },
  { email: "adjuster@demo.test", name: "Alex Turner", role: "adjuster", icon: UserCog, blurb: "Reviews and approves within a reserve limit." },
  { email: "adjuster2@demo.test", name: "Priya Shah", role: "adjuster", icon: User, blurb: "A second adjuster, assignable to claims." },
  { email: "viewer@demo.test", name: "Sam Rivera", role: "viewer", icon: Eye, blurb: "Read-only. Every transition is refused." },
];

export function SignIn({ onSignedIn }: { onSignedIn: (session: LoginResponse) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function signIn(withEmail: string, withPassword: string, key: string) {
    setBusy(key);
    setError(null);
    try {
      let resp: LoginResponse;
      try {
        resp = await login({ email: withEmail, password: withPassword });
      } catch (e) {
        // Fresh environment with no rows yet — seed once, then retry.
        if (e instanceof ApiError && e.status === 401 && withPassword === DEMO_PASSWORD) {
          await seedReset();
          resp = await login({ email: withEmail, password: withPassword });
        } else {
          throw e;
        }
      }
      onSignedIn(resp);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 p-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Claims Workflow</h1>
        <p className="text-muted-foreground mx-auto max-w-xl text-balance">
          A governed insurance claims backend. Pick a role to see how permissions,
          the state machine, and reserve limits are enforced at the API layer.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {DEMO_ACCOUNTS.map((a) => {
          const Icon = a.icon;
          return (
            <Card key={a.email} className="transition-colors hover:border-primary/40">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <span className="bg-muted flex size-10 items-center justify-center rounded-lg">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <CardTitle className="text-base">{a.name}</CardTitle>
                    <CardDescription>{ROLE_LABEL[a.role]}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground text-sm">{a.blurb}</p>
                <Button
                  className="w-full"
                  disabled={busy !== null}
                  onClick={() => signIn(a.email, DEMO_PASSWORD, a.email)}
                >
                  {busy === a.email ? <Loader2 className="size-4 animate-spin" /> : null}
                  Sign in as {a.name.split(" ")[0]}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {error ? (
        <p className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-center text-sm">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Or sign in manually</CardTitle>
          <CardDescription>
            All demo accounts use the password <code className="text-foreground">demo1234</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              signIn(email, password, "manual");
            }}
          >
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="username" placeholder="manager@demo.test" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" placeholder="demo1234" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" variant="secondary" disabled={busy !== null || !email || !password}>
              {busy === "manual" ? <Loader2 className="size-4 animate-spin" /> : null}
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
