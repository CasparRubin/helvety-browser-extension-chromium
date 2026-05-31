import {
  readExtensionId,
  readExtensionVersion,
} from "@helvety/extension-chrome/extension-version";
import { HelvetyMark } from "@helvety/extension-chrome/helvety-mark";
import { popupChoiceRowClass } from "@helvety/extension-chrome/popup-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@helvety/ui/card";
import { Label } from "@helvety/ui/label";
import { RadioGroup, RadioGroupItem } from "@helvety/ui/radio-group";
import { Separator } from "@helvety/ui/separator";
import {
  BadgeInfo,
  ExternalLink,
  GitBranch,
  Lock,
  Moon,
  Package,
  Palette,
  Sun,
} from "lucide-react";

import { HELVETY_AUTH_ORIGIN } from "../../lib/config";
import {
  DEVELOPER_NAME,
  DEVELOPER_URL,
  EXTENSION_DISPLAY_NAME,
  SECURITY_DOC_URL,
  SOURCE_REPO_URL,
  WEBAUTHN_DOC_URL,
} from "../about-meta";

import type { ParamsPreflight } from "./UnlockView";
import type { ThemePreference } from "@helvety/extension-chrome/theme-preference";

/** About, theme, security doc links, and extension diagnostics (no secrets in DOM). */
export function AboutTab({
  themePreference,
  onSaveTheme,
  paramsPreflight,
}: {
  themePreference: ThemePreference;
  onSaveTheme: (next: ThemePreference) => void;
  paramsPreflight: ParamsPreflight | null;
}): React.JSX.Element {
  const extensionVersion = readExtensionVersion();
  const extensionId = readExtensionId();

  const preflightLabel =
    paramsPreflight?.status === "loading"
      ? "checking…"
      : paramsPreflight?.status === "ready"
        ? "ready"
        : paramsPreflight?.status === "not_setup"
          ? "not set up"
          : paramsPreflight?.status === "error"
            ? paramsPreflight.message
            : "—";

  return (
    <div className="popup-tab-scroll min-h-0 flex-1 [scrollbar-gutter:stable] overflow-x-hidden overflow-y-auto pr-1">
      <div className="pr-2">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="flex flex-col gap-1 p-3 pb-2">
            <CardTitle className="text-sm">{EXTENSION_DISPLAY_NAME}</CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              End-to-end encrypted tasks, contacts, notes, links, and folders.
              Create, view, edit, and delete from this side panel after passkey
              unlock; decryption happens only in your browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground flex flex-col gap-3 p-3 pt-0 text-xs leading-relaxed">
            <div className="flex flex-col gap-1.5">
              <p className="text-foreground flex items-center gap-2 font-medium">
                <Palette
                  className="text-muted-foreground h-4 w-4 shrink-0"
                  aria-hidden
                />
                Appearance
              </p>
              <RadioGroup
                className="flex flex-col gap-1.5"
                aria-label="Popup color theme"
                value={themePreference}
                onValueChange={(v) => {
                  if (v === "light" || v === "dark") {
                    onSaveTheme(v);
                  }
                }}
              >
                <div
                  className={popupChoiceRowClass(themePreference === "light")}
                >
                  <RadioGroupItem
                    value="light"
                    id="helvety-theme-light"
                    className="mt-0.5 shrink-0"
                  />
                  <Sun
                    className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden
                  />
                  <Label
                    htmlFor="helvety-theme-light"
                    className="cursor-pointer text-sm font-medium"
                  >
                    Light
                  </Label>
                </div>
                <div
                  className={popupChoiceRowClass(themePreference === "dark")}
                >
                  <RadioGroupItem
                    value="dark"
                    id="helvety-theme-dark"
                    className="mt-0.5 shrink-0"
                  />
                  <Moon
                    className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden
                  />
                  <Label
                    htmlFor="helvety-theme-dark"
                    className="cursor-pointer text-sm font-medium"
                  >
                    Dark
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator className="bg-foreground/10" />

            <p className="text-foreground flex items-center gap-2 font-medium">
              <BadgeInfo
                className="text-muted-foreground h-4 w-4 shrink-0"
                aria-hidden
              />
              How it works
            </p>
            <ul className="flex list-disc flex-col gap-1 pl-4">
              <li>Sign in with email OTP via Supabase Auth.</li>
              <li>
                Unlock with a passkey (PRF) to derive the master key in this
                extension only.
              </li>
              <li>
                Browse and edit encrypted records here, or open the web app for
                advanced workflows.
              </li>
            </ul>

            <Separator className="bg-foreground/10" />

            <p className="text-foreground flex items-center gap-2 font-medium">
              <Lock
                className="text-muted-foreground h-4 w-4 shrink-0"
                aria-hidden
              />
              Security
            </p>
            <p>
              <a
                className="text-primary font-medium underline underline-offset-2"
                href={SECURITY_DOC_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                E2EE overview
                <ExternalLink
                  className="ml-1 inline h-3 w-3 opacity-70"
                  aria-hidden
                />
              </a>
            </p>
            <p>
              <a
                className="text-primary font-medium underline underline-offset-2"
                href={WEBAUTHN_DOC_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                WebAuthn extension setup
                <ExternalLink
                  className="ml-1 inline h-3 w-3 opacity-70"
                  aria-hidden
                />
              </a>
            </p>

            <p>
              <a
                className="text-primary inline-flex items-center gap-1.5 font-medium underline underline-offset-2"
                href={SOURCE_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <GitBranch className="h-4 w-4 shrink-0" aria-hidden />
                Source on GitHub
                <ExternalLink
                  className="h-3 w-3 shrink-0 opacity-70"
                  aria-hidden
                />
              </a>
            </p>

            <Separator className="bg-foreground/10" />

            <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              <Package
                className="text-muted-foreground h-3.5 w-3.5 shrink-0"
                aria-hidden
              />
              <span className="text-foreground font-medium">Version:</span>{" "}
              {extensionVersion}
            </p>

            {extensionId ? (
              <p className="text-muted-foreground font-mono text-[10px] leading-relaxed break-all">
                Extension ID: {extensionId}
              </p>
            ) : null}

            <p className="text-muted-foreground font-mono text-[10px] leading-relaxed break-all">
              Auth origin: {HELVETY_AUTH_ORIGIN}
            </p>
            <p className="text-[11px]">
              Encryption preflight:{" "}
              <span className="text-foreground">{preflightLabel}</span>
            </p>

            {import.meta.env.DEV ? (
              <p className="text-muted-foreground text-[11px]">
                Development build: unlock diagnostics log to the side panel
                DevTools console as{" "}
                <code className="bg-muted rounded-none px-0.5 text-[10px]">
                  [helvety-unlock]
                </code>
                .
              </p>
            ) : null}

            <Separator className="bg-foreground/10" />

            <section
              className="flex flex-col gap-2"
              aria-labelledby="helvety-about-developer"
            >
              <p
                id="helvety-about-developer"
                className="text-foreground text-xs font-medium"
              >
                Developer
              </p>
              <a
                className="hover:bg-muted/60 -mx-1 flex items-center gap-2.5 rounded-sm p-1.5 transition-colors"
                href={DEVELOPER_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <HelvetyMark className="h-7 w-7" />
                <span className="flex min-w-0 flex-1 flex-col gap-0">
                  <span className="text-foreground text-sm font-medium">
                    {DEVELOPER_NAME}
                  </span>
                  <span className="text-muted-foreground text-[11px] leading-tight">
                    helvety.com
                  </span>
                </span>
                <ExternalLink
                  className="text-muted-foreground h-3.5 w-3.5 shrink-0 opacity-70"
                  aria-hidden
                />
              </a>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
