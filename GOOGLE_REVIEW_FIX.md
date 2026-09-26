# Google OAuth verification package

## Required scope alignment

The application requests exactly this scope in both OAuth URL generators:

`https://www.googleapis.com/auth/gmail.metadata`

The application does **not** request `https://www.googleapis.com/auth/gmail.readonly`.
In Google Cloud Console, open **Google Auth Platform → Data Access** and make the submitted scope list an exact match:

- Keep: `https://www.googleapis.com/auth/gmail.metadata`
- Remove: `https://www.googleapis.com/auth/gmail.readonly` if it is listed
- Save the configuration and submit the verification form again

The current feature uses only metadata: it lists recent messages, retrieves each candidate with `format=metadata`, and locally evaluates the message ID, selected headers, date, and Gmail-provided snippet. It does not request or process full message bodies. No write, modify, delete, send, or label-management scope is requested.

## Scope justification to paste into Google Cloud Console

Subveris requests `https://www.googleapis.com/auth/gmail.metadata` so a Premium or Family user can connect Gmail and discover likely subscription receipts, invoices, and renewal messages. After the user explicitly approves OAuth, the browser extension lists a small number of recent messages and retrieves each candidate in metadata-only mode. It processes the message ID, subject, sender, date, and Gmail-provided snippet to identify a likely service name and, when present in the metadata, billing signals such as an amount or renewal date. The result is shown to the user as a pending subscription candidate; it is not activated or synchronized as an approved subscription until the user reviews and approves it.

This scope is the narrowest Gmail scope that supports the feature because the scanner needs authorized access to Gmail message metadata, headers, dates, and snippets. The scanner does not need full message bodies or any write capability, so `gmail.readonly` would grant more access than necessary. Subveris does not request or use any broader Gmail scope.

Google user data is used only to provide the user-facing Gmail subscription discovery, subscription tracking, renewal, cost, and account-management features the user requests. Full message content is never requested by the metadata-only scanner. Google user data is not used for advertising, profiling, unrelated analytics, data brokerage, or generalized AI/ML training.

## AI/ML disclosure

The repository contains no runtime integration with OpenAI, Anthropic, Gemini, Vertex AI, OpenRouter, Hugging Face, or another third-party AI service. Subveris recommendations are generated locally from subscription and usage fields using deterministic application code. Gmail metadata is not sent to an AI/ML provider and is not used to train or improve a generalized model.

Before replying, confirm this remains true in the deployed environment and remove any unused AI provider credentials or integrations from the production project.

## Reviewer navigation and test flow

1. Open `https://subveris.com` and sign in with the test Subveris account supplied in the reply.
2. Open **Settings** and locate **Gmail / Connected Services**.
3. Select **Connect Gmail**.
4. On the Google consent screen, select **Show all services** and record the fully expanded Gmail metadata permission. The screen must not show Gmail read-only as a separately requested scope.
5. Approve access with the supplied Google test account.
6. Return to Subveris and confirm the connected state.
7. Open the extension or its scan status and start a scan. Use the supplied test mailbox containing a clearly labeled subscription receipt or renewal message.
8. Show the pending candidate with the detected service and any amount, currency, or renewal date available in the metadata/snippet.
9. Approve the candidate and show it in the Subveris subscription list/dashboard.
10. Open Gmail in the source account and show that no message was modified, deleted, sent, or labeled by Subveris.

## Test credentials to include in the reply

Replace the placeholders with an active, dedicated test account before sending:

- Subveris URL: `https://subveris.com`
- Subveris test username/email: `[TEST_SUBVERIS_EMAIL]`
- Subveris test password: `[TEST_SUBVERIS_PASSWORD]`
- Google test account: `[TEST_GOOGLE_ACCOUNT]`
- Google account access: `[Explain how the reviewer receives access without sharing a password]`
- Required plan: Premium or Family, active and not blocked by phone verification or payment requirements
- Test message: `[sender, subject, and approximate date of the receipt/renewal email]`

Never put passwords, OAuth client secrets, refresh tokens, or API keys in this repository or in a public video.

## 1) Replacement demo video: recording plan

Record a clear, continuous screen capture of the production Subveris app and installed extension. Aim for 2-4 minutes; do not compress or edit out OAuth screens. Use readable browser zoom and keep the app name/branding visible at the beginning and end. The video link must open for anyone with the link, without a sign-in or access-request wall.

### Before recording

- Deploy the metadata-only OAuth code and verify Google Cloud **Data Access** lists exactly `https://www.googleapis.com/auth/gmail.metadata` for this feature. Remove `gmail.readonly` if present.
- Use the production Subveris brand/app that was submitted for verification, not a mockup or a differently named staging app.
- Prepare an active Premium or Family Subveris test account and a dedicated Google test account. Avoid accounts blocked by payment, phone verification, or other reviewer-only checks.
- Put a genuine subscription receipt/renewal test message in the Google test inbox. Use a sender and subject/snippet that the current metadata scanner can identify; do not rely on body-only details because the app requests metadata, not message bodies.
- Revoke Subveris access from the test Google account before recording, or use a fresh test account, so the full first-consent flow is visible.
- Confirm Settings and the installed extension popup both show the current metadata-only wording and are signed into the same Subveris test account.
- Close unrelated tabs and notifications. Set the Google consent page language to **English** using the language control at the bottom-left before recording.

