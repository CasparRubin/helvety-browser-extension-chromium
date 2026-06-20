import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const componentPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "EntityRichTextEditor.tsx"
);

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("EntityRichTextEditor", () => {
  it("does not key TipTap on serialized value (focus regression)", () => {
    const source = readFileSync(componentPath, "utf8");
    expect(source).toContain("key={sessionKey}");
    expect(source).toContain("sessionKey: string");
    expect(source).toContain("E2eeRichTextItemEditorShell");
    expect(source).not.toMatch(/key=\{value/);
    expect(source).not.toContain('key={value ?? "__empty__"}');
  });

  it("requires sessionKey from EntityFormView for each rich-text field", () => {
    const formView = readFileSync(
      join(repoRoot, "src/popup/views/EntityFormView.tsx"),
      "utf8"
    );
    const matches = formView.match(/<EntityRichTextEditor/g) ?? [];
    expect(matches.length).toBe(3);
    expect(formView.match(/sessionKey=\{formSessionKey\}/g)?.length).toBe(3);
  });

  it("web E2eeRichTextItemEditorShell keys TipTap by editorSessionKey (parity)", () => {
    const monorepoRoot = join(repoRoot, ".helvety");
    const shellPath = join(
      monorepoRoot,
      "packages/ui/src/e2ee-item-editor-shell.tsx"
    );
    const source = readFileSync(shellPath, "utf8");
    expect(source).toContain("editorSessionKey: string");
    expect(source).toContain("key={editorSessionKey}");
    expect(source).not.toMatch(/key=\{value/);
  });

  it("shared TiptapEditor uses mount-only content (parity)", () => {
    const monorepoRoot = join(repoRoot, ".helvety");
    const editorPath = join(monorepoRoot, "packages/ui/src/tiptap-editor.tsx");
    const source = readFileSync(editorPath, "utf8");
    expect(source).toContain("initialContentRef");
    expect(source).toContain("shouldRerenderOnTransaction: false");
    expect(source).toContain("const extensions = useMemo");
  });

  it("EntityRichTextEditor documents mount-only content and sessionKey remount", () => {
    const source = readFileSync(componentPath, "utf8");
    expect(source).toContain("mount-only");
    expect(source).toContain("editorSessionKey");
    expect(source).toContain("initialContentRef");
  });
});
