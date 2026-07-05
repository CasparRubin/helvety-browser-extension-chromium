"use client";

import { EXTENSION_EMAIL_OTP_SIGNIN_HELPER } from "@helvety/shared/user-facing-errors";
import { Button } from "@helvety/ui/button";
import { Card, CardContent, CardHeader } from "@helvety/ui/card";
import { Checkbox } from "@helvety/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@helvety/ui/dialog";
import { Input } from "@helvety/ui/input";
import { Label } from "@helvety/ui/label";
import { Loader2, Mail } from "lucide-react";

import { PopupHeader } from "../components/PopupHeader";

/** Email OTP sign-in via Helvety auth API; no entity data before unlock. */
export function SignInView({
  version,
  emailInput,
  otpInput,
  otpSent,
  nonEUEEAConfirmed,
  authBusy,
  authError,
  onEmailChange,
  onOtpChange,
  onNonEUEEAConfirmedChange,
  onSendOtp,
  onVerifyOtp,
  onUseDifferentEmail,
}: {
  version: string;
  emailInput: string;
  otpInput: string;
  otpSent: boolean;
  nonEUEEAConfirmed: boolean;
  authBusy: boolean;
  authError: string | null;
  onEmailChange: (value: string) => void;
  onOtpChange: (value: string) => void;
  onNonEUEEAConfirmedChange: (checked: boolean) => void;
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
            {EXTENSION_EMAIL_OTP_SIGNIN_HELPER} EU/EEA attestation is required
            before we send a code.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 p-3 pt-0">
          <div className="grid gap-2">
            <Label htmlFor="extension-email">Email address</Label>
            <Input
              id="extension-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={emailInput}
              onChange={(e) => onEmailChange(e.target.value)}
              disabled={otpSent || authBusy}
            />
          </div>
          {!otpSent ? (
            <>
              <label
                htmlFor="non-eu-eea-confirmation"
                className="flex cursor-pointer items-start gap-3 border p-3 select-none"
              >
                <Checkbox
                  id="non-eu-eea-confirmation"
                  checked={nonEUEEAConfirmed}
                  onCheckedChange={(checked) =>
                    onNonEUEEAConfirmedChange(checked === true)
                  }
                  disabled={authBusy}
                  className="mt-0.5"
                />
                <span className="text-foreground text-sm leading-relaxed">
                  I confirm that I am <strong>not</strong> located in the
                  European Union (EU) or European Economic Area (EEA).
                </span>
              </label>
              <Dialog>
                <DialogTrigger
                  render={
                    <button
                      type="button"
                      className="text-primary mx-auto block text-xs underline underline-offset-4 hover:opacity-90"
                    />
                  }
                  nativeButton={false}
                >
                  Why can&apos;t Helvety currently serve EU/EEA customers?
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      Why EU/EEA access is currently restricted
                    </DialogTitle>
                    <DialogDescription>
                      Helvety is a Swiss sole proprietorship. For now, we do not
                      have the legal/compliance capacity required to offer
                      account-based services to users located in the EU/EEA.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogDescription>
                    We would like to serve EU/EEA customers in the future, but
                    at the moment we must restrict access until we can meet
                    those legal requirements safely and responsibly.
                  </DialogDescription>
                  <DialogFooter showCloseButton />
                </DialogContent>
              </Dialog>
              <Button
                size="lg"
                className="w-full"
                disabled={authBusy || !emailInput.trim() || !nonEUEEAConfirmed}
                onClick={onSendOtp}
              >
                {authBusy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Mail className="size-4" /> Send code
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Code sent to {emailInput}. Check your inbox (and spam folder).
              </p>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                value={otpInput}
                onChange={(e) => onOtpChange(e.target.value)}
                disabled={authBusy}
              />
              <Button
                size="lg"
                className="w-full"
                disabled={authBusy}
                onClick={onVerifyOtp}
              >
                {authBusy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Verifying...
                  </>
                ) : (
                  "Verify code"
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                disabled={authBusy}
                onClick={onUseDifferentEmail}
              >
                Use a different email
              </Button>
            </>
          )}
          {authError ? (
            <p role="alert" className="text-destructive text-center text-sm">
              {authError}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
