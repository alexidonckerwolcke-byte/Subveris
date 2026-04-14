import { pgTable, text, varchar, integer, real, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Supabase auth users table reference
export const authUsers = pgTable("auth.users", {
  id: uuid("id").primaryKey(),
});

// Subscription status types
export type SubscriptionStatus = "active" | "unused" | "to-cancel" | "deleted";

// Subscription categories
export type SubscriptionCategory = 
  | "streaming" 
  | "software" 
  | "fitness" 
  | "cloud-storage" 
  | "news" 
  | "gaming" 
  | "productivity" 
  | "finance" 
  | "education"
  | "other";

// Billing frequency
export type BillingFrequency = "monthly" | "yearly" | "weekly" | "quarterly";

// Subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: uuid("user_id").references(() => authUsers.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  category: text("category").notNull().$type<SubscriptionCategory>(),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  frequency: text("frequency").notNull().$type<BillingFrequency>(),
  nextBillingDate: text("next_billing_at").notNull(),
  status: text("status").notNull().$type<SubscriptionStatus>().default("active"),
  usageCount: integer("usage_count").notNull().default(0),
  // column rename: the production database uses `_at` suffixs for timestamps
  lastUsedDate: text("last_used_at"),
  logoUrl: text("logo_url"),
  description: text("description"),
  isDetected: boolean("is_detected").notNull().default(true),
  websiteDomain: text("website_domain"), // e.g., "netflix.com", "spotify.com"
  scheduledCancellationDate: text("scheduled_cancellation_date"), // ISO 8601 date string for scheduled cancellation
  cancellationUrl: text("cancellation_url"), // URL to cancel the subscription
  monthlyUsageCount: integer("monthly_usage_count").notNull().default(0),
  usageMonth: text("usage_month"),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
});

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

// AI Insights/Recommendations
export const insights = pgTable("insights", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: uuid("user_id").references(() => authUsers.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(), // "savings" | "alternative" | "warning" | "tip"
  title: text("title").notNull(),
  description: text("description").notNull(),
  potentialSavings: real("potentialSavings"),
  subscriptionId: varchar("subscription_id", { length: 36 }),
  priority: integer("priority").notNull().default(1), // 1 = high, 2 = medium, 3 = low
  isRead: boolean("is_read").notNull().default(false),
  createdAt: text("created_at").notNull(),
});

export const insertInsightSchema = createInsertSchema(insights).omit({
  id: true,
});

export type InsertInsight = z.infer<typeof insertInsightSchema>;
export type Insight = typeof insights.$inferSelect;

// User subscriptions for Stripe billing
export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: uuid("user_id").references(() => authUsers.id, { onDelete: "cascade" }).notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  status: text("status").notNull().default("inactive"),
  planType: text("plan_type").notNull().default("free"), // "free" | "premium" | "family"
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
});

export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;

// Family group original plan tracker (tracks the user's plan before joining a family group)
export const familyGroupPlanBackups = pgTable("family_group_plan_backups", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: uuid("user_id").references(() => authUsers.id, { onDelete: "cascade" }).notNull(),
  familyGroupId: varchar("family_group_id", { length: 36 }).notNull(),
  originalPlanType: text("original_plan_type").notNull(), // "free" | "premium"
  originalStatus: text("original_status").notNull(), // the original subscription status
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertFamilyGroupPlanBackupSchema = createInsertSchema(familyGroupPlanBackups).omit({
  id: true,
});

export type InsertFamilyGroupPlanBackup = z.infer<typeof insertFamilyGroupPlanBackupSchema>;
export type FamilyGroupPlanBackup = typeof familyGroupPlanBackups.$inferSelect;

// Dashboard metrics summary type
export interface DashboardMetrics {
  totalMonthlySpend: number;
  activeSubscriptions: number;
  potentialSavings: number;
  thisMonthSavings: number;
  unusedSubscriptions: number;
  averageCostPerUse: number;
  monthlySpendChange?: number; // percentage change vs last month
  newServicesTracked?: number; // number of services added this month
  thisMonthSavingsOwner?: number;
  thisMonthSavingsMembers?: number;
}

// Spending by category type
export interface SpendingByCategory {
  category: SubscriptionCategory;
  amount: number;
  percentage: number;
  count: number;
}

// Daily spending trend (shows spending on actual billing dates)
export interface MonthlySpending {
  month: string;
  amount: number;
}

// Cost per use analysis
export interface CostPerUseAnalysis {
  subscriptionId: string;
  name: string;
  monthlyAmount: number;
  usageCount: number;
  costPerUse: number;
  currency: string;
  valueRating: "excellent" | "good" | "fair" | "poor";
}

// Behavioral insight (opportunity cost)
export interface OpportunityCost {
  subscriptionId: string;
  subscriptionName: string;
  monthlyAmount: number;
  currency: string;
  equivalents: {
    item: string;
    count: number;
    icon: string;
  }[];
  status?: string;
  subStatus?: string;
}

// AI Recommendation
export interface AIRecommendation {
  id: string;
  type: "alternative" | "cancel" | "negotiate" | "downgrade";
  title: string;
  description: string;
  currentCost: number;
  suggestedCost: number;
  savings: number;
  currency: string;
  subscriptionId: string;
  alternativeName?: string;
  confidence: number;
}

// Users table (keeping the existing one)
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  // preferred currency for the user interface; stored so the choice
  // is remembered across devices and sessions (no default, must be selected)
  currency: text("currency"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type Transaction = {
  id: string;
  userId?: string | null;
  amount: number;
  date: string;
  description: string | null;
  category: string | null;
  isRecurring: boolean;
  merchantName: string | null;
  subscriptionId: string | null;
};

export type InsertTransaction = Omit<Transaction, 'id'>;

export type BankConnection = {
  id: string;
  userId?: string | null;
  accountMask: string | null;
  provider: string | null;
  bankName?: string | null;
  accountType?: string | null;
  isConnected: boolean;
  lastSync?: string | null;
};

export type InsertBankConnection = Omit<BankConnection, 'id'>;

// Notification preferences table
export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: uuid("user_id").references(() => authUsers.id, { onDelete: "cascade" }).notNull().unique(),
  emailNotifications: boolean("email_notifications").notNull().default(true),
  pushNotifications: boolean("push_notifications").notNull().default(true),
  weeklyDigest: boolean("weekly_digest").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;

// Push subscriptions table for Web Push API
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => authUsers.id, { onDelete: "cascade" }).notNull(),
  endpoint: text("endpoint").notNull(),
  authKey: text("auth_key").notNull(),
  p256dhKey: text("p256dh_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;

// Family sharing types
export type FamilyGroup = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
};

export type FamilyGroupMember = {
  id: string;
  familyGroupId: string;
  userId: string;
  role: 'owner' | 'member';
  joinedAt: string;
  email?: string | null;
};

export type SharedSubscription = {
  id: string;
  familyGroupId: string;
  subscriptionId: string;
  sharedByUserId: string;
  sharedAt: string;
};

export type CostSplit = {
  id: string;
  sharedSubscriptionId: string;
  userId: string;
  percentage: number;
  createdAt: string;
  updatedAt: string;
};

// Calendar types
export type CalendarEventType = 'renewal' | 'trial_end' | 'custom';

export type CalendarEvent = {
  id: string;
  subscriptionId: string;
  userId: string;
  eventDate: string; // ISO date string
  eventType: CalendarEventType;
  title: string;
  description?: string;
  amount?: number;
  createdAt: string;
  updatedAt: string;
};
