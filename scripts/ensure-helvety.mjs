/**
 * Ensures `file:.helvety/packages/*` paths exist before pnpm resolves dependencies.
 * Uses sibling `../helvety` when present (directory junction on Windows, symlink elsewhere),
 * otherwise shallow-clones into `.helvety/`. Does not modify the monorepo.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sibling = path.resolve(root, "..", "helvety");
const vendor = path.join(root, ".helvety");
const repo = "https://github.com/CasparRubin/helvety.git";

function hasWorkspacePackages(dir) {
  return (
    fs.existsSync(path.join(dir, "packages", "shared", "package.json")) &&
    fs.existsSync(path.join(dir, "packages", "ui", "package.json")) &&
    fs.existsSync(
      path.join(dir, "packages", "extension-chrome", "package.json")
    )
  );
}

function removeVendor() {
  if (!fs.existsSync(vendor)) {
    return;
  }
  const stat = fs.lstatSync(vendor);
  if (stat.isSymbolicLink() || stat.isJunction?.()) {
    fs.unlinkSync(vendor);
    return;
  }
  fs.rmSync(vendor, { recursive: true, force: true });
}

function linkVendorTo(source) {
  removeVendor();
  const type = process.platform === "win32" ? "junction" : "dir";
  fs.symlinkSync(source, vendor, type);
}

let source = sibling;

if (!hasWorkspacePackages(sibling)) {
  if (hasWorkspacePackages(vendor)) {
    const stat = fs.lstatSync(vendor);
    if (!stat.isSymbolicLink() && !stat.isJunction?.()) {
      console.log("ensure-helvety: using existing .helvety clone");
      process.exit(0);
    }
  }

  console.log(
    "ensure-helvety: cloning Helvety monorepo (shallow) into .helvety …"
  );
  removeVendor();
  execSync(`git clone --depth 1 ${repo} "${vendor}"`, {
    stdio: "inherit",
    cwd: root,
  });
  source = vendor;
} else {
  console.log("ensure-helvety: linking .helvety → ../helvety");
  linkVendorTo(sibling);
  process.exit(0);
}

if (!hasWorkspacePackages(source)) {
  console.error("ensure-helvety: Helvety packages/ layout not found");
  process.exit(1);
}

console.log("ensure-helvety: done");
