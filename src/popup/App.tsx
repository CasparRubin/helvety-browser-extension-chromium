import { readExtensionVersion } from "@helvety/extension-chrome/extension-version";
import {
  POPUP_SHELL_CLASS,
  POPUP_WIDTH_CLASS,
} from "@helvety/extension-chrome/popup-shell";
import { usePopupTheme } from "@helvety/extension-chrome/use-popup-theme";
import {
  deleteMasterKey,
  getMasterKey,
} from "@helvety/shared/crypto/key-storage";
import { useCallback, useEffect, useMemo, useState } from "react";

import { HELVETY_GATEWAY } from "../lib/config";
import {
  decryptContactLabel,
  decryptLinkName,
  decryptNoteTitle,
  decryptTaskTitle,
} from "../lib/decrypt-entities";
import {
  CONTACT_LIST_SELECT,
  LINK_LIST_SELECT,
  NOTE_LIST_SELECT,
  TASK_LIST_SELECT,
} from "../lib/e2ee-data-select";
import { fetchPasskeyParamsForUser } from "../lib/extension-passkey-params";
import { createExtensionSupabaseClient } from "../lib/extension-supabase";
import { unlockEncryptionWithPasskey } from "../lib/passkey-unlock";

import { STORAGE_KEY_POPUP_THEME } from "./constants";
import { DataTabsView, type EntityTabId } from "./views/DataTabsView";
import { SignInView } from "./views/SignInView";
import { UnlockView, type ParamsPreflight } from "./views/UnlockView";

