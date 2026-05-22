"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.SupabaseStorage = exports.MemStorage = void 0;
var crypto_1 = require("crypto");
function calculateMonthlyCost(amount, frequency) {
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
var OPPORTUNITY_COSTS_BASE_USD = [
    { item: "coffee drinks", unitCostUsd: 4.5, icon: "coffee" },
    { item: "breakfast sandwiches", unitCostUsd: 6.5, icon: "shopping" },
    { item: "lunch meals", unitCostUsd: 13, icon: "utensils" },
    { item: "movie tickets", unitCostUsd: 14.5, icon: "film" },
    { item: "Spotify months", unitCostUsd: 10.99, icon: "music" },
    { item: "Netflix months", unitCostUsd: 15.49, icon: "tv" },
    { item: "gym day passes", unitCostUsd: 20, icon: "dumbbell" },
    { item: "gas tank fills", unitCostUsd: 55, icon: "fuel" },
    { item: "meal kit deliveries", unitCostUsd: 60, icon: "shopping" },
    { item: "one-way flights", unitCostUsd: 150, icon: "plane" },
];
var CURRENCY_EXCHANGE_RATES = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    CAD: 1.35,
    AUD: 1.52,
    JPY: 152.0,
    CHF: 0.88,
    SEK: 10.85,
    NOK: 10.75,
    DKK: 6.95,
    PLN: 4.05,
    CZK: 23.5,
    HUF: 365.0,
    BRL: 5.25,
    MXN: 18.5,
    ARS: 950.0,
    TRY: 34.0,
    ZAR: 18.5,
    INR: 84.0,
    CNY: 7.25,
    KRW: 1350.0,
    SGD: 1.35,
    HKD: 7.8,
    NZD: 1.65,
};
function generateOpportunityCosts(monthlyAmount, currency) {
    var _a;
    if (currency === void 0) { currency = 'USD'; }
    var normalizedCurrency = (currency || 'USD').toUpperCase();
    var rate = (_a = CURRENCY_EXCHANGE_RATES[normalizedCurrency]) !== null && _a !== void 0 ? _a : 1;
    return OPPORTUNITY_COSTS_BASE_USD
        .map(function (item) { return ({
        item: item.item,
        count: Math.floor(monthlyAmount / (item.unitCostUsd * rate)),
        icon: item.icon,
    }); })
        .filter(function (item) { return item.count >= 1; })
        .sort(function (a, b) { return b.count - a.count || a.item.localeCompare(b.item); })
        .slice(0, 3);
}
var MemStorage = /** @class */ (function () {
    function MemStorage() {
        this.users = new Map();
        this.subscriptions = new Map();
        this.transactions = new Map();
        this.insights = new Map();
        this.bankConnections = new Map();
        this.initializeMockData();
    }
    MemStorage.prototype.initializeMockData = function () {
        var mockSubscriptionBase = {
            userId: (0, crypto_1.randomUUID)(),
            websiteDomain: null,
            scheduledCancellationDate: null,
            cancellationUrl: null,
            monthlyUsageCount: 0,
            usageMonth: null,
        };
        var mockSubscriptions = [
            __assign(__assign({}, mockSubscriptionBase), { id: (0, crypto_1.randomUUID)(), name: "Netflix", category: "streaming", amount: 15.99, currency: "USD", frequency: "monthly", nextBillingDate: "2024-02-15", status: "active", usageCount: 12, lastUsedDate: "2024-01-28", logoUrl: null, description: "Streaming service", isDetected: true, billingMonth: "2026-05" }),
            __assign(__assign({}, mockSubscriptionBase), { id: (0, crypto_1.randomUUID)(), name: "Spotify Premium", category: "streaming", amount: 10.99, currency: "USD", frequency: "monthly", nextBillingDate: "2024-02-10", status: "active", usageCount: 25, lastUsedDate: "2024-01-29", logoUrl: null, description: "Music streaming", isDetected: true, billingMonth: "2026-05" }),
            __assign(__assign({}, mockSubscriptionBase), { id: (0, crypto_1.randomUUID)(), name: "Adobe Creative Cloud", category: "software", amount: 54.99, currency: "USD", frequency: "monthly", nextBillingDate: "2024-02-05", status: "active", usageCount: 3, lastUsedDate: "2024-01-15", logoUrl: null, description: "Design software suite", isDetected: true, billingMonth: "2026-05" }),
            __assign(__assign({}, mockSubscriptionBase), { id: (0, crypto_1.randomUUID)(), name: "Planet Fitness", category: "fitness", amount: 24.99, currency: "USD", frequency: "monthly", nextBillingDate: "2024-02-01", status: "unused", usageCount: 1, lastUsedDate: "2024-01-02", logoUrl: null, description: "Gym membership", isDetected: true, billingMonth: "2026-05" }),
            __assign(__assign({}, mockSubscriptionBase), { id: (0, crypto_1.randomUUID)(), name: "Dropbox Plus", category: "cloud-storage", amount: 11.99, currency: "USD", frequency: "monthly", nextBillingDate: "2024-02-20", status: "active", usageCount: 8, lastUsedDate: "2024-01-27", logoUrl: null, description: "Cloud storage", isDetected: true, billingMonth: "2026-05" }),
            __assign(__assign({}, mockSubscriptionBase), { id: (0, crypto_1.randomUUID)(), name: "New York Times", category: "news", amount: 17.00, currency: "USD", frequency: "monthly", nextBillingDate: "2024-02-08", status: "unused", usageCount: 2, lastUsedDate: "2024-01-10", logoUrl: null, description: "News subscription", isDetected: true, billingMonth: "2026-05" }),
            __assign(__assign({}, mockSubscriptionBase), { id: (0, crypto_1.randomUUID)(), name: "Xbox Game Pass", category: "gaming", amount: 14.99, currency: "USD", frequency: "monthly", nextBillingDate: "2024-02-12", status: "active", usageCount: 15, lastUsedDate: "2024-01-29", logoUrl: null, description: "Gaming subscription", isDetected: true, billingMonth: "2026-05" }),
            __assign(__assign({}, mockSubscriptionBase), { id: (0, crypto_1.randomUUID)(), name: "LinkedIn Premium", category: "productivity", amount: 29.99, currency: "USD", frequency: "monthly", nextBillingDate: "2024-02-18", status: "to-cancel", usageCount: 0, lastUsedDate: null, logoUrl: null, description: "Professional networking", isDetected: true, billingMonth: "2026-05" }),
        ];
        for (var _i = 0, mockSubscriptions_1 = mockSubscriptions; _i < mockSubscriptions_1.length; _i++) {
            var sub = mockSubscriptions_1[_i];
            this.subscriptions.set(sub.id, sub);
        }
        var mockBankConnection = {
            id: (0, crypto_1.randomUUID)(),
            provider: "Chase",
            bankName: "Chase Bank",
            accountType: "checking",
            lastSync: new Date().toISOString(),
            isConnected: true,
            accountMask: "4521",
        };
        this.bankConnections.set(mockBankConnection.id, mockBankConnection);
        var mockInsights = [
            {
                id: (0, crypto_1.randomUUID)(),
                userId: mockSubscriptionBase.userId,
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
                id: (0, crypto_1.randomUUID)(),
                userId: mockSubscriptionBase.userId,
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
                id: (0, crypto_1.randomUUID)(),
                userId: mockSubscriptionBase.userId,
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
        for (var _a = 0, mockInsights_1 = mockInsights; _a < mockInsights_1.length; _a++) {
            var insight = mockInsights_1[_a];
            this.insights.set(insight.id, insight);
        }
    };
    MemStorage.prototype.getUser = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.users.get(id)];
            });
        });
    };
    MemStorage.prototype.getUserByUsername = function (username) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.users.values()).find(function (user) { return user.username === username; })];
            });
        });
    };
    MemStorage.prototype.createUser = function (insertUser) {
        return __awaiter(this, void 0, void 0, function () {
            var id, user;
            return __generator(this, function (_a) {
                id = (0, crypto_1.randomUUID)();
                user = __assign(__assign({}, insertUser), { id: id, currency: insertUser.currency || 'USD' });
                this.users.set(id, user);
                return [2 /*return*/, user];
            });
        });
    };
    MemStorage.prototype.updateUserEmail = function (id, email) {
        return __awaiter(this, void 0, void 0, function () {
            var user, updated;
            return __generator(this, function (_a) {
                user = this.users.get(id);
                if (!user)
                    return [2 /*return*/, undefined];
                updated = __assign(__assign({}, user), { email: email });
                this.users.set(id, updated);
                return [2 /*return*/, updated];
            });
        });
    };
    MemStorage.prototype.updateUserPassword = function (id, password) {
        return __awaiter(this, void 0, void 0, function () {
            var user, updated;
            return __generator(this, function (_a) {
                user = this.users.get(id);
                if (!user)
                    return [2 /*return*/, undefined];
                updated = __assign(__assign({}, user), { password: password });
                this.users.set(id, updated);
                return [2 /*return*/, updated];
            });
        });
    };
    MemStorage.prototype.updateUserCurrency = function (id, currency) {
        return __awaiter(this, void 0, void 0, function () {
            var user, updated;
            return __generator(this, function (_a) {
                user = this.users.get(id);
                if (!user)
                    return [2 /*return*/, undefined];
                updated = __assign(__assign({}, user), { currency: currency });
                this.users.set(id, updated);
                return [2 /*return*/, updated];
            });
        });
    };
    MemStorage.prototype.getSubscriptions = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.subscriptions.values())];
            });
        });
    };
    MemStorage.prototype.getSubscription = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.subscriptions.get(id)];
            });
        });
    };
    MemStorage.prototype.createSubscription = function (insertSubscription) {
        return __awaiter(this, void 0, void 0, function () {
            var id, subscription;
            var _a, _b;
            return __generator(this, function (_c) {
                id = (0, crypto_1.randomUUID)();
                subscription = {
                    id: id,
                    userId: insertSubscription.userId,
                    name: insertSubscription.name,
                    category: insertSubscription.category,
                    amount: insertSubscription.amount,
                    currency: insertSubscription.currency || "USD",
                    frequency: insertSubscription.frequency,
                    nextBillingDate: insertSubscription.nextBillingDate,
                    status: (insertSubscription.status || "active"),
                    usageCount: insertSubscription.usageCount || 0,
                    lastUsedDate: insertSubscription.lastUsedDate || null,
                    logoUrl: insertSubscription.logoUrl || null,
                    description: insertSubscription.description || null,
                    isDetected: (_a = insertSubscription.isDetected) !== null && _a !== void 0 ? _a : false,
                    websiteDomain: insertSubscription.websiteDomain || null,
                    scheduledCancellationDate: insertSubscription.scheduledCancellationDate || null,
                    cancellationUrl: insertSubscription.cancellationUrl || null,
                    monthlyUsageCount: insertSubscription.monthlyUsageCount,
                    usageMonth: (_b = insertSubscription.usageMonth) !== null && _b !== void 0 ? _b : null,
                };
                this.subscriptions.set(id, subscription);
                return [2 /*return*/, subscription];
            });
        });
    };
    MemStorage.prototype.updateSubscriptionStatus = function (id, status) {
        return __awaiter(this, void 0, void 0, function () {
            var subscription, updated;
            return __generator(this, function (_a) {
                subscription = this.subscriptions.get(id);
                if (!subscription)
                    return [2 /*return*/, undefined];
                updated = __assign(__assign({}, subscription), { status: status });
                this.subscriptions.set(id, updated);
                return [2 /*return*/, updated];
            });
        });
    };
    MemStorage.prototype.updateSubscriptionUsage = function (id, usageCount) {
        return __awaiter(this, void 0, void 0, function () {
            var subscription, month, updated;
            return __generator(this, function (_a) {
                subscription = this.subscriptions.get(id);
                if (!subscription)
                    return [2 /*return*/, undefined];
                month = new Date().toISOString().substr(0, 7);
                updated = __assign(__assign({}, subscription), { usageCount: usageCount, monthlyUsageCount: usageCount, usageMonth: month, lastUsedDate: new Date().toISOString().split('T')[0] });
                this.subscriptions.set(id, updated);
                return [2 /*return*/, updated];
            });
        });
    };
    MemStorage.prototype.recordSubscriptionUsage = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var subscription, month, monthly, usageMonth, updated;
            return __generator(this, function (_a) {
                subscription = this.subscriptions.get(id);
                if (!subscription)
                    return [2 /*return*/, undefined];
                month = new Date().toISOString().substr(0, 7);
                monthly = (subscription.monthlyUsageCount || 0) + 1;
                usageMonth = subscription.usageMonth;
                if (subscription.usageMonth !== month) {
                    monthly = 1;
                    usageMonth = month;
                }
                updated = __assign(__assign({}, subscription), { usageCount: subscription.usageCount + 1, monthlyUsageCount: monthly, usageMonth: usageMonth, lastUsedDate: new Date().toISOString().split('T')[0], status: subscription.usageCount + 1 > 0 ? "active" : subscription.status });
                this.subscriptions.set(id, updated);
                return [2 /*return*/, updated];
            });
        });
    };
    MemStorage.prototype.deleteSubscription = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.subscriptions.delete(id)];
            });
        });
    };
    MemStorage.prototype.trackUsageByDomain = function (userId, domain, timeSpent) {
        return __awaiter(this, void 0, void 0, function () {
            var subscription, month;
            return __generator(this, function (_a) {
                subscription = Array.from(this.subscriptions.values()).find(function (sub) { return sub.userId === userId && sub.websiteDomain === domain; });
                if (!subscription) {
                    return [2 /*return*/, undefined];
                }
                subscription.usageCount += 1;
                month = new Date().toISOString().slice(0, 7);
                if (subscription.usageMonth !== month) {
                    subscription.monthlyUsageCount = 1;
                    subscription.usageMonth = month;
                }
                else {
                    subscription.monthlyUsageCount += 1;
                }
                subscription.lastUsedDate = new Date().toISOString().split('T')[0];
                subscription.status = 'active';
                this.subscriptions.set(subscription.id, subscription);
                return [2 /*return*/, subscription];
            });
        });
    };
    MemStorage.prototype.updateSubscriptionNextBilling = function (id, nextBillingDate) {
        return __awaiter(this, void 0, void 0, function () {
            var subscription, normalized, d, updated;
            return __generator(this, function (_a) {
                subscription = this.subscriptions.get(id);
                if (!subscription)
                    return [2 /*return*/, undefined];
                normalized = nextBillingDate;
                try {
                    d = new Date(nextBillingDate);
                    if (!isNaN(d.getTime())) {
                        normalized = d.toISOString().split('T')[0];
                    }
                }
                catch (e) { }
                updated = __assign(__assign({}, subscription), { nextBillingDate: normalized });
                this.subscriptions.set(id, updated);
                return [2 /*return*/, updated];
            });
        });
    };
    MemStorage.prototype.getTransactions = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.transactions.values())];
            });
        });
    };
    MemStorage.prototype.createTransaction = function (insertTransaction) {
        return __awaiter(this, void 0, void 0, function () {
            var id, transaction;
            var _a;
            return __generator(this, function (_b) {
                id = (0, crypto_1.randomUUID)();
                transaction = __assign(__assign({}, insertTransaction), { id: id, category: insertTransaction.category || null, isRecurring: (_a = insertTransaction.isRecurring) !== null && _a !== void 0 ? _a : false, merchantName: insertTransaction.merchantName || null, subscriptionId: insertTransaction.subscriptionId || null });
                this.transactions.set(id, transaction);
                return [2 /*return*/, transaction];
            });
        });
    };
    MemStorage.prototype.getInsights = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.insights.values())];
            });
        });
    };
    MemStorage.prototype.createInsight = function (insertInsight) {
        return __awaiter(this, void 0, void 0, function () {
            var id, insight;
            var _a, _b;
            return __generator(this, function (_c) {
                id = (0, crypto_1.randomUUID)();
                insight = __assign(__assign({}, insertInsight), { id: id, potentialSavings: insertInsight.potentialSavings || null, subscriptionId: insertInsight.subscriptionId || null, priority: (_a = insertInsight.priority) !== null && _a !== void 0 ? _a : 1, isRead: (_b = insertInsight.isRead) !== null && _b !== void 0 ? _b : false });
                this.insights.set(id, insight);
                return [2 /*return*/, insight];
            });
        });
    };
    MemStorage.prototype.getBankConnections = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.bankConnections.values())];
            });
        });
    };
    MemStorage.prototype.getBankConnection = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.bankConnections.get(id)];
            });
        });
    };
    MemStorage.prototype.createBankConnection = function (insertConnection) {
        return __awaiter(this, void 0, void 0, function () {
            var id, connection;
            var _a;
            return __generator(this, function (_b) {
                id = (0, crypto_1.randomUUID)();
                connection = __assign(__assign({}, insertConnection), { id: id, accountMask: insertConnection.accountMask || null, isConnected: (_a = insertConnection.isConnected) !== null && _a !== void 0 ? _a : true });
                this.bankConnections.set(id, connection);
                return [2 /*return*/, connection];
            });
        });
    };
    MemStorage.prototype.updateBankConnectionSync = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var connection, updated;
            return __generator(this, function (_a) {
                connection = this.bankConnections.get(id);
                if (!connection)
                    return [2 /*return*/, undefined];
                updated = __assign(__assign({}, connection), { lastSync: new Date().toISOString() });
                this.bankConnections.set(id, updated);
                return [2 /*return*/, updated];
            });
        });
    };
    MemStorage.prototype.deleteBankConnection = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.bankConnections.delete(id)];
            });
        });
    };
    MemStorage.prototype.getMetrics = function () {
        return __awaiter(this, void 0, void 0, function () {
            function getBillingMonth(sub) {
                var billingMonth = sub.billing_month || sub.billingMonth || null;
                if (!billingMonth || typeof billingMonth !== 'string')
                    return null;
                var match = billingMonth.match(/^(\d{4})-(\d{1,2})$/);
                if (!match)
                    return null;
                return "".concat(match[1], "-").concat(String(match[2]).padStart(2, '0'));
            }
            function parseRenewalDate(dateStr) {
                if (!dateStr)
                    return null;
                var m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (m) {
                    var y = Number(m[1]);
                    var mo = Number(m[2]) - 1;
                    var d = Number(m[3]);
                    var dt = new Date(y, mo, d);
                    dt.setHours(0, 0, 0, 0);
                    return dt;
                }
                var parsed = new Date(dateStr);
                if (Number.isNaN(parsed.getTime()))
                    return null;
                parsed.setHours(0, 0, 0, 0);
                return parsed;
            }
            var subscriptions, now, monthStart, totalMonthlySpend, activeSubscriptions, unusedSubscriptions, potentialSavings, totalUsage, averageCostPerUse;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getSubscriptions()];
                    case 1:
                        subscriptions = _a.sent();
                        now = new Date();
                        monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                        totalMonthlySpend = subscriptions.reduce(function (sum, sub) {
                            if (sub.status === 'to-cancel')
                                return sum;
                            var monthly = calculateMonthlyCost(sub.amount, sub.frequency);
                            var targetMonth = "".concat(monthStart.getFullYear(), "-").concat(String(monthStart.getMonth() + 1).padStart(2, '0'));
                            var billingMonth = getBillingMonth(sub);
                            var renewalDate = parseRenewalDate(sub.next_billing_at || sub.nextBillingDate || sub.next_billing_date || sub.next_billing);
                            var billedInMonth = false;
                            if (billingMonth === targetMonth) {
                                if (renewalDate) {
                                    if (renewalDate <= now)
                                        billedInMonth = true;
                                    else if ("".concat(renewalDate.getFullYear(), "-").concat(String(renewalDate.getMonth() + 1).padStart(2, '0')) !== targetMonth)
                                        billedInMonth = true;
                                }
                            }
                            else {
                                if (renewalDate) {
                                    if ("".concat(renewalDate.getFullYear(), "-").concat(String(renewalDate.getMonth() + 1).padStart(2, '0')) === targetMonth) {
                                        billedInMonth = renewalDate <= now;
                                    }
                                }
                            }
                            return billedInMonth ? sum + monthly : sum;
                        }, 0);
                        activeSubscriptions = subscriptions.filter(function (s) { return s.status === "active"; }).length;
                        unusedSubscriptions = subscriptions.filter(function (s) { return s.status === "unused"; }).length;
                        potentialSavings = subscriptions
                            .filter(function (s) { return s.status === "unused" || s.status === "to-cancel"; })
                            .reduce(function (sum, sub) { return sum + calculateMonthlyCost(sub.amount, sub.frequency); }, 0);
                        totalUsage = subscriptions.reduce(function (sum, sub) { return sum + sub.usageCount; }, 0);
                        averageCostPerUse = totalUsage > 0 ? totalMonthlySpend / totalUsage : 0;
                        return [2 /*return*/, {
                                totalMonthlySpend: totalMonthlySpend,
                                activeSubscriptions: activeSubscriptions,
                                potentialSavings: potentialSavings,
                                thisMonthSavings: 127.50,
                                unusedSubscriptions: unusedSubscriptions,
                                averageCostPerUse: averageCostPerUse,
                            }];
                }
            });
        });
    };
    MemStorage.prototype.getMonthlySpending = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, [
                        { month: "Aug", amount: 245.50 },
                        { month: "Sep", amount: 232.80 },
                        { month: "Oct", amount: 258.20 },
                        { month: "Nov", amount: 221.40 },
                        { month: "Dec", amount: 198.90 },
                        { month: "Jan", amount: 180.92 },
                    ]];
            });
        });
    };
    MemStorage.prototype.getSpendingByCategory = function () {
        return __awaiter(this, void 0, void 0, function () {
            var subscriptions, categoryMap, _i, subscriptions_1, sub, monthlyAmount, existing, totalAmount;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getSubscriptions()];
                    case 1:
                        subscriptions = _a.sent();
                        categoryMap = new Map();
                        for (_i = 0, subscriptions_1 = subscriptions; _i < subscriptions_1.length; _i++) {
                            sub = subscriptions_1[_i];
                            if (sub.status === "to-cancel")
                                continue;
                            monthlyAmount = calculateMonthlyCost(sub.amount, sub.frequency);
                            existing = categoryMap.get(sub.category) || { amount: 0, count: 0 };
                            categoryMap.set(sub.category, {
                                amount: existing.amount + monthlyAmount,
                                count: existing.count + 1,
                            });
                        }
                        totalAmount = Array.from(categoryMap.values()).reduce(function (sum, cat) { return sum + cat.amount; }, 0);
                        return [2 /*return*/, Array.from(categoryMap.entries()).map(function (_a) {
                                var category = _a[0], data = _a[1];
                                return ({
                                    category: category,
                                    amount: data.amount,
                                    percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
                                    count: data.count,
                                });
                            })];
                }
            });
        });
    };
    MemStorage.prototype.getCostPerUseAnalysis = function () {
        return __awaiter(this, void 0, void 0, function () {
            var subscriptions, currentMonth;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getSubscriptions()];
                    case 1:
                        subscriptions = _a.sent();
                        currentMonth = new Date().toISOString().slice(0, 7);
                        return [2 /*return*/, subscriptions
                                .filter(function (sub) { return sub.status !== "to-cancel"; })
                                .map(function (sub) {
                                var monthlyAmount = calculateMonthlyCost(sub.amount, sub.frequency);
                                var usageForCost = sub.usageMonth === currentMonth ? sub.monthlyUsageCount : sub.usageCount;
                                var costPerUse = usageForCost > 0 ? monthlyAmount / usageForCost : monthlyAmount;
                                var valueRating;
                                if (costPerUse <= 2)
                                    valueRating = "excellent";
                                else if (costPerUse <= 5)
                                    valueRating = "good";
                                else if (costPerUse <= 10)
                                    valueRating = "fair";
                                else
                                    valueRating = "poor";
                                return {
                                    subscriptionId: sub.id,
                                    name: sub.name,
                                    monthlyAmount: monthlyAmount,
                                    usageCount: sub.usageCount,
                                    costPerUse: costPerUse,
                                    currency: sub.currency || 'USD',
                                    valueRating: valueRating,
                                };
                            })
                                .sort(function (a, b) { return b.costPerUse - a.costPerUse; })
                                .slice(0, 5)];
                }
            });
        });
    };
    MemStorage.prototype.getBehavioralInsights = function () {
        return __awaiter(this, void 0, void 0, function () {
            var subscriptions;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getSubscriptions()];
                    case 1:
                        subscriptions = _a.sent();
                        return [2 /*return*/, subscriptions
                                .filter(function (sub) { return sub.status === "unused" || sub.status === "to-cancel"; })
                                .map(function (sub) {
                                var monthlyAmount = calculateMonthlyCost(sub.amount, sub.frequency);
                                return {
                                    subscriptionId: sub.id,
                                    subscriptionName: sub.name,
                                    monthlyAmount: monthlyAmount,
                                    currency: sub.currency || 'USD',
                                    equivalents: generateOpportunityCosts(monthlyAmount),
                                };
                            })];
                }
            });
        });
    };
    MemStorage.prototype.getRecommendations = function () {
        return __awaiter(this, void 0, void 0, function () {
            var subscriptions, recommendations, adobeSub, unusedSubs, _i, unusedSubs_1, sub, streamingSubs, totalStreaming;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getSubscriptions()];
                    case 1:
                        subscriptions = _a.sent();
                        recommendations = [];
                        adobeSub = subscriptions.find(function (s) { return s.name.toLowerCase().includes("adobe"); });
                        if (adobeSub) {
                            recommendations.push({
                                id: (0, crypto_1.randomUUID)(),
                                type: "alternative",
                                title: "Switch from Adobe to Affinity",
                                description: "Affinity offers similar professional design tools with a one-time purchase instead of monthly fees.",
                                currentCost: calculateMonthlyCost(adobeSub.amount, adobeSub.frequency),
                                suggestedCost: 0,
                                savings: calculateMonthlyCost(adobeSub.amount, adobeSub.frequency),
                                subscriptionId: adobeSub.id,
                                alternativeName: "Affinity Suite",
                                confidence: 0.85,
                                currency: adobeSub.currency || 'USD',
                            });
                        }
                        unusedSubs = subscriptions.filter(function (s) { return s.status === "unused"; });
                        for (_i = 0, unusedSubs_1 = unusedSubs; _i < unusedSubs_1.length; _i++) {
                            sub = unusedSubs_1[_i];
                            recommendations.push({
                                id: (0, crypto_1.randomUUID)(),
                                type: "cancel",
                                title: "Cancel ".concat(sub.name),
                                description: "You've barely used ".concat(sub.name, " this month. Consider cancelling to save money."),
                                currentCost: calculateMonthlyCost(sub.amount, sub.frequency),
                                suggestedCost: 0,
                                savings: calculateMonthlyCost(sub.amount, sub.frequency),
                                subscriptionId: sub.id,
                                confidence: 0.92,
                                currency: sub.currency || 'USD',
                            });
                        }
                        streamingSubs = subscriptions.filter(function (s) { return s.category === "streaming" && s.status === "active"; });
                        if (streamingSubs.length > 1) {
                            totalStreaming = streamingSubs.reduce(function (sum, s) { return sum + calculateMonthlyCost(s.amount, s.frequency); }, 0);
                            if (totalStreaming > 25) {
                                recommendations.push({
                                    id: (0, crypto_1.randomUUID)(),
                                    type: "negotiate",
                                    title: "Rotate streaming services",
                                    description: "Consider subscribing to one streaming service at a time and rotating monthly based on what you want to watch.",
                                    currentCost: totalStreaming,
                                    suggestedCost: 15.99,
                                    savings: totalStreaming - 15.99,
                                    subscriptionId: streamingSubs[0].id,
                                    confidence: 0.78,
                                    currency: streamingSubs[0].currency || 'USD',
                                });
                            }
                        }
                        return [2 /*return*/, recommendations];
                }
            });
        });
    };
    return MemStorage;
}());
exports.MemStorage = MemStorage;
// Export only Supabase storage - in-memory storage has been removed
// All storage operations use Supabase as the primary database
var supabaseStorage_js_1 = require("./supabaseStorage.cjs");
Object.defineProperty(exports, "SupabaseStorage", { enumerable: true, get: function () { return supabaseStorage_js_1.SupabaseStorage; } });
var supabaseStorage_js_2 = require("./supabaseStorage.cjs");
Object.defineProperty(exports, "storage", { enumerable: true, get: function () { return supabaseStorage_js_2.supabaseStorage; } });
