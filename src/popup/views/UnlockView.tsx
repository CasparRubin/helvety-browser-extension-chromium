import { Button } from "@helvety/ui/button";
import { Card, CardContent, CardHeader } from "@helvety/ui/card";
import { Loader2, Lock, LogOut } from "lucide-react";

import { PopupHeader } from "../components/PopupHeader";

/** Supabase `user_passkey_params` preflight shown on the unlock screen. */
export type ParamsPreflight =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "not_setup" }
  | { status: "error"; message: string };

/** Passkey unlock screen after OTP sign-in (before decrypted data is available). */
export function UnlockView({
  version,
  sessionEmail,
  paramsPreflight,
  cryptoBusy,
  cryptoError,
  onUnlock,
  onLogout,
}: {
  version: string;
  sessionEmail: string;
  paramsPreflight: ParamsPreflight | null;
  cryptoBusy: boolean;
  cryptoError: string | null;
  onUnlock: () => void;
  onLogout: () => void;
}): React.JSX.Element {
  return (
    <>
      <div className="relative mb-2">
        <PopupHeader version={version} />
        <Button
          variant="outline"
          size="sm"
          type="button"
          className="absolute top-0 right-0"
          onClick={onLogout}
        >
          <LogOut className="size-4" />
          <span className="sr-only">Sign out</span>
        </Button>
      </div>
      <p className="text-muted-foreground -mt-1 mb-1 truncate text-xs">
        {sessionEmail}
      </p>
      <Card className="border-0 shadow-none">
        <CardHeader className="p-3 pb-2">
          <p className="text-sm font-medium">Unlock encryption</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Use your Helvety passkey to decrypt and manage tasks, notes,
            contacts, links, and folders in this browser. See the About tab for
            E2EE and WebAuthn setup details.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 p-3 pt-0">
          {paramsPreflight ? (
            <p className="text-muted-foreground text-xs">
              Encryption params:{" "}
              {paramsPreflight.status === "loading"
                ? "checking…"
                : paramsPreflight.status === "ready"
                  ? "ready"
                  : paramsPreflight.status === "not_setup"
                    ? "not set up on this account"
                    : `cannot load: ${paramsPreflight.message}`}
            </p>
          ) : null}
          <Button disabled={cryptoBusy} onClick={onUnlock}>
            {cryptoBusy ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Waiting for passkey…
              </>
            ) : (
              <>
                <Lock className="size-4" />
                Unlock with passkey
              </>
            )}
          </Button>
          {cryptoError ? (
            <p role="alert" className="text-destructive text-sm">
              {cryptoError}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
