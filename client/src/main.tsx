import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const preloadRecoveryKey = "subveris-preload-recovery";
let hasRetriedPreload = false;
const recoveryStorage = (() => {
	try {
		return window.sessionStorage;
	} catch {
		return null;
	}
})();

window.addEventListener("vite:preloadError", (event) => {
	event.preventDefault();

	const lastRecovery = Number(recoveryStorage?.getItem(preloadRecoveryKey) || 0);
	if (hasRetriedPreload || Date.now() - lastRecovery < 30_000) {
		recoveryStorage?.removeItem(preloadRecoveryKey);
		return;
	}

	hasRetriedPreload = true;
	recoveryStorage?.setItem(preloadRecoveryKey, String(Date.now()));
	const url = new URL(window.location.href);
	url.searchParams.set("_asset_reload", String(Date.now()));
	window.location.replace(url.toString());
});

if (new URL(window.location.href).searchParams.has("_asset_reload")) {
	window.setTimeout(() => recoveryStorage?.removeItem(preloadRecoveryKey), 30_000);
}

// Runtime diagnostics: log React version and dispatcher presence to browser console
try {
	// some React internals are intentionally private — use defensively
	// @ts-ignore
	const dispatcher = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentDispatcher;
	// Expose for easier inspection in browser console
	// @ts-ignore
	(window as any).__REACT_DEBUG__ = {
		version: React.version,
		hasDispatcher: !!dispatcher,
		dispatcher,
	};
	// eslint-disable-next-line no-console
	console.log("[react-debug] version:", React.version, "hasDispatcher:", !!dispatcher);
} catch (e) {
	// eslint-disable-next-line no-console
	console.warn("[react-debug] diagnostics failed", e);
}

createRoot(document.getElementById("root")!).render(<App />);
