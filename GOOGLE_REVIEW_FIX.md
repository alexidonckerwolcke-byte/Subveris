# Google OAuth verification package

## Required scope alignment

The application requests exactly this scope in both OAuth URL generators:

`https://www.googleapis.com/auth/gmail.readonly`

The application does **not** request `https://www.googleapis.com/auth/gmail.metadata`.
In Google Cloud Console, open **Google Auth Platform → Data Access** and make the submitted scope list an exact match:

- Keep: `https://www.googleapis.com/auth/gmail.readonly`
- Remove: `https://www.googleapis.com/auth/gmail.metadata` if it is listed
- Save the configuration and submit the verification form again

The feature lists recent messages, retrieves each candidate with `format=full`, and locally scans headers plus decoded text/plain and text/html body parts for subscription details. Attachments are skipped. Raw message bodies are processed transiently in the extension and are not stored or sent to Subveris; extracted candidate fields are synced for user review. No Gmail write, modify, delete, send, or label-management scope is requested. `gmail.readonly` is a restricted scope and must complete Google's applicable OAuth verification; confirm whether the app's handling of derived candidate data requires a security assessment.

## Scope justification to paste into Google Cloud Console

Subveris requests `https://www.googleapis.com/auth/gmail.readonly` so a Premium or Family user can connect Gmail and discover likely subscription receipts, invoices, and renewal messages. After explicit user consent, the browser extension lists a small number of recent messages and retrieves candidate messages in full format. It processes headers and text message parts locally to identify the service, amount, and renewal date. Raw message bodies are not stored or sent to Subveris; extracted candidate details are synced to the user's account and remain pending until the user reviews and approves them.

`gmail.readonly` is required because Gmail's metadata scope cannot return message bodies. The app uses it only for user-authorized subscription discovery and does not modify, send, delete, or label messages. No broader Gmail scope is requested.

Google user data is used only to provide the user-facing Gmail subscription discovery and related subscription features. Raw message bodies are not retained or sent to an AI/ML provider. Google user data is not used for advertising, profiling, unrelated analytics, data brokerage, or generalized AI/ML training.

## AI/ML disclosure

The repository contains no runtime integration with OpenAI, Anthropic, Gemini, Vertex AI, OpenRouter, Hugging Face, or another third-party AI service. Subveris recommendations are generated locally from subscription and usage fields using deterministic application code. Gmail messages are not sent to an AI/ML provider and are not used to train or improve a generalized model.

Before replying, confirm this remains true in the deployed environment and remove any unused AI provider credentials or integrations from the production project.

## Reviewer navigation and test flow

1. Open `https://subveris.com` and sign in with the test Subveris account supplied in the reply.
2. Open **Settings** and locate **Gmail / Connected Services**.
3. Select **Connect Gmail**.
4. On the Google consent screen, select **Show all services** and record the fully expanded Gmail read-only permission.
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

- Deploy the full-message OAuth code and verify Google Cloud **Data Access** lists exactly `https://www.googleapis.com/auth/gmail.readonly` for this feature. Complete Google's restricted-scope verification requirements.
- Use the production Subveris brand/app that was submitted for verification, not a mockup or a differently named staging app.
- Prepare an active Premium or Family Subveris test account and a dedicated Google test account. Avoid accounts blocked by payment, phone verification, or other reviewer-only checks.
- Put a genuine subscription receipt/renewal test message in the Google test inbox, including billing details in its text body to validate local body scanning.
- Revoke Subveris access from the test Google account before recording, or use a fresh test account, so the full first-consent flow is visible.
- Confirm Settings and the installed extension popup both disclose local scanning of recent Gmail message text and are signed into the same Subveris test account.
- Close unrelated tabs and notifications. Set the Google consent page language to **English** using the language control at the bottom-left before recording.

### Record these scenes in order

