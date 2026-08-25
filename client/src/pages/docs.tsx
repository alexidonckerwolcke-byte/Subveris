 
import React, { useRef, useEffect, useMemo, useCallback } from "react";

const menuItems = [
  { label: "Getting Started", id: "getting-started" },
  { label: "User Guide", id: "user-guide" },
  { label: "Browser Extension", id: "browser-extension" },
  { label: "How Subscription Optimization Works", id: "how-subscription-optimization-works" },
  { label: "AI & Accuracy", id: "ai-accuracy" },
  { label: "API Documentation", id: "api-documentation" },
  { label: "Managing Your Account", id: "managing-your-account" },
  { label: "Troubleshooting", id: "troubleshooting" },
  { label: "FAQ", id: "faq" },
  { label: "Privacy & Data", id: "privacy-data" },
  { label: "Policies", id: "policies" },
];

const DocsPage: React.FC = () => {
  // Create refs for each section using useMemo
  const sectionRefs = useMemo(() => {
    const refs: Record<string, React.RefObject<HTMLDivElement>> = {};
    menuItems.forEach((item) => {
      refs[item.id] = React.createRef<HTMLDivElement>();
    });
    return refs;
  }, []);

  const handleMenuClick = useCallback((id: string) => {
    const ref = sectionRefs[id];
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [sectionRefs]);

  // Handle hash-based navigation on page load
  useEffect(() => {
    const hash = window.location.hash.slice(1); // Remove '#' from hash
    if (hash) {
      // Small delay to ensure DOM is ready
      setTimeout(() => handleMenuClick(hash), 100);
    }
  }, [handleMenuClick]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground md:flex-row">
      <aside className="flex w-full shrink-0 flex-col gap-2 border-b border-sidebar-border bg-gray-100 px-4 py-4 dark:bg-sidebar md:sticky md:top-0 md:min-h-screen md:w-64 md:border-b-0 md:border-r md:py-8">
        <h2 className="text-lg font-bold mb-4 text-foreground">Docs Menu</h2>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleMenuClick(item.id)}
            className="text-left py-2 px-3 rounded hover:bg-gray-200 dark:hover:bg-muted/60 focus:bg-gray-300 dark:focus:bg-muted/70 focus:outline-none text-sm font-medium text-foreground"
          >
            {item.label}
          </button>
        ))}
      </aside>
      <main className="prose min-w-0 max-w-none flex-1 px-4 py-8 dark:prose-invert sm:px-8 lg:prose-lg">
        <h1>Subveris Documentation</h1>
        <p>Welcome to the official documentation for Subveris, your all-in-one subscription optimization and analytics platform. All information is available on this page.</p>
        <hr />
      <div ref={sectionRefs["getting-started"]} id="getting-started">
      <section>
      <h2>Getting Started</h2>
      <p>Subveris is a modern SaaS platform that helps you optimize, analyze, and control your recurring subscriptions. Whether you have streaming services, SaaS tools, or memberships, Subveris gives you clarity and control.</p>
      <h3>What Subveris Does</h3>
      <ul>
        <li>Brings all your subscriptions into one optimization workspace</li>
        <li>Analyzes usage and cost per use to help you save money</li>
        <li>Flags inactive subscriptions and suggests savings actions</li>
        <li>Integrates with Stripe for secure premium payments</li>
        <li>Provides actionable insights to optimize your spending</li>
      </ul>
      <h3>What Subveris Does NOT Do</h3>
      <ul>
        <li>Does <b>not</b> access your bank account directly</li>
        <li>Does <b>not</b> cancel subscriptions automatically (you must confirm cancellations)</li>
        <li>Does <b>not</b> process payments for your subscriptions (only for premium features)</li>
        <li>Is <b>not</b> a budgeting or investment tool</li>
      </ul>
      <h3>Who Is It For?</h3>
      <ul>
        <li>Individuals with multiple recurring payments</li>
        <li>Families or teams sharing subscriptions</li>
        <li>Anyone wanting to reduce wasted spend on unused services</li>
      </ul>
      <h3>Quick Start Guide</h3>
      <ol>
        <li>Sign up for a free account</li>
        <li>Add your subscriptions manually or via supported integrations</li>
        <li>Explore your dashboard for analytics and recommendations</li>
        <li>Upgrade to premium for advanced features (optional)</li>
      </ol>
    </section>
    </div>
    <hr />
    <div ref={sectionRefs["user-guide"]} id="user-guide">
    <section>
      <h2>User Guide</h2>
      <h3>Dashboard Overview</h3>
      <p>The dashboard is your command center for subscription optimization. Here's what you'll find:</p>
      <ul>
        <li><b>Subscriptions Tab:</b> View all your subscriptions with cost, usage, and savings potential</li>
        <li><b>Insights Tab:</b> Deep dive into analytics and AI recommendations to cut waste</li>
        <li><b>Calendar Tab:</b> Track renewals and schedule savings actions before bills hit</li>
        <li><b>Family Sharing Tab:</b> Coordinate shared services and reduce collective spend (Premium feature)</li>
      </ul>
      <h3>Adding Subscriptions</h3>
      <ol>
        <li>Click "Add Subscription" on the subscriptions page</li>
        <li>Enter subscription details: name, cost, frequency, renewal date, and category</li>
        <li>Save the subscription</li>
        <li>Your dashboard will immediately update with the new subscription data</li>
      </ol>
      <h3>Editing & Removing Subscriptions</h3>
      <ul>
        <li>Click on any subscription to edit its details</li>
        <li>Use the delete option to remove subscriptions (you can always add them back)</li>
        <li>Set subscriptions to "inactive" if you want to pause optimization temporarily</li>
      </ul>
      <h3>Optimizing Usage</h3>
      <ul>
        <li>Log usage manually by clicking "Log Usage" on a subscription</li>
        <li>Subveris uses your usage data to calculate cost per use and optimize your spend</li>
        <li>Subscriptions with zero usage are flagged as potential cancellations
