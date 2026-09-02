# Google review fix for OAuth and app functionality

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

"I sign in to Subveris, open Settings, and click Connect Gmail. Google asks me to allow access to view Gmail messages and metadata needed to detect subscription receipts. I select my Google account and approve the request. Subveris redirects me back, shows Gmail connected, and begins scanning my inbox for billing or renewal emails. The app identifies a pending subscription from a receipt email, shows the candidate details, and I approve it. The subscription then appears in my Subveris dashboard where I can track billing, spending, and recommendations."

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
4. A Google sign-in and consent screen will appear requesting access to Gmail data needed to detect subscription-related receipts and renewal emails.
5. Select an account and approve the consent request.
6. The app redirects back to Subveris and displays a Gmail connected status.
7. After authorization, the app scans the inbox for receipt and renewal emails and detects a subscription candidate.
8. The user reviews and approves the detected subscription.
9. The approved item appears in the user’s subscription list and dashboard.

This access is used only to provide the Gmail subscription-detection feature and improve the accuracy of that functionality. It is not used for unrelated purposes, advertising, or profiling.

Please let us know if you need a test account or a specific scenario to validate the flow.

Thank you,
Subveris

---

## 3) Short answer for the app functionality issue

The app functionality requirement is met when the video demonstrates the actual OAuth consent flow and then shows the app receiving and processing Gmail data to identify a subscription candidate. The review team should be able to see the consent screen, the successful return to the app, and a real subscription detection result after approval.
