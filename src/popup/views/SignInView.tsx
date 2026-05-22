import { Button } from "@helvety/ui/button";
import { Card, CardContent, CardHeader } from "@helvety/ui/card";
import { Input } from "@helvety/ui/input";
import { Loader2 } from "lucide-react";

import { PopupHeader } from "../components/PopupHeader";

/**
 *
 */
export function SignInView({
  version,
  emailInput,
  otpInput,
  otpSent,
  authBusy,
  authError,
  onEmailChange,
  onOtpChange,
  onSendOtp,
  onVerifyOtp,
  onUseDifferentEmail,
}: {
  version: string;
  emailInput: string;
  otpInput: string;
  otpSent: boolean;
  authBusy: boolean;
  authError: string | null;
  onEmailChange: (value: string) => void;
  onOtpChange: (value: string) => void;
  onSendOtp: () => void;
  onVerifyOtp: () => void;
  onUseDifferentEmail: () => void;
}): React.JSX.Element {
  return (
    <>
      <PopupHeader version={version} />
      <Card className="border-0 shadow-none">
        <CardHeader className="p-3 pb-2">
          <p className="text-sm font-medium">Email sign-in</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Sign in with a one-time code (same Supabase Auth project as
            helvety.com).
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 p-3 pt-0">
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={emailInput}
            onChange={(e) => onEmailChange(e.target.value)}
          />
          {!otpSent ? (
            <Button disabled={authBusy} onClick={onSendOtp}>
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
                onChange={(e) => onOtpChange(e.target.value)}
              />
              <Button disabled={authBusy} onClick={onVerifyOtp}>
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
                onClick={onUseDifferentEmail}
              >
                Use a different email
              </Button>
            </>
          )}
          {authError ? (
            <p role="alert" className="text-destructive text-sm">
              {authError}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
