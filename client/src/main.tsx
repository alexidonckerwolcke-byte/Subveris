import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

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
