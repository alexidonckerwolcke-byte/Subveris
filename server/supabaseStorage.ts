import { randomUUID } from "crypto";
import { supabase } from "./supabase";
import type {
  User,
  InsertUser,
  Subscription,
  Transaction,
  InsertTransaction,
  Insight,
  InsertInsight,
  BankConnection,
  InsertBankConnection,
  DashboardMetrics,
  MonthlySpending,
  SpendingByCategory,
  CostPerUseAnalysis,
  OpportunityCost,
  AIRecommendation,
  SubscriptionStatus,
  SubscriptionCategory,
} from "@shared/schema";
import type { IStorage, InsertSubscriptionData } from "./storage";

function calculateMonthlyCost(amount: number, frequency: string): number {
  switch (frequency) {
    case "yearly":
      return amount / 12;
    case "quarterly":
      return amount / 3;
    case "weekly":
      return amount * 4;
    default:
      return amount;
  }
}

function generateOpportunityCosts(monthlyAmount: number): { item: string; count: number; icon: string }[] {
  const items = [
    { item: "coffee drinks", unitCost: 5, icon: "coffee" },
    { item: "movie tickets", unitCost: 15, icon: "film" },
    { item: "lunch meals", unitCost: 12, icon: "utensils" },
  ];

  return items
    .map((item) => ({
      item: item.item,
      count: Math.floor(monthlyAmount / item.unitCost),
      icon: item.icon,
    }))
    .filter((item) => item.count >= 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 1);
}