/** Root popup: OTP sign-in, passkey unlock, read-only E2EE lists. */
export default function App() {
  const supabase = useMemo(() => createExtensionSupabaseClient(), []);
  const { themePreference, saveTheme } = usePopupTheme(STORAGE_KEY_POPUP_THEME);
  const extensionVersion = useMemo(() => readExtensionVersion(), []);

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
  const [paramsPreflight, setParamsPreflight] =
    useState<ParamsPreflight | null>(null);

  const [tab, setTab] = useState<EntityTabId>("tasks");
  const [listBusy, setListBusy] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<{ id: string; title: string }[]>([]);
  const [notes, setNotes] = useState<{ id: string; title: string }[]>([]);
  const [contacts, setContacts] = useState<{ id: string; title: string }[]>([]);
  const [links, setLinks] = useState<{ id: string; title: string }[]>([]);
  const [loadedTabs, setLoadedTabs] = useState<Set<EntityTabId>>(new Set());

  const shellClass = `flex ${POPUP_WIDTH_CLASS} ${POPUP_SHELL_CLASS} text-foreground`;

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
      setLoadedTabs(new Set());
      return;
    }
    void (async () => {
      const key = await getMasterKey(userId);
      setMasterKey(key);
    })();
  }, [userId]);

  useEffect(() => {
    if (!userId || !accessToken || masterKey) {
      setParamsPreflight(null);
      return;
    }
    let cancelled = false;
    setParamsPreflight({ status: "loading" });
    void (async () => {
      const result = await fetchPasskeyParamsForUser(supabase, userId);
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setParamsPreflight({ status: "error", message: result.error });
        return;
      }
      if (!result.params) {
        setParamsPreflight({ status: "not_setup" });
        return;
      }
      setParamsPreflight({ status: "ready" });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, accessToken, masterKey, supabase]);

  const loadTab = useCallback(
    async (target: EntityTabId) => {
      if (!masterKey || !userId || target === "about") {
        return;
      }
      setListBusy(true);
      setListError(null);
      try {
        if (target === "tasks") {
          const { data, error } = await supabase
            .from("items")
            .select(TASK_LIST_SELECT)
            .eq("user_id", userId)
            .order("sort_order", { ascending: true })
            .limit(500);
          if (error) {
            setListError(error.message);
            return;
          }
          const rows = await Promise.all(
            (data ?? []).map(async (row) => ({
              id: row.id,
              title: await decryptTaskTitle(row, masterKey),
            }))
          );
          setTasks(rows);
        } else if (target === "notes") {
          const { data, error } = await supabase
            .from("notes")
            .select(NOTE_LIST_SELECT)
            .eq("user_id", userId)
            .order("sort_order", { ascending: true })
            .limit(500);
          if (error) {
            setListError(error.message);
            return;
          }
          const rows = await Promise.all(
            (data ?? []).map(async (row) => ({
              id: row.id,
              title: await decryptNoteTitle(row, masterKey),
            }))
          );
          setNotes(rows);
        } else if (target === "contacts") {
          const { data, error } = await supabase
            .from("contacts")
            .select(CONTACT_LIST_SELECT)
            .eq("user_id", userId)
            .order("sort_order", { ascending: true })
            .limit(500);
          if (error) {
            setListError(error.message);
            return;
          }
          const rows = await Promise.all(
            (data ?? []).map(async (row) => ({
              id: row.id,
              title: await decryptContactLabel(row, masterKey),
            }))
          );
          setContacts(rows);
        } else if (target === "links") {
          const { data, error } = await supabase
            .from("links")
            .select(LINK_LIST_SELECT)
            .eq("user_id", userId)
            .order("sort_order", { ascending: true })
            .limit(500);
          if (error) {
            setListError(error.message);
            return;
          }
          const rows = await Promise.all(
            (data ?? []).map(async (row) => ({
              id: row.id,
              title: await decryptLinkName(row, masterKey),
            }))
          );
          setLinks(rows);
        }
        setLoadedTabs((prev) => new Set(prev).add(target));
      } catch (e) {
        setListError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        setListBusy(false);
      }
    },
    [masterKey, supabase, userId]
  );

  useEffect(() => {
    if (!masterKey || !userId || tab === "about") {
      return;
    }
    if (!loadedTabs.has(tab)) {
      void loadTab(tab);
    }
  }, [loadTab, loadedTabs, masterKey, tab, userId]);

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
    setLoadedTabs(new Set());
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
    setParamsPreflight({ status: "loading" });
    try {
      const preflight = await fetchPasskeyParamsForUser(supabase, userId);
      if (!preflight.ok) {
        setParamsPreflight({ status: "error", message: preflight.error });
        setCryptoError(preflight.error);
        return;
      }
      if (!preflight.params) {
        setParamsPreflight({ status: "not_setup" });
        setCryptoError("Encryption is not set up for this account.");
        return;
      }
      setParamsPreflight({ status: "ready" });

      const result = await unlockEncryptionWithPasskey({
        supabase,
        accessToken,
        userId,
      });
      if (!result.ok) {
        setCryptoError(result.error);
        return;
      }
      const key = await getMasterKey(userId);
      setMasterKey(key);
      setLoadedTabs(new Set());
    } finally {
      setCryptoBusy(false);
    }
  };

  const handleTabChange = (next: EntityTabId) => {
    setTab(next);
    setListError(null);
  };

  const handleRetryList = () => {
    if (tab !== "about") {
      void loadTab(tab);
    }
  };

  const currentList =
    tab === "tasks"
      ? tasks
      : tab === "notes"
        ? notes
        : tab === "contacts"
          ? contacts
          : tab === "links"
            ? links
            : [];

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
      <div className={shellClass}>
        <SignInView
          version={extensionVersion}
          emailInput={emailInput}
          otpInput={otpInput}
          otpSent={otpSent}
          authBusy={authBusy}
          authError={authError}
          onEmailChange={setEmailInput}
          onOtpChange={setOtpInput}
          onSendOtp={() => void handleSendOtp()}
          onVerifyOtp={() => void handleVerifyOtp()}
          onUseDifferentEmail={() => {
            setOtpSent(false);
            setOtpInput("");
          }}
        />
      </div>
    );
  }

  if (!masterKey) {
    return (
      <div className={shellClass}>
        <UnlockView
          version={extensionVersion}
          sessionEmail={sessionEmail}
          paramsPreflight={paramsPreflight}
          cryptoBusy={cryptoBusy}
          cryptoError={cryptoError}
          onUnlock={() => void handleUnlock()}
          onLogout={() => void handleLogout()}
        />
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <DataTabsView
        version={extensionVersion}
        sessionEmail={sessionEmail}
        tab={tab}
        onTabChange={handleTabChange}
        listBusy={tab !== "about" && (listBusy || !loadedTabs.has(tab))}
        listError={listError}
        currentList={currentList}
        themePreference={themePreference}
        onSaveTheme={saveTheme}
        paramsPreflight={paramsPreflight}
        onOpenInApp={openInApp}
        onLogout={() => void handleLogout()}
        onRetryList={handleRetryList}
      />
    </div>
  );
}
