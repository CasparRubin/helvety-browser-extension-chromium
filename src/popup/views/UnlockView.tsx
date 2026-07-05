import { Button } from "@helvety/ui/button";
import { Card, CardContent, CardHeader } from "@helvety/ui/card";
import { Loader2, Lock, LogOut } from "lucide-react";

import { IconTooltipButton } from "../components/IconTooltipButton";
import { PopupHeader } from "../components/PopupHeader";

/** Supabase `user_passkey_params` preflight state for unlock screen branching. */
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
  onOpenEncryptionSetup,
}: {
  version: string;
  sessionEmail: string;
  paramsPreflight: ParamsPreflight | null;
  cryptoBusy: boolean;
  cryptoError: string | null;
  onUnlock: () => void;
  onLogout: () => void;
  onOpenEncryptionSetup: () => void;
}): React.JSX.Element {
  const notSetup = paramsPreflight?.status === "not_setup";

  return (
    <>
      <div className="relative mb-2">
        <PopupHeader version={version} />
        <IconTooltipButton
          label="Sign out"
          tooltip={
            <span className="block text-center">
              Sign out
              <span className="text-muted-foreground block text-xs">
                {sessionEmail}
              </span>
            </span>
          }
          variant="ghost"
          size="sm"
          type="button"
          className="absolute top-0 right-0"
          onClick={onLogout}
        >
          <LogOut className="size-4" />
        </IconTooltipButton>
      </div>
      <Card className="border-0 shadow-none">
        <CardHeader className="p-3 pb-2">
          <p className="text-sm font-medium">Unlock encryption</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {notSetup
              ? "Passkey encryption is not set up for this account yet. Complete setup on helvety.com, then return here to unlock."
              : "Use your Helvety passkey to decrypt and manage tasks, notes, contacts, links, and folders in this browser."}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 p-3 pt-0">
          {notSetup ? (
            <Button variant="default" onClick={onOpenEncryptionSetup}>
              Set up encryption on helvety.com
            </Button>
          ) : (
            <Button disabled={cryptoBusy} onClick={onUnlock}>
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
          )}
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
