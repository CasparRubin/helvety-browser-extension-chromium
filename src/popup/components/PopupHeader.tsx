import { PopupHeader as PopupHeaderBase } from "@helvety/extension-chrome/popup-header";

import { EXTENSION_DISPLAY_NAME } from "../about-meta";

import { EXTENSION_ICON_URL } from "./ExtensionMark";

/** Shared side panel chrome: extension icon, product name, optional version. */
export function PopupHeader({ version }: { version?: string }) {
  return (
    <PopupHeaderBase
      displayName={EXTENSION_DISPLAY_NAME}
      version={version}
      iconSrc={EXTENSION_ICON_URL}
    />
  );
}
