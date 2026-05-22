"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertPushSubscriptionSchema = exports.pushSubscriptions = exports.insertNotificationPreferencesSchema = exports.notificationPreferences = exports.insertUserSchema = exports.users = exports.insertFamilyGroupPlanBackupSchema = exports.familyGroupPlanBackups = exports.insertUserSubscriptionSchema = exports.userSubscriptions = exports.insertInsightSchema = exports.insights = exports.insertSubscriptionSchema = exports.subscriptions = exports.authUsers = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var drizzle_zod_1 = require("drizzle-zod");
// Supabase auth users table reference
exports.authUsers = (0, pg_core_1.pgTable)("auth.users", {
    id: (0, pg_core_1.uuid)("id").primaryKey(),
});
// Subscriptions table
exports.subscriptions = (0, pg_core_1.pgTable)("subscriptions", {
    id: (0, pg_core_1.varchar)("id", { length: 36 }).primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id").references(function () { return exports.authUsers.id; }, { onDelete: "cascade" }).notNull(),
    name: (0, pg_core_1.text)("name").notNull(),
    category: (0, pg_core_1.text)("category").notNull().$type(),
    amount: (0, pg_core_1.real)("amount").notNull(),
    currency: (0, pg_core_1.text)("currency").notNull().default("USD"),
    frequency: (0, pg_core_1.text)("frequency").notNull().$type(),
    nextBillingDate: (0, pg_core_1.text)("next_billing_at").notNull(),
    status: (0, pg_core_1.text)("status").notNull().$type().default("active"),
    usageCount: (0, pg_core_1.integer)("usage_count").notNull().default(0),
    // column rename: the production database uses `_at` suffixs for timestamps
    lastUsedDate: (0, pg_core_1.text)("last_used_at"),
    logoUrl: (0, pg_core_1.text)("logo_url"),
    description: (0, pg_core_1.text)("description"),
    isDetected: (0, pg_core_1.boolean)("is_detected").notNull().default(true),
    websiteDomain: (0, pg_core_1.text)("website_domain"), // e.g., "netflix.com", "spotify.com"
    scheduledCancellationDate: (0, pg_core_1.text)("scheduled_cancellation_date"), // ISO 8601 date string for scheduled cancellation
    cancellationUrl: (0, pg_core_1.text)("cancellation_url"), // URL to cancel the subscription
    monthlyUsageCount: (0, pg_core_1.integer)("monthly_usage_count").notNull().default(0),
    usageMonth: (0, pg_core_1.text)("usage_month"),
    billingMonth: (0, pg_core_1.text)("billing_month"), // YYYY-MM format, tracks which month subscription is billed for (persists until end of month)
});
exports.insertSubscriptionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.subscriptions).omit(['id']);
// AI Insights/Recommendations
exports.insights = (0, pg_core_1.pgTable)("insights", {
    id: (0, pg_core_1.varchar)("id", { length: 36 }).primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id").references(function () { return exports.authUsers.id; }, { onDelete: "cascade" }).notNull(),
    type: (0, pg_core_1.text)("type").notNull(), // "savings" | "alternative" | "warning" | "tip"
    title: (0, pg_core_1.text)("title").notNull(),
    description: (0, pg_core_1.text)("description").notNull(),
    potentialSavings: (0, pg_core_1.real)("potentialSavings"),
    subscriptionId: (0, pg_core_1.varchar)("subscription_id", { length: 36 }),
    priority: (0, pg_core_1.integer)("priority").notNull().default(1), // 1 = high, 2 = medium, 3 = low
    isRead: (0, pg_core_1.boolean)("is_read").notNull().default(false),
    createdAt: (0, pg_core_1.text)("created_at").notNull(),
});
exports.insertInsightSchema = (0, drizzle_zod_1.createInsertSchema)(exports.insights).omit(['id']);
// User subscriptions for Stripe billing
exports.userSubscriptions = (0, pg_core_1.pgTable)("user_subscriptions", {
    id: (0, pg_core_1.varchar)("id", { length: 36 }).primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id").references(function () { return exports.authUsers.id; }, { onDelete: "cascade" }).notNull(),
    stripeCustomerId: (0, pg_core_1.text)("stripe_customer_id"),
    stripeSubscriptionId: (0, pg_core_1.text)("stripe_subscription_id"),
    stripePriceId: (0, pg_core_1.text)("stripe_price_id"),
    status: (0, pg_core_1.text)("status").notNull().default("inactive"),
    planType: (0, pg_core_1.text)("plan_type").notNull().default("free"), // "free" | "premium" | "family"
    currentPeriodStart: (0, pg_core_1.timestamp)("current_period_start", { withTimezone: true }),
    currentPeriodEnd: (0, pg_core_1.timestamp)("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: (0, pg_core_1.boolean)("cancel_at_period_end").notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
});
exports.insertUserSubscriptionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.userSubscriptions).omit(['id']);
// Family group original plan tracker (tracks the user's plan before joining a family group)
exports.familyGroupPlanBackups = (0, pg_core_1.pgTable)("family_group_plan_backups", {
    id: (0, pg_core_1.varchar)("id", { length: 36 }).primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id").references(function () { return exports.authUsers.id; }, { onDelete: "cascade" }).notNull(),
    familyGroupId: (0, pg_core_1.varchar)("family_group_id", { length: 36 }).notNull(),
    originalPlanType: (0, pg_core_1.text)("original_plan_type").notNull(), // "free" | "premium"
    originalStatus: (0, pg_core_1.text)("original_status").notNull(), // the original subscription status
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
});
exports.insertFamilyGroupPlanBackupSchema = (0, drizzle_zod_1.createInsertSchema)(exports.familyGroupPlanBackups).omit(['id']);
// Users table (keeping the existing one)
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.varchar)("id", { length: 36 }).primaryKey(),
    username: (0, pg_core_1.text)("username").notNull().unique(),
    password: (0, pg_core_1.text)("password").notNull(),
    // preferred currency for the user interface; stored so the choice
    // is remembered across devices and sessions (no default, must be selected)
    currency: (0, pg_core_1.text)("currency"),
});
exports.insertUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.users).omit(['id']);
// Notification preferences table
exports.notificationPreferences = (0, pg_core_1.pgTable)("notification_preferences", {
    id: (0, pg_core_1.varchar)("id", { length: 36 }).primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id").references(function () { return exports.authUsers.id; }, { onDelete: "cascade" }).notNull().unique(),
    emailNotifications: (0, pg_core_1.boolean)("email_notifications").notNull().default(true),
    pushNotifications: (0, pg_core_1.boolean)("push_notifications").notNull().default(true),
    weeklyDigest: (0, pg_core_1.boolean)("weekly_digest").notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
});
exports.insertNotificationPreferencesSchema = (0, drizzle_zod_1.createInsertSchema)(exports.notificationPreferences).omit(['id', 'createdAt', 'updatedAt']);
// Push subscriptions table for Web Push API
exports.pushSubscriptions = (0, pg_core_1.pgTable)("push_subscriptions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").references(function () { return exports.authUsers.id; }, { onDelete: "cascade" }).notNull(),
    endpoint: (0, pg_core_1.text)("endpoint").notNull(),
    authKey: (0, pg_core_1.text)("auth_key").notNull(),
    p256dhKey: (0, pg_core_1.text)("p256dh_key").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
});
exports.insertPushSubscriptionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.pushSubscriptions).omit(['id', 'createdAt', 'updatedAt']);