1. **Identify the submitted app.** Show the browser address bar at `https://subveris.com`, Subveris branding, and the signed-in test account (mask the address if desired, but keep enough context to identify the account).
2. **Start from Settings.** Open **Settings → Connected Services → Gmail**. Briefly show that Gmail is not connected, then click **Connect Gmail**.
3. **Capture the complete first OAuth consent flow.** Record account selection and every consent step without cuts. On the consent page, keep the English language setting visible, expand **Show all services** if offered, and pause on the complete permission list so the Gmail read-only permission is readable. Do not obscure the Google app name or permission description. Approve the request.
4. **Show the return and connection.** Keep recording as Google returns to the Subveris extension flow. Show the success state in the extension and the connected state in Subveris Settings.
5. **Show the extension-popup entry point too.** Open the Subveris browser extension popup and show its Gmail authorization status. If this popup offers a separate **Connect/Reauthorize Gmail** action, initiate it and record the full consent screen and approval for this entry point as well. Both entry points should visibly request the same read-only permission. If the popup only reports the already-connected state, show that state and explain in narration that its authorization action uses the same extension OAuth flow initiated from Settings; do not imply that a second grant happened when it did not.
6. **Demonstrate the requested scope in use.** Show the test Gmail inbox and identify the test receipt by sender, subject, and date. Return to the extension scan status and show local scanning of the message text. Do not display unrelated email or personal content.
7. **Show the user-facing result.** Open Subveris detected subscriptions, show the candidate and the extracted service and billing details, then review and approve it. Show the approved subscription in the subscription list/dashboard.
8. **Show the source account remains unchanged.** Return to the test Gmail inbox and show that the source message remains present and unchanged. State that this integration does not write, delete, send, or label email.
9. **Close with scope and app identity.** Return to Subveris and leave the branded app visible while stating the exact requested scope and that no other Gmail scopes are requested.

### Suggested narration

"This is Subveris, the application submitted for verification. I am signed in with a Premium test account and opening Settings, then Connected Services. I select Connect Gmail. This is the complete Google OAuth consent flow for Subveris. The consent page is in English, and the expanded permission list shows Gmail read-only access. The app requests `https://www.googleapis.com/auth/gmail.readonly` only. I approve it and return to Subveris, where Gmail is connected. The extension popup is another entry point to the same Gmail authorization flow. Now I’ll show the test receipt in Gmail and the scan result. Subveris scans recent message text locally to create a pending subscription candidate. Only extracted candidate details are synced for review. I review and approve the candidate, and it appears in my Subveris subscription list. The original Gmail message remains unchanged. Subveris does not request Gmail write permissions. This video shows the complete OAuth grant and all user-facing functionality that uses the requested Gmail read-only scope. There are no additional Gmail scopes."

### Final video quality/access check

- Watch the exported video once before sending. Confirm the full consent flow is legible, uninterrupted, in English, and shows the same submitted app and requested permission.
- Confirm the Gmail API scope shown/configured is exactly `gmail.readonly`; the OAuth scope URI may be visible in the URL only briefly, so also show the complete permission description on the consent screen.
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
4. A Google sign-in and consent screen will appear requesting `https://www.googleapis.com/auth/gmail.readonly`, the restricted read-only access needed to inspect receipt and renewal message text.
5. Select an account and approve the consent request.
6. The app redirects back to Subveris and displays a Gmail connected status.
7. After authorization, the app scans the inbox for receipt and renewal emails and detects a subscription candidate.
8. The user reviews and approves the detected subscription.
9. The approved item appears in the user’s subscription list and dashboard.

This scope is used only for the Gmail subscription-detection feature. The extension scans recent message text locally; raw message bodies are not stored or sent to Subveris, and only extracted candidate details are synced for user review. The integration does not modify, send, delete, or label email. Gmail data is not used for advertising, profiling, unrelated analytics, or generalized AI/ML training, and messages are not sent to an AI provider.

Please let us know if you need a test account or a specific scenario to validate the flow.

Thank you,
Subveris

---

## 3) Short answer for the app functionality issue

The app functionality requirement is met when the video demonstrates the actual OAuth consent flow and then shows the app receiving and processing Gmail data to identify a subscription candidate. The review team should be able to see the consent screen, the successful return to the app, and a real subscription detection result after approval.
