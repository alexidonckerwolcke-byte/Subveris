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

## 1) Demo video requirements

Create a short demo video (30-60 seconds) that clearly shows the OAuth consent flow and the actual app functionality.

### What the video must show

1. The user opens the Subveris app and goes to Settings.
2. The user clicks Connect Gmail.
3. The Google OAuth consent screen appears.
4. The user selects the Google account and approves the requested Gmail access.
5. The app redirects back to the app and shows Gmail connected.
6. The app begins scanning for subscription-related emails.
7. A matching receipt or renewal email is detected and shown as a pending subscription candidate.
8. The user reviews and approves the detected subscription.
9. The approved item appears in the subscription list / dashboard and is associated with the account.

### Suggested script

"I sign in to Subveris, open Settings, and click Connect Gmail. Google asks me to allow restricted read-only access to Gmail messages so Subveris can detect subscription receipts. I select my Google account and approve the request. Subveris redirects me back, shows Gmail connected, and begins scanning my inbox for billing or renewal emails. The app identifies a pending subscription from a receipt email, shows the candidate details, and I approve it. The subscription then appears in my Subveris dashboard where I can track billing, spending, and recommendations."

### Best practice for the upload

- Use a real user flow, not a mock screen.
- Make sure the consent screen is visible and readable.
- Keep the app in focus so reviewers can see the redirect back and the connected state.
- Show a real detected subscription after OAuth approval, not just the button.

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
