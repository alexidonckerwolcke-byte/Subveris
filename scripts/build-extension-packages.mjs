import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionRoot = path.join(projectRoot, "extension");
const outputRoot = path.join(projectRoot, "build-extension-packages");
const sourceManifest = JSON.parse(fs.readFileSync(path.join(extensionRoot, "manifest.json"), "utf8"));

function buildPackage(name, transformManifest) {
  const packageRoot = path.join(outputRoot, name);
  fs.rmSync(packageRoot, { recursive: true, force: true });
  fs.mkdirSync(packageRoot, { recursive: true });
  fs.cpSync(extensionRoot, packageRoot, { recursive: true });
  fs.writeFileSync(
    path.join(packageRoot, "manifest.json"),
    `${JSON.stringify(transformManifest(structuredClone(sourceManifest)), null, 2)}\n`,
  );

  const packageManifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "manifest.json"), "utf8"));
  const referencedFiles = new Set([
    packageManifest.action?.default_popup,
    packageManifest.background?.service_worker,
    ...(packageManifest.background?.scripts || []),
    ...(packageManifest.content_scripts || []).flatMap((script) => script.js || []),
    ...(packageManifest.web_accessible_resources || []).flatMap((resource) => resource.resources || []),
  ].filter(Boolean));
  for (const referencedFile of referencedFiles) {
    if (!fs.existsSync(path.join(packageRoot, referencedFile))) {
      throw new Error(`Extension package ${name} is missing manifest file: ${referencedFile}`);
    }
  }

  const archivePath = path.join(projectRoot, `${name}.zip`);
  fs.rmSync(archivePath, { force: true });
  const result = spawnSync("zip", ["-qr", archivePath, ".", "-x", "*.DS_Store"], {
    cwd: packageRoot,
    stdio: "inherit",
  });
  if (result.status !== 0) throw new Error(`Failed to build ${name}.zip`);
  return archivePath;
}

fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(outputRoot, { recursive: true });

buildPackage("subveris-extension", (manifest) => manifest);
buildPackage("subveris-extension-firefox", (manifest) => ({
  ...manifest,
  background: {
    ...manifest.background,
    scripts: ["background.js"],
  },
  browser_specific_settings: {
    gecko: {
      id: "extension@subveris.com",
      strict_min_version: "109.0",
      data_collection_permissions: {
        required: ["authenticationInfo", "personallyIdentifyingInfo", "websiteActivity"],
        optional: ["personalCommunications"],
      },
    },
  },
}));

const chromeArchive = path.join(projectRoot, "subveris-extension.zip");
const firefoxArchive = path.join(projectRoot, "subveris-extension-firefox.zip");
fs.copyFileSync(chromeArchive, path.join(projectRoot, "subveris-extension-auth.zip"));
fs.mkdirSync(path.join(projectRoot, "client", "public"), { recursive: true });
fs.copyFileSync(chromeArchive, path.join(projectRoot, "client/public/subveris-extension.zip"));
fs.copyFileSync(firefoxArchive, path.join(projectRoot, "client/public/subveris-extension-firefox.zip"));
console.log("Built Chrome and Firefox extension packages.");