export class SupabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as User;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error || !data) return undefined;
    return data as User;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    // Ensure a currency field is set (schema default covers back-end, but
    // our TypeScript types may not include it yet).
    const user = { ...insertUser, id, currency: insertUser.currency || 'USD' } as any;
    
    const { data, error } = await supabase
      .from('users')
      .insert(user)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create user: ${error.message}`);
    return data as User;
  }

  async updateUserEmail(id: string, email: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .update({ email })
      .eq('id', id)
      .select()
      .single();
    
    if (error || !data) return undefined;
    return data as User;
  }

  async updateUserPassword(id: string, password: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .update({ password })
      .eq('id', id)
      .select()
      .single();
    
    if (error || !data) return undefined;
    return data as User;
  }

  async updateUserCurrency(id: string, currency: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .update({ currency })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return undefined;
    return data as User;
  }

  async getSubscriptions(): Promise<Subscription[]> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*');
    
    if (error) throw new Error(`Failed to get subscriptions: ${error.message}`);
    return (data || []).map(this.mapSubscription);
  }

  async getSubscription(id: string): Promise<Subscription | undefined> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return this.mapSubscription(data);
  }

  private mapSubscription(data: any): Subscription {
    return {
      id: data.id,
      name: data.name,
      category: data.category,
      amount: data.amount,
      currency: data.currency,
      frequency: data.frequency,
      nextBillingDate: data.next_billing_at || data.next_billing_date,
      status: data.status,
      usageCount: data.usage_count,
      lastUsedDate: data.last_used_at,
      logoUrl: data.logo_url,
      description: data.description,
      isDetected: data.is_detected,
      // new fields introduced for analytics
      monthlyUsageCount: data.monthly_usage_count || 0,
      usageMonth: data.usage_month || null,
    };
  }

  async createSubscription(insertSubscription: InsertSubscriptionData): Promise<Subscription> {
    const id = randomUUID();
    
    console.log("[Storage] Creating subscription with:", insertSubscription);
    
    // Build only the fields we know definitely exist
    const insertData: any = {
      id,
      user_id: insertSubscription.userId,
      name: insertSubscription.name,
      category: insertSubscription.category,
      amount: insertSubscription.amount,
      frequency: insertSubscription.frequency,
      next_billing_at: insertSubscription.nextBillingDate,
      status: insertSubscription.status || "active",
      is_detected: insertSubscription.isDetected ?? false,
    };
    
    // Add optional fields that might exist
    if (insertSubscription.currency) insertData.currency = insertSubscription.currency;
    if (insertSubscription.usageCount !== undefined) insertData.usage_count = insertSubscription.usageCount;
    if (insertSubscription.logoUrl) insertData.logo_url = insertSubscription.logoUrl;
    if (insertSubscription.description) insertData.description = insertSubscription.description;
    if (insertSubscription.websiteDomain) insertData.website_domain = insertSubscription.websiteDomain;
    
    console.log("[Storage] Insert data:", insertData);
    
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert(insertData)
        .select()
        .single();
      
      if (error) {
        console.error("[Storage] Database error:", error.code, error.message);
        throw new Error(`Failed to create subscription: ${error.message}`);
      }
      
      console.log("[Storage] Inserted successfully");
      return this.mapSubscription(data);
    } catch (err) {
      console.error("[Storage] Exception:", err);
      throw err;
    }
  }

  async updateSubscriptionStatus(id: string, status: SubscriptionStatus): Promise<Subscription | undefined> {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    
    if (error || !data) return undefined;
    return this.mapSubscription(data);
  }

  async updateSubscriptionUsage(id: string, usageCount: number): Promise<Subscription | undefined> {
    // when manually setting usage via API we also treat it as the monthly total
    const month = new Date().toISOString().substr(0,7); // YYYY-MM
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ 
        usage_count: usageCount,
        monthly_usage_count: usageCount,
        usage_month: month,
        last_used_at: new Date().toISOString().split('T')[0]
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error || !data) return undefined;
    return this.mapSubscription(data);
  }

  async recordSubscriptionUsage(id: string): Promise<Subscription | undefined> {
    console.log(`[SupabaseStorage] recordSubscriptionUsage called for id=${id}`);
    const subscription = await this.getSubscription(id);
    console.log(`[SupabaseStorage] fetched subscription:`, subscription);
    if (!subscription) {
      console.warn(`[SupabaseStorage] no subscription found for id=${id}`);
      return undefined;
    }
    
    const newUsageCount = subscription.usageCount + 1;
    // determine monthly values
    const month = new Date().toISOString().substr(0,7); // YYYY-MM
    let newMonthly = (subscription.monthlyUsageCount || 0) + 1;
    let newMonth = subscription.usageMonth;
    if (subscription.usageMonth !== month) {
      newMonthly = 1;
      newMonth = month;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .update({ 
        usage_count: newUsageCount,
        monthly_usage_count: newMonthly,
        usage_month: newMonth,
        last_used_at: new Date().toISOString().split('T')[0],
        status: newUsageCount > 0 ? "active" : subscription.status
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error || !data) {
      console.error(`[SupabaseStorage] update error for id=${id}`, error, data);
      return undefined;
    }
    const mapped = this.mapSubscription(data);
    console.log(`[SupabaseStorage] updated subscription`, mapped);
    return mapped;
  }

  async trackUsageByDomain(userId: string, domain: string, timeSpent: number): Promise<Subscription | undefined> {
    // Find subscription by userId and website_domain
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('website_domain', domain)
      .single();
    
    if (error || !data) {
      console.log(`[SupabaseStorage] No subscription found for user ${userId} and domain ${domain}`);
      return undefined;
    }

    // Track usage count and monthly usage (reset by month)
    const subscription = this.mapSubscription(data);
    const newUsageCount = (subscription.usageCount || 0) + 1;
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    let newMonthlyUsage = (subscription.monthlyUsageCount || 0) + 1;
    let newUsageMonth = subscription.usageMonth || month;
    if (subscription.usageMonth !== month) {
      newMonthlyUsage = 1;
      newUsageMonth = month;
    }

    const { data: updatedData, error: updateError } = await supabase
      .from('subscriptions')
      .update({ 
        usage_count: newUsageCount,
        monthly_usage_count: newMonthlyUsage,
        usage_month: newUsageMonth,
        last_used_at: new Date().toISOString().split('T')[0],
        status: "active"
      })
      .eq('id', data.id)
      .select()
      .single();
    
    if (updateError || !updatedData) return undefined;
    return this.mapSubscription(updatedData);
  }

  async deleteSubscription(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id);
    
    return !error;
  }

  async updateSubscriptionNextBilling(id: string, nextBillingDate: string): Promise<Subscription | undefined> {
    // Normalize date format (YYYY-MM-DD)
    let normalized = nextBillingDate;
    try {
      const d = new Date(nextBillingDate);
      if (!isNaN(d.getTime())) {
        normalized = d.toISOString().split('T')[0];
      }
    } catch (e) {}

    const { data, error } = await supabase
      .from('subscriptions')
      .update({ next_billing_at: normalized })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[SupabaseStorage] Error updating next billing date:', error);
      return undefined;
    }

    return this.mapSubscription(data);
  }

  async getTransactions(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*');
    
    if (error) throw new Error(`Failed to get transactions: ${error.message}`);
    return (data || []).map(this.mapTransaction);
  }

  private mapTransaction(data: any): Transaction {
    return {
      id: data.id,
      description: data.description,
      amount: data.amount,
      date: data.date,
      category: data.category,
      isRecurring: data.is_recurring,
      merchantName: data.merchant_name,
      subscriptionId: data.subscription_id,
    };
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    const transaction = {
      id,
      description: insertTransaction.description,
      amount: insertTransaction.amount,
      date: insertTransaction.date,
      category: insertTransaction.category || null,
      is_recurring: insertTransaction.isRecurring,
      merchant_name: insertTransaction.merchantName || null,
      subscription_id: insertTransaction.subscriptionId || null,
    };
    
    const { data, error } = await supabase
      .from('transactions')
      .insert(transaction)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create transaction: ${error.message}`);
    return this.mapTransaction(data);
  }

  async getInsights(): Promise<Insight[]> {
    const { data, error } = await supabase
      .from('insights')
      .select('*');
    
    if (error) throw new Error(`Failed to get insights: ${error.message}`);
    return (data || []).map(this.mapInsight);
  }

  private mapInsight(data: any): Insight {
    return {
      id: data.id,
      type: data.type,
      title: data.title,
      description: data.description,
      potentialSavings: data.potential_savings,
      subscriptionId: data.subscription_id,
      priority: data.priority,
      isRead: data.is_read,
      createdAt: data.created_at,
    };
  }

  async createInsight(insertInsight: InsertInsight): Promise<Insight> {
    const id = randomUUID();
    const insight = {
      id,
      type: insertInsight.type,
      title: insertInsight.title,
      description: insertInsight.description,
      potential_savings: insertInsight.potentialSavings || null,
      subscription_id: insertInsight.subscriptionId || null,
      priority: insertInsight.priority,
      is_read: insertInsight.isRead,
      created_at: insertInsight.createdAt,
    };
    
    const { data, error } = await supabase
      .from('insights')
      .insert(insight)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create insight: ${error.message}`);
    return this.mapInsight(data);
  }

  async getBankConnections(): Promise<BankConnection[]> {
    const { data, error } = await supabase
      .from('bank_connections')
      .select('*');
    
    if (error) throw new Error(`Failed to get bank connections: ${error.message}`);
    return (data || []).map(this.mapBankConnection);
  }

  async getBankConnection(id: string): Promise<BankConnection | undefined> {
    const { data, error } = await supabase
      .from('bank_connections')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return this.mapBankConnection(data);
  }

  private mapBankConnection(data: any): BankConnection {
    return {
      id: data.id,
      bankName: data.bank_name,
      accountType: data.account_type,
      lastSync: data.last_sync,
      isConnected: data.is_connected,
      accountMask: data.account_mask,
    };
  }

  async createBankConnection(insertConnection: InsertBankConnection): Promise<BankConnection> {
    const id = randomUUID();
    const connection = {
      id,
      bank_name: insertConnection.bankName,
      account_type: insertConnection.accountType,
      last_sync: insertConnection.lastSync,
      is_connected: insertConnection.isConnected,
      account_mask: insertConnection.accountMask || null,
    };
    
    const { data, error } = await supabase
      .from('bank_connections')
      .insert(connection)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create bank connection: ${error.message}`);
    return this.mapBankConnection(data);
  }

  async updateBankConnectionSync(id: string): Promise<BankConnection | undefined> {
    const { data, error } = await supabase
      .from('bank_connections')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error || !data) return undefined;
    return this.mapBankConnection(data);
  }

  async deleteBankConnection(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('bank_connections')
      .delete()
      .eq('id', id);
    
    return !error;
  }

  async getMetrics(): Promise<DashboardMetrics> {
    const subscriptions = await this.getSubscriptions();
    
    const totalMonthlySpend = subscriptions
      .filter(sub => sub.status !== "deleted" && sub.status !== "to-cancel")
      .reduce((sum, sub) => {
        return sum + calculateMonthlyCost(sub.amount, sub.frequency);
      }, 0);

    const activeSubscriptions = subscriptions.filter(s => s.status === "active").length;
    const unusedSubscriptions = subscriptions.filter(s => s.status === "unused").length;
    
    const potentialSavings = subscriptions
      .filter(s => s.status === "unused" || s.status === "to-cancel")
      .reduce((sum, sub) => sum + calculateMonthlyCost(sub.amount, sub.frequency), 0);

    const totalUsage = subscriptions.reduce((sum, sub) => sum + sub.usageCount, 0);
    const averageCostPerUse = totalUsage > 0 ? totalMonthlySpend / totalUsage : 0;

    // Compute this month's actual savings from subscriptions deleted during
    // the current calendar month (based on `deleted_at` timestamp).
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const deletedSavings = subscriptions
      .filter(s => s.status === 'deleted')
      .filter(s => {
        if (s.deleted_at) {
          const d = new Date(s.deleted_at);
          return d >= currentMonth && d < nextMonth;
        }
        return false;
      })
      .reduce((sum, sub) => sum + calculateMonthlyCost(sub.amount, sub.frequency), 0);

    return {
      totalMonthlySpend,
      activeSubscriptions,
      potentialSavings,
      thisMonthSavings: Math.round(deletedSavings * 100) / 100,
      unusedSubscriptions,
      averageCostPerUse,
    };
  }

  async getMonthlySpending(): Promise<MonthlySpending[]> {
    return [];
  }

  async getSpendingByCategory(): Promise<SpendingByCategory[]> {
    const subscriptions = await this.getSubscriptions();
    const categoryMap = new Map<SubscriptionCategory, { amount: number; count: number }>();

    for (const sub of subscriptions) {
      if (sub.status === "to-cancel") continue;
      const monthlyAmount = calculateMonthlyCost(sub.amount, sub.frequency);
      const existing = categoryMap.get(sub.category) || { amount: 0, count: 0 };
      categoryMap.set(sub.category, {
        amount: existing.amount + monthlyAmount,
        count: existing.count + 1,
      });
    }

    const totalAmount = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.amount, 0);

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      count: data.count,
    }));
  }

  async getCostPerUseAnalysis(): Promise<CostPerUseAnalysis[]> {
    const subscriptions = await this.getSubscriptions();
    
    return subscriptions
      .filter(sub => sub.status !== "to-cancel")
      .map(sub => {
        const monthlyAmount = calculateMonthlyCost(sub.amount, sub.frequency);
        const costPerUse = sub.usageCount > 0 ? monthlyAmount / sub.usageCount : monthlyAmount;
        
        let valueRating: "excellent" | "good" | "fair" | "poor";
        if (costPerUse <= 2) valueRating = "excellent";
        else if (costPerUse <= 5) valueRating = "good";
        else if (costPerUse <= 10) valueRating = "fair";
        else valueRating = "poor";

        return {
          subscriptionId: sub.id,
          name: sub.name,
          monthlyAmount,
          usageCount: sub.usageCount,
          costPerUse,
          valueRating,
        };
      })
      .sort((a, b) => b.costPerUse - a.costPerUse)
      .slice(0, 5);
  }

  async getBehavioralInsights(): Promise<OpportunityCost[]> {
    const subscriptions = await this.getSubscriptions();
    // Strictly filter only unused and to-cancel, never active
    return subscriptions
      .filter(sub => {
        if (!sub) return false;
        // If subStatus exists, both status and subStatus must be unused or to-cancel
        if (typeof sub.subStatus === 'string') {
          return (
            (sub.status === 'unused' || sub.status === 'to-cancel') &&
            (sub.subStatus === 'unused' || sub.subStatus === 'to-cancel')
          );
        }
        // If no subStatus, only status must be unused or to-cancel
        return (sub.status === 'unused' || sub.status === 'to-cancel');
      })
      .map(sub => {
        const monthlyAmount = calculateMonthlyCost(sub.amount, sub.frequency);
        return {
          subscriptionId: sub.id,
          subscriptionName: sub.name,
          subStatus: sub.subStatus,
          status: sub.status,
          monthlyAmount,
          equivalents: generateOpportunityCosts(monthlyAmount),
        };
      });
  }

  async getRecommendations(): Promise<AIRecommendation[]> {
    const subscriptions = await this.getSubscriptions();
    const recommendations: AIRecommendation[] = [];

    const actionableSubs = subscriptions.filter(s => s.status === "unused" || s.status === "to-cancel");

    const adobeSub = actionableSubs.find(s => s.name.toLowerCase().includes("adobe"));
    if (adobeSub) {
      recommendations.push({
        id: randomUUID(),
        type: "alternative",
        title: "Switch from Adobe to Affinity",
        description: "Affinity offers similar professional design tools with a one-time purchase instead of monthly fees.",
        currentCost: calculateMonthlyCost(adobeSub.amount, adobeSub.frequency),
        suggestedCost: 0,
        savings: calculateMonthlyCost(adobeSub.amount, adobeSub.frequency),
        subscriptionId: adobeSub.id,
        alternativeName: "Affinity Suite",
        confidence: 0.85,
      });
    }

    const unusedSubs = actionableSubs.filter(s => s.status === "unused");
    for (const sub of unusedSubs) {
      recommendations.push({
        id: randomUUID(),
        type: "cancel",
        title: `Cancel ${sub.name}`,
        description: `You've barely used ${sub.name} this month. Consider cancelling to save money.`,
        currentCost: calculateMonthlyCost(sub.amount, sub.frequency),
        suggestedCost: 0,
        savings: calculateMonthlyCost(sub.amount, sub.frequency),
        subscriptionId: sub.id,
        confidence: 0.92,
      });
    }

    const streamingSubs = actionableSubs.filter(s => s.category === "streaming" && (s.status === "unused" || s.status === "to-cancel"));
    if (streamingSubs.length > 1) {
      const totalStreaming = streamingSubs.reduce((sum, s) => sum + calculateMonthlyCost(s.amount, s.frequency), 0);
      if (totalStreaming > 25) {
        recommendations.push({
          id: randomUUID(),
          type: "negotiate",
          title: "Rotate streaming services",
          description: "Consider subscribing to one streaming service at a time and rotating monthly based on what you want to watch.",
          currentCost: totalStreaming,
          suggestedCost: 15.99,
          savings: totalStreaming - 15.99,
          subscriptionId: streamingSubs[0].id,
          confidence: 0.78,
        });
      }
    }

    return recommendations;
  }
}

export const supabaseStorage = new SupabaseStorage();
