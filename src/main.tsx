import "./globals.css";

import {
  deleteMasterKey,
  getMasterKey,
} from "@helvety/shared/crypto/key-storage";
import { Button } from "@helvety/ui/button";
import { Card, CardContent, CardHeader } from "@helvety/ui/card";
import { Input } from "@helvety/ui/input";
import { ScrollArea } from "@helvety/ui/scroll-area";
import { Separator } from "@helvety/ui/separator";
import { ExternalLink, Loader2, Lock, LogOut } from "lucide-react";
import { StrictMode, useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import { HELVETY_AUTH_ORIGIN, HELVETY_GATEWAY } from "./lib/config";
import {
  decryptContactLabel,
  decryptLinkName,
  decryptNoteTitle,
  decryptTaskTitle,
} from "./lib/decrypt-entities";
import {
  CONTACT_LIST_SELECT,
  LINK_LIST_SELECT,
  NOTE_LIST_SELECT,
  TASK_LIST_SELECT,
} from "./lib/e2ee-data-select";
import { createExtensionSupabaseClient } from "./lib/extension-supabase";
import { unlockEncryptionWithPasskey } from "./lib/passkey-unlock";

/**
 *
 */
type TabId = "tasks" | "notes" | "contacts" | "links";

/**
 *
 */
function App() {
  const supabase = useMemo(() => createExtensionSupabaseClient(), []);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [cryptoBusy, setCryptoBusy] = useState(false);
  const [cryptoError, setCryptoError] = useState<string | null>(null);

  const [tab, setTab] = useState<TabId>("tasks");
  const [listBusy, setListBusy] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<{ id: string; title: string }[]>([]);
  const [notes, setNotes] = useState<{ id: string; title: string }[]>([]);
  const [contacts, setContacts] = useState<{ id: string; title: string }[]>([]);
  const [links, setLinks] = useState<{ id: string; title: string }[]>([]);

  const refreshSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session?.user) {
      setSessionEmail(null);
      setUserId(null);
      setAccessToken(null);
      return;
    }
    setSessionEmail(session.user.email ?? null);
    setUserId(session.user.id);
    setAccessToken(session.access_token);
  }, [supabase]);

  useEffect(() => {
    void refreshSession();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshSession();
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [refreshSession, supabase]);

  useEffect(() => {
    if (!userId) {
      setMasterKey(null);
      return;
    }
    void (async () => {
      const key = await getMasterKey(userId);
      setMasterKey(key);
    })();
  }, [userId]);

  const handleSendOtp = async () => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: emailInput.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) {
        setAuthError(error.message);
        return;
      }
      setOtpSent(true);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: emailInput.trim(),
        token: otpInput.trim(),
        type: "email",
      });
      if (error) {
        setAuthError(error.message);
        return;
      }
      setOtpInput("");
      setOtpSent(false);
      await refreshSession();
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    if (userId) {
      await deleteMasterKey(userId);
    }
    setMasterKey(null);
    await supabase.auth.signOut();
    await refreshSession();
  };

  const handleUnlock = async () => {
    if (!accessToken || !userId) {
      setCryptoError("Not signed in.");
      return;
    }
    setCryptoError(null);
    setCryptoBusy(true);
    try {
      const result = await unlockEncryptionWithPasskey({ accessToken, userId });
      if (!result.ok) {
        setCryptoError(result.error);
        return;
      }
      const key = await getMasterKey(userId);
      setMasterKey(key);
    } finally {
      setCryptoBusy(false);
    }
  };

  const loadLists = useCallback(async () => {
    if (!masterKey || !userId) {
      return;
    }
    setListBusy(true);
    setListError(null);
    try {
      const [itemsRes, notesRes, contactsRes, linksRes] = await Promise.all([
        supabase
          .from("items")
          .select(TASK_LIST_SELECT)
          .eq("user_id", userId)
          .order("sort_order", { ascending: true })
          .limit(500),
        supabase
          .from("notes")
          .select(NOTE_LIST_SELECT)
          .eq("user_id", userId)
          .order("sort_order", { ascending: true })
          .limit(500),
        supabase
          .from("contacts")
          .select(CONTACT_LIST_SELECT)
          .eq("user_id", userId)
          .order("sort_order", { ascending: true })
          .limit(500),
        supabase
          .from("links")
          .select(LINK_LIST_SELECT)
          .eq("user_id", userId)
          .order("sort_order", { ascending: true })
          .limit(500),
      ]);

      if (itemsRes.error) {
        setListError(itemsRes.error.message);
        return;
      }
      if (notesRes.error) {
        setListError(notesRes.error.message);
        return;
      }
      if (contactsRes.error) {
        setListError(contactsRes.error.message);
        return;
      }
      if (linksRes.error) {
        setListError(linksRes.error.message);
        return;
      }

      const mkTasks = await Promise.all(
        (itemsRes.data ?? []).map(async (row) => ({
          id: row.id,
          title: await decryptTaskTitle(row, masterKey),
        }))
      );
      const mkNotes = await Promise.all(
        (notesRes.data ?? []).map(async (row) => ({
          id: row.id,
          title: await decryptNoteTitle(row, masterKey),
        }))
      );
      const mkContacts = await Promise.all(
        (contactsRes.data ?? []).map(async (row) => ({
          id: row.id,
          title: await decryptContactLabel(row, masterKey),
        }))
      );
      const mkLinks = await Promise.all(
        (linksRes.data ?? []).map(async (row) => ({
          id: row.id,
          title: await decryptLinkName(row, masterKey),
        }))
      );

      setTasks(mkTasks);
      setNotes(mkNotes);
      setContacts(mkContacts);
      setLinks(mkLinks);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setListBusy(false);
    }
  }, [masterKey, supabase, userId]);

  useEffect(() => {
    if (masterKey && userId) {
      void loadLists();
    }
  }, [loadLists, masterKey, userId]);

  const currentList =
    tab === "tasks"
      ? tasks
      : tab === "notes"
        ? notes
        : tab === "contacts"
          ? contacts
          : links;

  const openInApp = () => {
    const path =
      tab === "tasks"
        ? "/tasks"
        : tab === "notes"
          ? "/notes"
          : tab === "contacts"
            ? "/contacts"
            : "/links";
    void chrome.tabs.create({ url: `${HELVETY_GATEWAY}${path}` });
  };

  if (!sessionEmail || !userId || !accessToken) {
    return (
      <div className="flex min-h-[420px] flex-col gap-3 p-4">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">Helvety</h1>
          <p className="text-muted-foreground text-sm">
            Sign in with email and a one-time code (Supabase Auth — same project
            as helvety.com). After sign-in, unlock with your passkey via{" "}
            <span className="font-mono text-xs">{HELVETY_AUTH_ORIGIN}</span>{" "}
            (requires extension API routes on that host).
          </p>
        </div>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium">Email sign-in</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
            />
            {!otpSent ? (
              <Button disabled={authBusy} onClick={() => void handleSendOtp()}>
                {authBusy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Sending…
                  </>
                ) : (
                  "Send code"
                )}
              </Button>
            ) : (
              <>
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6-digit code"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                />
                <Button
                  disabled={authBusy}
                  onClick={() => void handleVerifyOtp()}
                >
                  {authBusy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Verifying…
                    </>
                  ) : (
                    "Verify code"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpInput("");
                  }}
                >
                  Use a different email
                </Button>
              </>
            )}
            {authError ? (
              <p className="text-destructive text-sm">{authError}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!masterKey) {
    return (
      <div className="flex min-h-[420px] flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Helvety</h1>
            <p className="text-muted-foreground text-sm">{sessionEmail}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleLogout()}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium">Unlock encryption</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-muted-foreground text-sm">
              Use your Helvety passkey (PRF) to derive the master key—the same
              E2EE pattern as the web apps. The auth server at{" "}
              <span className="font-mono text-xs">{HELVETY_AUTH_ORIGIN}</span>{" "}
              must expose the extension passkey API; if those routes are
              missing, unlock will fail.
            </p>
            <Button disabled={cryptoBusy} onClick={() => void handleUnlock()}>
              {cryptoBusy ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Waiting for
                  passkey…
                </>
              ) : (
                <>
                  <Lock className="size-4" />
                  Unlock with passkey
                </>
              )}
            </Button>
            {cryptoError ? (
              <p className="text-destructive text-sm">{cryptoError}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[520px] max-h-[90vh] flex-col gap-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Helvety</h1>
          <p className="text-muted-foreground truncate text-xs">
            {sessionEmail}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="outline" size="sm" onClick={() => void openInApp()}>
            <ExternalLink className="size-4" />
            Web
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void handleLogout()}>
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>

      <div className="bg-muted inline-flex h-9 w-full rounded-lg p-1">
        {(
          [
            ["tasks", "Tasks"],
            ["notes", "Notes"],
            ["contacts", "Contacts"],
            ["links", "Links"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={
              tab === id
                ? "bg-background text-foreground inline-flex flex-1 items-center justify-center rounded-md px-2 text-xs font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground inline-flex flex-1 items-center justify-center rounded-md px-2 text-xs font-medium"
            }
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <Separator />

      <div className="flex min-h-0 flex-1 flex-col">
        {listBusy ? (
          <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : listError ? (
          <p className="text-destructive p-2 text-sm">{listError}</p>
        ) : (
          <ScrollArea className="h-full pr-2">
            <ul className="flex flex-col gap-1 pb-2">
              {currentList.map((row) => (
                <li key={row.id}>
                  <Card className="border-border/80 shadow-none">
                    <CardContent className="px-3 py-2">
                      <p className="text-sm leading-snug">{row.title}</p>
                      <p className="text-muted-foreground font-mono text-[10px]">
                        {row.id}
                      </p>
                    </CardContent>
                  </Card>
                </li>
              ))}
              {currentList.length === 0 ? (
                <p className="text-muted-foreground px-1 py-6 text-center text-sm">
                  No records yet.
                </p>
              ) : null}
            </ul>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
