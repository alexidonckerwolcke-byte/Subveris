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
exports.supabaseStorage = exports.SupabaseStorage = void 0;
var crypto_1 = require("crypto");
var supabase_js_1 = require("./supabase.cjs");
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
var SupabaseStorage = /** @class */ (function () {
    function SupabaseStorage() {
    }
    SupabaseStorage.prototype.getUser = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, supabase_js_1.supabase
                            .from('users')
                            .select('*')
                            .eq('id', id)
                            .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error || !data)
                            return [2 /*return*/, undefined];
                        return [2 /*return*/, data];
                }
            });
        });
    };
    SupabaseStorage.prototype.getUserByUsername = function (username) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, supabase_js_1.supabase
                            .from('users')
                            .select('*')
                            .eq('username', username)
                            .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error || !data)
                            return [2 /*return*/, undefined];
                        return [2 /*return*/, data];
                }
            });
        });
    };
    SupabaseStorage.prototype.createUser = function (insertUser) {
        return __awaiter(this, void 0, void 0, function () {
            var id, user, _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        id = (0, crypto_1.randomUUID)();
                        user = __assign(__assign({}, insertUser), { id: id, currency: insertUser.currency || 'USD' });
                        return [4 /*yield*/, supabase_js_1.supabase
                                .from('users')
                                .insert(user)
                                .select()
                                .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error)
                            throw new Error("Failed to create user: ".concat(error.message));
                        return [2 /*return*/, data];
                }
            });
        });
    };
    SupabaseStorage.prototype.updateUserEmail = function (id, email) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, supabase_js_1.supabase
                            .from('users')
                            .update({ email: email })
                            .eq('id', id)
                            .select()
                            .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error || !data)
                            return [2 /*return*/, undefined];
                        return [2 /*return*/, data];
                }
            });
        });
    };
    SupabaseStorage.prototype.updateUserPassword = function (id, password) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, supabase_js_1.supabase
                            .from('users')
                            .update({ password: password })
                            .eq('id', id)
                            .select()
                            .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error || !data)
                            return [2 /*return*/, undefined];
                        return [2 /*return*/, data];
                }
            });
        });
    };
    SupabaseStorage.prototype.updateUserCurrency = function (id, currency) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, supabase_js_1.supabase
                            .from('users')
                            .update({ currency: currency })
                            .eq('id', id)
                            .select()
                            .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error || !data)
                            return [2 /*return*/, undefined];
                        return [2 /*return*/, data];
                }
            });
        });
    };
    SupabaseStorage.prototype.getSubscriptions = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, supabase_js_1.supabase
                            .from('subscriptions')
                            .select('*')];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error)
                            throw new Error("Failed to get subscriptions: ".concat(error.message));
                        return [2 /*return*/, (data || []).map(this.mapSubscription)];
                }
            });
        });
    };
    SupabaseStorage.prototype.getSubscription = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, supabase_js_1.supabase
                            .from('subscriptions')
                            .select('*')
                            .eq('id', id)
                            .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error || !data)
                            return [2 /*return*/, undefined];
                        return [2 /*return*/, this.mapSubscription(data)];
                }
            });
        });
    };
    SupabaseStorage.prototype.mapSubscription = function (data) {
        return {
            id: data.id,
            userId: data.user_id,
            name: data.name,
            category: data.category,
            amount: data.amount,
            currency: data.currency,
            frequency: data.frequency,
            nextBillingDate: data.next_billing_at || data.next_billing_date,
            status: data.status,
            usageCount: typeof data.usage_count === 'number' ? data.usage_count : 0,
            lastUsedDate: data.last_used_at,
            logoUrl: data.logo_url,
            description: data.description,
            isDetected: data.is_detected,
            websiteDomain: data.website_domain || null,
            scheduledCancellationDate: data.scheduled_cancellation_date || null,
            cancellationUrl: data.cancellation_url || null,
            monthlyUsageCount: typeof data.monthly_usage_count === 'number' ? data.monthly_usage_count : 0,
            usageMonth: data.usage_month || null,
            billingMonth: data.billing_month || null,
        };
    };
    SupabaseStorage.prototype.createSubscription = function (insertSubscription) {
        return __awaiter(this, void 0, void 0, function () {
            var id, insertData, _a, data, error, err_1;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        id = (0, crypto_1.randomUUID)();
                        console.log("[Storage] Creating subscription with:", insertSubscription);
                        insertData = {
                            id: id,
                            user_id: insertSubscription.userId,
                            name: insertSubscription.name,
                            category: insertSubscription.category,
                            amount: insertSubscription.amount,
                            frequency: insertSubscription.frequency,
                            next_billing_at: insertSubscription.nextBillingDate,
                            status: insertSubscription.status || "active",
                            is_detected: (_b = insertSubscription.isDetected) !== null && _b !== void 0 ? _b : false,
                        };
                        // Add optional fields that might exist
                        if (insertSubscription.currency)
                            insertData.currency = insertSubscription.currency;
                        if (insertSubscription.usageCount !== undefined)
                            insertData.usage_count = insertSubscription.usageCount;
                        if (insertSubscription.logoUrl)
                            insertData.logo_url = insertSubscription.logoUrl;
                        if (insertSubscription.description)
                            insertData.description = insertSubscription.description;
                        if (insertSubscription.websiteDomain)
                            insertData.website_domain = insertSubscription.websiteDomain;
                        if (insertSubscription.scheduledCancellationDate)
                            insertData.scheduled_cancellation_date = insertSubscription.scheduledCancellationDate;
                        if (insertSubscription.cancellationUrl)
                            insertData.cancellation_url = insertSubscription.cancellationUrl;
                        if (insertSubscription.monthlyUsageCount !== undefined)
                            insertData.monthly_usage_count = insertSubscription.monthlyUsageCount;
                        if (insertSubscription.usageMonth)
                            insertData.usage_month = insertSubscription.usageMonth;
                        console.log("[Storage] Insert data:", insertData);
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, supabase_js_1.supabase
                                .from('subscriptions')
                                .insert(insertData)
                                .select()
                                .single()];
                    case 2:
                        _a = _c.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            console.error("[Storage] Database error:", error.code, error.message);
                            throw new Error("Failed to create subscription: ".concat(error.message));
                        }
                        console.log("[Storage] Inserted successfully");
                        return [2 /*return*/, this.mapSubscription(data)];
                    case 3:
                        err_1 = _c.sent();
                        console.error("[Storage] Exception:", err_1);
                        throw err_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    SupabaseStorage.prototype.updateSubscriptionStatus = function (id, status) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, supabase_js_1.supabase
                            .from('subscriptions')
                            .update({ status: status })
                            .eq('id', id)
                            .select()
                            .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error || !data)
                            return [2 /*return*/, undefined];
                        return [2 /*return*/, this.mapSubscription(data)];
                }
            });
        });
    };
    SupabaseStorage.prototype.updateSubscriptionUsage = function (id, usageCount) {
        return __awaiter(this, void 0, void 0, function () {
            var month, _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        month = new Date().toISOString().substr(0, 7);
                        return [4 /*yield*/, supabase_js_1.supabase
                                .from('subscriptions')
                                .update({
                                usage_count: usageCount,
                                monthly_usage_count: usageCount,
                                usage_month: month,
                                last_used_at: new Date().toISOString().split('T')[0]
                            })
                                .eq('id', id)
                                .select()
                                .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error || !data)
                            return [2 /*return*/, undefined];
                        return [2 /*return*/, this.mapSubscription(data)];
                }
            });
        });
    };
    SupabaseStorage.prototype.recordSubscriptionUsage = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var subscription, newUsageCount, month, newMonthly, newMonth, _a, data, error, mapped;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log("[SupabaseStorage] recordSubscriptionUsage called for id=".concat(id));
                        return [4 /*yield*/, this.getSubscription(id)];
                    case 1:
                        subscription = _b.sent();
                        console.log("[SupabaseStorage] fetched subscription:", subscription);
                        if (!subscription) {
                            console.warn("[SupabaseStorage] no subscription found for id=".concat(id));
                            return [2 /*return*/, undefined];
                        }
                        newUsageCount = (subscription.usageCount || 0) + 1;
                        month = new Date().toISOString().substr(0, 7);
                        newMonthly = (subscription.monthlyUsageCount || 0) + 1;
                        newMonth = subscription.usageMonth || month;
                        if (subscription.usageMonth !== month) {
                            newMonthly = 1;
                            newMonth = month;
                        }
                        return [4 /*yield*/, supabase_js_1.supabase
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
                                .single()];
                    case 2:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error || !data) {
                            console.error("[SupabaseStorage] update error for id=".concat(id), error, data);
                            return [2 /*return*/, undefined];
                        }
                        mapped = this.mapSubscription(data);
                        console.log("[SupabaseStorage] updated subscription", mapped);
                        return [2 /*return*/, mapped];
                }
            });
        });
    };
    SupabaseStorage.prototype.trackUsageByDomain = function (userId, domain, timeSpent) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error, groupIds, _b, memberGroups, memberGroupsError, _c, ownedGroups, ownedGroupsError, uniqueGroupIds, _d, sharedSubscriptions, sharedSubscriptionsError, subscriptionIds, _e, sharedDomainSubscription, sharedDomainError, subscription, newUsageCount, month, newMonthlyUsage, newUsageMonth, _f, updatedData, updateError;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0: return [4 /*yield*/, supabase_js_1.supabase
                            .from('subscriptions')
                            .select('*')
                            .eq('user_id', userId)
                            .eq('website_domain', domain)
                            .single()];
                    case 1:
                        _a = _g.sent(), data = _a.data, error = _a.error;
                        if (!((!data || error) && userId)) return [3 /*break*/, 6];
                        groupIds = [];
                        return [4 /*yield*/, supabase_js_1.supabase
                                .from('family_group_members')
                                .select('family_group_id')
                                .eq('user_id', userId)];
                    case 2:
                        _b = _g.sent(), memberGroups = _b.data, memberGroupsError = _b.error;
                        if (!memberGroupsError && Array.isArray(memberGroups)) {
                            groupIds.push.apply(groupIds, memberGroups.map(function (group) { return group.family_group_id; }).filter(Boolean));
                        }
                        return [4 /*yield*/, supabase_js_1.supabase
                                .from('family_groups')
                                .select('id')
                                .eq('owner_id', userId)];
                    case 3:
                        _c = _g.sent(), ownedGroups = _c.data, ownedGroupsError = _c.error;
                        if (!ownedGroupsError && Array.isArray(ownedGroups)) {
                            groupIds.push.apply(groupIds, ownedGroups.map(function (group) { return group.id; }).filter(Boolean));
                        }
                        uniqueGroupIds = Array.from(new Set(groupIds));
                        if (!(uniqueGroupIds.length > 0)) return [3 /*break*/, 6];
                        return [4 /*yield*/, supabase_js_1.supabase
                                .from('shared_subscriptions')
                                .select('subscription_id')
                                .in('family_group_id', uniqueGroupIds)];
                    case 4:
                        _d = _g.sent(), sharedSubscriptions = _d.data, sharedSubscriptionsError = _d.error;
                        if (!(!sharedSubscriptionsError && Array.isArray(sharedSubscriptions) && sharedSubscriptions.length > 0)) return [3 /*break*/, 6];
                        subscriptionIds = Array.from(new Set(sharedSubscriptions
                            .map(function (row) { return row.subscription_id; })
                            .filter(Boolean)));
                        if (!(subscriptionIds.length > 0)) return [3 /*break*/, 6];
                        return [4 /*yield*/, supabase_js_1.supabase
                                .from('subscriptions')
                                .select('*')
                                .in('id', subscriptionIds)
                                .eq('website_domain', domain)
                                .maybeSingle()];
                    case 5:
                        _e = _g.sent(), sharedDomainSubscription = _e.data, sharedDomainError = _e.error;
                        if (!sharedDomainError && sharedDomainSubscription) {
                            data = sharedDomainSubscription;
                        }
                        _g.label = 6;
                    case 6:
                        if (!data) {
                            console.log("[SupabaseStorage] No subscription found for user ".concat(userId, " and domain ").concat(domain));
                            return [2 /*return*/, undefined];
                        }
                        subscription = this.mapSubscription(data);
                        newUsageCount = (subscription.usageCount || 0) + 1;
                        month = new Date().toISOString().slice(0, 7);
                        newMonthlyUsage = (subscription.monthlyUsageCount || 0) + 1;
                        newUsageMonth = subscription.usageMonth || month;
                        if (subscription.usageMonth !== month) {
                            newMonthlyUsage = 1;
                            newUsageMonth = month;
                        }
                        return [4 /*yield*/, supabase_js_1.supabase
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
                                .single()];
                    case 7:
                        _f = _g.sent(), updatedData = _f.data, updateError = _f.error;
                        if (updateError || !updatedData)
                            return [2 /*return*/, undefined];
                        return [2 /*return*/, this.mapSubscription(updatedData)];
                }
            });
        });
    };
    SupabaseStorage.prototype.deleteSubscription = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var error;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, supabase_js_1.supabase
                            .from('subscriptions')
                            .delete()
                            .eq('id', id)];
                    case 1:
                        error = (_a.sent()).error;
                        return [2 /*return*/, !error];
                }
            });
        });
    };
    SupabaseStorage.prototype.updateSubscriptionNextBilling = function (id, nextBillingDate) {
        return __awaiter(this, void 0, void 0, function () {
            var normalized, dateStr, match, d, _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        normalized = nextBillingDate;
                        try {
                            dateStr = String(nextBillingDate).split('T')[0];
                            match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                            if (match) {
                                d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
                                d.setHours(0, 0, 0, 0);
                                normalized = "".concat(d.getFullYear(), "-").concat(String(d.getMonth() + 1).padStart(2, '0'), "-").concat(String(d.getDate()).padStart(2, '0'));
                            }
                        }
                        catch (e) {
                            // Keep raw value if parsing fails.
                        }
                        return [4 /*yield*/, supabase_js_1.supabase
                                .from('subscriptions')
                                .update({ next_billing_at: normalized })
                                .eq('id', id)
                                .select()
                                .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            console.error('[SupabaseStorage] Error updating next billing date:', error);
                            return [2 /*return*/, undefined];
                        }
                        return [2 /*return*/, this.mapSubscription(data)];
                }
            });
        });
    };
    SupabaseStorage.prototype.getTransactions = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, supabase_js_1.supabase
                            .from('transactions')
                            .select('*')];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error)
                            throw new Error("Failed to get transactions: ".concat(error.message));
                        return [2 /*return*/, (data || []).map(this.mapTransaction)];
                }
            });
        });
    };
    SupabaseStorage.prototype.mapTransaction = function (data) {
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
    };
    SupabaseStorage.prototype.createTransaction = function (insertTransaction) {
        return __awaiter(this, void 0, void 0, function () {
            var id, transaction, _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        id = (0, crypto_1.randomUUID)();
                        transaction = {
                            id: id,
                            description: insertTransaction.description,
                            amount: insertTransaction.amount,
                            date: insertTransaction.date,
                            category: insertTransaction.category || null,
                            is_recurring: insertTransaction.isRecurring,
                            merchant_name: insertTransaction.merchantName || null,
                            subscription_id: insertTransaction.subscriptionId || null,
                        };
                        return [4 /*yield*/, supabase_js_1.supabase
                                .from('transactions')
                                .insert(transaction)
                                .select()
                                .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error)
                            throw new Error("Failed to create transaction: ".concat(error.message));
                        return [2 /*return*/, this.mapTransaction(data)];
                }
            });
        });
    };
    SupabaseStorage.prototype.getInsights = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, supabase_js_1.supabase
                            .from('insights')
                            .select('*')];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error)
                            throw new Error("Failed to get insights: ".concat(error.message));
                        return [2 /*return*/, (data || []).map(this.mapInsight)];
                }
            });
        });
    };
    SupabaseStorage.prototype.mapInsight = function (data) {
        return {
            id: data.id,
            userId: data.user_id,
            type: data.type,
            title: data.title,
            description: data.description,
            potentialSavings: data.potential_savings,
            subscriptionId: data.subscription_id,
            priority: data.priority,
            isRead: data.is_read,
            createdAt: data.created_at,
        };
    };
    SupabaseStorage.prototype.createInsight = function (insertInsight) {
        return __awaiter(this, void 0, void 0, function () {
            var id, insight, _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        id = (0, crypto_1.randomUUID)();
                        insight = {
                            id: id,
                            user_id: insertInsight.userId,
                            type: insertInsight.type,
                            title: insertInsight.title,
                            description: insertInsight.description,
                            potential_savings: insertInsight.potentialSavings || null,
                            subscription_id: insertInsight.subscriptionId || null,
                            priority: insertInsight.priority,
                            is_read: insertInsight.isRead,
                            created_at: insertInsight.createdAt,
                        };
                        return [4 /*yield*/, supabase_js_1.supabase
                                .from('insights')
                                .insert(insight)
                                .select()
                                .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error)
                            throw new Error("Failed to create insight: ".concat(error.message));
                        return [2 /*return*/, this.mapInsight(data)];
                }
            });
        });
    };
    SupabaseStorage.prototype.getBankConnections = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, supabase_js_1.supabase
                            .from('bank_connections')
                            .select('*')];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error)
                            throw new Error("Failed to get bank connections: ".concat(error.message));
                        return [2 /*return*/, (data || []).map(this.mapBankConnection)];
                }
            });
        });
    };
    SupabaseStorage.prototype.getBankConnection = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, supabase_js_1.supabase
                            .from('bank_connections')
                            .select('*')
                            .eq('id', id)
                            .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error || !data)
                            return [2 /*return*/, undefined];
                        return [2 /*return*/, this.mapBankConnection(data)];
                }
            });
        });
    };
    SupabaseStorage.prototype.mapBankConnection = function (data) {
        return {
            id: data.id,
            userId: data.user_id,
            bankName: data.bank_name,
            accountType: data.account_type,
            lastSync: data.last_sync,
            isConnected: data.is_connected,
            accountMask: data.account_mask,
            provider: data.provider || null,
        };
    };
    SupabaseStorage.prototype.createBankConnection = function (insertConnection) {
        return __awaiter(this, void 0, void 0, function () {
            var id, connection, _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        id = (0, crypto_1.randomUUID)();
                        connection = {
                            id: id,
                            user_id: insertConnection.userId,
                            bank_name: insertConnection.bankName,
                            account_type: insertConnection.accountType,
                            last_sync: insertConnection.lastSync,
                            is_connected: insertConnection.isConnected,
                            account_mask: insertConnection.accountMask || null,
                            provider: insertConnection.provider || null,
                        };
                        return [4 /*yield*/, supabase_js_1.supabase
                                .from('bank_connections')
                                .insert(connection)
                                .select()
                                .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error)
                            throw new Error("Failed to create bank connection: ".concat(error.message));
                        return [2 /*return*/, this.mapBankConnection(data)];
                }
            });
        });
    };
    SupabaseStorage.prototype.updateBankConnectionSync = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, supabase_js_1.supabase
                            .from('bank_connections')
                            .update({ last_sync: new Date().toISOString() })
                            .eq('id', id)
                            .select()
                            .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error || !data)
                            return [2 /*return*/, undefined];
                        return [2 /*return*/, this.mapBankConnection(data)];
                }
            });
        });
    };
    SupabaseStorage.prototype.deleteBankConnection = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var error;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, supabase_js_1.supabase
                            .from('bank_connections')
                            .delete()
                            .eq('id', id)];
                    case 1:
                        error = (_a.sent()).error;
                        return [2 /*return*/, !error];
                }
            });
        });
    };
    SupabaseStorage.prototype.getMetrics = function () {
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
            var subscriptions, now, monthStart, monthEnd, totalMonthlySpend, activeSubscriptions, unusedSubscriptions, potentialSavings, totalUsage, averageCostPerUse, currentMonth, nextMonth, deletedSavings;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getSubscriptions()];
                    case 1:
                        subscriptions = _a.sent();
                        now = new Date();
                        monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                        monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                        totalMonthlySpend = subscriptions
                            .filter(function (sub) { return sub.status !== "deleted" && sub.status !== "to-cancel"; })
                            .reduce(function (sum, sub) {
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
                        currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                        nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                        deletedSavings = subscriptions
                            .filter(function (s) { return s.status === 'deleted'; })
                            .filter(function (s) {
                            var deletedAt = s.deleted_at || s.deletedAt;
                            if (deletedAt) {
                                var d = new Date(deletedAt);
                                return d >= currentMonth && d < nextMonth;
                            }
                            return false;
                        })
                            .reduce(function (sum, sub) { return sum + calculateMonthlyCost(sub.amount, sub.frequency); }, 0);
                        return [2 /*return*/, {
                                totalMonthlySpend: totalMonthlySpend,
                                activeSubscriptions: activeSubscriptions,
                                potentialSavings: potentialSavings,
                                thisMonthSavings: Math.round(deletedSavings * 100) / 100,
                                unusedSubscriptions: unusedSubscriptions,
                                averageCostPerUse: averageCostPerUse,
                            }];
                }
            });
        });
    };
    SupabaseStorage.prototype.getMonthlySpending = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, []];
            });
        });
    };
    SupabaseStorage.prototype.getSpendingByCategory = function () {
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
    SupabaseStorage.prototype.getCostPerUseAnalysis = function () {
        return __awaiter(this, void 0, void 0, function () {
            var subscriptions;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getSubscriptions()];
                    case 1:
                        subscriptions = _a.sent();
                        return [2 /*return*/, subscriptions
                                .filter(function (sub) { return sub.status !== "to-cancel"; })
                                .map(function (sub) {
                                var monthlyAmount = calculateMonthlyCost(sub.amount, sub.frequency);
                                var costPerUse = sub.usageCount > 0 ? monthlyAmount / sub.usageCount : monthlyAmount;
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
    SupabaseStorage.prototype.getBehavioralInsights = function () {
        return __awaiter(this, void 0, void 0, function () {
            var subscriptions;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getSubscriptions()];
                    case 1:
                        subscriptions = _a.sent();
                        // Strictly filter only unused and to-cancel, never active
                        return [2 /*return*/, subscriptions
                                .filter(function (sub) { return !sub ? false : (sub.status === 'unused' || sub.status === 'to-cancel'); })
                                .map(function (sub) {
                                var monthlyAmount = calculateMonthlyCost(sub.amount, sub.frequency);
                                return {
                                    subscriptionId: sub.id,
                                    subscriptionName: sub.name,
                                    status: sub.status,
                                    monthlyAmount: monthlyAmount,
                                    currency: sub.currency || 'USD',
                                    equivalents: generateOpportunityCosts(monthlyAmount),
                                };
                            })];
                }
            });
        });
    };
    SupabaseStorage.prototype.getRecommendations = function () {
        return __awaiter(this, void 0, void 0, function () {
            var subscriptions, recommendations, actionableSubs, adobeSub, unusedSubs, _i, unusedSubs_1, sub, streamingSubs, totalStreaming;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getSubscriptions()];
                    case 1:
                        subscriptions = _a.sent();
                        recommendations = [];
                        actionableSubs = subscriptions.filter(function (s) { return s.status === "unused" || s.status === "to-cancel"; });
                        adobeSub = actionableSubs.find(function (s) { return s.name.toLowerCase().includes("adobe"); });
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
                        unusedSubs = actionableSubs.filter(function (s) { return s.status === "unused"; });
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
                        streamingSubs = actionableSubs.filter(function (s) { return s.category === "streaming" && (s.status === "unused" || s.status === "to-cancel"); });
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
    return SupabaseStorage;
}());
exports.SupabaseStorage = SupabaseStorage;
exports.supabaseStorage = new SupabaseStorage();
