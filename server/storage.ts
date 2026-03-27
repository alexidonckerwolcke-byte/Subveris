import { randomUUID } from "crypto";
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
  BillingFrequency,
} from "@shared/schema";

// Manual type for creating subscriptions (avoids Drizzle schema validation)
export interface InsertSubscriptionData {
  userId: string;
  name: string;
  category: string;
  amount: number;
  frequency: string;
  nextBillingDate: string;
  status?: string;
  usageCount?: number;
  isDetected?: boolean;
  websiteDomain?: string;
  logoUrl?: string;
  description?: string;
  currency?: string;
  scheduledCancellationDate?: string;
  cancellationUrl?: string;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserEmail(id: string, email: string): Promise<User | undefined>;
  updateUserPassword(id: string, password: string): Promise<User | undefined>;
  
  getSubscriptions(): Promise<Subscription[]>;
  getSubscription(id: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscriptionData): Promise<Subscription>;
  updateSubscriptionStatus(id: string, status: SubscriptionStatus): Promise<Subscription | undefined>;
  updateSubscriptionUsage(id: string, usageCount: number): Promise<Subscription | undefined>;
  recordSubscriptionUsage(id: string): Promise<Subscription | undefined>;
  trackUsageByDomain(userId: string, domain: string, timeSpent: number): Promise<Subscription | undefined>;
  deleteSubscription(id: string): Promise<boolean>;
  updateSubscriptionNextBilling(id: string, nextBillingDate: string): Promise<Subscription | undefined>;
  
  getTransactions(): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  
  getInsights(): Promise<Insight[]>;
  createInsight(insight: InsertInsight): Promise<Insight>;
  
  getBankConnections(): Promise<BankConnection[]>;
  getBankConnection(id: string): Promise<BankConnection | undefined>;
  createBankConnection(connection: InsertBankConnection): Promise<BankConnection>;
  updateBankConnectionSync(id: string): Promise<BankConnection | undefined>;
  deleteBankConnection(id: string): Promise<boolean>;
  