### Record these scenes in order

1. **Identify the submitted app.** Show the browser address bar at `https://subveris.com`, Subveris branding, and the signed-in test account (mask the address if desired, but keep enough context to identify the account).
2. **Start from Settings.** Open **Settings → Connected Services → Gmail**. Briefly show that Gmail is not connected, then click **Connect Gmail**.
3. **Capture the complete first OAuth consent flow.** Record account selection and every consent step without cuts. On the consent page, keep the English language setting visible, expand **Show all services** if offered, and pause on the complete permission list so the Gmail metadata permission is readable. Do not obscure the Google app name or permission description. Approve the request.
4. **Show the return and connection.** Keep recording as Google returns to the Subveris extension flow. Show the success state in the extension and the connected state in Subveris Settings.
5. **Show the extension-popup entry point too.** Open the Subveris browser extension popup and show its Gmail authorization status. If this popup offers a separate **Connect/Reauthorize Gmail** action, initiate it and record the full consent screen and approval for this entry point as well. Both entry points should visibly request the same metadata permission. If the popup only reports the already-connected state, show that state and explain in narration that its authorization action uses the same extension OAuth flow initiated from Settings; do not imply that a second grant happened when it did not.
6. **Demonstrate the requested scope in use.** Show the test Gmail inbox and identify the test receipt by sender, subject, and date. Return to the extension scan status and show the scan processing message metadata. Do not display unrelated email or personal content.
7. **Show the user-facing result.** Open Subveris detected subscriptions, show the candidate and the available metadata-derived details, then review and approve it. Show the approved subscription in the subscription list/dashboard.
8. **Show the source account remains unchanged.** Return to the test Gmail inbox and show that the source message remains present and unchanged. State that this integration does not write, delete, send, or label email.
9. **Close with scope and app identity.** Return to Subveris and leave the branded app visible while stating the exact requested scope and that no other Gmail scopes are requested.

### Suggested narration

"This is Subveris, the application submitted for verification. I am signed in with a Premium test account and opening Settings, then Connected Services. I select Connect Gmail. This is the complete Google OAuth consent flow for Subveris. The consent page is in English, and the expanded permission list shows Gmail metadata access. The app requests `https://www.googleapis.com/auth/gmail.metadata` only. I approve it and return to Subveris, where Gmail is connected. The extension popup is another entry point to the same Gmail authorization flow. Now I’ll show the test receipt in Gmail and the scan result. Subveris uses the message metadata, including its headers, date, and available snippet, to create a pending subscription candidate. I review and approve it, and it appears in my Subveris subscription list. The original Gmail message remains unchanged. Subveris does not request full message bodies or Gmail write permissions. This video shows the complete OAuth grant and all user-facing functionality that uses the requested Gmail metadata scope. There are no additional Gmail scopes or Gmail data-access features to demonstrate."

### Final video quality/access check

- Watch the exported video once before sending. Confirm the full consent flow is legible, uninterrupted, in English, and shows the same submitted app and requested permission.
- Confirm the Gmail API scope shown/configured is exactly `gmail.metadata`; the OAuth scope URI may be visible in the URL only briefly, so also show the complete permission description on the consent screen.
- Confirm each actual OAuth initiation method is represented and do not claim a flow or result that was not recorded.
- Upload to YouTube as **Unlisted** or Google Drive with **Anyone with the link can view**. Open the link in a signed-out/private browser window to verify reviewer access.
- Replace `[INSERT VIDEO LINK]` in the reply with the tested link.

---

## 2) Trust and Safety email response draft

Subject: OAuth consent flow test instructions for Subveris

Hello,

To test the OAuth consent flow for Subveris, please sign in to the app with a test account and complete the following steps:

1. Open the app and go to Settings.
2. Select Connected Services or Gmail settings.
3. Click Connect Gmail.
4. A Google sign-in and consent screen will appear requesting `https://www.googleapis.com/auth/gmail.metadata`, the narrow Gmail metadata access needed to detect subscription-related receipts and renewal emails.
5. Select an account and approve the consent request.
6. The app redirects back to Subveris and displays a Gmail connected status.
7. After authorization, the app scans the inbox for receipt and renewal emails and detects a subscription candidate.
8. The user reviews and approves the detected subscription.
9. The approved item appears in the user’s subscription list and dashboard.

This exact scope is used only to provide the Gmail subscription-detection feature and improve the accuracy of that functionality. It is the narrowest scope that supports inspecting the message metadata needed for this feature. Full message bodies are not requested. It is not used for unrelated purposes, advertising, profiling, or generalized AI/ML training, and Gmail data is not sent to an AI provider.

Please let us know if you need a test account or a specific scenario to validate the flow.

Thank you,
Subveris

---

## 3) Short answer for the app functionality issue

The app functionality requirement is met when the video demonstrates the actual OAuth consent flow and then shows the app receiving and processing Gmail data to identify a subscription candidate. The review team should be able to see the consent screen, the successful return to the app, and a real subscription detection result after approval.
