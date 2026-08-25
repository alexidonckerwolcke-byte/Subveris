# Subveris Browser Extension Cookie and Data Disclosure

Last updated: 2026-08-25

This disclosure describes the behavior of the Subveris browser extension as implemented in the current extension package. It is intended to support the Chrome Web Store privacy and data-use disclosures. The public Privacy Policy is available at https://subveris.com/privacy.

## What the Extension Does

Subveris tracks time spent on supported subscription-service websites so it can update usage information in the user's Subveris account. It can also detect subscription services, synchronize detected subscription information, scan authorized Gmail receipts, and inspect selected browser cookies for supported-service login signals.

Extension tracking is available only to authenticated users with an active Premium or Family Subveris plan.

## Cookie Access

The extension requests the browser `cookies` permission and can call the browser cookie API during its authenticated cookie-session scan. It examines cookie names and values for login/session indicators on services covered by the extension's host permissions. It uses matching domains to identify possible subscription services.

The extension does not intentionally save or transmit the complete cookie jar, cookie values, passwords, payment-card data, or browsing history. Cookie-derived service/domain detections can be stored locally in extension storage and synchronized as detected subscription information to the user's Subveris account.

Cookie scanning is a requested extension feature and is gated by authentication and an active Premium or Family plan. Users can disable or remove the extension through browser extension settings.

## Extension Storage

The extension stores data in browser extension storage, including:

- A short-lived Subveris extension session token.
- The authenticated Subveris user ID.
- The current plan status and session expiry information.
- Detected subscription services and domains.
- Usage-signal history used to identify zero-usage patterns.
- Locally queued detection data.
- Gmail OAuth access-token data only after the user separately authorizes Gmail scanning.

The extension does not store the user's Subveris password. The password is sent to Supabase Auth during direct popup login and is not written to extension storage.

## Data Sent to Subveris

When authenticated and plan-eligible, the extension can send the following to the Subveris API:

- The authenticated user session token.
- User ID associated with the extension session.
- Supported service domain.
- Detected service or plan name.
- Time spent on the supported service website.
- Usage and zero-usage signals.
- Detected subscription amount, currency, billing cycle, and renewal date when the extension finds those values on a supported page or receipt.
- Detected service information derived from an authorized cookie scan or Gmail receipt scan.

Requests are sent to the configured Subveris API over HTTPS in production. During local development, the extension may use the local Subveris API server.

## Gmail Access

Gmail scanning is optional and is not performed unless the user starts the Gmail authorization flow and grants Google OAuth access. When authorized, the extension uses the Gmail API to search for unread messages matching receipt, invoice, renewal, or confirmation terms and extracts subscription-related service names and amounts.

The extension does not intentionally send full Gmail messages to Subveris or store full message content as subscription data. Gmail OAuth access can be revoked from the user's Google Account permissions or by disconnecting Gmail in Subveris.

## Downloads Access

The extension requests download access to detect subscription-related CSV files. It can read matching downloaded CSV files and extract subscription names, amounts, and billing details. It does not upload unrelated downloads.

## Data Not Collected by This Extension

The current extension does not intentionally collect:

- Passwords.
- Payment-card numbers.
- Complete browser history.
- Keystrokes.
- The contents of unrelated web pages.
- Advertising or retargeting profiles.
- Google Analytics, Hotjar, Meta Pixel, or similar analytics identifiers.

## Third-Party Services

- Supabase Auth and the Subveris API authenticate users and synchronize extension data: https://supabase.com/privacy
- Google Gmail API is used only after optional Gmail OAuth authorization: https://policies.google.com/privacy
- Stripe payment processing is handled by the Subveris web service, not by the extension's cookie or browsing tracking code: https://stripe.com/privacy

## User Controls

Users can remove the extension, clear its extension storage through browser settings, revoke Gmail authorization, or log out of the extension. Data already synchronized to the Subveris account is managed under the Subveris Privacy Policy and account export/deletion controls.

Questions about extension data or cookie access can be sent to help.subveris@gmail.com.

This disclosure describes the current code. It must be updated if the extension adds analytics, marketing, advertising, additional cookie access, or new data processing.
