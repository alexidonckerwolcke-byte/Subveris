# Subveris Subscription Insights: Firefox Source Submission

This directory contains the readable source code for the Subveris Subscription Insights browser extension. The source is not bundled, transpiled, minified, or obfuscated. The package build only copies these source files and creates ZIP archives. For Firefox, it creates a second manifest with Firefox-specific settings.

## Build environment

The build was developed and tested on macOS with Apple Silicon. It also runs on Linux with Node.js and the `zip` command available. The Mozilla reviewer environment may differ; the build uses only standard Node.js modules and the system `zip` utility.

Requirements:

- Node.js 20 or newer. Install from https://nodejs.org/ or with a version manager such as `nvm`.
- npm 10 or newer, included with Node.js 20.
- `zip`, available by default on macOS and Ubuntu. On Ubuntu install it with `sudo apt-get install zip`.
- Git is optional for the build itself.

No npm package dependencies are required to build the extension archives. The repository root includes `package-lock.json` for the web application, but the extension packaging script uses only Node.js built-ins and `zip`.

## Reproduce the packages

From the repository root, run:

```bash
npm run build:extension
```

This runs:

```bash
node scripts/build-extension-packages.mjs
```

The script:

1. Copies the readable files from `extension/` into temporary package directories.
2. Creates `subveris-extension.zip` using the Chrome-compatible `extension/manifest.json`.
3. Adds Firefox `background.scripts`, `browser_specific_settings.gecko.id`, and `data_collection_permissions` to the copied Firefox manifest.
4. Creates `subveris-extension-firefox.zip` for Mozilla Add-ons.
5. Copies the Chrome archive to `subveris-extension-auth.zip` and `client/public/subveris-extension.zip`, and copies the Firefox archive to `client/public/subveris-extension-firefox.zip` for the separate Firefox download.

The Firefox archive to upload to addons.mozilla.org is:

```text
subveris-extension-firefox.zip
```

The script creates the temporary `build-extension-packages/` directory. It is not part of the extension package and can be deleted after the build.

## Source and third-party code

The extension source files are plain JavaScript, HTML, JSON, and CommonJS utility code. No source files are generated from a template or bundled from multiple source files. The `zip` utility is used only to archive files. Third-party libraries are not bundled into the extension package.

## Validation

Before submission, validate the source scripts and Firefox manifest:

```bash
node --check extension/background.js
node --check extension/content.js
node --check extension/popup.js
node -e "const fs=require('fs'); const m=JSON.parse(fs.readFileSync('extension/manifest.json')); if (!m.name || !m.version) process.exit(1)"
unzip -p subveris-extension-firefox.zip manifest.json
```

The Firefox package uses the same JavaScript source as the Chrome package. Only its copied manifest differs for Firefox signing and data-collection declarations.
