import { useState } from "react";
import { LogOut, RotateCcw, FilePlus2, Scale, ArrowLeftRight, ShieldCheck, ListChecks } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SignIn } from "@/components/SignIn";
import { Queue } from "@/components/Queue";
import { ClaimDetail } from "@/components/ClaimDetail";
import { FileClaim } from "@/components/FileClaim";
import { seedReset, setToken, type LoginResponse, type SessionUser } from "@/lib/api";
import { ROLE_LABEL, type Role } from "@/lib/claims";

const SESSION_KEY = "cwsm_session";
type Session = { token: string; user: SessionUser };

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    setToken(s.token);
    return s;
  } catch {
    return null;
  }
}

const ROLE_BADGE: Record<Role, string> = {
  claims_manager: "border-violet-500/30 bg-violet-500/15 text-violet-300",
  adjuster: "border-sky-500/30 bg-sky-500/15 text-sky-300",
  viewer: "border-zinc-500/30 bg-zinc-500/15 text-zinc-300",
};

export default function App() {
  const [session, setSession] = useState<Session | null>(loadSession);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<"detail" | "file">("detail");
  const [reloadKey, setReloadKey] = useState(0);
  const [resetting, setResetting] = useState(false);

  function onSignedIn(resp: LoginResponse) {
    if (!resp.user) return;
    const s: Session = { token: resp.token, user: resp.user };
    setToken(resp.token);
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setSession(s);
  }

  function signOut() {
    setToken(null);
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setSelectedId(null);
    setMode("detail");
  }

  async function resetDemo() {
    setResetting(true);
    try {
      await seedReset();
      setSelectedId(null);
      setMode("detail");
      setReloadKey((k) => k + 1);
    } finally {
      setResetting(false);
    }
  }

  if (!session) return <SignIn onSignedIn={onSignedIn} />;

  const role = String(session.user.role) as Role;

  return (
    <div className="min-h-screen">
      <header className="border-border bg-card/40 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
              <Scale className="size-4" />
            </span>
            <div className="leading-tight">
              <p className="font-semibold">Claims Workflow</p>
              <p className="text-muted-foreground text-xs">Governed state machine · API-layer RBAC</p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground hidden text-sm sm:inline">
              {String(session.user.name)}
            </span>
            <Badge variant="outline" className={ROLE_BADGE[role]}>
              {ROLE_LABEL[role]}
            </Badge>
            <Button
              size="sm"
              variant={mode === "file" ? "default" : "outline"}
              onClick={() => {
                setMode("file");
                setSelectedId(null);
              }}
            >
              <FilePlus2 className="size-4" /> New claim
            </Button>
            <Button size="sm" variant="ghost" onClick={resetDemo} disabled={resetting}>
              <RotateCcw className={resetting ? "size-4 animate-spin" : "size-4"} /> Reset demo
            </Button>
            <Button size="sm" variant="ghost" onClick={signOut}>
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <section className="space-y-3">
          <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            Claims queue
          </h2>
          <Queue
            selectedId={selectedId}
            reloadKey={reloadKey}
            onSelect={(id) => {
              setSelectedId(id);
              setMode("detail");
            }}
          />
        </section>

        <section className="border-border bg-card min-h-[24rem] rounded-xl border p-5">
          {mode === "file" ? (
            <FileClaim
              onFiled={(id) => {
                setSelectedId(id);
                setMode("detail");
                setReloadKey((k) => k + 1);
              }}
            />
          ) : selectedId != null ? (
            <ClaimDetail
              claimId={selectedId}
              role={role}
              onChanged={() => setReloadKey((k) => k + 1)}
            />
          ) : (
            <GettingStarted />
          )}
        </section>
      </main>
    </div>
  );
}

function GettingStarted() {
  const steps = [
    { icon: ListChecks, text: "Pick a claim from the queue to see its detail and full audit trail." },
    { icon: ArrowLeftRight, text: "As an adjuster, open claim #2 and click Approve — it is blocked: the amount is over the adjuster reserve limit." },
    { icon: ShieldCheck, text: "Sign in as the claims manager and the same approval goes through. Every move is written to the audit trail." },
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Walk a claim through the machine</h2>
        <p className="text-muted-foreground text-sm">
          Every transition is checked at the API layer, not in the browser.
        </p>
      </div>
      <ul className="space-y-3">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg">
                <Icon className="size-4" />
              </span>
              <span className="pt-1.5">{s.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
