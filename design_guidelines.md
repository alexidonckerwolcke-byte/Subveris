# Subveris Design Guidelines

## Design Approach

**Hybrid Fintech System**: Combining Stripe's clarity and restraint with Linear's typography precision and modern dashboard patterns. This information-dense financial platform requires trust, efficiency, and data clarity above visual flair.

**Key Principles:**
- Data transparency and instant comprehension
- Trust through clarity and professional restraint
- Efficient scanning and actionable insights
- Clean, modern fintech aesthetic

---

## Typography System

**Font Stack:** Inter (Google Fonts) for all text - exceptional for financial data and UI

**Hierarchy:**
- Page Titles: 3xl to 4xl, font-semibold (36-48px)
- Section Headers: xl to 2xl, font-semibold (24-30px)
- Card Titles: lg, font-medium (18px)
- Body Text: base, font-normal (16px)
- Data Points/Metrics: lg to 2xl, font-bold for emphasis
- Labels/Secondary: sm, font-medium (14px)
- Captions: xs, font-normal (12px)

---

## Layout System

**Spacing Primitives:** Use Tailwind units of **2, 3, 4, 6, 8, 12, 16** for consistent rhythm
- Component internal padding: p-4 to p-6
- Card spacing: p-6 to p-8
- Section margins: my-8 to my-12
- Grid gaps: gap-4 to gap-6

**Container Strategy:**
- Dashboard sections: max-w-7xl mx-auto
- Content cards: w-full within grid
- Forms: max-w-2xl for optimal input width

---

## Component Library

### Navigation
**Top Navigation Bar:**
- Full-width, sticky header with logo left, navigation center, user profile/settings right
- Height: h-16
- Contains: Logo, Dashboard, Subscriptions, Insights, Settings links, Profile dropdown

**Sidebar (Dashboard Pages):**
- Fixed left sidebar, w-64
- Navigation items with icons (Heroicons), grouped by function
- Active state indicators
- Collapsible on mobile

### Dashboard Cards

**Subscription Cards:**
- Rounded corners (rounded-lg)
- Padding p-6
- Shadow: shadow-sm with subtle border
- Structure: Service logo/icon (top-left), subscription name (bold), amount (large, right-aligned), frequency label, usage indicator, action buttons (bottom)

**Metric Cards:**
- Prominent number display (text-3xl to text-4xl, font-bold)
- Label above (text-sm, uppercase tracking-wide)
- Trend indicator (arrow icon + percentage)
- Compact: p-4 to p-6

**Usage Analysis Cards:**
- Progress bars showing usage frequency
- Cost-per-use calculation prominently displayed
- Visual comparison: spent vs. value received
- Traffic light status indicators (visual dots/badges)

### Data Visualization

**Charts & Graphs:**
- Use Chart.js or Recharts for consistency
- Monthly spending trend line chart (hero dashboard element)
- Category breakdown pie/donut chart
- Subscription timeline/calendar view
- Cost comparison bar charts

**Tables:**
- Transaction lists with alternating row treatment
- Sortable headers
- Fixed header on scroll for long lists
- Row actions on hover (edit, delete icons)
- Responsive: stack on mobile

### Forms & Inputs

**Input Fields:**
- Height: h-12
- Border radius: rounded-lg
- Padding: px-4
- Focus states with subtle ring effect
- Labels: font-medium, mb-2

**Buttons:**
- Primary CTA: px-6 py-3, rounded-lg, font-semibold
- Secondary: outline style with same dimensions
- Danger actions: distinct treatment for cancel/delete
- Icon buttons: square (h-10 w-10), rounded-lg

### AI Chat Interface ("FinBot")

**Chat Container:**
- Fixed bottom-right corner or dedicated panel
- Rounded-xl with shadow-lg
- Message bubbles: User (right-aligned), AI (left-aligned)
- Input field at bottom with send button
- Suggested quick actions as chips

### Modals & Overlays

**Modal Structure:**
- Centered, max-w-2xl
- Backdrop blur with reduced opacity
- Rounded-xl, p-6 to p-8
- Close button (top-right)
- Footer with action buttons (right-aligned)

---

## Page Layouts

### Dashboard Home
- **Hero Metrics Row:** 4-column grid of key metrics (Total Monthly Spend, Active Subscriptions, Potential Savings, This Month's Savings). *Note: "This Month's Savings" reflects actual money saved from cancelling subscriptions, not potential savings from unused services.*
- **Spending Chart:** Full-width area chart showing 6-month trend
- **Subscription Grid:** 3-column grid of subscription cards (lg: grid-cols-3, md: grid-cols-2, mobile: grid-cols-1)
- **AI Insights Panel:** Right sidebar or bottom section with FinBot recommendations
- **Quick Actions:** Floating action button or top-right quick access

### Subscription Detail View
- **Header:** Large subscription logo, name, monthly cost, billing date
- **Usage Analytics:** Visual breakdown - times used, cost-per-use, value score
- **Historical Data:** Chart showing usage patterns over time
- **Alternatives Section:** Card grid showing cheaper/better alternatives
- **Management Actions:** Cancel, Pause, Negotiate buttons

### Insights & Optimization Page
- **Savings Opportunities:** Priority-ranked list of recommendations
- **Behavioral Insights:** Opportunity cost visualizations (e.g., "This equals X coffee trips")
- **Goal Tracker:** Progress toward savings goals with visual progress bar
- **What-If Simulator:** Interactive tool showing financial impact of changes

---

## Images

**Hero/Dashboard:**
- No traditional hero image - this is a functional dashboard
- Consider: Abstract financial gradient background for auth pages only
- Subscription logos: Use actual brand logos (64x64px) in cards

**Illustration Usage:**
- Empty states: Friendly illustrations for "No subscriptions found" or "All optimized!"
- Onboarding: 3-4 step illustrations explaining value proposition
- Success states: Celebration illustration when savings achieved

**Placement Strategy:**
- Auth pages (login/signup): Split-screen with gradient or abstract financial visual (left side)
- Dashboard: Logo marks only, no decorative images
- Marketing landing: Hero section with app screenshot mockup showing dashboard

---

## Responsive Behavior

**Breakpoint Strategy:**
- Mobile (<768px): Single column, stacked navigation, collapsible sidebar
- Tablet (768-1024px): 2-column grids, visible sidebar
- Desktop (>1024px): 3-4 column grids, full sidebar, optimal data density

**Mobile Priorities:**
- Bottom navigation for key actions
- Swipe gestures for subscription cards
- Simplified chart views
- Collapsible detail sections

---

## Animations

**Minimal, Purposeful Motion:**
- Page transitions: Simple fade (150ms)
- Card hover: Subtle lift (translate-y-1) with shadow increase
- Data updates: Number counter animations
- Loading states: Skeleton screens (pulse), not spinners
- **No** scroll-triggered or decorative animations

---

## Accessibility

- All interactive elements: min-height h-11 (44px touch target)
- Sufficient contrast ratios for financial data
- Keyboard navigation for all actions
- Screen reader labels for all icons and data visualizations
- Form validation with clear error messages