  getMetrics(): Promise<DashboardMetrics>;
  getMonthlySpending(): Promise<MonthlySpending[]>;
  getSpendingByCategory(): Promise<SpendingByCategory[]>;
  getCostPerUseAnalysis(): Promise<CostPerUseAnalysis[]>;
  getBehavioralInsights(): Promise<OpportunityCost[]>;
  getRecommendations(): Promise<AIRecommendation[]>;
}

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

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private subscriptions: Map<string, Subscription>;
  private transactions: Map<string, Transaction>;
  private insights: Map<string, Insight>;
  private bankConnections: Map<string, BankConnection>;

  constructor() {
    this.users = new Map();
    this.subscriptions = new Map();
    this.transactions = new Map();
    this.insights = new Map();
    this.bankConnections = new Map();
    
    this.initializeMockData();
  }

  private initializeMockData() {
    const mockSubscriptions: Subscription[] = [
      {
        id: randomUUID(),
        name: "Netflix",
        category: "streaming",
        amount: 15.99,
        currency: "USD",
        frequency: "monthly",
        nextBillingDate: "2024-02-15",
        status: "active",
        usageCount: 12,
        lastUsedDate: "2024-01-28",
        logoUrl: null,
        description: "Streaming service",
        isDetected: true,
      },
      {
        id: randomUUID(),
        name: "Spotify Premium",
        category: "streaming",
        amount: 10.99,
        currency: "USD",
        frequency: "monthly",
        nextBillingDate: "2024-02-10",
        status: "active",
        usageCount: 25,
        lastUsedDate: "2024-01-29",
        logoUrl: null,
        description: "Music streaming",
        isDetected: true,
      },
      {
        id: randomUUID(),
        name: "Adobe Creative Cloud",
        category: "software",
        amount: 54.99,
        currency: "USD",
        frequency: "monthly",
        nextBillingDate: "2024-02-05",
        status: "active",
        usageCount: 3,
        lastUsedDate: "2024-01-15",
        logoUrl: null,
        description: "Design software suite",
        isDetected: true,
      },
      {
        id: randomUUID(),
        name: "Planet Fitness",
        category: "fitness",
        amount: 24.99,
        currency: "USD",
        frequency: "monthly",
        nextBillingDate: "2024-02-01",
        status: "unused",
        usageCount: 1,
        lastUsedDate: "2024-01-02",
        logoUrl: null,
        description: "Gym membership",
        isDetected: true,
      },
      {
        id: randomUUID(),
        name: "Dropbox Plus",
        category: "cloud-storage",
        amount: 11.99,
        currency: "USD",
        frequency: "monthly",
        nextBillingDate: "2024-02-20",
        status: "active",
        usageCount: 8,
        lastUsedDate: "2024-01-27",
        logoUrl: null,
        description: "Cloud storage",
        isDetected: true,
      },
      {
        id: randomUUID(),
        name: "New York Times",
        category: "news",
        amount: 17.00,
        currency: "USD",
        frequency: "monthly",
        nextBillingDate: "2024-02-08",
        status: "unused",
        usageCount: 2,
        lastUsedDate: "2024-01-10",
        logoUrl: null,
        description: "News subscription",
        isDetected: true,
      },
      {
        id: randomUUID(),
        name: "Xbox Game Pass",
        category: "gaming",
        amount: 14.99,
        currency: "USD",
        frequency: "monthly",
        nextBillingDate: "2024-02-12",
        status: "active",
        usageCount: 15,
        lastUsedDate: "2024-01-29",
        logoUrl: null,
        description: "Gaming subscription",
        isDetected: true,
      },
      {
        id: randomUUID(),
        name: "LinkedIn Premium",
        category: "productivity",
        amount: 29.99,
        currency: "USD",
        frequency: "monthly",
        nextBillingDate: "2024-02-18",
        status: "to-cancel",
        usageCount: 0,
        lastUsedDate: null,
        logoUrl: null,
        description: "Professional networking",
        isDetected: true,
      },
    ];

    for (const sub of mockSubscriptions) {
      this.subscriptions.set(sub.id, sub);
    }

    const mockBankConnection: BankConnection = {
      id: randomUUID(),
      bankName: "Chase Bank",
      accountType: "checking",
      lastSync: new Date().toISOString(),
      isConnected: true,
      accountMask: "4521",
    };
    this.bankConnections.set(mockBankConnection.id, mockBankConnection);

    const mockInsights: Insight[] = [
      {
        id: randomUUID(),
        type: "savings",
        title: "Cancel unused gym membership",
        description: "You've only used Planet Fitness once this month. Consider cancelling to save $24.99/mo.",
        potentialSavings: 24.99,
        subscriptionId: null,
        priority: 1,
        isRead: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: randomUUID(),
        type: "alternative",
        title: "Switch to Affinity Photo",
        description: "Affinity Photo offers similar features to Adobe Photoshop for a one-time payment of $69.99.",
        potentialSavings: 54.99,
        subscriptionId: null,
        priority: 2,
        isRead: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: randomUUID(),
        type: "tip",
        title: "Bundle your streaming services",
        description: "Consider Disney+ Bundle to get Hulu and ESPN+ included, potentially saving on separate subscriptions.",
        potentialSavings: 10.00,
        subscriptionId: null,
        priority: 3,
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    ];

    for (const insight of mockInsights) {
      this.insights.set(insight.id, insight);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id, currency: insertUser.currency || 'USD' } as any;
    this.users.set(id, user);
    return user;
  }

  async updateUserEmail(id: string, email: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updated = { ...user, email };
    this.users.set(id, updated);
    return updated;
  }

  async updateUserPassword(id: string, password: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updated = { ...user, password };
    this.users.set(id, updated);
    return updated;
  }

  async updateUserCurrency(id: string, currency: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, currency } as any;
    this.users.set(id, updated);
    return updated;
  }

  async getSubscriptions(): Promise<Subscription[]> {
    return Array.from(this.subscriptions.values());
  }

  async getSubscription(id: string): Promise<Subscription | undefined> {
    return this.subscriptions.get(id);
  }

  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const id = randomUUID();
    const subscription: Subscription = { 
      id,
      userId: insertSubscription.userId,
      name: insertSubscription.name,
      category: insertSubscription.category as SubscriptionCategory,
      amount: insertSubscription.amount,
      currency: insertSubscription.currency || "USD",
      frequency: insertSubscription.frequency as BillingFrequency,
      nextBillingDate: insertSubscription.nextBillingDate,
      status: (insertSubscription.status || "active") as SubscriptionStatus,
      usageCount: insertSubscription.usageCount || 0,
      lastUsedDate: insertSubscription.lastUsedDate || null,
      logoUrl: insertSubscription.logoUrl || null,
      description: insertSubscription.description || null,
      isDetected: insertSubscription.isDetected ?? false,
      websiteDomain: insertSubscription.websiteDomain || null,
      scheduledCancellationDate: insertSubscription.scheduledCancellationDate || null,
      cancellationUrl: insertSubscription.cancellationUrl || null,
    };
    this.subscriptions.set(id, subscription);
    return subscription;
  }

  async updateSubscriptionStatus(id: string, status: SubscriptionStatus): Promise<Subscription | undefined> {
    const subscription = this.subscriptions.get(id);
    if (!subscription) return undefined;
    
    const updated = { ...subscription, status };
    this.subscriptions.set(id, updated);
    return updated;
  }

  async updateSubscriptionUsage(id: string, usageCount: number): Promise<Subscription | undefined> {
    const subscription = this.subscriptions.get(id);
    if (!subscription) return undefined;
    const month = new Date().toISOString().substr(0,7);
    const updated: Subscription = { 
      ...subscription, 
      usageCount,
      monthlyUsageCount: usageCount,
      usageMonth: month,
      lastUsedDate: new Date().toISOString().split('T')[0]
    };
    this.subscriptions.set(id, updated);
    return updated;
  }

  async recordSubscriptionUsage(id: string): Promise<Subscription | undefined> {
    const subscription = this.subscriptions.get(id);
    if (!subscription) return undefined;
    const month = new Date().toISOString().substr(0,7);
    let monthly = (subscription.monthlyUsageCount || 0) + 1;
    let usageMonth = subscription.usageMonth;
    if (subscription.usageMonth !== month) {
      monthly = 1;
      usageMonth = month;
    }
    const updated: Subscription = { 
      ...subscription, 
      usageCount: subscription.usageCount + 1,
      monthlyUsageCount: monthly,
      usageMonth,
      lastUsedDate: new Date().toISOString().split('T')[0],
      status: subscription.usageCount + 1 > 0 ? "active" as SubscriptionStatus : subscription.status
    };
    this.subscriptions.set(id, updated);
    return updated;
  }

  async deleteSubscription(id: string): Promise<boolean> {
    return this.subscriptions.delete(id);
  }

  async updateSubscriptionNextBilling(id: string, nextBillingDate: string): Promise<Subscription | undefined> {
    const subscription = this.subscriptions.get(id);
    if (!subscription) return undefined;

    // Normalize date format (YYYY-MM-DD)
    let normalized = nextBillingDate;
    try {
      const d = new Date(nextBillingDate);
      if (!isNaN(d.getTime())) {
        normalized = d.toISOString().split('T')[0];
      }
    } catch (e) {}

    const updated = { 
      ...subscription, 
      nextBillingDate: normalized
    };
    this.subscriptions.set(id, updated);
    return updated;
  }

  async getTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values());
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    const transaction: Transaction = { 
      ...insertTransaction, 
      id,
      category: insertTransaction.category || null,
      isRecurring: insertTransaction.isRecurring ?? false,
      merchantName: insertTransaction.merchantName || null,
      subscriptionId: insertTransaction.subscriptionId || null,
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async getInsights(): Promise<Insight[]> {
    return Array.from(this.insights.values());
  }

  async createInsight(insertInsight: InsertInsight): Promise<Insight> {
    const id = randomUUID();
    const insight: Insight = { 
      ...insertInsight, 
      id,
      potentialSavings: insertInsight.potentialSavings || null,
      subscriptionId: insertInsight.subscriptionId || null,
      priority: insertInsight.priority ?? 1,
      isRead: insertInsight.isRead ?? false,
    };
    this.insights.set(id, insight);
    return insight;
  }

  async getBankConnections(): Promise<BankConnection[]> {
    return Array.from(this.bankConnections.values());
  }

  async getBankConnection(id: string): Promise<BankConnection | undefined> {
    return this.bankConnections.get(id);
  }

  async createBankConnection(insertConnection: InsertBankConnection): Promise<BankConnection> {
    const id = randomUUID();
    const connection: BankConnection = { 
      ...insertConnection, 
      id,
      accountMask: insertConnection.accountMask || null,
      isConnected: insertConnection.isConnected ?? true,
    };
    this.bankConnections.set(id, connection);
    return connection;
  }

  async updateBankConnectionSync(id: string): Promise<BankConnection | undefined> {
    const connection = this.bankConnections.get(id);
    if (!connection) return undefined;
    
    const updated = { ...connection, lastSync: new Date().toISOString() };
    this.bankConnections.set(id, updated);
    return updated;
  }

  async deleteBankConnection(id: string): Promise<boolean> {
    return this.bankConnections.delete(id);
  }

  async getMetrics(): Promise<DashboardMetrics> {
    const subscriptions = await this.getSubscriptions();
    
    const totalMonthlySpend = subscriptions.reduce((sum, sub) => {
      if (sub.status === "to-cancel") return sum;
      return sum + calculateMonthlyCost(sub.amount, sub.frequency);
    }, 0);

    const activeSubscriptions = subscriptions.filter(s => s.status === "active").length;
    const unusedSubscriptions = subscriptions.filter(s => s.status === "unused").length;
    
    const potentialSavings = subscriptions
      .filter(s => s.status === "unused" || s.status === "to-cancel")
      .reduce((sum, sub) => sum + calculateMonthlyCost(sub.amount, sub.frequency), 0);

    const totalUsage = subscriptions.reduce((sum, sub) => sum + sub.usageCount, 0);
    const averageCostPerUse = totalUsage > 0 ? totalMonthlySpend / totalUsage : 0;

    return {
      totalMonthlySpend,
      activeSubscriptions,
      potentialSavings,
      thisMonthSavings: 127.50,
      unusedSubscriptions,
      averageCostPerUse,
    };
  }

  async getMonthlySpending(): Promise<MonthlySpending[]> {
    return [
      { month: "Aug", amount: 245.50 },
      { month: "Sep", amount: 232.80 },
      { month: "Oct", amount: 258.20 },
      { month: "Nov", amount: 221.40 },
      { month: "Dec", amount: 198.90 },
      { month: "Jan", amount: 180.92 },
    ];
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
    
    return subscriptions
      .filter(sub => sub.status === "unused" || sub.status === "to-cancel")
      .map(sub => {
        const monthlyAmount = calculateMonthlyCost(sub.amount, sub.frequency);
        return {
          subscriptionId: sub.id,
          subscriptionName: sub.name,
          monthlyAmount,
          equivalents: generateOpportunityCosts(monthlyAmount),
        };
      });
  }

  async getRecommendations(): Promise<AIRecommendation[]> {
    const subscriptions = await this.getSubscriptions();
    const recommendations: AIRecommendation[] = [];

    const adobeSub = subscriptions.find(s => s.name.toLowerCase().includes("adobe"));
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

    const unusedSubs = subscriptions.filter(s => s.status === "unused");
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

    const streamingSubs = subscriptions.filter(s => s.category === "streaming" && s.status === "active");
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

// Export only Supabase storage - in-memory storage has been removed
// All storage operations use Supabase as the primary database
export { SupabaseStorage } from "./supabaseStorage";
export { supabaseStorage as storage } from "./supabaseStorage";