</li>
      </ul>
      <h3>Setting Reminders</h3>
      <ul>
        <li>Use the Calendar tab to view all renewal dates</li>
        <li>The system will notify you before important dates</li>
        <li>Adjust renewal dates directly in the calendar interface</li>
      </ul>
    </section>
    </div>
    <hr />
    <div ref={sectionRefs["browser-extension"]} id="browser-extension">
    <section>
      <h2>Browser Extension</h2>
      <p>The Subveris browser extension automatically discovers and tracks your subscriptions. It's currently available on Chrome, Edge, and Firefox. Safari support is coming soon.</p>
      
      <h3>What the Extension Does</h3>
      <ul>
        <li><b>Website Tracking:</b> Detects when you visit Netflix, Spotify, Disney+, and 20+ other subscription services</li>
        <li><b>Gmail Receipt Scanning:</b> Scans your email inbox for subscription receipts and confirmations</li>
        <li><b>CSV Detection:</b> Automatically finds subscription lists in your Downloads folder</li>
        <li><b>Cookie Analysis:</b> Identifies subscriptions from authentication cookies on first login</li>
      </ul>

      <h3>Installation by Browser</h3>
      <h4>Chrome & Edge</h4>
      <ol>
        <li>Go to <b>Files → Download Extension</b> in your dashboard</li>
        <li>Extract the ZIP file</li>
        <li>Open <code>chrome://extensions</code> (Chrome) or <code>edge://extensions</code> (Edge)</li>
        <li>Enable "Developer mode" (top right toggle)</li>
        <li>Click "Load unpacked" and select the extracted folder</li>
      </ol>

      <h4>Firefox</h4>
      <ol>
        <li>Open Firefox and go to: <a href="https://addons.mozilla.org/firefox/addon/subveris-tracker/" target="_blank" rel="noopener noreferrer">Firefox Add-ons Store</a></li>
        <li>Click "Add to Firefox"</li>
        <li>Review permissions and click "Add"</li>
      </ol>

      <h4>Safari (macOS)</h4>
      <ol>
        <li>Open the Mac App Store and search for "Subveris Tracker"</li>
        <li>Click "Get" and open the app</li>
        <li>Go to <b>Safari → Settings → Extensions</b></li>
        <li>Enable "Subveris Tracker"</li>
      </ol>

      <h3>First Time Setup</h3>
      <ol>
        <li>After installation, open your Subveris dashboard</li>
        <li>Log in with your account (the extension auto-detects your login)</li>
        <li>Go to <b>Settings → Connected Services</b></li>
        <li>Click <b>"Connect Gmail Account"</b> to enable email scanning (optional but recommended)</li>
        <li>Grant permissions when prompted</li>
      </ol>

      <h3>How Gmail Integration Works</h3>
      <ul>
        <li><b>Privacy:</b> Uses OAuth - your account is logged in via Google's secure authentication</li>
        <li><b>Read-only:</b> The extension can only read emails, never send or delete them</li>
        <li><b>Automatic:</b> Scans your inbox every 5 minutes for new receipts and confirmations</li>
        <li><b>Smart parsing:</b> Extracts service names, amounts, and billing frequencies from emails</li>
        <li><b>Control:</b> You can disconnect Gmail anytime in Settings → Connected Services</li>
      </ul>

      <h3>Subscription Detection Methods</h3>
      <ul>
        <li><b>Website Visits:</b> Logs the site you visit and time spent (tracks usage patterns)</li>
        <li><b>Gmail Receipts:</b> Finds confirmations for Netflix, Spotify, Adobe, etc.</li>
        <li><b>CSV Files:</b> Parses subscription exports with flexible column detection</li>
        <li><b>Auth Cookies:</b> Scans login cookies once to identify existing subscriptions</li>
      </ul>

      <h3>Troubleshooting</h3>
      <p><b>Extension not visible in toolbar?</b></p>
      <ul>
        <li>Open your browser's extension settings</li>
        <li>Find "Subveris Tracker" and check that it's enabled</li>
        <li>Restart your browser</li>
      </ul>

      <p><b>Gmail connection failing?</b></p>
      <ul>
        <li>Make sure you're logged into your Google account in the same browser</li>
        <li>Check that your browser allows pop-ups</li>
        <li>Try clearing browser cookies for accounts.google.com and reconnecting</li>
      </ul>

      <p><b>Subscriptions not being detected?</b></p>
      <ul>
        <li>Verify the extension is enabled in your browser settings</li>
        <li>Visit the subscription website and reload the page</li>
        <li>Wait 5+ minutes for Gmail to scan (emails are scanned periodically)</li>
      </ul>

      <h3>Features by Browser</h3>
      <table style={{width: '100%', borderCollapse: 'collapse'}}>
        <thead>
          <tr style={{borderBottom: '2px solid #ddd'}}>
            <th style={{textAlign: 'left', padding: '8px'}}>Feature</th>
            <th style={{textAlign: 'center', padding: '8px'}}>Chrome</th>
            <th style={{textAlign: 'center', padding: '8px'}}>Edge</th>
            <th style={{textAlign: 'center', padding: '8px'}}>Firefox</th>
            <th style={{textAlign: 'center', padding: '8px'}}>Safari</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{borderBottom: '1px solid #eee'}}>
            <td style={{padding: '8px'}}>Website tracking</td>
            <td style={{textAlign: 'center', padding: '8px'}}>✅</td>
            <td style={{textAlign: 'center', padding: '8px'}}>✅</td>
            <td style={{textAlign: 'center', padding: '8px'}}>✅</td>
            <td style={{textAlign: 'center', padding: '8px'}}>✅</td>
          </tr>
          <tr style={{borderBottom: '1px solid #eee'}}>
            <td style={{padding: '8px'}}>Gmail scanning</td>
            <td style={{textAlign: 'center', padding: '8px'}}>✅</td>
            <td style={{textAlign: 'center', padding: '8px'}}>✅</td>
            <td style={{textAlign: 'center', padding: '8px'}}>✅</td>
            <td style={{textAlign: 'center', padding: '8px'}}>✅</td>
          </tr>
          <tr style={{borderBottom: '1px solid #eee'}}>
            <td style={{padding: '8px'}}>CSV detection</td>
            <td style={{textAlign: 'center', padding: '8px'}}>✅</td>
            <td style={{textAlign: 'center', padding: '8px'}}>✅</td>
            <td style={{textAlign: 'center', padding: '8px'}}>✅</td>
            <td style={{textAlign: 'center', padding: '8px'}}>⚠️ Limited</td>
          </tr>
        </tbody>
      </table>

      <h3>Data & Privacy</h3>
      <ul>
        <li><b>Encrypted:</b> All data is encrypted in transit (HTTPS) and at rest</li>
        <li><b>Not sold:</b> We never sell or share your data with third parties</li>
        <li><b>Gmail OAuth:</b> Read-only access via standard Google OAuth</li>
        <li><b>No tracking:</b> We only log subscriptions, not your general browsing</li>
      </ul>
    </section>
    </div>
    <hr />
    <div ref={sectionRefs["how-subscription-optimization-works"]} id="how-subscription-optimization-works">
    <section>
      <h2>How Subscription Optimization Works</h2>
      <p>Subveris uses a combination of user input, smart analytics, and optional integrations to help you optimize your recurring spending, identify waste, and prioritize savings actions.</p>
      <h3>Workflow Overview</h3>
      <ol>
        <li>Add Subscriptions: Enter details such as name, cost, renewal date, and category.</li>
        <li>Capture Usage: Log usage manually or connect supported integrations (where available).</li>
        <li>Analyze: View cost per use, monthly spend, and get recommendations.</li>
        <li>Take Action: Cancel, upgrade, or adjust subscriptions as needed.</li>
      </ol>
      <h3>Feature Logic</h3>
      <ul>
        <li>Automatic Status Changes: Subscriptions with zero monthly usage are flagged and can be set to "inactive" automatically.</li>
        <li>Cost Per Use Analytics: Calculates how much value you get from each subscription. Subscriptions with no recorded usage will be flagged as "poor" (since the cost per use would otherwise be infinite).</li>
        <li>Premium Feature Reset: Canceling premium disables advanced analytics and prevents further Stripe billing.</li>
        <li>Stripe Webhook Integration: Ensures your premium status and billing are always in sync with your Stripe account.</li>
      </ul>
      <h3>AI Limitations</h3>
      <ul>
        <li>AI recommendations are based on your input and available usage data.</li>
        <li>Subveris cannot access or analyze your bank transactions directly.</li>
        <li>AI cannot cancel subscriptions for you; it can only suggest actions.</li>
      </ul>
      <h3>Required Inputs</h3>
      <ul>
        <li>Subscription details (name, cost, renewal date, category)</li>
        <li>Usage data (manual entry or via integrations)</li>
      </ul>
    </section>
    </div>
    <hr />
    <div ref={sectionRefs["ai-accuracy"]} id="ai-accuracy">
    <section>
      <h2>AI & Accuracy</h2>
      <h3>How Accurate Are the Analytics?</h3>
      <ul>
        <li>Analytics are only as accurate as the data you provide.</li>
        <li>Integrations (where available) can improve accuracy by automating usage-based optimization.</li>
        <li>AI suggestions are transparent and explainable—no "black box" decisions.</li>
      </ul>
      <h3>Limitations</h3>
      <ul>
        <li>Manual data entry may lead to incomplete analytics.</li>
        <li>AI cannot predict future price changes or service disruptions.</li>
        <li>Recommendations are suggestions, not financial advice.</li>
      </ul>
    </section>
    </div>
    <hr />
    <div ref={sectionRefs["api-documentation"]} id="api-documentation">
    <section>
      <h2>API Documentation</h2>
      <h3>Overview</h3>
      <p>The Subveris API allows developers to programmatically interact with subscription data. Authentication is required for all endpoints.</p>
      <h3>Authentication</h3>
      <ul>
        <li>All API calls require a valid JWT token in the Authorization header</li>
        <li>Format: <code>Authorization: Bearer YOUR_JWT_TOKEN</code></li>
        <li>Obtain a token by logging in through the Subveris web application</li>
      </ul>
      <h3>Core Endpoints</h3>
      <ul>
        <li><b>GET /api/subscriptions</b> - Retrieve all user subscriptions</li>
        <li><b>POST /api/subscriptions</b> - Create a new subscription</li>
        <li><b>GET /api/subscriptions/:id</b> - Get details for a specific subscription</li>
        <li><b>PATCH /api/subscriptions/:id</b> - Update subscription renewal date</li>
        <li><b>PATCH /api/subscriptions/:id/status</b> - Update subscription status (active, unused, to-cancel, deleted)</li>
        <li><b>DELETE /api/subscriptions/:id</b> - Delete a subscription</li>
        <li><b>GET /api/analytics/monthly-savings</b> - Retrieve amount actually saved this month by deleting subscriptions (status = <code>deleted</code>). <code>to-cancel</code> is potential savings only. Append <code>?family=true</code> to total across all members of your owned family groups.</li>
        <li><b>GET /api/family-groups/:id/family-data</b> - Return combined data for a family group when the requester is the owner or a member and family data sharing is enabled. The response includes:
          <ul className="ml-4 list-disc">
            <li><code>members</code> array (userId, role)</li>
            <li><code>subscriptions</code> array (all non-deleted subs visible to the user)</li>
            <li><code>sharedSubscriptions</code> - detailed shared entries with original subscription data when available</li>
            <li><code>costSplits</code> for any shared subscriptions</li>
            <li><code>metrics</code> object ({'{' }totalSubscriptions, activeSubscriptions, totalMonthlySpending, memberCount{'}'}) computed server-side</li>
          </ul>
        </li>
        <li><b>GET /api/metrics</b> - Get overall dashboard metrics for the current user, including <code>thisMonthSavings</code> (actual savings based on deleted subscriptions), <code>potentialSavings</code> (unused + to-cancel), active/unused counts, and spend numbers. <code>totalMonthlySpend</code> counts only subscriptions with renewal dates in the current month.</li>
        <li><b>GET /api/spending/monthly</b> - Retrieve monthly spending trends based on subscription renewal dates. Shows spending for the last 6 months plus the current month. <b>Important:</b> Spending only increases/appears for a month if one or more subscriptions have their next renewal date falling in that month. Subscriptions are filtered to only include those with status <code>active</code>, <code>unused</code>, or <code>to-cancel</code>.</li>
        <li><b>GET /api/spending/category</b> - Breakdown of current month spending by category (e.g., streaming, software, fitness). Shows percentages and counts for each category. <b>Important:</b> Only includes subscriptions with renewal dates in the current month, in the same way as the monthly spending overview. Empty categories are excluded if no subscriptions renew in this month.</li>
      </ul>
      <h3>Response Format</h3>
      <p>All responses are returned in JSON format. Successful requests return status code 200, while errors return appropriate HTTP status codes (400, 401, 404, 500).</p>
      <h3>Rate Limiting</h3>
      <p>API requests are rate-limited to prevent abuse. Excessive requests may result in temporary rate limiting.</p>
      <h3>Support</h3>
      <p>For detailed API documentation, code examples, and SDKs, please contact our support team at <code>help.subveris@gmail.com</code></p>
    </section>
    </div>
    <hr />
    <div ref={sectionRefs["managing-your-account"]} id="managing-your-account">
    <section>
      <h2>Managing Your Account</h2>
      <h3>Account Creation & Login</h3>
      <ul>
        <li>Sign up with email and password</li>
        <li>Secure authentication via Supabase</li>
      </ul>
      <h3>Upgrading to Premium</h3>
      <ul>
        <li>Premium features are unlocked via Stripe payment</li>
        <li>You can upgrade or downgrade at any time</li>
        <li>Canceling premium disables advanced features immediately and stops future billing</li>
      </ul>
      <h3>Optimizing Subscriptions</h3>
      <ul>
        <li>Add, edit, or remove subscriptions to improve spend efficiency</li>
        <li>Set reminders for renewal dates</li>
        <li>Optimize usage and spending trends</li>
      </ul>
      <h3>Account Settings</h3>
      <ul>
        <li>Update your email or password</li>
        <li>Delete your account (all data is permanently removed)</li>
        <li>Control notification preferences</li>
      </ul>
    </section>
    </div>
    <hr />
    <div ref={sectionRefs["troubleshooting"]} id="troubleshooting">
    <section>
      <h2>Troubleshooting</h2>
      <h3>Common Issues & Solutions</h3>
      <h4>I can't log in to my account</h4>
      <ul>
        <li>Verify that you're using the correct email address and password</li>
        <li>Use the "Forgot Password" option to reset your password</li>
        <li>Clear your browser cache and cookies, then try again</li>
        <li>Try using a different browser or incognito/private mode</li>
      </ul>
      <h4>My subscriptions aren't showing up</h4>
      <ul>
        <li>Refresh your browser or reload the page</li>
        <li>Check that your subscription status is set to "active" (not "inactive" or "archived")</li>
        <li>Verify that you added the subscriptions to the correct account</li>
      </ul>
      <h4>Premium features disappeared after payment</h4>
      <ul>
        <li>Your Stripe payment may still be processing. Wait a few minutes and refresh the page</li>
        <li>Log out and log back in to ensure your premium status is updated</li>
        <li>Check your email for payment confirmation</li>
        <li>Contact support with your payment receipt if the issue persists</li>
      </ul>
      <h4>The calendar isn't showing my renewal dates</h4>
      <ul>
        <li>Make sure your subscriptions have valid renewal dates set</li>
        <li>Check that renewal dates are in the correct date format (YYYY-MM-DD)</li>
        <li>Refresh your browser to reload the calendar</li>
      </ul>
      <h4>I'm having issues with family sharing</h4>
      <ul>
        <li>Family sharing requires the Family plan. Upgrade to use this feature</li>
        <li>Ensure family members accept the invitation to join the family group</li>
        <li>Check that renewal dates are set correctly before sharing subscriptions</li>
      </ul>
      <h3>Data & Sync Issues</h3>
      <ul>
        <li><b>Data not syncing:</b> Ensure your internet connection is stable and reload the page</li>
        <li><b>Missing analytics:</b> Analytics rely on usage data. Log usage for accurate insights</li>
        <li><b>Incorrect calculations:</b> Double-check your subscription amounts and frequency settings</li>
      </ul>
      <h3>Still Need Help?</h3>
      <p>If you can't find a solution to your problem, please contact our support team:</p>
      <ul>
        <li>Email: <code>help.subveris@gmail.com</code></li>
        <li>Response time: Within 24 hours</li>
      </ul>
    </section>
    </div>
    <hr />
    <div ref={sectionRefs["faq"]} id="faq">
    <section>
      <h2>FAQ</h2>
      <h3>Pricing</h3>
      <ul>
        <li><b>Is Subveris free?</b> Yes, there is a free tier with core features. Premium features require a subscription via Stripe.</li>
        <li><b>How do I upgrade or cancel?</b> Go to Account Settings &gt; Billing. Canceling premium stops future charges immediately.</li>
      </ul>
      <h3>Account Management</h3>
      <ul>
        <li><b>How do I reset my password?</b> Use the "Forgot Password" link on the login page.</li>
        <li><b>Can I delete my account?</b> Yes, from Account Settings. This action is irreversible.</li>
      </ul>
      <h3>Data & Privacy</h3>
      <ul>
        <li><b>Is my data secure?</b> Yes. All data is encrypted and never sold or shared.</li>
        <li><b>Can I export my data?</b> Yes, export options are available in Account Settings.</li>
      </ul>
      <h3>Troubleshooting</h3>
      <ul>
        <li><b>I can't log in!</b> Check your email and password, or use "Forgot Password".</li>
        <li><b>Premium features disappeared after payment?</b> Contact support with your payment receipt for assistance.</li>
      </ul>
      <h3>Limitations</h3>
      <ul>
        <li>Subveris cannot access your bank account or cancel subscriptions for you.</li>
        <li>Analytics depend on the accuracy of your input data.</li>
      </ul>
    </section>
    </div>
    <hr />
    <div ref={sectionRefs["privacy-data"]} id="privacy-data">
    <section>
      <h2>Privacy & Data</h2>
      <h3>Data Handling</h3>
      <ul>
        <li>Deployed web and API traffic uses HTTPS</li>
        <li>We do not sell your data; Supabase and Stripe process data needed to operate the service</li>
        <li>Payment information is handled securely via Stripe</li>
      </ul>
      <h3>Data Usage</h3>
      <ul>
        <li>Data is used only to provide analytics and recommendations</li>
        <li>You can export or delete your data at any time</li>
      </ul>
    </section>
    </div>
    <hr />
    <div ref={sectionRefs["policies"]} id="policies">
    <section>
      <h2>Policies</h2>
      <ul>
        <li>Privacy Policy</li>
        <li>Terms of Service</li>
        <li>Refund Policy</li>
      </ul>
      <h3>Privacy Policy</h3>
      <p>We explain the data we collect, how we use it, and which service providers process it in the full Privacy Policy.</p>
      <h3>Terms of Service</h3>
      <p>By using Subveris, you agree to our terms.</p>
      <h3>Refund Policy</h3>
      <p>Refunds are available for premium subscriptions within 14 days of purchase.</p>
    </section>
    </div>
    <hr />
    <p>For further help, contact our support team or visit the Help Center.</p>
    </main>
  </div>
  );
};

export default DocsPage;
