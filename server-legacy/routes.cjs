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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaginationParams = getPaginationParams;
exports.extractUserIdFromToken = extractUserIdFromToken;
exports.handleCostPerUse = handleCostPerUse;
exports.registerRoutes = registerRoutes;
// Utility to map DB subscription row to camelCase for API responses
function mapSubscriptionFromDb(sub) {
    if (!sub)
        return sub;
    return {
        id: sub.id,
        userId: sub.user_id,
        name: sub.name,
        category: sub.category,
        amount: sub.amount,
        currency: sub.currency,
        frequency: sub.frequency,
        nextBillingDate: (function () {
            var raw = sub.next_billing_at || sub.next_billing_date;
            var parsed = parseDateOnlyLocal(raw);
            return parsed ? formatDateLocal(parsed) : raw;
        })(),
        status: sub.status,
        usageCount: sub.usage_count,
        lastUsedDate: sub.last_used_at,
        logoUrl: sub.logo_url,
        description: sub.description,
        isDetected: sub.is_detected,
        websiteDomain: sub.website_domain,
        scheduledCancellationDate: sub.scheduled_cancellation_date,
        cancellationUrl: sub.cancellation_url,
        createdAt: sub.created_at,
        updatedAt: sub.updated_at,
        deletedAt: sub.deleted_at,
        monthlyUsageCount: sub.monthly_usage_count,
        usageMonth: sub.usage_month,
        billingMonth: sub.billing_month,
        // Add any additional fields as needed
    };
}
function formatBillingMonth(date) {
    return "".concat(date.getFullYear(), "-").concat(String(date.getMonth() + 1).padStart(2, '0'));
}
function formatDateLocal(date) {
    return "".concat(date.getFullYear(), "-").concat(String(date.getMonth() + 1).padStart(2, '0'), "-").concat(String(date.getDate()).padStart(2, '0'));
}
function parseDateOnlyLocal(dateInput) {
    if (!dateInput)
        return null;
    if (dateInput instanceof Date) {
        var date_1 = new Date(dateInput);
        date_1.setHours(0, 0, 0, 0);
        return date_1;
    }
    var dateStr = String(dateInput).split('T')[0];
    var match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match)
        return null;
    var date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    date.setHours(0, 0, 0, 0);
    return date;
}
function parseSubscriptionRenewalDate(dateInput) {
    if (!dateInput)
        return null;
    if (dateInput instanceof Date)
        return new Date(dateInput);
    var dateStr = String(dateInput).trim();
    if (!dateStr)
        return null;
    var parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
        // Preserve time for ISO timestamps so same-day future renewals are handled correctly.
        if (dateStr.includes('T') || dateStr.includes(' ')) {
            return parsed;
        }
        return parseDateOnlyLocal(dateStr);
    }
    return parseDateOnlyLocal(dateStr);
}
function normalizeRenewalDate(sub) {
    var renewalDateStr = sub.next_billing_at || sub.nextBillingDate || sub.next_billing_date;
    return parseSubscriptionRenewalDate(renewalDateStr);
}
function getSubscriptionBillingMonth(sub) {
    var billingMonth = sub.billing_month || sub.billingMonth || null;
    if (!billingMonth || typeof billingMonth !== 'string')
        return null;
    var match = billingMonth.match(/^(\d{4})-(\d{1,2})$/);
    if (!match)
        return null;
    return "".concat(match[1], "-").concat(String(match[2]).padStart(2, '0'));
}
function normalizeStatus(status) {
    return String(status || '').trim().toLowerCase();
}
function isSubscriptionDeletedOrCanceled(sub) {
    var status = normalizeStatus(sub.status);
    if (status === 'deleted' || status === 'canceled')
        return true;
    if (status === 'active' || status === 'unused' || status === 'to-cancel')
        return false;
    return Boolean(sub.deleted_at || sub.deletedAt);
}
function isSubscriptionActiveLike(sub) {
    if (isSubscriptionDeletedOrCanceled(sub))
        return false;
    var status = normalizeStatus(sub.status);
    return status === 'active' || status === 'unused' || status === 'to-cancel';
}
function isSubscriptionBilledInMonth(sub, monthStart, monthEnd, now, isCurrentMonth, offsetMinutes) {
    if (offsetMinutes === void 0) { offsetMinutes = 0; }
    var targetMonth = formatBillingMonth(monthStart);
    var billingMonth = getSubscriptionBillingMonth(sub);
    // If billing_month explicitly matches the target month, only include it
    // for the current month when the renewal date has arrived or passed.
    if (billingMonth === targetMonth) {
        if (isCurrentMonth) {
            var renewalDate_1 = normalizeRenewalDate(sub);
            if (!renewalDate_1) {
                return false;
            }
            // If renewalDate contains a time (ISO timestamp), adjust it into the
            // client's local time using the provided offsetMinutes so same-day
            // renewals are evaluated correctly.
            var renewalAsDate_1 = renewalDate_1 instanceof Date ? new Date(renewalDate_1) : new Date(String(renewalDate_1));
            if (!isNaN(renewalAsDate_1.getTime()) && offsetMinutes) {
                renewalAsDate_1 = new Date(renewalAsDate_1.getTime() - offsetMinutes * 60000);
            }
            var renewalDay = renewalAsDate_1 ? new Date(renewalAsDate_1.getFullYear(), renewalAsDate_1.getMonth(), renewalAsDate_1.getDate()) : null;
            var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            // Include if renewal already occurred today or earlier in this month.
            // Also include if the renewal date was advanced to a later month (auto-advance)
            // because the subscription was billed earlier this month.
            if (renewalDay && renewalDay <= today)
                return true;
            if (formatBillingMonth(renewalAsDate_1) !== targetMonth)
                return true;
            return false;
        }
        return true;
    }
    var renewalDate = normalizeRenewalDate(sub);
    if (!renewalDate) {
        return false;
    }
    // Adjust renewal date into client-local time if offset provided
    var renewalAsDate = renewalDate instanceof Date ? new Date(renewalDate) : new Date(String(renewalDate));
    if (!isNaN(renewalAsDate.getTime()) && offsetMinutes) {
        renewalAsDate = new Date(renewalAsDate.getTime() - offsetMinutes * 60000);
    }
    if (formatBillingMonth(renewalAsDate) !== targetMonth) {
        return false;
    }
    if (isCurrentMonth) {
        var renewalDay = new Date(renewalAsDate.getFullYear(), renewalAsDate.getMonth(), renewalAsDate.getDate());
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return renewalDay ? renewalDay <= today : false;
    }
    return true;
}
var crypto_1 = require("crypto");
var path_1 = require("path");
var supabase_js_1 = require("@supabase/supabase-js");
var zod_1 = require("zod");
var stripe_js_1 = require("./stripe.cjs");
var email_js_1 = require("./email.cjs");
var renewal_manager_js_1 = require("./renewal-manager.cjs");
// Helper for pagination params
function getPaginationParams(req) {
    var page = parseInt(req.query.page, 10);
    var perPage = parseInt(req.query.perPage, 10);
    if (isNaN(page) || page < 1)
        page = 1;
    if (isNaN(perPage)) {
        perPage = 100;
    }
    else if (perPage < 1) {
        perPage = 1;
    }
    if (perPage > 1000)
        perPage = 1000;
    return { page: page, perPage: perPage };
}
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
function convertToUSD(amount, currency) {
    var _a;
    var normalizedCurrency = String(currency || 'USD').trim().toUpperCase();
    var rate = (_a = CURRENCY_EXCHANGE_RATES[normalizedCurrency]) !== null && _a !== void 0 ? _a : 1;
    return amount / rate;
}
// Return monthlyized amount for a subscription (in its original currency)
function monthlyAmountForSubscriptionRow(s) {
    var amount = Number(s === null || s === void 0 ? void 0 : s.amount) || 0;
    var freq = String((s === null || s === void 0 ? void 0 : s.frequency) || 'monthly').toLowerCase();
    // Match the logic used by /api/metrics: weekly approximated as 4x per month
    if (freq === 'yearly')
        return amount / 12;
    if (freq === 'quarterly')
        return amount / 3;
    if (freq === 'weekly')
        return amount * 4;
    return amount;
}
function getMetricsCacheKey(userId, date) {
    if (date === void 0) { date = new Date(); }
    var monthKey = "".concat(date.getFullYear(), "-").concat(String(date.getMonth() + 1).padStart(2, '0'));
    return "metrics:".concat(userId, ":").concat(monthKey);
}
function clearSubscriptionsCacheForUser(userId) {
    // We cache the first few pages, so clear those keys after updates.
    for (var page = 1; page <= 20; page += 1) {
        cache.del("subscriptions:".concat(userId, ":p").concat(page, ":n100"));
        cache.del("subscriptions:".concat(userId, ":p").concat(page, ":n50"));
        cache.del("subscriptions:".concat(userId, ":p").concat(page, ":n25"));
        cache.del("subscriptions:".concat(userId, ":p").concat(page, ":n10"));
    }
    cache.del(getMetricsCacheKey(userId));
}
var cache_js_1 = require("./cache.cjs");
// Import via the server shim so test spies that mock `../server/supabase`
// will correctly intercept calls when tests replace `getSupabaseClient`.
var supabase_js_2 = require("./supabase.cjs");
var storage_js_1 = require("./storage.cjs");
// Helper to extract userId from a JWT (Supabase or custom)
function extractUserIdFromToken(token) {
    try {
        var parts = token.split('.');
        var payloadPart = parts.length === 3 ? parts[1] : parts.length >= 3 ? parts[parts.length - 2] : undefined;
        if (!payloadPart)
            return undefined;
        var payload = JSON.parse(Buffer.from(payloadPart, 'base64').toString('utf8'));
        return payload.sub || payload.user_id || payload.id || undefined;
    }
    catch (_a) {
        return undefined;
    }
}
function getUserIdFromRequest(req) {
    return __awaiter(this, void 0, void 0, function () {
        var userId, authHeader, supabase, _a, data, error, error_1;
        var _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    userId = (_c = (_b = req.session) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.id;
                    if (userId)
                        return [2 /*return*/, userId];
                    authHeader = (_d = req.headers.authorization) === null || _d === void 0 ? void 0 : _d.replace('Bearer ', '');
                    if (!authHeader)
                        return [2 /*return*/, undefined];
                    userId = extractUserIdFromToken(authHeader);
                    if (userId)
                        return [2 /*return*/, userId];
                    supabase = (0, supabase_js_2.getSupabaseClient)();
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, supabase.auth.getUser(authHeader)];
                case 2:
                    _a = _f.sent(), data = _a.data, error = _a.error;
                    if (!error && ((_e = data === null || data === void 0 ? void 0 : data.user) === null || _e === void 0 ? void 0 : _e.id)) {
                        return [2 /*return*/, data.user.id];
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _f.sent();
                    console.warn('[Routes] getUserIdFromRequest supabase auth lookup failed:', error_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/, undefined];
            }
        });
    });
}
function isTimestampInCurrentMonth(timestamp) {
    if (!timestamp)
        return false;
    var parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime()))
        return false;
    var now = new Date();
    var currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    var nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return parsed >= currentMonth && parsed < nextMonth;
}
function getSubscriptionDeletedTimestamp(sub) {
    return sub.deleted_at || sub.deletedAt || sub.updated_at || sub.updatedAt || null;
}
var errorHandler_js_1 = require("./middleware/errorHandler.cjs");
var cache = new cache_js_1.CacheService();
function isValidBillingFrequency(freq) {
    return ['weekly', 'monthly', 'quarterly', 'yearly'].includes(freq);
}
// centralized handler for cost-per-use endpoint; defined above so
// it exists outside the registration function (and can be imported by tests).
function handleCostPerUse(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var userId, authHeader, supabase, subscriptions, familyGroupId, showFamilyData, groupRes, groupRow, isOwner, isMember, memRes, membership, settingsRes, settings, members, memberIds_1, groupRow2, allSubsRaw, allSubs, personalSubs, userSubscriptionRow, planType, visibleSubscriptions, FREE_COST_PER_USE_LIMIT, analysisSubscriptions, currentMonth_1, analysis, out, error_2;
        var _a, _b, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    _g.trys.push([0, 13, , 14]);
                    userId = (_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id;
                    if (!userId) {
                        authHeader = (_c = req.headers.authorization) === null || _c === void 0 ? void 0 : _c.replace('Bearer ', '');
                        if (authHeader)
                            userId = extractUserIdFromToken(authHeader) || undefined;
                    }
                    if (!userId)
                        return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                    supabase = (0, supabase_js_2.getSupabaseClient)();
                    subscriptions = null;
                    familyGroupId = typeof req.query.familyGroupId === 'string' ? req.query.familyGroupId : undefined;
                    showFamilyData = false;
                    if (!familyGroupId) return [3 /*break*/, 5];
                    return [4 /*yield*/, supabase
                            .from('family_groups')
                            .select('owner_id')
                            .eq('id', familyGroupId)
                            .single()];
                case 1:
                    groupRes = _g.sent();
                    groupRow = (_d = groupRes === null || groupRes === void 0 ? void 0 : groupRes.data) !== null && _d !== void 0 ? _d : groupRes;
                    if (!groupRow) return [3 /*break*/, 5];
                    isOwner = groupRow.owner_id === userId;
                    isMember = false;
                    if (!!isOwner) return [3 /*break*/, 3];
                    return [4 /*yield*/, supabase
                            .from('family_group_members')
                            .select('id')
                            .eq('family_group_id', familyGroupId)
                            .eq('user_id', userId)
                            .single()];
                case 2:
                    memRes = _g.sent();
                    membership = (_e = memRes === null || memRes === void 0 ? void 0 : memRes.data) !== null && _e !== void 0 ? _e : memRes;
                    isMember = !!membership;
                    _g.label = 3;
                case 3:
                    if (!(isOwner || isMember)) return [3 /*break*/, 5];
                    return [4 /*yield*/, supabase
                            .from('family_group_settings')
                            .select('show_family_data')
                            .eq('family_group_id', familyGroupId)
                            .single()];
                case 4:
                    settingsRes = _g.sent();
                    settings = (_f = settingsRes === null || settingsRes === void 0 ? void 0 : settingsRes.data) !== null && _f !== void 0 ? _f : settingsRes;
                    // if settings are missing, be permissive in tests/legacy flows
                    if (!settings || (settings === null || settings === void 0 ? void 0 : settings.show_family_data) === undefined) {
                        showFamilyData = true;
                    }
                    else if (settings === null || settings === void 0 ? void 0 : settings.show_family_data) {
                        showFamilyData = true;
                    }
                    _g.label = 5;
                case 5:
                    if (familyGroupId && !showFamilyData) {
                        return [2 /*return*/, res.status(403).json({ error: 'Sharing not enabled for this family group' })];
                    }
                    if (!showFamilyData) return [3 /*break*/, 9];
                    return [4 /*yield*/, supabase
                            .from('family_group_members')
                            .select('user_id')
                            .eq('family_group_id', familyGroupId)];
                case 6:
                    members = (_g.sent()).data;
                    // eslint-disable-next-line no-console
                    console.log('[Routes] members raw:', JSON.stringify(members));
                    memberIds_1 = (members || []).map(function (m) { return m.user_id; }).filter(Boolean);
                    return [4 /*yield*/, supabase
                            .from('family_groups')
                            .select('owner_id')
                            .eq('id', familyGroupId)
                            .single()];
                case 7:
                    groupRow2 = (_g.sent()).data;
                    if (groupRow2 && !memberIds_1.includes(groupRow2.owner_id))
                        memberIds_1.push(groupRow2.owner_id);
                    // eslint-disable-next-line no-console
                    console.log('[Routes] memberIds before ensure current user:', JSON.stringify(memberIds_1));
                    if (!memberIds_1.includes(userId))
                        memberIds_1 = __spreadArray([userId], memberIds_1, true);
                    // eslint-disable-next-line no-console
                    console.log('[Routes] memberIds final:', JSON.stringify(memberIds_1));
                    return [4 /*yield*/, supabase
                            .from('subscriptions')
                            .select('*')
                            .neq('status', 'deleted')];
                case 8:
                    allSubsRaw = (_g.sent()).data;
                    allSubs = allSubsRaw || [];
                    if (!Array.isArray(allSubs)) {
                        allSubs = Array.isArray(allSubs === null || allSubs === void 0 ? void 0 : allSubs.data) ? allSubs.data : [];
                    }
                    subscriptions = allSubs.filter(function (s) { return memberIds_1.includes(s.user_id); });
                    return [3 /*break*/, 11];
                case 9: return [4 /*yield*/, supabase
                        .from('subscriptions')
                        .select('*')
                        .eq('user_id', userId)];
                case 10:
                    personalSubs = (_g.sent()).data;
                    subscriptions = personalSubs || [];
                    _g.label = 11;
                case 11:
                    // debug: show raw subscriptions fetched
                    // eslint-disable-next-line no-console
                    console.log('[Routes] raw subscriptions before normalize:', Array.isArray(subscriptions) ? 'array' : typeof subscriptions, JSON.stringify(subscriptions));
                    // normalize subscriptions to an array in case the supabase client
                    // returned a thenable/row wrapper in tests or unexpected shapes
                    if (!Array.isArray(subscriptions)) {
                        subscriptions = Array.isArray(subscriptions === null || subscriptions === void 0 ? void 0 : subscriptions.data) ? subscriptions.data : [];
                    }
                    if (!subscriptions || subscriptions.length === 0) {
                        return [2 /*return*/, res.json([])];
                    }
                    return [4 /*yield*/, supabase
                            .from('user_subscriptions')
                            .select('plan_type')
                            .eq('user_id', userId)
                            .single()];
                case 12:
                    userSubscriptionRow = (_g.sent()).data;
                    planType = (userSubscriptionRow === null || userSubscriptionRow === void 0 ? void 0 : userSubscriptionRow.plan_type) || 'free';
                    visibleSubscriptions = subscriptions.filter(function (sub) { return sub.status !== 'deleted'; });
                    FREE_COST_PER_USE_LIMIT = 2;
                    analysisSubscriptions = !showFamilyData && planType === 'free' && visibleSubscriptions.length > FREE_COST_PER_USE_LIMIT
                        ? visibleSubscriptions.slice(0, FREE_COST_PER_USE_LIMIT)
                        : visibleSubscriptions;
                    currentMonth_1 = new Date().toISOString().slice(0, 7);
                    analysis = analysisSubscriptions
                        .map(function (sub) {
                        var _a, _b, _c;
                        var monthlyAmount = sub.frequency === 'yearly' ? sub.amount / 12 : sub.frequency === 'quarterly' ? sub.amount / 3 : sub.frequency === 'weekly' ? sub.amount * 4 : sub.amount;
                        var hasUsageMonth = typeof sub.usage_month === 'string' && sub.usage_month !== '';
                        var usageCount = hasUsageMonth
                            ? sub.usage_month === currentMonth_1
                                ? ((_b = (_a = sub.monthly_usage_count) !== null && _a !== void 0 ? _a : sub.usage_count) !== null && _b !== void 0 ? _b : 0)
                                : 0
                            : ((_c = sub.usage_count) !== null && _c !== void 0 ? _c : 0);
                        var costPerUse = usageCount > 0 ? monthlyAmount / usageCount : monthlyAmount;
                        var valueRating;
                        if (usageCount <= 1) {
                            valueRating = 'poor';
                        }
                        else if (usageCount <= 3) {
                            valueRating = costPerUse <= 10 ? 'fair' : 'poor';
                        }
                        else {
                            valueRating = costPerUse > 20 ? 'poor' : costPerUse > 10 ? 'fair' : 'good';
                        }
                        return {
                            subscriptionId: sub.id,
                            name: sub.name,
                            monthlyAmount: Math.round(monthlyAmount * 100) / 100,
                            usageCount: usageCount,
                            costPerUse: Math.round(costPerUse * 100) / 100,
                            valueRating: valueRating,
                            currency: sub.currency || 'USD',
                        };
                    });
                    out = Array.isArray(analysis) ? analysis : (analysis ? [analysis] : []);
                    console.log('[Routes] cost-per-use analysis result type:', Array.isArray(out), 'length:', out.length);
                    console.log('[Routes] cost-per-use analysis payload:', JSON.stringify(out));
                    res.json(out);
                    return [3 /*break*/, 14];
                case 13:
                    error_2 = _g.sent();
                    console.error('[Routes] cost-per-use error', error_2);
                    res.status(500).json({ error: 'Failed to compute cost per use' });
                    return [3 /*break*/, 14];
                case 14: return [2 /*return*/];
            }
        });
    });
}
function registerRoutes(httpServer, app) {
    return __awaiter(this, void 0, void 0, function () {
        var handleAccountEmailUpdate, handleAccountPasswordUpdate;
        var _this = this;
        return __generator(this, function (_a) {
            // API root route for health/status
            app.get("/api/status", function (req, res) {
                res.json({
                    status: "ok",
                    message: "Welcome to the Subveris API",
                    timestamp: new Date().toISOString()
                });
            });
            app.get("/api/metrics", (0, errorHandler_js_1.asyncHandler)(function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, authHeader, cacheKey, cached, err_1, supabase, _a, subscriptions, subscriptionsError, emptyMetrics, currentDate, today, monthStart, monthEnd, monthlyAmountForSubscription, activeCount, unusedCount, totalMonthly, now, currentMonth, previousMonth, nextMonth, previousMonthEnd, currentMonthSubs, previousMonthSubs, previousMonthSpend, monthlySpendChange, newServicesTracked, deletedSavings, thisMonthSavingsAmount, potentialSavingsAmount, metrics;
                var _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            userId = (_c = (_b = req.session) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.id;
                            if (!userId) {
                                authHeader = (_d = req.headers.authorization) === null || _d === void 0 ? void 0 : _d.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                throw new errorHandler_js_1.UnauthorizedError('Authentication required');
                            cacheKey = getMetricsCacheKey(userId);
                            return [4 /*yield*/, cache.get(cacheKey)];
                        case 1:
                            cached = _e.sent();
                            if (cached) {
                                return [2 /*return*/, res.json(JSON.parse(cached))];
                            }
                            _e.label = 2;
                        case 2:
                            _e.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, (0, renewal_manager_js_1.runRenewalChecks)({ userId: userId })];
                        case 3:
                            _e.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            err_1 = _e.sent();
                            console.error('[Routes] Error auto-advancing renewal dates:', err_1);
                            return [3 /*break*/, 5];
                        case 5:
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase
                                    .from('subscriptions')
                                    .select('*')
                                    .eq('user_id', userId)];
                        case 6:
                            _a = _e.sent(), subscriptions = _a.data, subscriptionsError = _a.error;
                            if (subscriptionsError) {
                                console.error('[Routes] /api/metrics supabase error', subscriptionsError);
                                throw new errorHandler_js_1.AppError(500, 'Failed to load metrics');
                            }
                            if (!!subscriptions) return [3 /*break*/, 8];
                            emptyMetrics = {
                                totalMonthlySpend: 0,
                                activeSubscriptions: 0,
                                potentialSavings: 0,
                                thisMonthSavings: 0,
                                unusedSubscriptions: 0,
                                averageCostPerUse: 0,
                                monthlySpendChange: 0,
                                newServicesTracked: 0
                            };
                            return [4 /*yield*/, cache.set(cacheKey, JSON.stringify(emptyMetrics), 300)];
                        case 7:
                            _e.sent();
                            return [2 /*return*/, res.json(emptyMetrics)];
                        case 8:
                            currentDate = new Date();
                            today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
                            monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                            monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
                            monthlyAmountForSubscription = function (s) {
                                var amount = Number(s === null || s === void 0 ? void 0 : s.amount) || 0;
                                var monthlyAmount = s.frequency === 'yearly' ? amount / 12 : s.frequency === 'quarterly' ? amount / 3 : s.frequency === 'weekly' ? amount * 4 : amount;
                                return convertToUSD(monthlyAmount, s.currency || 'USD');
                            };
                            activeCount = subscriptions.filter(function (s) { return s.status === 'active' || s.status === 'unused'; }).length;
                            unusedCount = subscriptions.filter(function (s) { return s.status === 'unused'; }).length;
                            totalMonthly = subscriptions
                                .filter(function (s) { return s.status !== 'deleted'; })
                                .reduce(function (sum, s) {
                                if (!isSubscriptionBilledInMonth(s, monthStart, monthEnd, currentDate, true)) {
                                    return sum;
                                }
                                return sum + monthlyAmountForSubscription(s);
                            }, 0);
                            now = new Date();
                            currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                            previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                            nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                            previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
                            currentMonthSubs = subscriptions.filter(function (s) {
                                var createdDate = new Date(s.created_at);
                                return createdDate >= currentMonth && createdDate < nextMonth;
                            });
                            previousMonthSubs = subscriptions.filter(function (s) {
                                var createdDate = new Date(s.created_at);
                                return createdDate >= previousMonth && createdDate < currentMonth;
                            });
                            previousMonthSpend = subscriptions
                                .filter(function (s) { return s.status !== 'deleted'; })
                                .reduce(function (sum, s) {
                                if (!isSubscriptionBilledInMonth(s, previousMonth, previousMonthEnd, now, false)) {
                                    return sum;
                                }
                                return sum + monthlyAmountForSubscription(s);
                            }, 0);
                            monthlySpendChange = previousMonthSpend > 0
                                ? Math.round(((totalMonthly - previousMonthSpend) / previousMonthSpend) * 100)
                                : 0;
                            newServicesTracked = currentMonthSubs.length;
                            deletedSavings = subscriptions
                                .filter(function (s) { return s.status === 'deleted'; })
                                .filter(function (s) {
                                var ts = getSubscriptionDeletedTimestamp(s);
                                return isTimestampInCurrentMonth(ts);
                            })
                                .reduce(function (sum, s) {
                                var monthlyAmount = s.frequency === 'yearly' ? s.amount / 12 : s.frequency === 'quarterly' ? s.amount / 3 : s.frequency === 'weekly' ? s.amount * 4 : s.amount;
                                return sum + convertToUSD(monthlyAmount, s.currency || 'USD');
                            }, 0);
                            thisMonthSavingsAmount = Math.round(deletedSavings * 100) / 100;
                            potentialSavingsAmount = Math.round(subscriptions.filter(function (s) { return s.status === 'unused' || s.status === 'to-cancel'; }).reduce(function (sum, s) {
                                var monthlyAmount = s.frequency === 'yearly' ? s.amount / 12 : s.frequency === 'quarterly' ? s.amount / 3 : s.frequency === 'weekly' ? s.amount * 4 : s.amount;
                                return sum + convertToUSD(monthlyAmount, s.currency || 'USD');
                            }, 0) * 100) / 100;
                            metrics = {
                                totalMonthlySpend: Math.round(totalMonthly * 100) / 100,
                                activeSubscriptions: activeCount,
                                potentialSavings: potentialSavingsAmount,
                                thisMonthSavings: thisMonthSavingsAmount,
                                unusedSubscriptions: unusedCount,
                                averageCostPerUse: 0,
                                monthlySpendChange: monthlySpendChange,
                                newServicesTracked: newServicesTracked
                            };
                            return [4 /*yield*/, cache.set(cacheKey, JSON.stringify(metrics), 300)];
                        case 9:
                            _e.sent();
                            res.json(metrics);
                            return [2 /*return*/];
                    }
                });
            }); }));
            app.get("/api/subscriptions", (0, errorHandler_js_1.asyncHandler)(function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var _a, page, perPage, userId, authHeader, cacheKey, cached, err_2, supabase, from, to, _b, data, error, count, result;
                var _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            _a = getPaginationParams(req), page = _a.page, perPage = _a.perPage;
                            userId = (_d = (_c = req.session) === null || _c === void 0 ? void 0 : _c.user) === null || _d === void 0 ? void 0 : _d.id;
                            if (!userId) {
                                authHeader = (_e = req.headers.authorization) === null || _e === void 0 ? void 0 : _e.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                throw new errorHandler_js_1.UnauthorizedError('Authentication required');
                            cacheKey = "subscriptions:".concat(userId, ":p").concat(page, ":n").concat(perPage);
                            return [4 /*yield*/, cache.get(cacheKey)];
                        case 1:
                            cached = _f.sent();
                            if (cached) {
                                return [2 /*return*/, res.json(JSON.parse(cached))];
                            }
                            _f.label = 2;
                        case 2:
                            _f.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, (0, renewal_manager_js_1.runRenewalChecks)({ userId: userId })];
                        case 3:
                            _f.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            err_2 = _f.sent();
                            console.error("[Routes] Error auto-advancing renewal dates:", err_2);
                            return [3 /*break*/, 5];
                        case 5:
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            from = (page - 1) * perPage;
                            to = page * perPage - 1;
                            console.log("[API/Subscriptions] Fetching for user: ".concat(userId, ", from: ").concat(from, ", to: ").concat(to));
                            return [4 /*yield*/, supabase
                                    .from('subscriptions')
                                    .select('*', { count: 'exact' })
                                    .eq('user_id', userId)
                                    .order('created_at', { ascending: false })
                                    .range(from, to)];
                        case 6:
                            _b = _f.sent(), data = _b.data, error = _b.error, count = _b.count;
                            console.log("[API/Subscriptions] Query returned ".concat((data === null || data === void 0 ? void 0 : data.length) || 0, " rows, count: ").concat(count, ", error: ").concat((error === null || error === void 0 ? void 0 : error.message) || 'none'));
                            // expose the header for clients that care
                            if (typeof count === 'number') {
                                res.setHeader('x-total-count', count);
                            }
                            if (error) {
                                throw new errorHandler_js_1.AppError(500, 'Failed to fetch subscriptions');
                            }
                            result = (data || []).map(mapSubscriptionFromDb);
                            // note: caching now ignores pagination parameters because range results vary
                            return [4 /*yield*/, cache.set(cacheKey, JSON.stringify(result), 300)];
                        case 7:
                            // note: caching now ignores pagination parameters because range results vary
                            _f.sent();
                            res.json(result);
                            return [2 /*return*/];
                    }
                });
            }); }));
            app.get("/api/subscriptions/:id", (0, errorHandler_js_1.asyncHandler)(function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, authHeader, supabase, _a, data, error;
                var _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            userId = (_c = (_b = req.session) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.id;
                            if (!userId) {
                                authHeader = (_d = req.headers.authorization) === null || _d === void 0 ? void 0 : _d.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                throw new errorHandler_js_1.UnauthorizedError('Authentication required');
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase
                                    .from('subscriptions')
                                    .select('*')
                                    .eq('id', req.params.id)
                                    .eq('user_id', userId)
                                    .single()];
                        case 1:
                            _a = _e.sent(), data = _a.data, error = _a.error;
                            if (error || !data) {
                                throw new errorHandler_js_1.NotFoundError('Subscription not found');
                            }
                            res.json(mapSubscriptionFromDb(data));
                            return [2 /*return*/];
                    }
                });
            }); }));
            app.post("/api/subscriptions", (0, errorHandler_js_1.asyncHandler)(function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, authHeader, _a, name, category, rawAmount, frequency, nextBillingDate, websiteDomain, description, currency, familyGroupId, status, usageCount, isDetected, requiredFields, missingFields, amount, normalizedNextBillingDate, today, billingMonthValue, supabase, allowedFamilyGroupId, _b, groupRow, groupErr, isOwner, isMember, _c, membership, memErr, insertPayload, _d, inserted, insertError;
                var _e, _f, _g;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0:
                            userId = (_f = (_e = req.session) === null || _e === void 0 ? void 0 : _e.user) === null || _f === void 0 ? void 0 : _f.id;
                            if (!userId) {
                                authHeader = (_g = req.headers.authorization) === null || _g === void 0 ? void 0 : _g.replace('Bearer ', '');
                                if (authHeader) {
                                    userId = extractUserIdFromToken(authHeader);
                                }
                            }
                            if (!userId) {
                                throw new errorHandler_js_1.UnauthorizedError('Authentication required');
                            }
                            _a = req.body, name = _a.name, category = _a.category, rawAmount = _a.amount, frequency = _a.frequency, nextBillingDate = _a.nextBillingDate, websiteDomain = _a.websiteDomain, description = _a.description, currency = _a.currency, familyGroupId = _a.familyGroupId, status = _a.status, usageCount = _a.usageCount, isDetected = _a.isDetected;
                            requiredFields = ['name', 'category', 'amount', 'frequency', 'nextBillingDate'];
                            missingFields = requiredFields.filter(function (field) { return !req.body[field]; });
                            if (missingFields.length > 0) {
                                throw new errorHandler_js_1.AppError(400, "Missing required fields: ".concat(missingFields.join(', ')));
                            }
                            amount = Number(rawAmount);
                            if (Number.isNaN(amount) || amount <= 0) {
                                throw new errorHandler_js_1.AppError(400, 'Amount must be a positive number');
                            }
                            if (!isValidBillingFrequency(frequency)) {
                                throw new errorHandler_js_1.AppError(400, 'Invalid billing frequency');
                            }
                            normalizedNextBillingDate = new Date(String(nextBillingDate));
                            if (isNaN(normalizedNextBillingDate.getTime())) {
                                throw new errorHandler_js_1.AppError(400, 'Invalid nextBillingDate');
                            }
                            normalizedNextBillingDate.setHours(0, 0, 0, 0);
                            today = new Date();
                            today.setHours(0, 0, 0, 0);
                            billingMonthValue = normalizedNextBillingDate <= today
                                ? formatBillingMonth(today)
                                : formatBillingMonth(normalizedNextBillingDate);
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            allowedFamilyGroupId = null;
                            if (!(typeof familyGroupId === 'string' && familyGroupId.trim().length > 0)) return [3 /*break*/, 4];
                            return [4 /*yield*/, supabase
                                    .from('family_groups')
                                    .select('id, owner_id')
                                    .eq('id', familyGroupId)
                                    .single()];
                        case 1:
                            _b = _h.sent(), groupRow = _b.data, groupErr = _b.error;
                            if (groupErr || !groupRow) {
                                throw new errorHandler_js_1.AppError(400, 'Invalid family group ID');
                            }
                            isOwner = groupRow.owner_id === userId;
                            isMember = false;
                            if (!!isOwner) return [3 /*break*/, 3];
                            return [4 /*yield*/, supabase
                                    .from('family_group_members')
                                    .select('id')
                                    .eq('family_group_id', familyGroupId)
                                    .eq('user_id', userId)
                                    .single()];
                        case 2:
                            _c = _h.sent(), membership = _c.data, memErr = _c.error;
                            isMember = !!membership && !memErr;
                            _h.label = 3;
                        case 3:
                            if (!isOwner && !isMember) {
                                throw new errorHandler_js_1.AppError(403, 'Not authorized to create a subscription for this family group');
                            }
                            allowedFamilyGroupId = familyGroupId;
                            _h.label = 4;
                        case 4:
                            insertPayload = {
                                id: (0, crypto_1.randomUUID)(),
                                user_id: userId,
                                name: String(name),
                                category: String(category),
                                amount: amount,
                                frequency: frequency,
                                next_billing_at: normalizedNextBillingDate.toISOString().split('T')[0],
                                billing_month: billingMonthValue,
                                status: typeof status === 'string' ? status : 'active',
                                usage_count: typeof usageCount === 'number' ? usageCount : 0,
                                is_detected: typeof isDetected === 'boolean' ? isDetected : false,
                                website_domain: websiteDomain ? String(websiteDomain) : null,
                                description: description ? String(description) : null,
                                currency: currency ? String(currency) : 'USD',
                            };
                            if (allowedFamilyGroupId) {
                                insertPayload.family_group_id = allowedFamilyGroupId;
                            }
                            return [4 /*yield*/, supabase
                                    .from('subscriptions')
                                    .insert(insertPayload)
                                    .select('*')
                                    .single()];
                        case 5:
                            _d = _h.sent(), inserted = _d.data, insertError = _d.error;
                            if (insertError) {
                                // Check for unique constraint violation
                                if (insertError.code === '23505' || (insertError.message && insertError.message.includes('unique constraint'))) {
                                    throw new errorHandler_js_1.AppError(409, 'A subscription with this name, amount, and billing date already exists');
                                }
                                console.error('[Routes] Failed to insert subscription', {
                                    insertPayload: insertPayload,
                                    insertError: insertError,
                                });
                                throw new errorHandler_js_1.AppError(500, insertError.message || 'Failed to create subscription');
                            }
                            if (!inserted) {
                                throw new errorHandler_js_1.AppError(500, 'Failed to create subscription (no data returned)');
                            }
                            // Clear cache for this user
                            clearSubscriptionsCacheForUser(userId);
                            res.status(201).json(mapSubscriptionFromDb(inserted));
                            return [2 /*return*/];
                    }
                });
            }); }));
            app.patch("/api/subscriptions/:id/usage", (0, errorHandler_js_1.asyncHandler)(function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var usageCount, userId, authHeader, supabase, _a, existingSub, fetchErr, subscriptionOwner, allow, memberships, groupIds, ownerGroups, month, existingAgain, monthly, usageMonthValue, _b, data, error;
                var _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            usageCount = req.body.usageCount;
                            if (typeof usageCount !== "number" || usageCount < 0) {
                                throw new errorHandler_js_1.AppError(400, "Usage count must be a non-negative number");
                            }
                            userId = (_d = (_c = req.session) === null || _c === void 0 ? void 0 : _c.user) === null || _d === void 0 ? void 0 : _d.id;
                            if (!userId) {
                                authHeader = (_e = req.headers.authorization) === null || _e === void 0 ? void 0 : _e.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                throw new errorHandler_js_1.UnauthorizedError('Authentication required');
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase
                                    .from('subscriptions')
                                    .select('*')
                                    .eq('id', req.params.id)
                                    .single()];
                        case 1:
                            _a = _f.sent(), existingSub = _a.data, fetchErr = _a.error;
                            if (fetchErr || !existingSub) {
                                throw new errorHandler_js_1.NotFoundError('Subscription not found');
                            }
                            subscriptionOwner = existingSub.user_id;
                            allow = subscriptionOwner === userId;
                            if (!!allow) return [3 /*break*/, 4];
                            return [4 /*yield*/, supabase
                                    .from('family_group_members')
                                    .select('family_group_id')
                                    .eq('user_id', subscriptionOwner)];
                        case 2:
                            memberships = (_f.sent()).data;
                            groupIds = (memberships || []).map(function (m) { return m.family_group_id; });
                            if (!(groupIds.length > 0)) return [3 /*break*/, 4];
                            return [4 /*yield*/, supabase
                                    .from('family_groups')
                                    .select('id')
                                    .in('id', groupIds)
                                    .eq('owner_id', userId)];
                        case 3:
                            ownerGroups = (_f.sent()).data;
                            if (ownerGroups && ownerGroups.length > 0)
                                allow = true;
                            _f.label = 4;
                        case 4:
                            if (!allow)
                                throw new errorHandler_js_1.ForbiddenError('Not authorized to update this subscription');
                            month = new Date().toISOString().substr(0, 7);
                            return [4 /*yield*/, supabase
                                    .from('subscriptions')
                                    .select('monthly_usage_count,usage_month')
                                    .eq('id', req.params.id)
                                    .single()];
                        case 5:
                            existingAgain = (_f.sent()).data;
                            monthly = usageCount;
                            usageMonthValue = month;
                            if (existingAgain && existingAgain.usage_month !== month) {
                                // reset if we crossed into a new month
                                monthly = usageCount;
                                usageMonthValue = month;
                            }
                            return [4 /*yield*/, supabase
                                    .from('subscriptions')
                                    .update({
                                    usage_count: usageCount,
                                    monthly_usage_count: monthly,
                                    usage_month: usageMonthValue,
                                    last_used_at: new Date().toISOString().split('T')[0]
                                })
                                    .eq('id', req.params.id)
                                    .select()
                                    .single()];
                        case 6:
                            _b = _f.sent(), data = _b.data, error = _b.error;
                            if (error || !data) {
                                throw new errorHandler_js_1.AppError(500, 'Failed to update usage count');
                            }
                            res.json(mapSubscriptionFromDb(data));
                            return [2 /*return*/];
                    }
                });
            }); }));
            app.patch("/api/subscriptions/:id", (0, errorHandler_js_1.asyncHandler)(function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var subscriptionId, nextBillingDate, userId, authHeader, supabase, _a, existingSub, fetchErr, subscriptionOwner, allow, memberships, groupIds, ownerGroups, normalized, billingMonthValue, parsed, today, existingRenewal, isAutoAdvance, updatePayload, err_3, _b, data, updateErr;
                var _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            subscriptionId = req.params.id;
                            nextBillingDate = req.body.nextBillingDate;
                            console.log('[Routes] PATCH /api/subscriptions/:id', { subscriptionId: subscriptionId, nextBillingDate: nextBillingDate });
                            if (!nextBillingDate) {
                                throw new errorHandler_js_1.AppError(400, 'nextBillingDate is required');
                            }
                            userId = (_d = (_c = req.session) === null || _c === void 0 ? void 0 : _c.user) === null || _d === void 0 ? void 0 : _d.id;
                            if (!userId) {
                                authHeader = (_e = req.headers.authorization) === null || _e === void 0 ? void 0 : _e.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            console.log('[Routes] User ID from token:', userId);
                            if (!userId)
                                throw new errorHandler_js_1.UnauthorizedError('Authentication required');
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase
                                    .from('subscriptions')
                                    .select('*')
                                    .eq('id', subscriptionId)
                                    .single()];
                        case 1:
                            _a = _f.sent(), existingSub = _a.data, fetchErr = _a.error;
                            console.log('[Routes] Fetch subscription result:', { error: fetchErr === null || fetchErr === void 0 ? void 0 : fetchErr.message, subExists: !!existingSub, owner: existingSub === null || existingSub === void 0 ? void 0 : existingSub.user_id });
                            if (fetchErr || !existingSub) {
                                console.error('[Routes] Subscription not found:', fetchErr);
                                return [2 /*return*/, res.status(404).json({ error: 'Subscription not found', details: fetchErr === null || fetchErr === void 0 ? void 0 : fetchErr.message })];
                            }
                            subscriptionOwner = existingSub.user_id;
                            allow = subscriptionOwner === userId;
                            console.log('[Routes] Direct owner check:', { subscriptionOwner: subscriptionOwner, userId: userId, allow: allow });
                            if (!!allow) return [3 /*break*/, 4];
                            return [4 /*yield*/, supabase
                                    .from('family_group_members')
                                    .select('family_group_id')
                                    .eq('user_id', subscriptionOwner)];
                        case 2:
                            memberships = (_f.sent()).data;
                            groupIds = (memberships || []).map(function (m) { return m.family_group_id; });
                            console.log('[Routes] Member found in groups:', groupIds);
                            if (!(groupIds.length > 0)) return [3 /*break*/, 4];
                            return [4 /*yield*/, supabase
                                    .from('family_groups')
                                    .select('id')
                                    .in('id', groupIds)
                                    .eq('owner_id', userId)];
                        case 3:
                            ownerGroups = (_f.sent()).data;
                            console.log('[Routes] Requester owns groups:', ownerGroups === null || ownerGroups === void 0 ? void 0 : ownerGroups.map(function (g) { return g.id; }));
                            if (ownerGroups && ownerGroups.length > 0)
                                allow = true;
                            _f.label = 4;
                        case 4:
                            console.log('[Routes] Final authorization decision:', allow);
                            if (!allow)
                                return [2 /*return*/, res.status(403).json({ error: 'Not authorized to update this subscription' })];
                            normalized = nextBillingDate;
                            billingMonthValue = undefined;
                            try {
                                parsed = parseDateOnlyLocal(nextBillingDate);
                                if (parsed && !isNaN(parsed.getTime())) {
                                    normalized = formatDateLocal(parsed);
                                    today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    existingRenewal = normalizeRenewalDate(existingSub);
                                    isAutoAdvance = Boolean(req.body.autoAdvanced);
                                    if (isAutoAdvance && existingRenewal && existingRenewal <= today && parsed > today) {
                                        // Preserve the subscription's previous billing month only when the
                                        // client indicated this update is an auto-advance.
                                        billingMonthValue = formatBillingMonth(existingRenewal);
                                    }
                                    else {
                                        billingMonthValue = parsed <= today ? formatBillingMonth(today) : formatBillingMonth(parsed);
                                    }
                                }
                            }
                            catch (e) {
                                console.warn('[Routes] Failed to parse nextBillingDate in PATCH /api/subscriptions/:id', { nextBillingDate: nextBillingDate, error: e });
                            }
                            console.log('[Routes] Updating subscription with normalized date:', normalized, { billingMonthValue: billingMonthValue });
                            updatePayload = { next_billing_at: normalized };
                            if (billingMonthValue) {
                                updatePayload.billing_month = billingMonthValue;
                            }
                            _f.label = 5;
                        case 5:
                            _f.trys.push([5, 7, , 8]);
                            return [4 /*yield*/, supabase
                                    .from('subscription_calendar_events')
                                    .delete()
                                    .eq('subscription_id', subscriptionId)
                                    .eq('user_id', userId)
                                    .eq('event_type', 'renewal')];
                        case 6:
                            _f.sent();
                            return [3 /*break*/, 8];
                        case 7:
                            err_3 = _f.sent();
                            console.warn('[Routes] Failed to delete stored renewal calendar events', { subscriptionId: subscriptionId, userId: userId, err: err_3 });
                            return [3 /*break*/, 8];
                        case 8: return [4 /*yield*/, supabase
                                .from('subscriptions')
                                .update(updatePayload)
                                .eq('id', subscriptionId)
                                .select()
                                .single()];
                        case 9:
                            _b = _f.sent(), data = _b.data, updateErr = _b.error;
                            if (updateErr || !data) {
                                console.error('[Routes] Failed to update next_billing_at:', updateErr);
                                return [2 /*return*/, res.status(500).json({ error: 'Failed to update subscription', details: updateErr === null || updateErr === void 0 ? void 0 : updateErr.message })];
                            }
                            console.log('[Routes] Update successful:', data);
                            clearSubscriptionsCacheForUser(userId);
                            res.json(mapSubscriptionFromDb(data));
                            return [2 /*return*/];
                    }
                });
            }); }));
            app.patch("/api/subscriptions/:id/status", (0, errorHandler_js_1.asyncHandler)(function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var subscriptionId, status, allowedStatuses, userId, authHeader, supabase, _a, existingSub, fetchErr, allow, memberships, groupIds, ownerGroups, updateData, updatedSub, updateErr, tryUpdateWithoutDeletedAt, updateResult;
                var _this = this;
                var _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            subscriptionId = req.params.id;
                            status = req.body.status;
                            if (!status || typeof status !== 'string') {
                                throw new errorHandler_js_1.AppError(400, 'Status is required');
                            }
                            allowedStatuses = ['active', 'unused', 'to-cancel', 'deleted'];
                            if (!allowedStatuses.includes(status)) {
                                throw new errorHandler_js_1.AppError(400, 'Invalid subscription status');
                            }
                            userId = (_c = (_b = req.session) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.id;
                            if (!userId) {
                                authHeader = (_d = req.headers.authorization) === null || _d === void 0 ? void 0 : _d.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                throw new errorHandler_js_1.UnauthorizedError('Authentication required');
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase
                                    .from('subscriptions')
                                    .select('*')
                                    .eq('id', subscriptionId)
                                    .single()];
                        case 1:
                            _a = _f.sent(), existingSub = _a.data, fetchErr = _a.error;
                            if (fetchErr || !existingSub) {
                                return [2 /*return*/, res.status(404).json({ error: 'Subscription not found', details: fetchErr === null || fetchErr === void 0 ? void 0 : fetchErr.message })];
                            }
                            allow = existingSub.user_id === userId;
                            if (!!allow) return [3 /*break*/, 4];
                            return [4 /*yield*/, supabase
                                    .from('family_group_members')
                                    .select('family_group_id')
                                    .eq('user_id', existingSub.user_id)];
                        case 2:
                            memberships = (_f.sent()).data;
                            groupIds = (memberships || []).map(function (m) { return m.family_group_id; });
                            if (!(groupIds.length > 0)) return [3 /*break*/, 4];
                            return [4 /*yield*/, supabase
                                    .from('family_groups')
                                    .select('id')
                                    .in('id', groupIds)
                                    .eq('owner_id', userId)];
                        case 3:
                            ownerGroups = (_f.sent()).data;
                            if (ownerGroups && ownerGroups.length > 0)
                                allow = true;
                            _f.label = 4;
                        case 4:
                            if (!allow)
                                return [2 /*return*/, res.status(403).json({ error: 'Not authorized to update this subscription' })];
                            updateData = { status: status };
                            if (status === 'deleted') {
                                // In schemas that support deleted_at, we write it too. If column missing,
                                // this will be caught and ignored by fallback below.
                                updateData.deleted_at = new Date().toISOString();
                            }
                            updatedSub = null;
                            updateErr = null;
                            tryUpdateWithoutDeletedAt = function () { return __awaiter(_this, void 0, void 0, function () {
                                var fallbackResult;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, supabase
                                                .from('subscriptions')
                                                .update({ status: status })
                                                .eq('id', subscriptionId)
                                                .select()
                                                .single()];
                                        case 1:
                                            fallbackResult = _a.sent();
                                            updatedSub = fallbackResult.data;
                                            updateErr = fallbackResult.error;
                                            return [2 /*return*/];
                                    }
                                });
                            }); };
                            return [4 /*yield*/, supabase
                                    .from('subscriptions')
                                    .update(updateData)
                                    .eq('id', subscriptionId)
                                    .select()
                                    .single()];
                        case 5:
                            updateResult = _f.sent();
                            updatedSub = updateResult.data;
                            updateErr = updateResult.error;
                            if (!(updateErr && status === 'deleted' && ((_e = updateErr.message) === null || _e === void 0 ? void 0 : _e.includes('deleted_at')))) return [3 /*break*/, 7];
                            return [4 /*yield*/, tryUpdateWithoutDeletedAt()];
                        case 6:
                            _f.sent();
                            _f.label = 7;
                        case 7:
                            if (updateErr || !updatedSub) {
                                console.error('[Routes] Failed to update subscription status:', updateErr);
                                return [2 /*return*/, res.status(500).json({ error: 'Failed to update subscription status', details: (updateErr === null || updateErr === void 0 ? void 0 : updateErr.message) || 'Unknown' })];
                            }
                            clearSubscriptionsCacheForUser(userId);
                            res.json(mapSubscriptionFromDb(updatedSub));
                            return [2 /*return*/];
                    }
                });
            }); }));
            app.post("/api/subscriptions/:id/log-usage", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, authHeader, id, supabase, _a, existingSub, fetchErr, subscriptionOwner, allow, memberships, groupIds, ownerGroups, subscription, error_3;
                var _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            console.log("[Routes] hit log-usage for id=".concat(req.params.id));
                            _e.label = 1;
                        case 1:
                            _e.trys.push([1, 7, , 8]);
                            userId = (_c = (_b = req.session) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.id;
                            if (!userId) {
                                authHeader = (_d = req.headers.authorization) === null || _d === void 0 ? void 0 : _d.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            console.log("[Routes] log-usage auth userId=".concat(userId));
                            if (!userId) {
                                // this route used to be open but we now require a logged-in user so that
                                // clients get a proper 401 instead of silently failing later
                                return [2 /*return*/, res.status(401).json({ error: "Unauthorized" })];
                            }
                            id = req.params.id;
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase
                                    .from('subscriptions')
                                    .select('*')
                                    .eq('id', id)
                                    .single()];
                        case 2:
                            _a = _e.sent(), existingSub = _a.data, fetchErr = _a.error;
                            if (fetchErr) {
                                console.error("[Routes] log-usage supabase fetchErr for id=".concat(id), fetchErr);
                                return [2 /*return*/, res.status(500).json({ error: "Database error fetching subscription" })];
                            }
                            if (!existingSub) {
                                console.warn("[Routes] log-usage could not find subscription id=".concat(id));
                                return [2 /*return*/, res.status(404).json({ error: "Subscription not found or has been deleted" })];
                            }
                            subscriptionOwner = existingSub.user_id;
                            allow = subscriptionOwner === userId;
                            if (!!allow) return [3 /*break*/, 5];
                            return [4 /*yield*/, supabase
                                    .from('family_group_members')
                                    .select('family_group_id')
                                    .eq('user_id', subscriptionOwner)];
                        case 3:
                            memberships = (_e.sent()).data;
                            groupIds = (memberships || []).map(function (m) { return m.family_group_id; });
                            if (!(groupIds.length > 0)) return [3 /*break*/, 5];
                            return [4 /*yield*/, supabase
                                    .from('family_groups')
                                    .select('id')
                                    .in('id', groupIds)
                                    .eq('owner_id', userId)];
                        case 4:
                            ownerGroups = (_e.sent()).data;
                            if (ownerGroups && ownerGroups.length > 0)
                                allow = true;
                            _e.label = 5;
                        case 5:
                            if (!allow) {
                                return [2 /*return*/, res.status(403).json({ error: 'Not authorized to log usage for this subscription' })];
                            }
                            return [4 /*yield*/, storage_js_1.storage.recordSubscriptionUsage(id)];
                        case 6:
                            subscription = _e.sent();
                            if (!subscription) {
                                console.error("[Routes] recordSubscriptionUsage returned undefined for id=".concat(id));
                                return [2 /*return*/, res.status(500).json({ error: "Failed to record usage" })];
                            }
                            res.json(subscription);
                            return [3 /*break*/, 8];
                        case 7:
                            error_3 = _e.sent();
                            console.error("[Routes] POST /api/subscriptions/:id/log-usage error:", error_3);
                            res.status(500).json({ error: "Failed to record usage" });
                            return [3 /*break*/, 8];
                        case 8: return [2 /*return*/];
                    }
                });
            }); });
            // Track usage by domain (used by browser extension)
            app.post("/api/track-usage-by-domain", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var authHeader, userId, _a, domain, timeSpent, subscription, monthlyAmount, currentMonth, usageForCost, costPerUse, error_4, message;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _c.trys.push([0, 2, , 3]);
                            authHeader = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace('Bearer ', '');
                            if (!authHeader) {
                                return [2 /*return*/, res.status(401).json({ error: "Missing authorization header" })];
                            }
                            userId = extractUserIdFromToken(authHeader);
                            if (!userId) {
                                return [2 /*return*/, res.status(401).json({ error: "Invalid token" })];
                            }
                            _a = req.body, domain = _a.domain, timeSpent = _a.timeSpent;
                            if (!domain) {
                                return [2 /*return*/, res.status(400).json({ error: "Missing domain in request body" })];
                            }
                            return [4 /*yield*/, storage_js_1.storage.trackUsageByDomain(userId, domain, timeSpent || 0)];
                        case 1:
                            subscription = _c.sent();
                            if (!subscription) {
                                return [2 /*return*/, res.status(404).json({
                                        error: "No subscription found for this domain",
                                        message: "Make sure the domain matches the website_domain in your subscription settings"
                                    })];
                            }
                            monthlyAmount = subscription.frequency === 'yearly' ? subscription.amount / 12 : subscription.frequency === 'quarterly' ? subscription.amount / 3 : subscription.frequency === 'weekly' ? subscription.amount * 4 : subscription.amount;
                            currentMonth = new Date().toISOString().slice(0, 7);
                            usageForCost = subscription.usageMonth === currentMonth ? subscription.monthlyUsageCount : subscription.usageCount;
                            costPerUse = usageForCost > 0 ? monthlyAmount / usageForCost : monthlyAmount;
                            res.json({
                                message: "Usage tracked successfully",
                                subscription: subscription,
                                usageCount: subscription.usageCount,
                                monthlyUsageCount: subscription.monthlyUsageCount,
                                costPerUse: costPerUse,
                            });
                            return [3 /*break*/, 3];
                        case 2:
                            error_4 = _c.sent();
                            message = error_4 instanceof Error ? error_4.message : "Unknown error";
                            console.error("[Routes] POST /api/track-usage-by-domain error:", message);
                            res.status(500).json({ error: "Failed to track usage", message: message });
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            app.delete("/api/subscriptions/:id", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, authHeader, supabase, _a, data, error, error_5;
                var _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            _e.trys.push([0, 2, , 3]);
                            userId = (_c = (_b = req.session) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.id;
                            if (!userId) {
                                authHeader = (_d = req.headers.authorization) === null || _d === void 0 ? void 0 : _d.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase
                                    .from('subscriptions')
                                    .delete()
                                    .eq('id', req.params.id)
                                    .eq('user_id', userId)
                                    .select()
                                    .single()];
                        case 1:
                            _a = _e.sent(), data = _a.data, error = _a.error;
                            if (error || !data) {
                                console.error('[Routes] DELETE /api/subscriptions/:id error or no data:', error);
                                return [2 /*return*/, res.status(404).json({ error: "Subscription not found or not authorized" })];
                            }
                            clearSubscriptionsCacheForUser(userId);
                            res.status(200).json({ success: true, message: "Subscription deleted permanently" });
                            return [3 /*break*/, 3];
                        case 2:
                            error_5 = _e.sent();
                            console.error('[Routes] DELETE /api/subscriptions/:id error:', error_5);
                            res.status(500).json({ error: "Failed to delete subscription" });
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            // Get calendar events for the user (includes both db events and renewal dates from subscriptions)
            app.get("/api/calendar-events", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId_1, authHeader, supabase, _a, dbEvents, error, subscriptions, renewalEvents, eventMap_1, allEvents, error_6, message;
                var _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            _e.trys.push([0, 3, , 4]);
                            userId_1 = (_c = (_b = req.session) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.id;
                            if (!userId_1) {
                                authHeader = (_d = req.headers.authorization) === null || _d === void 0 ? void 0 : _d.replace("Bearer ", "");
                                if (authHeader) {
                                    userId_1 = extractUserIdFromToken(authHeader);
                                }
                            }
                            if (!userId_1) {
                                return [2 /*return*/, res.status(401).json({ error: "Unauthorized" })];
                            }
                            console.log("[Routes] GET /api/calendar-events - userId:", userId_1);
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase
                                    .from("subscription_calendar_events")
                                    .select("*")
                                    .eq("user_id", userId_1)
                                    .order("event_date", { ascending: true })];
                        case 1:
                            _a = _e.sent(), dbEvents = _a.data, error = _a.error;
                            if (error) {
                                console.error("[Routes] Error fetching calendar events:", error);
                                return [2 /*return*/, res.status(500).json({ error: "Failed to fetch calendar events" })];
                            }
                            console.log("[Routes] DB calendar events found:", (dbEvents === null || dbEvents === void 0 ? void 0 : dbEvents.length) || 0);
                            return [4 /*yield*/, supabase
                                    .from("subscriptions")
                                    .select("*")
                                    .eq("user_id", userId_1)];
                        case 2:
                            subscriptions = (_e.sent()).data;
                            console.log("[Routes] Subscriptions found:", (subscriptions === null || subscriptions === void 0 ? void 0 : subscriptions.length) || 0, "- Data:", subscriptions === null || subscriptions === void 0 ? void 0 : subscriptions.map(function (s) { return ({ name: s.name, status: s.status, next_billing_at: s.next_billing_at }); }));
                            renewalEvents = (subscriptions || [])
                                .filter(function (sub) { return sub.status === "active" || sub.status === "unused"; })
                                .map(function (sub) {
                                // Use existing next_billing_at or default to today
                                var billingDate = sub.next_billing_at;
                                var parsedBillingDate = parseDateOnlyLocal(billingDate);
                                if (!parsedBillingDate) {
                                    console.log("[Routes] Subscription ".concat(sub.id, " (").concat(sub.name, ") missing or invalid next_billing_at, using today"));
                                    parsedBillingDate = parseDateOnlyLocal(new Date());
                                }
                                return {
                                    id: "renewal-".concat(sub.id),
                                    subscriptionId: sub.id,
                                    userId: userId_1,
                                    Title: "".concat(sub.name, " Renewal"),
                                    title: "".concat(sub.name, " Renewal"),
                                    eventDate: parsedBillingDate ? formatDateLocal(parsedBillingDate) : formatDateLocal(parseDateOnlyLocal(new Date())),
                                    eventType: "renewal",
                                    amount: sub.amount,
                                    createdAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString()
                                };
                            });
                            console.log("[Routes] Renewal events generated:", renewalEvents.length, "- Events:", renewalEvents.map(function (e) { return ({ id: e.id, title: e.title, eventDate: e.eventDate }); }));
                            eventMap_1 = new Map();
                            (dbEvents || []).forEach(function (e) {
                                var isStoredRenewal = e.eventType === 'renewal' || (typeof e.id === 'string' && e.id.startsWith('renewal-'));
                                if (isStoredRenewal) {
                                    return;
                                }
                                eventMap_1.set(e.id, e);
                            });
                            renewalEvents.forEach(function (e) {
                                eventMap_1.set(e.id, e);
                            });
                            allEvents = Array.from(eventMap_1.values())
                                .sort(function (a, b) { return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(); });
                            console.log("[Routes] Final events returned:", allEvents.length);
                            res.json(allEvents);
                            return [3 /*break*/, 4];
                        case 3:
                            error_6 = _e.sent();
                            message = error_6 instanceof Error ? error_6.message : "Unknown error";
                            console.error("[Routes] GET /api/calendar-events error:", message);
                            res.status(500).json({ error: "Failed to fetch calendar events", message: message });
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
            app.get("/api/spending/monthly", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, authHeader, supabase, subscriptions, offsetMinutes, localDateParam, now, result, i, monthStart, monthEnd, monthStr, isCurrentMonth, monthlyAmount, _i, subscriptions_1, sub, status_1, renewalDate, monthlyAmt, error_7;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _d.trys.push([0, 2, , 3]);
                            userId = (_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id;
                            if (!userId) {
                                authHeader = (_c = req.headers.authorization) === null || _c === void 0 ? void 0 : _c.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase
                                    .from('subscriptions')
                                    .select('*')
                                    .eq('user_id', userId)];
                        case 1:
                            subscriptions = (_d.sent()).data;
                            if (!subscriptions || subscriptions.length === 0) {
                                return [2 /*return*/, res.json([])];
                            }
                            offsetMinutes = typeof req.query.offsetMinutes === 'string' ? parseInt(req.query.offsetMinutes, 10) || 0 : 0;
                            localDateParam = typeof req.query.localDate === 'string' ? req.query.localDate : undefined;
                            now = localDateParam ? (parseDateOnlyLocal(localDateParam) || new Date()) : new Date();
                            result = [];
                            // Generate for last 6 complete months + current month (7 total)
                            for (i = 6; i >= 0; i--) {
                                monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
                                monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
                                monthStr = monthStart.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                                isCurrentMonth = i === 0;
                                monthlyAmount = 0;
                                for (_i = 0, subscriptions_1 = subscriptions; _i < subscriptions_1.length; _i++) {
                                    sub = subscriptions_1[_i];
                                    status_1 = normalizeStatus(sub.status);
                                    if (status_1 === 'deleted')
                                        continue;
                                    renewalDate = normalizeRenewalDate(sub);
                                    if (!renewalDate)
                                        continue;
                                    if (isSubscriptionBilledInMonth(sub, monthStart, monthEnd, now, isCurrentMonth, offsetMinutes)) {
                                        monthlyAmt = monthlyAmountForSubscriptionRow(sub);
                                        monthlyAmount += convertToUSD(monthlyAmt, sub.currency || 'USD');
                                    }
                                }
                                result.push({
                                    month: monthStr,
                                    amount: Math.round(monthlyAmount * 100) / 100,
                                    isCurrentMonth: isCurrentMonth
                                });
                            }
                            res.json(result);
                            return [3 /*break*/, 3];
                        case 2:
                            error_7 = _d.sent();
                            console.error("[Spending] Error calculating monthly spending:", error_7);
                            res.status(500).json({ error: "Failed to get monthly spending" });
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            app.get("/api/spending/category", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, authHeader, supabase, subscriptions, offsetMinutes_1, localDateParam, now_1, monthStart_1, monthEnd_1, categoryMap_1, totalAmount_1, result, error_8;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _d.trys.push([0, 2, , 3]);
                            userId = (_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id;
                            if (!userId) {
                                authHeader = (_c = req.headers.authorization) === null || _c === void 0 ? void 0 : _c.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase
                                    .from('subscriptions')
                                    .select('*')
                                    .eq('user_id', userId)];
                        case 1:
                            subscriptions = (_d.sent()).data;
                            if (!subscriptions || subscriptions.length === 0) {
                                return [2 /*return*/, res.json([])];
                            }
                            offsetMinutes_1 = typeof req.query.offsetMinutes === 'string' ? parseInt(req.query.offsetMinutes, 10) || 0 : 0;
                            localDateParam = typeof req.query.localDate === 'string' ? req.query.localDate : undefined;
                            now_1 = localDateParam ? (parseDateOnlyLocal(localDateParam) || new Date()) : new Date();
                            monthStart_1 = new Date(now_1.getFullYear(), now_1.getMonth(), 1);
                            monthEnd_1 = new Date(now_1.getFullYear(), now_1.getMonth() + 1, 0, 23, 59, 59);
                            categoryMap_1 = new Map();
                            subscriptions.forEach(function (sub) {
                                var status = normalizeStatus(sub.status);
                                if (status === 'deleted')
                                    return;
                                // Get renewal date
                                var renewalDateStr = sub.next_billing_at || sub.nextBillingDate || sub.next_billing_date;
                                if (!renewalDateStr)
                                    return;
                                var renewalDate = new Date(renewalDateStr);
                                if (isNaN(renewalDate.getTime()))
                                    return;
                                if (!isSubscriptionBilledInMonth(sub, monthStart_1, monthEnd_1, now_1, true, offsetMinutes_1))
                                    return;
                                var monthlyAmount = convertToUSD(monthlyAmountForSubscriptionRow(sub), sub.currency || 'USD');
                                var existing = categoryMap_1.get(sub.category) || { amount: 0, count: 0 };
                                categoryMap_1.set(sub.category, {
                                    amount: existing.amount + monthlyAmount,
                                    count: existing.count + 1
                                });
                            });
                            totalAmount_1 = Array.from(categoryMap_1.values()).reduce(function (sum, v) { return sum + v.amount; }, 0);
                            result = Array.from(categoryMap_1.entries()).map(function (_a) {
                                var category = _a[0], data = _a[1];
                                return ({
                                    category: category,
                                    amount: Math.round(data.amount * 100) / 100,
                                    percentage: totalAmount_1 > 0 ? Math.round((data.amount / totalAmount_1) * 100) : 0,
                                    count: data.count
                                });
                            });
                            res.json(result);
                            return [3 /*break*/, 3];
                        case 2:
                            error_8 = _d.sent();
                            res.status(500).json({ error: "Failed to get spending by category" });
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            app.get("/api/analysis/cost-per-use", (0, errorHandler_js_1.asyncHandler)(handleCostPerUse));
            app.get("/api/insights/behavioral", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, authHeader, supabase, wantFamily, subsToConsider, ownedGroups, memberGroups, groupIds, members, memberIds, subs, subscriptions, actionableSubs, insights, error_9;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _d.trys.push([0, 8, , 9]);
                            userId = (_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id;
                            if (!userId) {
                                authHeader = (_c = req.headers.authorization) === null || _c === void 0 ? void 0 : _c.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            wantFamily = String(req.query.family).toLowerCase() === 'true';
                            subsToConsider = [];
                            if (!wantFamily) return [3 /*break*/, 5];
                            return [4 /*yield*/, supabase
                                    .from('family_groups')
                                    .select('id')
                                    .eq('owner_id', userId)];
                        case 1:
                            ownedGroups = (_d.sent()).data;
                            return [4 /*yield*/, supabase
                                    .from('family_group_members')
                                    .select('family_group_id')
                                    .eq('user_id', userId)];
                        case 2:
                            memberGroups = (_d.sent()).data;
                            groupIds = Array.from(new Set(__spreadArray(__spreadArray([], (ownedGroups || []).map(function (g) { return g.id; }), true), (memberGroups || []).map(function (m) { return m.family_group_id; }), true))).filter(Boolean);
                            if (!(groupIds.length > 0)) return [3 /*break*/, 5];
                            return [4 /*yield*/, supabase
                                    .from('family_group_members')
                                    .select('user_id')
                                    .in('family_group_id', groupIds)];
                        case 3:
                            members = (_d.sent()).data;
                            memberIds = Array.from(new Set(__spreadArray([
                                userId
                            ], (members || []).map(function (m) { return m.user_id; }), true))).filter(Boolean);
                            return [4 /*yield*/, supabase
                                    .from('subscriptions')
                                    .select('*')
                                    .in('user_id', memberIds)];
                        case 4:
                            subs = (_d.sent()).data;
                            subsToConsider = subs || [];
                            _d.label = 5;
                        case 5:
                            if (!(subsToConsider.length === 0)) return [3 /*break*/, 7];
                            return [4 /*yield*/, supabase
                                    .from('subscriptions')
                                    .select('*')
                                    .eq('user_id', userId)];
                        case 6:
                            subscriptions = (_d.sent()).data;
                            subsToConsider = subscriptions || [];
                            _d.label = 7;
                        case 7:
                            if (!subsToConsider || subsToConsider.length === 0) {
                                return [2 /*return*/, res.json([])];
                            }
                            actionableSubs = subsToConsider.filter(function (sub) {
                                return sub.status === 'unused' || sub.status === 'to-cancel';
                            });
                            insights = actionableSubs.map(function (sub) {
                                var _a;
                                var monthlyAmount = sub.frequency === 'yearly' ? sub.amount / 12 : sub.frequency === 'quarterly' ? sub.amount / 3 : sub.frequency === 'weekly' ? sub.amount * 4 : sub.amount;
                                var currency = (sub.currency || 'USD').toUpperCase();
                                var exchangeRates = {
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
                                var rate = (_a = exchangeRates[currency]) !== null && _a !== void 0 ? _a : 1;
                                var baseItems = [
                                    { item: 'coffee drinks', unitCostUsd: 4.5, icon: 'coffee' },
                                    { item: 'breakfast sandwiches', unitCostUsd: 6.5, icon: 'shopping' },
                                    { item: 'lunch meals', unitCostUsd: 13, icon: 'utensils' },
                                    { item: 'movie tickets', unitCostUsd: 14.5, icon: 'film' },
                                    { item: 'Spotify months', unitCostUsd: 10.99, icon: 'music' },
                                    { item: 'Netflix months', unitCostUsd: 15.49, icon: 'tv' },
                                    { item: 'gym day passes', unitCostUsd: 20, icon: 'dumbbell' },
                                    { item: 'gas tank fills', unitCostUsd: 55, icon: 'fuel' },
                                    { item: 'meal kit deliveries', unitCostUsd: 60, icon: 'shopping' },
                                    { item: 'one-way flights', unitCostUsd: 150, icon: 'plane' },
                                ];
                                var equivalents = baseItems
                                    .map(function (e) { return ({
                                    item: e.item,
                                    count: Math.floor(monthlyAmount / (e.unitCostUsd * rate)),
                                    icon: e.icon,
                                    totalCost: Math.floor(monthlyAmount / (e.unitCostUsd * rate)) * e.unitCostUsd * rate
                                }); })
                                    .filter(function (e) { return e.count >= 1; })
                                    .sort(function (a, b) { return b.count - a.count || a.item.localeCompare(b.item); })
                                    .slice(0, 3);
                                return {
                                    subscriptionId: sub.id,
                                    subscriptionName: sub.name,
                                    userId: sub.user_id,
                                    monthlyAmount: Math.round(monthlyAmount * 100) / 100,
                                    currency: currency,
                                    status: sub.status,
                                    subStatus: sub.status,
                                    equivalents: equivalents,
                                };
                            });
                            res.json(insights);
                            return [3 /*break*/, 9];
                        case 8:
                            error_9 = _d.sent();
                            res.status(500).json({ error: "Failed to get behavioral insights" });
                            return [3 /*break*/, 9];
                        case 9: return [2 /*return*/];
                    }
                });
            }); });
            app.get("/api/insights", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, authHeader, supabase, insights, error_10;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _d.trys.push([0, 2, , 3]);
                            userId = (_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id;
                            if (!userId) {
                                authHeader = (_c = req.headers.authorization) === null || _c === void 0 ? void 0 : _c.replace("Bearer ", "");
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId) {
                                return [2 /*return*/, res.json([])];
                            }
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase
                                    .from('insights')
                                    .select('*')
                                    .eq('user_id', userId)];
                        case 1:
                            insights = (_d.sent()).data;
                            res.json(insights || []);
                            return [3 /*break*/, 3];
                        case 2:
                            error_10 = _d.sent();
                            res.status(500).json({ error: "Failed to get insights" });
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            app.get("/api/recommendations", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, authHeader, supabase_1, getUserRes, user, extracted, err_4, extracted, supabase, wantFamily, subsToConsider, ownedGroups, memberGroups, groupIds, members, memberIds, subs, _a, subscriptions, subsErr, generateAIRecommendations, recommendations, error_11;
                var _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            _e.trys.push([0, 13, , 14]);
                            userId = (_c = (_b = req.session) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.id;
                            if (!!userId) return [3 /*break*/, 4];
                            authHeader = (_d = req.headers.authorization) === null || _d === void 0 ? void 0 : _d.replace("Bearer ", "");
                            if (!authHeader) return [3 /*break*/, 4];
                            supabase_1 = (0, supabase_js_2.getSupabaseClient)();
                            _e.label = 1;
                        case 1:
                            _e.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, supabase_1.auth.getUser(authHeader)];
                        case 2:
                            getUserRes = _e.sent();
                            user = (getUserRes && getUserRes.data && getUserRes.data.user) || null;
                            if (user) {
                                userId = user.id;
                            }
                            else {
                                extracted = extractUserIdFromToken(authHeader);
                                if (extracted)
                                    userId = extracted;
                                else
                                    console.warn('[Routes] Could not resolve user from auth header for /api/recommendations');
                            }
                            return [3 /*break*/, 4];
                        case 3:
                            err_4 = _e.sent();
                            console.warn('[Routes] supabase.auth.getUser threw, falling back to token decode:', err_4 instanceof Error ? err_4.message : err_4);
                            extracted = extractUserIdFromToken(authHeader);
                            if (extracted)
                                userId = extracted;
                            return [3 /*break*/, 4];
                        case 4:
                            if (!userId) {
                                return [2 /*return*/, res.json([])];
                            }
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            wantFamily = String(req.query.family).toLowerCase() === 'true';
                            subsToConsider = [];
                            if (!wantFamily) return [3 /*break*/, 9];
                            return [4 /*yield*/, supabase
                                    .from('family_groups')
                                    .select('id')
                                    .eq('owner_id', userId)];
                        case 5:
                            ownedGroups = (_e.sent()).data;
                            return [4 /*yield*/, supabase
                                    .from('family_group_members')
                                    .select('family_group_id')
                                    .eq('user_id', userId)];
                        case 6:
                            memberGroups = (_e.sent()).data;
                            groupIds = Array.from(new Set(__spreadArray(__spreadArray([], (ownedGroups || []).map(function (g) { return g.id; }), true), (memberGroups || []).map(function (m) { return m.family_group_id; }), true))).filter(Boolean);
                            if (!(groupIds.length > 0)) return [3 /*break*/, 9];
                            return [4 /*yield*/, supabase
                                    .from('family_group_members')
                                    .select('user_id')
                                    .in('family_group_id', groupIds)];
                        case 7:
                            members = (_e.sent()).data;
                            memberIds = Array.from(new Set(__spreadArray([
                                userId
                            ], (members || []).map(function (m) { return m.user_id; }), true))).filter(Boolean);
                            return [4 /*yield*/, supabase
                                    .from('subscriptions')
                                    .select('*')
                                    .in('user_id', memberIds)];
                        case 8:
                            subs = (_e.sent()).data;
                            subsToConsider = subs || [];
                            _e.label = 9;
                        case 9:
                            if (!(subsToConsider.length === 0)) return [3 /*break*/, 11];
                            return [4 /*yield*/, supabase
                                    .from('subscriptions')
                                    .select('*')
                                    .eq('user_id', userId)];
                        case 10:
                            _a = _e.sent(), subscriptions = _a.data, subsErr = _a.error;
                            if (subsErr) {
                                console.error('[Routes] Error fetching subscriptions for recommendations:', subsErr);
                            }
                            subsToConsider = subscriptions || [];
                            _e.label = 11;
                        case 11:
                            console.log('[Routes] /api/recommendations fetched subscriptions count:', (subsToConsider || []).length);
                            return [4 /*yield*/, Promise.resolve().then(function () { return require('./family-sharing.cjs'); })];
                        case 12:
                            generateAIRecommendations = (_e.sent()).generateAIRecommendations;
                            recommendations = generateAIRecommendations(subsToConsider || []);
                            console.log('[Routes] /api/recommendations returning', (recommendations || []).length, 'recommendations');
                            res.json(recommendations || []);
                            return [3 /*break*/, 14];
                        case 13:
                            error_11 = _e.sent();
                            console.error('[Routes] /api/recommendations error:', error_11 instanceof Error ? error_11.stack || error_11.message : error_11);
                            res.status(500).json({ error: "Failed to get recommendations" });
                            return [3 /*break*/, 14];
                        case 14: return [2 /*return*/];
                    }
                });
            }); });
            app.get("/api/bank-connections", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var connections, error_12;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, storage_js_1.storage.getBankConnections()];
                        case 1:
                            connections = _a.sent();
                            res.json(connections);
                            return [3 /*break*/, 3];
                        case 2:
                            error_12 = _a.sent();
                            res.status(500).json({ error: "Failed to get bank connections" });
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            app.post("/api/bank-connections", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    try {
                        // TODO: insertBankConnectionSchema not available in schema
                        res.status(501).json({ error: "Bank connection creation not implemented" });
                        /*
                        const validatedData = insertBankConnectionSchema.parse(req.body);
                        const connection = await storage.createBankConnection(validatedData);
                        res.status(201).json(connection);
                        */
                    }
                    catch (error) {
                        if (error instanceof zod_1.z.ZodError) {
                            return [2 /*return*/, res.status(400).json({ error: "Invalid bank connection data", details: error.errors })];
                        }
                        res.status(500).json({ error: "Failed to create bank connection" });
                    }
                    return [2 /*return*/];
                });
            }); });
            app.patch("/api/bank-connections/:id/sync", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var connection, error_13;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, storage_js_1.storage.updateBankConnectionSync(req.params.id)];
                        case 1:
                            connection = _a.sent();
                            if (!connection) {
                                return [2 /*return*/, res.status(404).json({ error: "Bank connection not found" })];
                            }
                            res.json(connection);
                            return [3 /*break*/, 3];
                        case 2:
                            error_13 = _a.sent();
                            res.status(500).json({ error: "Failed to sync bank connection" });
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            app.delete("/api/bank-connections/:id", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var deleted, error_14;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, storage_js_1.storage.deleteBankConnection(req.params.id)];
                        case 1:
                            deleted = _a.sent();
                            if (!deleted) {
                                return [2 /*return*/, res.status(404).json({ error: "Bank connection not found" })];
                            }
                            res.status(204).send();
                            return [3 /*break*/, 3];
                        case 2:
                            error_14 = _a.sent();
                            res.status(500).json({ error: "Failed to delete bank connection" });
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            handleAccountEmailUpdate = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var email, userId, supabase, _a, authUser, authError, error_15;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 4, , 5]);
                            email = req.body.email;
                            if (!email || !email.includes("@")) {
                                return [2 /*return*/, res.status(400).json({ error: "Invalid email address" })];
                            }
                            return [4 /*yield*/, getUserIdFromRequest(req)];
                        case 1:
                            userId = _b.sent();
                            if (!userId) {
                                return [2 /*return*/, res.status(401).json({ error: "Unauthorized" })];
                            }
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase.auth.admin.updateUserById(userId, {
                                    email: email,
                                })];
                        case 2:
                            _a = _b.sent(), authUser = _a.data, authError = _a.error;
                            if (authError) {
                                console.error("[Account] Failed to update auth email:", authError);
                                return [2 /*return*/, res.status(500).json({ error: "Failed to update email" })];
                            }
                            return [4 /*yield*/, supabase.from("users").upsert({ id: userId, email: email })];
                        case 3:
                            _b.sent();
                            res.json({ success: true, message: "Email updated successfully" });
                            return [3 /*break*/, 5];
                        case 4:
                            error_15 = _b.sent();
                            console.error("[Account] Email update error:", error_15);
                            res.status(500).json({ error: "Failed to update email" });
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            }); };
            app.patch("/api/account/email", handleAccountEmailUpdate);
            app.patch("/account/email", handleAccountEmailUpdate);
            handleAccountPasswordUpdate = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var _a, currentPassword, newPassword, userId, supabase, _b, authUser, authError, error_16;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _c.trys.push([0, 4, , 5]);
                            _a = req.body, currentPassword = _a.currentPassword, newPassword = _a.newPassword;
                            if (!currentPassword || !newPassword) {
                                return [2 /*return*/, res.status(400).json({ error: "Missing password fields" })];
                            }
                            if (newPassword.length < 8) {
                                return [2 /*return*/, res.status(400).json({ error: "Password must be at least 8 characters" })];
                            }
                            return [4 /*yield*/, getUserIdFromRequest(req)];
                        case 1:
                            userId = _c.sent();
                            if (!userId) {
                                return [2 /*return*/, res.status(401).json({ error: "Unauthorized" })];
                            }
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase.auth.admin.updateUserById(userId, {
                                    password: newPassword,
                                })];
                        case 2:
                            _b = _c.sent(), authUser = _b.data, authError = _b.error;
                            if (authError) {
                                console.error("[Account] Failed to update auth password:", authError);
                                return [2 /*return*/, res.status(500).json({ error: "Failed to update password" })];
                            }
                            return [4 /*yield*/, supabase.from("users").upsert({ id: userId })];
                        case 3:
                            _c.sent();
                            res.json({ success: true, message: "Password updated successfully" });
                            return [3 /*break*/, 5];
                        case 4:
                            error_16 = _c.sent();
                            console.error("[Account] Password update error:", error_16);
                            res.status(500).json({ error: "Failed to update password" });
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            }); };
            app.patch("/api/account/password", handleAccountPasswordUpdate);
            app.patch("/account/password", handleAccountPasswordUpdate);
            app.get("/api/account/2fa/init", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    try {
                        // Placeholder initialization response for 2FA setup
                        res.json({
                            id: "",
                            secret: "",
                            otpauthUrl: "",
                        });
                    }
                    catch (error) {
                        res.status(500).json({ error: "Failed to initialize 2FA" });
                    }
                    return [2 /*return*/];
                });
            }); });
            app.get("/account/2fa/init", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    try {
                        res.json({
                            id: "",
                            secret: "",
                            otpauthUrl: "",
                        });
                    }
                    catch (error) {
                        res.status(500).json({ error: "Failed to initialize 2FA" });
                    }
                    return [2 /*return*/];
                });
            }); });
            app.post("/api/account/2fa", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var code;
                return __generator(this, function (_a) {
                    try {
                        code = req.body.code;
                        if (!code || code.length !== 6) {
                            return [2 /*return*/, res.status(400).json({ error: "Invalid authentication code" })];
                        }
                        // In a real app, this would verify the 2FA code against a time-based OTP
                        res.json({ success: true, message: "Two-factor authentication enabled" });
                    }
                    catch (error) {
                        res.status(500).json({ error: "Failed to enable 2FA" });
                    }
                    return [2 /*return*/];
                });
            }); });
            app.post("/account/2fa", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var code;
                return __generator(this, function (_a) {
                    try {
                        code = req.body.code;
                        if (!code || code.length !== 6) {
                            return [2 /*return*/, res.status(400).json({ error: "Invalid authentication code" })];
                        }
                        res.json({ success: true, message: "Two-factor authentication enabled" });
                    }
                    catch (error) {
                        res.status(500).json({ error: "Failed to enable 2FA" });
                    }
                    return [2 /*return*/];
                });
            }); });
            app.get("/api/account/export", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var subscriptions, transactions, insights, exportData, error_17;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 4, , 5]);
                            return [4 /*yield*/, storage_js_1.storage.getSubscriptions()];
                        case 1:
                            subscriptions = _a.sent();
                            return [4 /*yield*/, storage_js_1.storage.getTransactions()];
                        case 2:
                            transactions = _a.sent();
                            return [4 /*yield*/, storage_js_1.storage.getInsights()];
                        case 3:
                            insights = _a.sent();
                            exportData = {
                                exportDate: new Date().toISOString(),
                                subscriptions: subscriptions,
                                transactions: transactions,
                                insights: insights,
                            };
                            res.setHeader("Content-Type", "application/json");
                            res.setHeader("Content-Disposition", "attachment; filename=subveris-data.json");
                            res.json(exportData);
                            return [3 /*break*/, 5];
                        case 4:
                            error_17 = _a.sent();
                            res.status(500).json({ error: "Failed to export data" });
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            }); });
            app.get("/account/export", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var subscriptions, transactions, insights, exportData, error_18;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 4, , 5]);
                            return [4 /*yield*/, storage_js_1.storage.getSubscriptions()];
                        case 1:
                            subscriptions = _a.sent();
                            return [4 /*yield*/, storage_js_1.storage.getTransactions()];
                        case 2:
                            transactions = _a.sent();
                            return [4 /*yield*/, storage_js_1.storage.getInsights()];
                        case 3:
                            insights = _a.sent();
                            exportData = {
                                exportDate: new Date().toISOString(),
                                subscriptions: subscriptions,
                                transactions: transactions,
                                insights: insights,
                            };
                            res.setHeader("Content-Type", "application/json");
                            res.setHeader("Content-Disposition", "attachment; filename=subveris-data.json");
                            res.json(exportData);
                            return [3 /*break*/, 5];
                        case 4:
                            error_18 = _a.sent();
                            res.status(500).json({ error: "Failed to export data" });
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            }); });
            app.delete("/api/account", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, authHeader, supabase, _a, userSubscriptions, userSubscriptionsError, subscriptionIds, transactionError, calendarEventsError, subsError, userSubscriptionsDeleteError, familyGroupMembersError, _b, ownerSharedSubscriptions, ownerSharedSubscriptionsError, sharedSubscriptionIds, sharedCostSplitError, sharedSubscriptionsDeleteError, _c, ownedGroups, ownedGroupsError, ownedGroupIds, _d, ownedGroupSharedSubs, ownedGroupSharedSubsError, ownedSharedSubscriptionIds, ownedCostSplitsError, ownedGroupMembersError, ownedSharedSubscriptionsDeleteError, groupPlanBackupsError, groupsError, prefsError, insightsError, costSplitsByUserError, membersError, usersTableError, adminClient, authError_1, error_19;
                var _e, _f, _g;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0:
                            _h.trys.push([0, 30, , 31]);
                            userId = (_f = (_e = req.session) === null || _e === void 0 ? void 0 : _e.user) === null || _f === void 0 ? void 0 : _f.id;
                            if (!userId) {
                                authHeader = (_g = req.headers.authorization) === null || _g === void 0 ? void 0 : _g.replace("Bearer ", "");
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                return [2 /*return*/, res.status(401).json({ error: "Unauthorized" })];
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase
                                    .from("subscriptions")
                                    .select("id")
                                    .eq("user_id", userId)];
                        case 1:
                            _a = _h.sent(), userSubscriptions = _a.data, userSubscriptionsError = _a.error;
                            if (userSubscriptionsError) {
                                console.error("[Account] Error fetching user subscriptions:", userSubscriptionsError);
                            }
                            subscriptionIds = Array.isArray(userSubscriptions)
                                ? userSubscriptions.map(function (sub) { return sub.id; }).filter(Boolean)
                                : [];
                            if (!(subscriptionIds.length > 0)) return [3 /*break*/, 4];
                            return [4 /*yield*/, supabase
                                    .from("transactions")
                                    .delete()
                                    .in("subscription_id", subscriptionIds)];
                        case 2:
                            transactionError = (_h.sent()).error;
                            if (transactionError) {
                                console.error("[Account] Error deleting transaction history:", transactionError);
                            }
                            return [4 /*yield*/, supabase
                                    .from("subscription_calendar_events")
                                    .delete()
                                    .in("subscription_id", subscriptionIds)];
                        case 3:
                            calendarEventsError = (_h.sent()).error;
                            if (calendarEventsError) {
                                console.error("[Account] Error deleting calendar events:", calendarEventsError);
                            }
                            _h.label = 4;
                        case 4: return [4 /*yield*/, supabase
                                .from("subscriptions")
                                .delete()
                                .eq("user_id", userId)];
                        case 5:
                            subsError = (_h.sent()).error;
                            if (subsError) {
                                console.error("[Account] Error deleting subscriptions:", subsError);
                            }
                            return [4 /*yield*/, supabase
                                    .from("user_subscriptions")
                                    .delete()
                                    .eq("user_id", userId)];
                        case 6:
                            userSubscriptionsDeleteError = (_h.sent()).error;
                            if (userSubscriptionsDeleteError) {
                                console.error("[Account] Error deleting user subscriptions:", userSubscriptionsDeleteError);
                            }
                            return [4 /*yield*/, supabase
                                    .from("family_group_members")
                                    .delete()
                                    .eq("user_id", userId)];
                        case 7:
                            familyGroupMembersError = (_h.sent()).error;
                            if (familyGroupMembersError) {
                                console.error("[Account] Error deleting family group memberships:", familyGroupMembersError);
                            }
                            return [4 /*yield*/, supabase
                                    .from("shared_subscriptions")
                                    .select("id")
                                    .eq("shared_by_user_id", userId)];
                        case 8:
                            _b = _h.sent(), ownerSharedSubscriptions = _b.data, ownerSharedSubscriptionsError = _b.error;
                            if (ownerSharedSubscriptionsError) {
                                console.error("[Account] Error fetching shared subscriptions:", ownerSharedSubscriptionsError);
                            }
                            sharedSubscriptionIds = Array.isArray(ownerSharedSubscriptions)
                                ? ownerSharedSubscriptions.map(function (row) { return row.id; }).filter(Boolean)
                                : [];
                            if (!(sharedSubscriptionIds.length > 0)) return [3 /*break*/, 11];
                            return [4 /*yield*/, supabase
                                    .from("cost_splits")
                                    .delete()
                                    .in("shared_subscription_id", sharedSubscriptionIds)];
                        case 9:
                            sharedCostSplitError = (_h.sent()).error;
                            if (sharedCostSplitError) {
                                console.error("[Account] Error deleting cost splits for user shared subscriptions:", sharedCostSplitError);
                            }
                            return [4 /*yield*/, supabase
                                    .from("shared_subscriptions")
                                    .delete()
                                    .in("id", sharedSubscriptionIds)];
                        case 10:
                            sharedSubscriptionsDeleteError = (_h.sent()).error;
                            if (sharedSubscriptionsDeleteError) {
                                console.error("[Account] Error deleting user shared subscriptions:", sharedSubscriptionsDeleteError);
                            }
                            _h.label = 11;
                        case 11: return [4 /*yield*/, supabase
                                .from("family_groups")
                                .select("id")
                                .eq("owner_id", userId)];
                        case 12:
                            _c = _h.sent(), ownedGroups = _c.data, ownedGroupsError = _c.error;
                            if (ownedGroupsError) {
                                console.error("[Account] Error fetching owned family groups:", ownedGroupsError);
                            }
                            ownedGroupIds = Array.isArray(ownedGroups)
                                ? ownedGroups.map(function (group) { return group.id; }).filter(Boolean)
                                : [];
                            if (!(ownedGroupIds.length > 0)) return [3 /*break*/, 20];
                            return [4 /*yield*/, supabase
                                    .from("shared_subscriptions")
                                    .select("id")
                                    .in("family_group_id", ownedGroupIds)];
                        case 13:
                            _d = _h.sent(), ownedGroupSharedSubs = _d.data, ownedGroupSharedSubsError = _d.error;
                            if (ownedGroupSharedSubsError) {
                                console.error("[Account] Error fetching shared subscriptions for owned groups:", ownedGroupSharedSubsError);
                            }
                            ownedSharedSubscriptionIds = Array.isArray(ownedGroupSharedSubs)
                                ? ownedGroupSharedSubs.map(function (row) { return row.id; }).filter(Boolean)
                                : [];
                            if (!(ownedSharedSubscriptionIds.length > 0)) return [3 /*break*/, 15];
                            return [4 /*yield*/, supabase
                                    .from("cost_splits")
                                    .delete()
                                    .in("shared_subscription_id", ownedSharedSubscriptionIds)];
                        case 14:
                            ownedCostSplitsError = (_h.sent()).error;
                            if (ownedCostSplitsError) {
                                console.error("[Account] Error deleting cost splits for owned group shared subscriptions:", ownedCostSplitsError);
                            }
                            _h.label = 15;
                        case 15: return [4 /*yield*/, supabase
                                .from("family_group_members")
                                .delete()
                                .in("family_group_id", ownedGroupIds)];
                        case 16:
                            ownedGroupMembersError = (_h.sent()).error;
                            if (ownedGroupMembersError) {
                                console.error("[Account] Error deleting members of owned groups:", ownedGroupMembersError);
                            }
                            return [4 /*yield*/, supabase
                                    .from("shared_subscriptions")
                                    .delete()
                                    .in("family_group_id", ownedGroupIds)];
                        case 17:
                            ownedSharedSubscriptionsDeleteError = (_h.sent()).error;
                            if (ownedSharedSubscriptionsDeleteError) {
                                console.error("[Account] Error deleting shared subscriptions for owned groups:", ownedSharedSubscriptionsDeleteError);
                            }
                            return [4 /*yield*/, supabase
                                    .from("family_group_plan_backups")
                                    .delete()
                                    .in("family_group_id", ownedGroupIds)];
                        case 18:
                            groupPlanBackupsError = (_h.sent()).error;
                            if (groupPlanBackupsError) {
                                console.error("[Account] Error deleting family group plan backups:", groupPlanBackupsError);
                            }
                            return [4 /*yield*/, supabase
                                    .from("family_groups")
                                    .delete()
                                    .in("id", ownedGroupIds)];
                        case 19:
                            groupsError = (_h.sent()).error;
                            if (groupsError) {
                                console.error("[Account] Error deleting owned family groups:", groupsError);
                            }
                            _h.label = 20;
                        case 20: return [4 /*yield*/, supabase
                                .from("notification_preferences")
                                .delete()
                                .eq("user_id", userId)];
                        case 21:
                            prefsError = (_h.sent()).error;
                            if (prefsError) {
                                console.error("[Account] Error deleting preferences:", prefsError);
                            }
                            return [4 /*yield*/, supabase
                                    .from("insights")
                                    .delete()
                                    .eq("user_id", userId)];
                        case 22:
                            insightsError = (_h.sent()).error;
                            if (insightsError) {
                                console.error("[Account] Error deleting insights:", insightsError);
                            }
                            return [4 /*yield*/, supabase
                                    .from("cost_splits")
                                    .delete()
                                    .eq("user_id", userId)];
                        case 23:
                            costSplitsByUserError = (_h.sent()).error;
                            if (costSplitsByUserError) {
                                console.error("[Account] Error deleting cost splits for user:", costSplitsByUserError);
                            }
                            return [4 /*yield*/, supabase
                                    .from("family_members")
                                    .delete()
                                    .eq("user_id", userId)];
                        case 24:
                            membersError = (_h.sent()).error;
                            if (membersError) {
                                console.error("[Account] Error deleting legacy family memberships:", membersError);
                            }
                            return [4 /*yield*/, supabase
                                    .from("users")
                                    .delete()
                                    .eq("id", userId)];
                        case 25:
                            usersTableError = (_h.sent()).error;
                            if (usersTableError) {
                                console.error("[Account] Error deleting users table row:", usersTableError);
                            }
                            _h.label = 26;
                        case 26:
                            _h.trys.push([26, 28, , 29]);
                            adminClient = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
                            return [4 /*yield*/, adminClient.auth.admin.deleteUser(userId)];
                        case 27:
                            _h.sent();
                            console.log("[Account] Deleted auth user: ".concat(userId));
                            return [3 /*break*/, 29];
                        case 28:
                            authError_1 = _h.sent();
                            // If we can't delete from auth, still continue - user data is deleted
                            console.warn("[Account] Could not delete from auth (non-critical):", authError_1);
                            return [3 /*break*/, 29];
                        case 29:
                            res.json({
                                success: true,
                                message: "Account and all associated data deleted successfully"
                            });
                            return [3 /*break*/, 31];
                        case 30:
                            error_19 = _h.sent();
                            console.error("[Account] Error deleting account:", error_19);
                            res.status(500).json({ error: "Failed to delete account" });
                            return [3 /*break*/, 31];
                        case 31: return [2 /*return*/];
                    }
                });
            }); });
            // Get notification preferences
            app.get("/api/account/notification-preferences", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, authHeader, supabase, _a, data, error, error_20;
                var _b, _c, _d, _e, _f, _g;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0:
                            _h.trys.push([0, 2, , 3]);
                            userId = (_c = (_b = req.session) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.id;
                            if (!userId) {
                                authHeader = (_d = req.headers.authorization) === null || _d === void 0 ? void 0 : _d.replace("Bearer ", "");
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                return [2 /*return*/, res.status(401).json({ error: "Unauthorized" })];
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase
                                    .from("notification_preferences")
                                    .select("email_notifications, push_notifications, weekly_digest")
                                    .eq("user_id", userId)
                                    .single()];
                        case 1:
                            _a = _h.sent(), data = _a.data, error = _a.error;
                            if (error || !data) {
                                // Return defaults for new users
                                return [2 /*return*/, res.json({
                                        emailNotifications: true,
                                        pushNotifications: true,
                                        weeklyDigest: true,
                                    })];
                            }
                            res.json({
                                emailNotifications: (_e = data.email_notifications) !== null && _e !== void 0 ? _e : true,
                                pushNotifications: (_f = data.push_notifications) !== null && _f !== void 0 ? _f : true,
                                weeklyDigest: (_g = data.weekly_digest) !== null && _g !== void 0 ? _g : true,
                            });
                            return [3 /*break*/, 3];
                        case 2:
                            error_20 = _h.sent();
                            console.error("[Preferences] Error fetching:", error_20);
                            res.status(500).json({ error: "Failed to fetch preferences" });
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            app.get("/account/notification-preferences", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, authHeader, supabase, _a, data, error, error_21;
                var _b, _c, _d, _e, _f, _g;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0:
                            _h.trys.push([0, 2, , 3]);
                            userId = (_c = (_b = req.session) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.id;
                            if (!userId) {
                                authHeader = (_d = req.headers.authorization) === null || _d === void 0 ? void 0 : _d.replace("Bearer ", "");
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                return [2 /*return*/, res.status(401).json({ error: "Unauthorized" })];
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase
                                    .from("notification_preferences")
                                    .select("email_notifications, push_notifications, weekly_digest")
                                    .eq("user_id", userId)
                                    .single()];
                        case 1:
                            _a = _h.sent(), data = _a.data, error = _a.error;
                            if (error || !data) {
                                return [2 /*return*/, res.json({
                                        emailNotifications: true,
                                        pushNotifications: true,
                                        weeklyDigest: true,
                                    })];
                            }
                            res.json({
                                emailNotifications: (_e = data.email_notifications) !== null && _e !== void 0 ? _e : true,
                                pushNotifications: (_f = data.push_notifications) !== null && _f !== void 0 ? _f : true,
                                weeklyDigest: (_g = data.weekly_digest) !== null && _g !== void 0 ? _g : true,
                            });
                            return [3 /*break*/, 3];
                        case 2:
                            error_21 = _h.sent();
                            console.error("[Preferences] Error fetching:", error_21);
                            res.status(500).json({ error: "Failed to fetch preferences" });
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            // Update notification preferences
            app.patch("/api/account/notification-preferences", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, authHeader, _a, emailNotifications, pushNotifications, weeklyDigest, supabase, updateError, insertError, error_22;
                var _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            _e.trys.push([0, 5, , 6]);
                            userId = (_c = (_b = req.session) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.id;
                            if (!userId) {
                                authHeader = (_d = req.headers.authorization) === null || _d === void 0 ? void 0 : _d.replace("Bearer ", "");
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                return [2 /*return*/, res.status(401).json({ error: "Unauthorized" })];
                            _a = req.body, emailNotifications = _a.emailNotifications, pushNotifications = _a.pushNotifications, weeklyDigest = _a.weeklyDigest;
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase
                                    .from("notification_preferences")
                                    .update({
                                    email_notifications: emailNotifications,
                                    push_notifications: pushNotifications,
                                    weekly_digest: weeklyDigest,
                                    updated_at: new Date().toISOString(),
                                })
                                    .eq("user_id", userId)];
                        case 1:
                            updateError = (_e.sent()).error;
                            if (!(updateError && updateError.message.includes("No rows"))) return [3 /*break*/, 3];
                            return [4 /*yield*/, supabase
                                    .from("notification_preferences")
                                    .insert({
                                    user_id: userId,
                                    email_notifications: emailNotifications,
                                    push_notifications: pushNotifications,
                                    weekly_digest: weeklyDigest,
                                })];
                        case 2:
                            insertError = (_e.sent()).error;
                            if (insertError) {
                                console.error("[Preferences] Insert error:", insertError);
                                return [2 /*return*/, res.status(500).json({ error: "Failed to save preferences" })];
                            }
                            return [3 /*break*/, 4];
                        case 3:
                            if (updateError) {
                                console.error("[Preferences] Update error:", updateError);
                                return [2 /*return*/, res.status(500).json({ error: "Failed to save preferences" })];
                            }
                            _e.label = 4;
                        case 4:
                            res.json({
                                emailNotifications: emailNotifications,
                                pushNotifications: pushNotifications,
                                weeklyDigest: weeklyDigest,
                            });
                            return [3 /*break*/, 6];
                        case 5:
                            error_22 = _e.sent();
                            console.error("[Preferences] Error saving:", error_22);
                            res.status(500).json({ error: "Failed to save preferences" });
                            return [3 /*break*/, 6];
                        case 6: return [2 /*return*/];
                    }
                });
            }); });
            app.patch("/account/notification-preferences", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, authHeader, _a, emailNotifications, pushNotifications, weeklyDigest, supabase, updateError, insertError, error_23;
                var _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            _e.trys.push([0, 5, , 6]);
                            userId = (_c = (_b = req.session) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.id;
                            if (!userId) {
                                authHeader = (_d = req.headers.authorization) === null || _d === void 0 ? void 0 : _d.replace("Bearer ", "");
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                return [2 /*return*/, res.status(401).json({ error: "Unauthorized" })];
                            _a = req.body, emailNotifications = _a.emailNotifications, pushNotifications = _a.pushNotifications, weeklyDigest = _a.weeklyDigest;
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase
                                    .from("notification_preferences")
                                    .update({
                                    email_notifications: emailNotifications,
                                    push_notifications: pushNotifications,
                                    weekly_digest: weeklyDigest,
                                    updated_at: new Date().toISOString(),
                                })
                                    .eq("user_id", userId)];
                        case 1:
                            updateError = (_e.sent()).error;
                            if (!(updateError && updateError.message.includes("No rows"))) return [3 /*break*/, 3];
                            return [4 /*yield*/, supabase
                                    .from("notification_preferences")
                                    .insert({
                                    user_id: userId,
                                    email_notifications: emailNotifications,
                                    push_notifications: pushNotifications,
                                    weekly_digest: weeklyDigest,
                                })];
                        case 2:
                            insertError = (_e.sent()).error;
                            if (insertError) {
                                console.error("[Preferences] Insert error:", insertError);
                                return [2 /*return*/, res.status(500).json({ error: "Failed to save preferences" })];
                            }
                            return [3 /*break*/, 4];
                        case 3:
                            if (updateError) {
                                console.error("[Preferences] Update error:", updateError);
                                return [2 /*return*/, res.status(500).json({ error: "Failed to save preferences" })];
                            }
                            _e.label = 4;
                        case 4:
                            res.json({
                                emailNotifications: emailNotifications,
                                pushNotifications: pushNotifications,
                                weeklyDigest: weeklyDigest,
                            });
                            return [3 /*break*/, 6];
                        case 5:
                            error_23 = _e.sent();
                            console.error("[Preferences] Error saving:", error_23);
                            res.status(500).json({ error: "Failed to save preferences" });
                            return [3 /*break*/, 6];
                        case 6: return [2 /*return*/];
                    }
                });
            }); });
            // Analytics: Monthly savings
            // By default this returns the amount the requesting user has actually saved
            // this month by deleting services (status === 'deleted'). 
            // 'to-cancel' is a planned action and counts as potential savings only.
            //
            // If the query string contains `family=true` and the requester is an owner
            // of one or more family groups, the endpoint will instead total savings for
            // **all members of those groups** (including the owner). This enables the
            // sidebar to show a household total when family data view is active. The
            // client-side code adds the parameter whenever showFamilyData is set.
            //
            // Normalization is performed on the incoming status values in the patch
            // route to avoid 400s from quirky inputs.
            app.get("/api/analytics/monthly-savings", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, authHeader, supabase, subsToConsider, wantFamily, ownedGroups, memberGroups, groupIds, members, groupsWithOwners, memberIds, subs, subscriptions, now, currentMonth, nextMonth, normalizeStatus_1, isInCurrentMonth_1, calculateSavings, ownerId_1, ownerSubs, memberSubs, ownerMonthlySavings, memberMonthlySavings, totalMonthlySavings, error_24;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _d.trys.push([0, 9, , 10]);
                            userId = (_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id;
                            if (!userId) {
                                authHeader = (_c = req.headers.authorization) === null || _c === void 0 ? void 0 : _c.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            subsToConsider = [];
                            wantFamily = String(req.query.family).toLowerCase() === 'true';
                            if (!wantFamily) return [3 /*break*/, 6];
                            return [4 /*yield*/, supabase
                                    .from('family_groups')
                                    .select('id')
                                    .eq('owner_id', userId)];
                        case 1:
                            ownedGroups = (_d.sent()).data;
                            return [4 /*yield*/, supabase
                                    .from('family_group_members')
                                    .select('family_group_id')
                                    .eq('user_id', userId)];
                        case 2:
                            memberGroups = (_d.sent()).data;
                            groupIds = Array.from(new Set(__spreadArray(__spreadArray([], (ownedGroups || []).map(function (g) { return g.id; }), true), (memberGroups || []).map(function (m) { return m.family_group_id; }), true))).filter(Boolean);
                            if (!(groupIds.length > 0)) return [3 /*break*/, 6];
                            return [4 /*yield*/, supabase
                                    .from('family_group_members')
                                    .select('user_id')
                                    .in('family_group_id', groupIds)];
                        case 3:
                            members = (_d.sent()).data;
                            return [4 /*yield*/, supabase
                                    .from('family_groups')
                                    .select('owner_id')
                                    .in('id', groupIds)];
                        case 4:
                            groupsWithOwners = (_d.sent()).data;
                            memberIds = Array.from(new Set(__spreadArray(__spreadArray([
                                userId
                            ], (members || []).map(function (m) { return m.user_id; }), true), (groupsWithOwners || []).map(function (g) { return g.owner_id; }), true))).filter(Boolean);
                            return [4 /*yield*/, supabase
                                    .from('subscriptions')
                                    .select('*')
                                    .in('user_id', memberIds)];
                        case 5:
                            subs = (_d.sent()).data;
                            subsToConsider = subs || [];
                            _d.label = 6;
                        case 6:
                            if (!(subsToConsider.length === 0)) return [3 /*break*/, 8];
                            return [4 /*yield*/, supabase
                                    .from('subscriptions')
                                    .select('*')
                                    .eq('user_id', userId)];
                        case 7:
                            subscriptions = (_d.sent()).data;
                            subsToConsider = subscriptions || [];
                            _d.label = 8;
                        case 8:
                            if (subsToConsider.length === 0) {
                                return [2 /*return*/, res.json({ monthlySavings: 0 })];
                            }
                            now = new Date();
                            currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                            nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                            normalizeStatus_1 = function (status) { return String(status || '').trim().toLowerCase(); };
                            isInCurrentMonth_1 = function (sub) {
                                var timestamp = getSubscriptionDeletedTimestamp(sub);
                                return isTimestampInCurrentMonth(timestamp);
                            };
                            calculateSavings = function (subs) {
                                return subs
                                    .filter(function (sub) { return normalizeStatus_1(sub.status) === 'deleted'; })
                                    .filter(isInCurrentMonth_1)
                                    .reduce(function (total, sub) {
                                    var monthlyAmount = sub.frequency === 'yearly'
                                        ? sub.amount / 12
                                        : sub.frequency === 'quarterly'
                                            ? sub.amount / 3
                                            : sub.frequency === 'weekly'
                                                ? sub.amount * 4
                                                : sub.amount;
                                    return total + convertToUSD(monthlyAmount, sub.currency || 'USD');
                                }, 0);
                            };
                            ownerId_1 = userId;
                            ownerSubs = subsToConsider.filter(function (sub) { return sub.user_id === ownerId_1; });
                            memberSubs = subsToConsider.filter(function (sub) { return sub.user_id !== ownerId_1; });
                            ownerMonthlySavings = Math.round(calculateSavings(ownerSubs) * 100) / 100;
                            memberMonthlySavings = Math.round(calculateSavings(memberSubs) * 100) / 100;
                            totalMonthlySavings = Math.round((ownerMonthlySavings + memberMonthlySavings) * 100) / 100;
                            res.json({
                                monthlySavings: totalMonthlySavings,
                                ownerMonthlySavings: ownerMonthlySavings,
                                memberMonthlySavings: memberMonthlySavings,
                            });
                            return [3 /*break*/, 10];
                        case 9:
                            error_24 = _d.sent();
                            res.status(500).json({ error: "Failed to fetch monthly savings" });
                            return [3 /*break*/, 10];
                        case 10: return [2 /*return*/];
                    }
                });
            }); });
            // User: Premium status
            app.get("/api/user/premium-status", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, authHeader_1, supabase_2, _a, user, authError, supabase, _b, userSub, error, isPremium, userRecord, currency, authHeader, authUser, err_5, userRecord_1, err_6, error_25;
                var _c, _d, _e, _f, _g;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0:
                            _h.trys.push([0, 13, , 14]);
                            userId = (_d = (_c = req.session) === null || _c === void 0 ? void 0 : _c.user) === null || _d === void 0 ? void 0 : _d.id;
                            if (!!userId) return [3 /*break*/, 2];
                            authHeader_1 = (_e = req.headers.authorization) === null || _e === void 0 ? void 0 : _e.replace("Bearer ", "");
                            if (!authHeader_1) return [3 /*break*/, 2];
                            // Try extracting token first (handles custom test tokens)
                            userId = extractUserIdFromToken(authHeader_1) || undefined;
                            if (!!userId) return [3 /*break*/, 2];
                            supabase_2 = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase_2.auth.getUser(authHeader_1)];
                        case 1:
                            _a = _h.sent(), user = _a.data.user, authError = _a.error;
                            if (user) {
                                userId = user.id;
                            }
                            _h.label = 2;
                        case 2:
                            if (!userId) {
                                return [2 /*return*/, res.json({
                                        isPremium: false,
                                        planType: "free",
                                        status: "inactive",
                                        cancelAtPeriodEnd: false,
                                        currentPeriodEnd: null,
                                    })];
                            }
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase
                                    .from("user_subscriptions")
                                    .select("plan_type, status, cancel_at_period_end, current_period_end")
                                    .eq("user_id", userId)
                                    .single()];
                        case 3:
                            _b = _h.sent(), userSub = _b.data, error = _b.error;
                            if (error || !userSub) {
                                // Default to free plan if no subscription record exists
                                return [2 /*return*/, res.json({
                                        isPremium: false,
                                        planType: "free",
                                        status: "inactive",
                                        cancelAtPeriodEnd: false,
                                        currentPeriodEnd: null,
                                    })];
                            }
                            isPremium = userSub.plan_type !== "free" && userSub.status === "active";
                            return [4 /*yield*/, supabase
                                    .from('users')
                                    .select('currency')
                                    .eq('id', userId)
                                    .single()];
                        case 4:
                            userRecord = (_h.sent()).data;
                            currency = 'USD';
                            authHeader = ((_f = req.headers.authorization) === null || _f === void 0 ? void 0 : _f.replace('Bearer ', '')) || '';
                            if (!authHeader) return [3 /*break*/, 8];
                            _h.label = 5;
                        case 5:
                            _h.trys.push([5, 7, , 8]);
                            return [4 /*yield*/, supabase.auth.getUser(authHeader)];
                        case 6:
                            authUser = (_h.sent()).data.user;
                            if ((_g = authUser === null || authUser === void 0 ? void 0 : authUser.user_metadata) === null || _g === void 0 ? void 0 : _g.currency) {
                                currency = authUser.user_metadata.currency;
                            }
                            return [3 /*break*/, 8];
                        case 7:
                            err_5 = _h.sent();
                            // If the token is invalid (e.g. a fake test token) the call will
                            // throw – we'll ignore it and fall back to the custom users table.
                            console.debug('[Routes] premium-status failed to fetch auth user metadata:', err_5);
                            return [3 /*break*/, 8];
                        case 8:
                            if (!(currency === 'USD')) return [3 /*break*/, 12];
                            _h.label = 9;
                        case 9:
                            _h.trys.push([9, 11, , 12]);
                            return [4 /*yield*/, supabase
                                    .from('users')
                                    .select('currency')
                                    .eq('id', userId)
                                    .single()];
                        case 10:
                            userRecord_1 = (_h.sent()).data;
                            if (userRecord_1 === null || userRecord_1 === void 0 ? void 0 : userRecord_1.currency) {
                                currency = userRecord_1.currency;
                            }
                            return [3 /*break*/, 12];
                        case 11:
                            err_6 = _h.sent();
                            return [3 /*break*/, 12];
                        case 12:
                            res.json({
                                isPremium: isPremium,
                                planType: userSub.plan_type || "free",
                                status: userSub.status || "inactive",
                                cancelAtPeriodEnd: userSub.cancel_at_period_end || false,
                                currentPeriodEnd: userSub.current_period_end,
                                currency: currency,
                            });
                            return [3 /*break*/, 14];
                        case 13:
                            error_25 = _h.sent();
                            console.error("Error fetching premium status:", error_25);
                            res.status(500).json({ error: "Failed to fetch premium status" });
                            return [3 /*break*/, 14];
                        case 14: return [2 /*return*/];
                    }
                });
            }); });
            // Update currency preference for logged-in user
            app.patch('/api/user/currency', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, token, authHeader, supabase_3, user, supabase, currency, _a, updatedUser, error, err_7, e_1, err_8;
                var _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            _e.trys.push([0, 11, , 12]);
                            userId = (_c = (_b = req.session) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.id;
                            token = void 0;
                            if (!!userId) return [3 /*break*/, 3];
                            authHeader = (_d = req.headers.authorization) === null || _d === void 0 ? void 0 : _d.replace('Bearer ', '');
                            if (!authHeader) return [3 /*break*/, 2];
                            token = authHeader;
                            userId = extractUserIdFromToken(authHeader) || undefined;
                            if (!!userId) return [3 /*break*/, 2];
                            supabase_3 = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase_3.auth.getUser(authHeader)];
                        case 1:
                            user = (_e.sent()).data.user;
                            if (user)
                                userId = user.id;
                            _e.label = 2;
                        case 2: return [3 /*break*/, 3];
                        case 3:
                            if (!userId) {
                                return [2 /*return*/, res.status(401).json({ error: 'Not authenticated' })];
                            }
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            currency = String(req.body.currency || '').toUpperCase();
                            if (!currency || !/^[A-Z]{3}$/.test(currency)) {
                                return [2 /*return*/, res.status(400).json({ error: 'Invalid currency code' })];
                            }
                            _e.label = 4;
                        case 4:
                            _e.trys.push([4, 6, , 7]);
                            return [4 /*yield*/, supabase.auth.admin.updateUserById(userId, {
                                    user_metadata: { currency: currency }
                                })];
                        case 5:
                            _a = _e.sent(), updatedUser = _a.data, error = _a.error;
                            if (error) {
                                console.warn('[Routes] PATCH /api/user/currency auth update error', error.message);
                            }
                            return [3 /*break*/, 7];
                        case 6:
                            err_7 = _e.sent();
                            console.warn('[Routes] PATCH /api/user/currency auth exception', err_7);
                            return [3 /*break*/, 7];
                        case 7:
                            _e.trys.push([7, 9, , 10]);
                            return [4 /*yield*/, supabase.from('users').upsert({ id: userId, currency: currency })];
                        case 8:
                            _e.sent();
                            return [3 /*break*/, 10];
                        case 9:
                            e_1 = _e.sent();
                            console.warn('[Routes] failed to upsert currency into users table', e_1);
                            return [3 /*break*/, 10];
                        case 10:
                            res.json({ currency: currency });
                            return [3 /*break*/, 12];
                        case 11:
                            err_8 = _e.sent();
                            console.error('[Routes] PATCH /api/user/currency error:', err_8);
                            res.status(500).json({ error: 'Failed to update currency' });
                            return [3 /*break*/, 12];
                        case 12: return [2 /*return*/];
                    }
                });
            }); });
            // Family group endpoints (use server/family-sharing helpers)
            app.get('/api/family-groups', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId_2, authHeader, supabase, _a, _b, user, groups, err_9;
                var _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            _f.trys.push([0, 4, , 5]);
                            userId_2 = (_d = (_c = req.session) === null || _c === void 0 ? void 0 : _c.user) === null || _d === void 0 ? void 0 : _d.id;
                            if (!!userId_2) return [3 /*break*/, 2];
                            authHeader = (_e = req.headers.authorization) === null || _e === void 0 ? void 0 : _e.replace('Bearer ', '');
                            if (!authHeader) return [3 /*break*/, 2];
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase.auth.getUser(authHeader).catch(function () { return ({}); })];
                        case 1:
                            _a = (_f.sent()).data, _b = _a === void 0 ? {} : _a, user = _b.user;
                            if (user) {
                                userId_2 = user.id;
                            }
                            else {
                                userId_2 = extractUserIdFromToken(authHeader) || undefined;
                            }
                            _f.label = 2;
                        case 2:
                            if (!userId_2)
                                return [2 /*return*/, res.json([])];
                            return [4 /*yield*/, Promise.resolve().then(function () { return require('./family-sharing.cjs'); }).then(function (m) { return m.getFamilyGroups(userId_2); })];
                        case 3:
                            groups = _f.sent();
                            res.json(groups);
                            return [3 /*break*/, 5];
                        case 4:
                            err_9 = _f.sent();
                            console.error('[Routes] GET /api/family-groups error:', err_9);
                            res.status(500).json({ error: 'Failed to fetch family groups' });
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            }); });
            app.post('/api/family-groups', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var name_1, userId_3, authHeader, family, err_10, message;
                var _a, _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            _e.trys.push([0, 2, , 3]);
                            console.log('[Routes] POST /api/family-groups body:', req.body);
                            name_1 = (_a = req.body) === null || _a === void 0 ? void 0 : _a.name;
                            if (!name_1 || typeof name_1 !== 'string') {
                                return [2 /*return*/, res.status(400).json({ error: 'Missing or invalid name' })];
                            }
                            userId_3 = (_c = (_b = req.session) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.id;
                            if (!userId_3) {
                                authHeader = (_d = req.headers.authorization) === null || _d === void 0 ? void 0 : _d.replace('Bearer ', '');
                                if (authHeader) {
                                    userId_3 = extractUserIdFromToken(authHeader) || undefined;
                                }
                            }
                            if (!userId_3) {
                                return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                            }
                            return [4 /*yield*/, Promise.resolve().then(function () { return require('./family-sharing.cjs'); }).then(function (m) { return m.createFamilyGroup(userId_3, name_1); })];
                        case 1:
                            family = _e.sent();
                            console.log('[Routes] Created family group:', family);
                            return [2 /*return*/, res.status(201).json(family)];
                        case 2:
                            err_10 = _e.sent();
                            console.error('[Routes] POST /api/family-groups error:', err_10);
                            message = err_10 instanceof Error ? err_10.message : 'Unknown error';
                            res.status(500).json({ error: 'Failed to create family group', message: message });
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            app.delete('/api/family-groups/:id', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId_4, authHeader, id_1, err_11;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _d.trys.push([0, 2, , 3]);
                            userId_4 = (_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id;
                            if (!userId_4) {
                                authHeader = (_c = req.headers.authorization) === null || _c === void 0 ? void 0 : _c.replace('Bearer ', '');
                                if (authHeader)
                                    userId_4 = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId_4)
                                return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                            id_1 = req.params.id;
                            return [4 /*yield*/, Promise.resolve().then(function () { return require('./family-sharing.cjs'); }).then(function (m) { return m.deleteFamilyGroup(id_1, userId_4); })];
                        case 1:
                            _d.sent();
                            res.status(204).send();
                            return [3 /*break*/, 3];
                        case 2:
                            err_11 = _d.sent();
                            console.error('[Routes] DELETE /api/family-groups/:id error:', err_11);
                            res.status(500).json({ error: 'Failed to delete family group' });
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            // Get family group settings
            app.get('/api/family-groups/:id/settings', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var groupId, supabase, userId, authHeader, _a, groupRow, groupRowError, _b, membership, membershipError, _c, data, error, err_12;
                var _d, _e, _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0:
                            _g.trys.push([0, 5, , 6]);
                            groupId = req.params.id;
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            userId = (_e = (_d = req.session) === null || _d === void 0 ? void 0 : _d.user) === null || _e === void 0 ? void 0 : _e.id;
                            if (!userId) {
                                authHeader = (_f = req.headers.authorization) === null || _f === void 0 ? void 0 : _f.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                            return [4 /*yield*/, supabase
                                    .from('family_groups')
                                    .select('owner_id')
                                    .eq('id', groupId)
                                    .single()];
                        case 1:
                            _a = _g.sent(), groupRow = _a.data, groupRowError = _a.error;
                            if (groupRowError || !groupRow) {
                                return [2 /*return*/, res.status(404).json({ error: 'Family group not found' })];
                            }
                            if (!(groupRow.owner_id !== userId)) return [3 /*break*/, 3];
                            return [4 /*yield*/, supabase
                                    .from('family_group_members')
                                    .select('id')
                                    .eq('family_group_id', groupId)
                                    .eq('user_id', userId)
                                    .single()];
                        case 2:
                            _b = _g.sent(), membership = _b.data, membershipError = _b.error;
                            if (membershipError || !membership) {
                                return [2 /*return*/, res.status(403).json({ error: 'Not authorized to view family group settings' })];
                            }
                            _g.label = 3;
                        case 3: return [4 /*yield*/, supabase
                                .from('family_group_settings')
                                .select('*')
                                .eq('family_group_id', groupId)
                                .single()];
                        case 4:
                            _c = _g.sent(), data = _c.data, error = _c.error;
                            if (error) {
                                // If table or row doesn't exist, return sensible defaults instead of HTML
                                console.warn('[Routes] GET /api/family-groups/:id/settings error:', error.message || error);
                                return [2 /*return*/, res.json({ show_family_data: false })];
                            }
                            res.json(data || { show_family_data: false });
                            return [3 /*break*/, 6];
                        case 5:
                            err_12 = _g.sent();
                            console.error('[Routes] GET /api/family-groups/:id/settings unexpected error:', err_12);
                            res.status(500).json({ error: 'Failed to fetch family group settings' });
                            return [3 /*break*/, 6];
                        case 6: return [2 /*return*/];
                    }
                });
            }); });
            // membership lookup for current user
            // log registration so we can confirm the route is added when server starts
            console.log('[Routes] registering GET /api/family-groups/me/membership');
            app.get('/api/family-groups/me/membership', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, authHeader, supabase, _a, ownerGroups, ownerErr, _b, memberships, memErr, groupIds_1, idsArray, groups, _c, groupRows, groupErr, info_1, err_13;
                var _d, _e, _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0:
                            _g.trys.push([0, 5, , 6]);
                            userId = (_e = (_d = req.session) === null || _d === void 0 ? void 0 : _d.user) === null || _e === void 0 ? void 0 : _e.id;
                            if (!userId) {
                                authHeader = (_f = req.headers.authorization) === null || _f === void 0 ? void 0 : _f.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId) {
                                // return empty data rather than 401 so UI can behave gracefully
                                return [2 /*return*/, res.json({ groups: [], isMemberOfFamily: false, membershipCount: 0, membershipInfo: [] })];
                            }
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase
                                    .from('family_groups')
                                    .select('id,name,created_at')
                                    .eq('owner_id', userId)];
                        case 1:
                            _a = _g.sent(), ownerGroups = _a.data, ownerErr = _a.error;
                            if (ownerErr) {
                                console.error('[Routes] GET /api/family-groups/me/membership owner query error', ownerErr);
                                throw ownerErr;
                            }
                            return [4 /*yield*/, supabase
                                    .from('family_group_members')
                                    .select('family_group_id,role,joined_at')
                                    .eq('user_id', userId)];
                        case 2:
                            _b = _g.sent(), memberships = _b.data, memErr = _b.error;
                            if (memErr) {
                                console.error('[Routes] GET /api/family-groups/me/membership membership query error', memErr);
                                throw memErr;
                            }
                            groupIds_1 = new Set();
                            (ownerGroups || []).forEach(function (g) { return groupIds_1.add(g.id); });
                            (memberships || []).forEach(function (m) { return groupIds_1.add(m.family_group_id); });
                            idsArray = Array.from(groupIds_1);
                            groups = [];
                            if (!(idsArray.length > 0)) return [3 /*break*/, 4];
                            return [4 /*yield*/, supabase
                                    .from('family_groups')
                                    .select('*')
                                    .in('id', idsArray)];
                        case 3:
                            _c = _g.sent(), groupRows = _c.data, groupErr = _c.error;
                            if (groupErr) {
                                console.error('[Routes] GET /api/family-groups/me/membership group fetch error', groupErr);
                                throw groupErr;
                            }
                            groups = groupRows || [];
                            _g.label = 4;
                        case 4:
                            info_1 = [];
                            (ownerGroups || []).forEach(function (g) {
                                info_1.push({ family_group_id: g.id, role: 'owner', joined_at: g.created_at });
                            });
                            (memberships || []).forEach(function (m) {
                                // avoid duplicating if owner already added
                                if (!info_1.find(function (i) { return i.family_group_id === m.family_group_id; })) {
                                    info_1.push(m);
                                }
                            });
                            res.json({
                                groups: groups,
                                isMemberOfFamily: info_1.length > 0,
                                membershipCount: info_1.length,
                                membershipInfo: info_1,
                            });
                            return [3 /*break*/, 6];
                        case 5:
                            err_13 = _g.sent();
                            console.error('[Routes] GET /api/family-groups/me/membership error', err_13);
                            res.status(500).json({ error: 'Failed to fetch membership' });
                            return [3 /*break*/, 6];
                        case 6: return [2 /*return*/];
                    }
                });
            }); });
            // Update family group settings (owner only)
            app.put('/api/family-groups/:id/settings', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var groupId, userId, authHeader, supabase, _a, group, groupError, updates, _b, data, error, err_14;
                var _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            _f.trys.push([0, 3, , 4]);
                            groupId = req.params.id;
                            userId = (_d = (_c = req.session) === null || _c === void 0 ? void 0 : _c.user) === null || _d === void 0 ? void 0 : _d.id;
                            if (!userId) {
                                authHeader = (_e = req.headers.authorization) === null || _e === void 0 ? void 0 : _e.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase
                                    .from('family_groups')
                                    .select('owner_id')
                                    .eq('id', groupId)
                                    .single()];
                        case 1:
                            _a = _f.sent(), group = _a.data, groupError = _a.error;
                            if (groupError || !group || group.owner_id !== userId) {
                                return [2 /*return*/, res.status(403).json({ error: 'Only group owner can update settings' })];
                            }
                            updates = {
                                family_group_id: groupId,
                                show_family_data: !!req.body.show_family_data,
                                owner_id: group.owner_id,
                            };
                            return [4 /*yield*/, supabase
                                    .from('family_group_settings')
                                    .upsert(updates, { onConflict: 'family_group_id' })
                                    .select()
                                    .single()];
                        case 2:
                            _b = _f.sent(), data = _b.data, error = _b.error;
                            if (error) {
                                console.error('[Routes] PUT /api/family-groups/:id/settings supabase error:', error);
                                return [2 /*return*/, res.status(500).json({ error: 'Failed to update settings' })];
                            }
                            res.json(data);
                            return [3 /*break*/, 4];
                        case 3:
                            err_14 = _f.sent();
                            console.error('[Routes] PUT /api/family-groups/:id/settings unexpected error:', err_14);
                            res.status(500).json({ error: 'Failed to update family group settings' });
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
            // Get family group members
            app.get('/api/family-groups/:id/members', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var groupId, supabase, userId, authHeader, _a, groupRow, groupRowError, _b, membership, membershipError, getFamilyMembers, members, err_15;
                var _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            _f.trys.push([0, 6, , 7]);
                            groupId = req.params.id;
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            userId = (_d = (_c = req.session) === null || _c === void 0 ? void 0 : _c.user) === null || _d === void 0 ? void 0 : _d.id;
                            if (!userId) {
                                authHeader = (_e = req.headers.authorization) === null || _e === void 0 ? void 0 : _e.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                            return [4 /*yield*/, supabase
                                    .from('family_groups')
                                    .select('owner_id')
                                    .eq('id', groupId)
                                    .single()];
                        case 1:
                            _a = _f.sent(), groupRow = _a.data, groupRowError = _a.error;
                            if (groupRowError || !groupRow) {
                                return [2 /*return*/, res.status(404).json({ error: 'Family group not found' })];
                            }
                            if (!(groupRow.owner_id !== userId)) return [3 /*break*/, 3];
                            return [4 /*yield*/, supabase
                                    .from('family_group_members')
                                    .select('id')
                                    .eq('family_group_id', groupId)
                                    .eq('user_id', userId)
                                    .single()];
                        case 2:
                            _b = _f.sent(), membership = _b.data, membershipError = _b.error;
                            if (membershipError || !membership) {
                                return [2 /*return*/, res.status(403).json({ error: 'Not authorized to view family members' })];
                            }
                            _f.label = 3;
                        case 3: return [4 /*yield*/, Promise.resolve().then(function () { return require('./family-sharing.cjs'); })];
                        case 4:
                            getFamilyMembers = (_f.sent()).getFamilyMembers;
                            return [4 /*yield*/, getFamilyMembers(groupId)];
                        case 5:
                            members = _f.sent();
                            res.json(members);
                            return [3 /*break*/, 7];
                        case 6:
                            err_15 = _f.sent();
                            console.error('[Routes] GET /api/family-groups/:id/members error:', err_15);
                            res.status(500).json({ error: 'Failed to fetch family members' });
                            return [3 /*break*/, 7];
                        case 7: return [2 /*return*/];
                    }
                });
            }); });
            // Add family group member
            app.post('/api/family-groups/:id/members', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var groupId, _a, memberEmail, memberId, memberIdentifier, rawIdentifier_1, userId, authHeader, supabase, memberUserId, isUuid, isEmail, _b, userData, idErr, e_2, _c, userRow, userRowErr, e_3, emailCandidate, _d, userRow, userRowErr, e_4, _e, userById, userByIdErr, e_5, _f, userByEmail, userByEmailErr, e_6, _g, listData, listError, users, found, lookupErr_1, addFamilyMember, member, err_16, message;
                var _h, _j, _k, _l;
                return __generator(this, function (_m) {
                    switch (_m.label) {
                        case 0:
                            _m.trys.push([0, 27, , 28]);
                            groupId = req.params.id;
                            _a = req.body, memberEmail = _a.memberEmail, memberId = _a.memberId, memberIdentifier = _a.memberIdentifier;
                            rawIdentifier_1 = (memberIdentifier || memberEmail || memberId || '').trim();
                            if (!rawIdentifier_1 || typeof rawIdentifier_1 !== 'string') {
                                return [2 /*return*/, res.status(400).json({ error: 'Missing member email or user ID' })];
                            }
                            if (rawIdentifier_1 === groupId) {
                                return [2 /*return*/, res.status(400).json({ error: 'Member identifier cannot be the family group ID; provide an exact email or user ID' })];
                            }
                            userId = (_j = (_h = req.session) === null || _h === void 0 ? void 0 : _h.user) === null || _j === void 0 ? void 0 : _j.id;
                            if (!userId) {
                                authHeader = (_k = req.headers.authorization) === null || _k === void 0 ? void 0 : _k.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            memberUserId = null;
                            isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(rawIdentifier_1) || /^[0-9a-fA-F]{32}$/.test(rawIdentifier_1);
                            isEmail = rawIdentifier_1.includes('@');
                            if (!isUuid) return [3 /*break*/, 8];
                            _m.label = 1;
                        case 1:
                            _m.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, supabase.auth.admin.getUserById(rawIdentifier_1)];
                        case 2:
                            _b = _m.sent(), userData = _b.data, idErr = _b.error;
                            if (!idErr && (userData === null || userData === void 0 ? void 0 : userData.user)) {
                                memberUserId = userData.user.id;
                            }
                            return [3 /*break*/, 4];
                        case 3:
                            e_2 = _m.sent();
                            return [3 /*break*/, 4];
                        case 4:
                            if (!!memberUserId) return [3 /*break*/, 8];
                            _m.label = 5;
                        case 5:
                            _m.trys.push([5, 7, , 8]);
                            return [4 /*yield*/, supabase
                                    .from('users')
                                    .select('id')
                                    .eq('id', rawIdentifier_1)
                                    .single()];
                        case 6:
                            _c = _m.sent(), userRow = _c.data, userRowErr = _c.error;
                            if (!userRowErr && (userRow === null || userRow === void 0 ? void 0 : userRow.id))
                                memberUserId = userRow.id;
                            return [3 /*break*/, 8];
                        case 7:
                            e_3 = _m.sent();
                            return [3 /*break*/, 8];
                        case 8:
                            if (!(!memberUserId && isEmail)) return [3 /*break*/, 12];
                            emailCandidate = rawIdentifier_1.trim().toLowerCase();
                            try {
                                // Supabase admin API does not expose getUserByEmail in this version.
                                // Fall back to the local users table and listUsers lookup instead.
                            }
                            catch (e) {
                                // fallback
                            }
                            if (!!memberUserId) return [3 /*break*/, 12];
                            _m.label = 9;
                        case 9:
                            _m.trys.push([9, 11, , 12]);
                            return [4 /*yield*/, supabase
                                    .from('users')
                                    .select('id')
                                    .eq('email', emailCandidate)
                                    .single()];
                        case 10:
                            _d = _m.sent(), userRow = _d.data, userRowErr = _d.error;
                            if (!userRowErr && (userRow === null || userRow === void 0 ? void 0 : userRow.id))
                                memberUserId = userRow.id;
                            return [3 /*break*/, 12];
                        case 11:
                            e_4 = _m.sent();
                            return [3 /*break*/, 12];
                        case 12:
                            if (!!memberUserId) return [3 /*break*/, 16];
                            _m.label = 13;
                        case 13:
                            _m.trys.push([13, 15, , 16]);
                            return [4 /*yield*/, supabase
                                    .from('users')
                                    .select('id')
                                    .eq('id', rawIdentifier_1)
                                    .single()];
                        case 14:
                            _e = _m.sent(), userById = _e.data, userByIdErr = _e.error;
                            if (!userByIdErr && (userById === null || userById === void 0 ? void 0 : userById.id)) {
                                memberUserId = userById.id;
                            }
                            return [3 /*break*/, 16];
                        case 15:
                            e_5 = _m.sent();
                            return [3 /*break*/, 16];
                        case 16:
                            if (!(!memberUserId && isEmail)) return [3 /*break*/, 20];
                            _m.label = 17;
                        case 17:
                            _m.trys.push([17, 19, , 20]);
                            return [4 /*yield*/, supabase
                                    .from('users')
                                    .select('id')
                                    .eq('email', rawIdentifier_1.toLowerCase())
                                    .single()];
                        case 18:
                            _f = _m.sent(), userByEmail = _f.data, userByEmailErr = _f.error;
                            if (!userByEmailErr && (userByEmail === null || userByEmail === void 0 ? void 0 : userByEmail.id)) {
                                memberUserId = userByEmail.id;
                            }
                            return [3 /*break*/, 20];
                        case 19:
                            e_6 = _m.sent();
                            return [3 /*break*/, 20];
                        case 20:
                            if (!!memberUserId) return [3 /*break*/, 24];
                            _m.label = 21;
                        case 21:
                            _m.trys.push([21, 23, , 24]);
                            return [4 /*yield*/, supabase.auth.admin.listUsers({ perPage: 1000 })];
                        case 22:
                            _g = _m.sent(), listData = _g.data, listError = _g.error;
                            users = (_l = listData === null || listData === void 0 ? void 0 : listData.users) !== null && _l !== void 0 ? _l : [];
                            if (!listError && users.length > 0) {
                                found = users.find(function (u) { var _a; return u.id === rawIdentifier_1 || ((_a = u.email) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === rawIdentifier_1.toLowerCase(); });
                                if (found)
                                    memberUserId = found.id;
                            }
                            return [3 /*break*/, 24];
                        case 23:
                            lookupErr_1 = _m.sent();
                            console.error('[Routes] Error listing users fallback:', lookupErr_1);
                            return [3 /*break*/, 24];
                        case 24:
                            if (!memberUserId) {
                                return [2 /*return*/, res.status(404).json({ error: "User not found; please use an exact registered email or user ID" })];
                            }
                            return [4 /*yield*/, Promise.resolve().then(function () { return require('./family-sharing.cjs'); })];
                        case 25:
                            addFamilyMember = (_m.sent()).addFamilyMember;
                            return [4 /*yield*/, addFamilyMember(groupId, userId, memberUserId)];
                        case 26:
                            member = _m.sent();
                            res.status(201).json(member);
                            return [3 /*break*/, 28];
                        case 27:
                            err_16 = _m.sent();
                            console.error('[Routes] POST /api/family-groups/:id/members error:', err_16);
                            message = err_16 instanceof Error ? err_16.message : 'Unknown error';
                            res.status(500).json({ error: 'Failed to add family member', message: message });
                            return [3 /*break*/, 28];
                        case 28: return [2 /*return*/];
                    }
                });
            }); });
            // Remove family group member
            app.delete('/api/family-groups/:id/members/:memberId', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var groupId, memberUserId, userId, authHeader, removeFamilyMember, err_17;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _d.trys.push([0, 3, , 4]);
                            groupId = req.params.id;
                            memberUserId = req.params.memberId;
                            userId = (_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id;
                            if (!userId) {
                                authHeader = (_c = req.headers.authorization) === null || _c === void 0 ? void 0 : _c.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                            return [4 /*yield*/, Promise.resolve().then(function () { return require('./family-sharing.cjs'); })];
                        case 1:
                            removeFamilyMember = (_d.sent()).removeFamilyMember;
                            return [4 /*yield*/, removeFamilyMember(groupId, userId, memberUserId)];
                        case 2:
                            _d.sent();
                            res.status(204).send();
                            return [3 /*break*/, 4];
                        case 3:
                            err_17 = _d.sent();
                            console.error('[Routes] DELETE /api/family-groups/:id/members/:memberId error:', err_17);
                            res.status(500).json({ error: 'Failed to remove family member' });
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
            // Get shared subscriptions for a family group
            app.get('/api/family-groups/:id/shared-subscriptions', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var groupId, supabase_4, userId, authHeader, _a, groupRow, groupRowError, _b, membership, membershipError, _c, sharedSubs, error, sharedByUserIds, ownersById_1, err_18;
                var _this = this;
                var _d, _e, _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0:
                            _g.trys.push([0, 7, , 8]);
                            groupId = req.params.id;
                            supabase_4 = (0, supabase_js_2.getSupabaseClient)();
                            userId = (_e = (_d = req.session) === null || _d === void 0 ? void 0 : _d.user) === null || _e === void 0 ? void 0 : _e.id;
                            if (!userId) {
                                authHeader = (_f = req.headers.authorization) === null || _f === void 0 ? void 0 : _f.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                            return [4 /*yield*/, supabase_4
                                    .from('family_groups')
                                    .select('owner_id')
                                    .eq('id', groupId)
                                    .single()];
                        case 1:
                            _a = _g.sent(), groupRow = _a.data, groupRowError = _a.error;
                            if (groupRowError || !groupRow) {
                                return [2 /*return*/, res.status(404).json({ error: 'Family group not found' })];
                            }
                            if (!(groupRow.owner_id !== userId)) return [3 /*break*/, 3];
                            return [4 /*yield*/, supabase_4
                                    .from('family_group_members')
                                    .select('id')
                                    .eq('family_group_id', groupId)
                                    .eq('user_id', userId)
                                    .single()];
                        case 2:
                            _b = _g.sent(), membership = _b.data, membershipError = _b.error;
                            if (membershipError || !membership) {
                                return [2 /*return*/, res.status(403).json({ error: 'Not authorized to view family shared subscriptions' })];
                            }
                            _g.label = 3;
                        case 3: return [4 /*yield*/, supabase_4
                                .from('shared_subscriptions')
                                .select("\n          id,\n          family_group_id,\n          subscription_id,\n          shared_by_user_id,\n          shared_at\n        ")
                                .eq('family_group_id', groupId)];
                        case 4:
                            _c = _g.sent(), sharedSubs = _c.data, error = _c.error;
                            if (error) {
                                console.error('[Routes] GET shared subscriptions error:', error);
                                return [2 /*return*/, res.status(500).json({ error: 'Failed to fetch shared subscriptions' })];
                            }
                            sharedByUserIds = Array.from(new Set((sharedSubs || []).map(function (s) { return s.shared_by_user_id; }).filter(Boolean)));
                            ownersById_1 = {};
                            if (!(sharedByUserIds.length > 0)) return [3 /*break*/, 6];
                            return [4 /*yield*/, Promise.all(sharedByUserIds.map(function (uid) { return __awaiter(_this, void 0, void 0, function () {
                                    var _a, userData, userError, e_7, _b, userRow, userRowErr, e_8;
                                    var _c;
                                    return __generator(this, function (_d) {
                                        switch (_d.label) {
                                            case 0:
                                                _d.trys.push([0, 2, , 3]);
                                                return [4 /*yield*/, supabase_4.auth.admin.getUserById(uid)];
                                            case 1:
                                                _a = _d.sent(), userData = _a.data, userError = _a.error;
                                                if (!userError && (userData === null || userData === void 0 ? void 0 : userData.user)) {
                                                    ownersById_1[String(uid)] = {
                                                        email: userData.user.email || undefined,
                                                        name: ((_c = userData.user.user_metadata) === null || _c === void 0 ? void 0 : _c.name) || userData.user.email || uid,
                                                    };
                                                    return [2 /*return*/];
                                                }
                                                return [3 /*break*/, 3];
                                            case 2:
                                                e_7 = _d.sent();
                                                return [3 /*break*/, 3];
                                            case 3:
                                                _d.trys.push([3, 5, , 6]);
                                                return [4 /*yield*/, supabase_4
                                                        .from('users')
                                                        .select('email')
                                                        .eq('id', uid)
                                                        .single()];
                                            case 4:
                                                _b = _d.sent(), userRow = _b.data, userRowErr = _b.error;
                                                if (!userRowErr && (userRow === null || userRow === void 0 ? void 0 : userRow.email)) {
                                                    ownersById_1[String(uid)] = { email: userRow.email, name: userRow.email };
                                                    return [2 /*return*/];
                                                }
                                                return [3 /*break*/, 6];
                                            case 5:
                                                e_8 = _d.sent();
                                                return [3 /*break*/, 6];
                                            case 6:
                                                ownersById_1[String(uid)] = { email: undefined, name: String(uid) };
                                                return [2 /*return*/];
                                        }
                                    });
                                }); }))];
                        case 5:
                            _g.sent();
                            _g.label = 6;
                        case 6:
                            res.json((sharedSubs || []).map(function (ss) { return (__assign(__assign({}, ss), { owner: ownersById_1[ss.shared_by_user_id] || { email: undefined, name: ss.shared_by_user_id } })); }));
                            return [3 /*break*/, 8];
                        case 7:
                            err_18 = _g.sent();
                            console.error('[Routes] GET /api/family-groups/:id/shared-subscriptions error:', err_18);
                            res.status(500).json({ error: 'Failed to fetch shared subscriptions' });
                            return [3 /*break*/, 8];
                        case 8: return [2 /*return*/];
                    }
                });
            }); });
            // Share a subscription with family group
            app.post('/api/family-groups/:id/share-subscription', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var groupId, subscriptionId, userId, authHeader, supabase, groupCheck, memberCheck, _a, newShare, error, err_19;
                var _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            _e.trys.push([0, 5, , 6]);
                            groupId = req.params.id;
                            subscriptionId = req.body.subscriptionId;
                            userId = (_c = (_b = req.session) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.id;
                            if (!userId) {
                                authHeader = (_d = req.headers.authorization) === null || _d === void 0 ? void 0 : _d.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase
                                    .from('family_groups')
                                    .select('id, owner_id')
                                    .eq('id', groupId)
                                    .single()];
                        case 1:
                            groupCheck = (_e.sent()).data;
                            if (!groupCheck) {
                                return [2 /*return*/, res.status(404).json({ error: 'Family group not found' })];
                            }
                            if (!(groupCheck.owner_id !== userId)) return [3 /*break*/, 3];
                            return [4 /*yield*/, supabase
                                    .from('family_group_members')
                                    .select('id')
                                    .eq('family_group_id', groupId)
                                    .eq('user_id', userId)
                                    .single()];
                        case 2:
                            memberCheck = (_e.sent()).data;
                            if (!memberCheck) {
                                return [2 /*return*/, res.status(403).json({ error: 'Not authorized to share subscriptions in this group' })];
                            }
                            _e.label = 3;
                        case 3: return [4 /*yield*/, supabase
                                .from('shared_subscriptions')
                                .insert({
                                family_group_id: groupId,
                                subscription_id: subscriptionId,
                                shared_by_user_id: userId,
                                shared_at: new Date().toISOString(),
                            })
                                .select()
                                .single()];
                        case 4:
                            _a = _e.sent(), newShare = _a.data, error = _a.error;
                            if (error) {
                                console.error('[Routes] Share subscription error:', error);
                                return [2 /*return*/, res.status(500).json({ error: 'Failed to share subscription' })];
                            }
                            res.status(201).json(newShare);
                            return [3 /*break*/, 6];
                        case 5:
                            err_19 = _e.sent();
                            console.error('[Routes] POST /api/family-groups/:id/share-subscription error:', err_19);
                            res.status(500).json({ error: 'Failed to share subscription' });
                            return [3 /*break*/, 6];
                        case 6: return [2 /*return*/];
                    }
                });
            }); });
            // Unshare a subscription (delete shared record)
            app.delete('/api/family-groups/:id/shared-subscriptions/:sharedId', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var sharedId, userId, authHeader, unshareSubscription, err_20;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _d.trys.push([0, 3, , 4]);
                            sharedId = req.params.sharedId;
                            userId = (_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id;
                            if (!userId) {
                                authHeader = (_c = req.headers.authorization) === null || _c === void 0 ? void 0 : _c.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                            return [4 /*yield*/, Promise.resolve().then(function () { return require('./family-sharing.cjs'); })];
                        case 1:
                            unshareSubscription = (_d.sent()).unshareSubscription;
                            return [4 /*yield*/, unshareSubscription(sharedId)];
                        case 2:
                            _d.sent();
                            res.status(204).send();
                            return [3 /*break*/, 4];
                        case 3:
                            err_20 = _d.sent();
                            console.error('[Routes] DELETE /api/family-groups/:id/shared-subscriptions/:sharedId error:', err_20);
                            res.status(500).json({ error: 'Failed to unshare subscription' });
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
            // Cost splits endpoints
            app.post('/api/family-groups/:id/shared-subscriptions/:sharedId/cost-splits', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var _a, groupId, sharedId, _b, userId, percentage, requesterId, authHeader, setCostSplit, split, err_21;
                var _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            _f.trys.push([0, 3, , 4]);
                            _a = req.params, groupId = _a.id, sharedId = _a.sharedId;
                            _b = req.body, userId = _b.userId, percentage = _b.percentage;
                            if (!userId || typeof percentage !== 'number') {
                                return [2 /*return*/, res.status(400).json({ error: 'Missing userId or percentage' })];
                            }
                            requesterId = (_d = (_c = req.session) === null || _c === void 0 ? void 0 : _c.user) === null || _d === void 0 ? void 0 : _d.id;
                            if (!requesterId) {
                                authHeader = (_e = req.headers.authorization) === null || _e === void 0 ? void 0 : _e.replace('Bearer ', '');
                                if (authHeader)
                                    requesterId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!requesterId)
                                return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                            return [4 /*yield*/, Promise.resolve().then(function () { return require('./family-sharing.cjs'); })];
                        case 1:
                            setCostSplit = (_f.sent()).setCostSplit;
                            return [4 /*yield*/, setCostSplit(sharedId, userId, percentage)];
                        case 2:
                            split = _f.sent();
                            res.status(201).json(split);
                            return [3 /*break*/, 4];
                        case 3:
                            err_21 = _f.sent();
                            console.error('[Routes] POST cost-split error:', err_21);
                            res.status(500).json({ error: 'Failed to set cost split' });
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
            app.get('/api/family-groups/:id/shared-subscriptions/:sharedId/cost-splits', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var _a, groupId, sharedId, requesterId, authHeader, getCostSplits, splits, err_22;
                var _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            _e.trys.push([0, 3, , 4]);
                            _a = req.params, groupId = _a.id, sharedId = _a.sharedId;
                            requesterId = (_c = (_b = req.session) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.id;
                            if (!requesterId) {
                                authHeader = (_d = req.headers.authorization) === null || _d === void 0 ? void 0 : _d.replace('Bearer ', '');
                                if (authHeader)
                                    requesterId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!requesterId)
                                return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                            return [4 /*yield*/, Promise.resolve().then(function () { return require('./family-sharing.cjs'); })];
                        case 1:
                            getCostSplits = (_e.sent()).getCostSplits;
                            return [4 /*yield*/, getCostSplits(sharedId)];
                        case 2:
                            splits = _e.sent();
                            res.json(splits);
                            return [3 /*break*/, 4];
                        case 3:
                            err_22 = _e.sent();
                            console.error('[Routes] GET cost-splits error:', err_22);
                            res.status(500).json({ error: 'Failed to fetch cost splits' });
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
            // Get member's dashboard data
            app.get('/api/family-groups/:id/members/:memberId/dashboard', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var _a, groupId, memberId, supabase, requesterId, authHeader, _b, member, memberError, subscriptions_2, userSub_1, memberSubscriptions_1, currentDate_1, currentMonthStart_1, currentMonthEnd_1, monthlySpending_1, spendingSeries_1, _c, groupInfo, groupInfoError, subscriptions, userSub, memberSubscriptions_2, currentDate_2, currentMonthStart_2, currentMonthEnd_2, monthlySpending, spendingSeries, err_23;
                var _d, _e, _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0:
                            _g.trys.push([0, 8, , 9]);
                            _a = req.params, groupId = _a.id, memberId = _a.memberId;
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            requesterId = (_e = (_d = req.session) === null || _d === void 0 ? void 0 : _d.user) === null || _e === void 0 ? void 0 : _e.id;
                            if (!requesterId) {
                                authHeader = (_f = req.headers.authorization) === null || _f === void 0 ? void 0 : _f.replace('Bearer ', '');
                                if (authHeader)
                                    requesterId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!requesterId)
                                return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                            return [4 /*yield*/, supabase
                                    .from('family_group_members')
                                    .select('*')
                                    .eq('family_group_id', groupId)
                                    .eq('user_id', memberId)
                                    .single()];
                        case 1:
                            _b = _g.sent(), member = _b.data, memberError = _b.error;
                            if (memberError || !member) {
                                return [2 /*return*/, res.status(404).json({ error: 'Member not found in group' })];
                            }
                            if (!(requesterId === memberId)) return [3 /*break*/, 4];
                            return [4 /*yield*/, supabase
                                    .from('subscriptions')
                                    .select('*')
                                    .eq('user_id', memberId)];
                        case 2:
                            subscriptions_2 = (_g.sent()).data;
                            return [4 /*yield*/, supabase
                                    .from('user_subscriptions')
                                    .select('*')
                                    .eq('user_id', memberId)
                                    .single()];
                        case 3:
                            userSub_1 = (_g.sent()).data;
                            memberSubscriptions_1 = (subscriptions_2 || []).filter(function (s) { return normalizeStatus(s.status) !== 'deleted'; });
                            currentDate_1 = new Date();
                            currentMonthStart_1 = new Date(currentDate_1.getFullYear(), currentDate_1.getMonth(), 1);
                            currentMonthEnd_1 = new Date(currentDate_1.getFullYear(), currentDate_1.getMonth() + 1, 0, 23, 59, 59, 999);
                            monthlySpending_1 = memberSubscriptions_1.reduce(function (total, sub) {
                                if (!isSubscriptionBilledInMonth(sub, currentMonthStart_1, currentMonthEnd_1, currentDate_1, true)) {
                                    return total;
                                }
                                var monthlyAmount = monthlyAmountForSubscriptionRow(sub);
                                return total + convertToUSD(monthlyAmount, sub.currency || 'USD');
                            }, 0);
                            spendingSeries_1 = (function () {
                                var now = new Date();
                                var months = [];
                                var _loop_1 = function (i) {
                                    var monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
                                    var monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
                                    var monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
                                    var monthLabel = monthDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                                    var total = memberSubscriptions_1.reduce(function (sum, sub) {
                                        if (!isSubscriptionBilledInMonth(sub, monthStart, monthEnd, now, monthStart.getMonth() === now.getMonth() && monthStart.getFullYear() === now.getFullYear())) {
                                            return sum;
                                        }
                                        return sum + convertToUSD(monthlyAmountForSubscriptionRow(sub), sub.currency || 'USD');
                                    }, 0);
                                    months.push({ month: monthLabel, total: Math.round(total * 100) / 100 });
                                };
                                for (var i = 6; i >= 0; i--) {
                                    _loop_1(i);
                                }
                                return months;
                            })();
                            return [2 /*return*/, res.json({
                                    member: member,
                                    subscriptions: subscriptions_2 || [],
                                    userSubscription: userSub_1 || null,
                                    spending: spendingSeries_1,
                                    metrics: {
                                        totalSubscriptions: memberSubscriptions_1.length,
                                        activeSubscriptions: memberSubscriptions_1.filter(function (s) {
                                            var status = normalizeStatus(s.status);
                                            return status === 'active' || status === 'unused';
                                        }).length,
                                        totalMonthlySpending: Math.round(monthlySpending_1 * 100) / 100,
                                        memberCount: 1,
                                    },
                                })];
                        case 4: return [4 /*yield*/, supabase
                                .from('family_groups')
                                .select('owner_id')
                                .eq('id', groupId)
                                .single()];
                        case 5:
                            _c = _g.sent(), groupInfo = _c.data, groupInfoError = _c.error;
                            if (groupInfoError || !groupInfo) {
                                return [2 /*return*/, res.status(500).json({ error: 'Failed to fetch group info' })];
                            }
                            // Only owner can view other members' dashboards
                            if (groupInfo.owner_id !== requesterId) {
                                return [2 /*return*/, res.status(403).json({ error: 'Members can only view their own dashboard' })];
                            }
                            return [4 /*yield*/, supabase
                                    .from('subscriptions')
                                    .select('*')
                                    .eq('user_id', memberId)];
                        case 6:
                            subscriptions = (_g.sent()).data;
                            return [4 /*yield*/, supabase
                                    .from('user_subscriptions')
                                    .select('*')
                                    .eq('user_id', memberId)
                                    .single()];
                        case 7:
                            userSub = (_g.sent()).data;
                            memberSubscriptions_2 = (subscriptions || []).filter(function (s) { return normalizeStatus(s.status) !== 'deleted'; });
                            currentDate_2 = new Date();
                            currentMonthStart_2 = new Date(currentDate_2.getFullYear(), currentDate_2.getMonth(), 1);
                            currentMonthEnd_2 = new Date(currentDate_2.getFullYear(), currentDate_2.getMonth() + 1, 0, 23, 59, 59, 999);
                            monthlySpending = memberSubscriptions_2.reduce(function (total, sub) {
                                if (!isSubscriptionBilledInMonth(sub, currentMonthStart_2, currentMonthEnd_2, currentDate_2, true)) {
                                    return total;
                                }
                                var monthlyAmount = monthlyAmountForSubscriptionRow(sub);
                                return total + convertToUSD(monthlyAmount, sub.currency || 'USD');
                            }, 0);
                            spendingSeries = (function () {
                                var now = new Date();
                                var months = [];
                                var _loop_2 = function (i) {
                                    var monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
                                    var monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
                                    var monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
                                    var monthLabel = monthDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                                    var total = memberSubscriptions_2.reduce(function (sum, sub) {
                                        if (!isSubscriptionBilledInMonth(sub, monthStart, monthEnd, now, monthStart.getMonth() === now.getMonth() && monthStart.getFullYear() === now.getFullYear())) {
                                            return sum;
                                        }
                                        return sum + convertToUSD(monthlyAmountForSubscriptionRow(sub), sub.currency || 'USD');
                                    }, 0);
                                    months.push({ month: monthLabel, total: Math.round(total * 100) / 100 });
                                };
                                for (var i = 6; i >= 0; i--) {
                                    _loop_2(i);
                                }
                                return months;
                            })();
                            return [2 /*return*/, res.json({
                                    member: member,
                                    subscriptions: subscriptions || [],
                                    userSubscription: userSub || null,
                                    spending: spendingSeries,
                                    metrics: {
                                        totalSubscriptions: memberSubscriptions_2.length,
                                        activeSubscriptions: memberSubscriptions_2.filter(function (s) {
                                            var status = normalizeStatus(s.status);
                                            return status === 'active' || status === 'unused';
                                        }).length,
                                        totalMonthlySpending: Math.round(monthlySpending * 100) / 100,
                                        memberCount: 1,
                                    },
                                })];
                        case 8:
                            err_23 = _g.sent();
                            console.error('[Routes] GET /api/family-groups/:id/member/:memberId/dashboard error:', err_23);
                            res.status(500).json({ error: 'Failed to fetch member dashboard data' });
                            return [3 /*break*/, 9];
                        case 9: return [2 /*return*/];
                    }
                });
            }); });
            // Get family data (all members' subscriptions when show_family_data is enabled)
            app.get('/api/family-groups/:id/family-data', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                // Helper to convert snake_case database fields to camelCase for API response
                function transformSubscription(sub) {
                    return {
                        id: sub.id,
                        userId: sub.user_id,
                        name: sub.name,
                        category: sub.category,
                        amount: sub.amount,
                        currency: sub.currency,
                        frequency: sub.frequency,
                        nextBillingDate: (function () {
                            var raw = sub.next_billing_at || sub.next_billing_date;
                            var parsed = parseDateOnlyLocal(raw);
                            return parsed ? formatDateLocal(parsed) : raw;
                        })(),
                        status: sub.status,
                        usageCount: sub.usage_count,
                        lastUsedDate: sub.last_used_at,
                        logoUrl: sub.logo_url,
                        description: sub.description,
                        isDetected: sub.is_detected,
                        createdAt: sub.created_at,
                        updatedAt: sub.updated_at,
                        deletedAt: sub.deleted_at,
                        websiteDomain: sub.website_domain,
                        scheduledCancellationDate: sub.scheduled_cancellation_date,
                        cancellationUrl: sub.cancellation_url,
                        monthlyUsageCount: sub.monthly_usage_count,
                        usageMonth: sub.usage_month,
                    };
                }
                var generateAIRecommendations, groupId, supabase, offsetMinutes_2, localDateParam, now_2, userId, authHeader, _a, groupRow_1, groupRowError, _b, membership, membershipError, _c, settings, settingsError, familyDataSharingEnabled, _d, members_1, membersError, _e, personalSubs_1, personalSubsError, recommendations, metrics, isOwner, sharedSubs, sharedSubscriptionsDetailed_1, sharedSubscriptionIds, sharedByUserIds, sharedRows_1, userRows_1, _sharedRows, usersById, listUsersResult, users, err_24, err_25, ownerId_2, memberIds, _f, ownerSubscriptions, ownerSubscriptionsError, memberSubscriptions, _g, memberSubs, memberSubscriptionsError, combinedSubscriptionsById_1, allSubscriptions_1, costSplits, err_26;
                var _h, _j, _k, _l, _m;
                return __generator(this, function (_o) {
                    switch (_o.label) {
                        case 0:
                            _o.trys.push([0, 24, , 25]);
                            return [4 /*yield*/, Promise.resolve().then(function () { return require('./family-sharing.cjs'); })];
                        case 1:
                            generateAIRecommendations = (_o.sent()).generateAIRecommendations;
                            groupId = req.params.id;
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            offsetMinutes_2 = typeof req.query.offsetMinutes === 'string' ? parseInt(req.query.offsetMinutes, 10) || 0 : 0;
                            localDateParam = typeof req.query.localDate === 'string' ? req.query.localDate : undefined;
                            now_2 = localDateParam ? (parseDateOnlyLocal(localDateParam) || new Date()) : new Date();
                            userId = (_j = (_h = req.session) === null || _h === void 0 ? void 0 : _h.user) === null || _j === void 0 ? void 0 : _j.id;
                            if (!userId) {
                                authHeader = (_k = req.headers.authorization) === null || _k === void 0 ? void 0 : _k.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                            return [4 /*yield*/, supabase
                                    .from('family_groups')
                                    .select('owner_id')
                                    .eq('id', groupId)
                                    .single()];
                        case 2:
                            _a = _o.sent(), groupRow_1 = _a.data, groupRowError = _a.error;
                            if (groupRowError || !groupRow_1) {
                                return [2 /*return*/, res.status(404).json({ error: 'Family group not found' })];
                            }
                            if (!(groupRow_1.owner_id !== userId)) return [3 /*break*/, 4];
                            return [4 /*yield*/, supabase
                                    .from('family_group_members')
                                    .select('id')
                                    .eq('family_group_id', groupId)
                                    .eq('user_id', userId)
                                    .single()];
                        case 3:
                            _b = _o.sent(), membership = _b.data, membershipError = _b.error;
                            if (membershipError || !membership) {
                                return [2 /*return*/, res.status(403).json({ error: 'Not authorized to view family data' })];
                            }
                            _o.label = 4;
                        case 4: return [4 /*yield*/, supabase
                                .from('family_group_settings')
                                .select('show_family_data')
                                .eq('family_group_id', groupId)
                                .single()];
                        case 5:
                            _c = _o.sent(), settings = _c.data, settingsError = _c.error;
                            if (settingsError) {
                                console.warn('[Routes] /api/family-groups/:id/family-data failed to read family group settings', settingsError);
                            }
                            familyDataSharingEnabled = true;
                            return [4 /*yield*/, supabase
                                    .from('family_group_members')
                                    .select('user_id, role')
                                    .eq('family_group_id', groupId)];
                        case 6:
                            _d = _o.sent(), members_1 = _d.data, membersError = _d.error;
                            if (membersError) {
                                return [2 /*return*/, res.status(500).json({ error: 'Failed to fetch family members' })];
                            }
                            if (!!familyDataSharingEnabled) return [3 /*break*/, 8];
                            return [4 /*yield*/, supabase
                                    .from('subscriptions')
                                    .select('*')
                                    .eq('user_id', userId)];
                        case 7:
                            _e = _o.sent(), personalSubs_1 = _e.data, personalSubsError = _e.error;
                            if (personalSubsError) {
                                console.error('[Routes] /api/family-groups/:id/family-data personal fallback failed:', personalSubsError);
                                return [2 /*return*/, res.status(500).json({ error: 'Failed to load personal subscriptions' })];
                            }
                            recommendations = generateAIRecommendations(personalSubs_1 || []);
                            metrics = (function () {
                                var subs = (personalSubs_1 || []).filter(function (s) { return s.status !== 'deleted'; });
                                var totalSubscriptions = subs.length;
                                var activeSubscriptions = subs.filter(function (s) { return !s.status || s.status === 'active'; }).length;
                                var monthlyTotal = subs.reduce(function (acc, s) {
                                    var amt = Number(s.amount) || 0;
                                    var freq = s.frequency || 'monthly';
                                    var monthly = amt;
                                    if (freq === 'yearly')
                                        monthly = amt / 12;
                                    if (freq === 'quarterly')
                                        monthly = amt / 3;
                                    if (freq === 'weekly')
                                        monthly = amt * 4;
                                    return acc + monthly;
                                }, 0);
                                return {
                                    totalSubscriptions: totalSubscriptions,
                                    activeSubscriptions: activeSubscriptions,
                                    totalMonthlySpending: monthlyTotal,
                                    memberCount: 1,
                                };
                            })();
                            return [2 /*return*/, res.json({
                                    members: __spreadArray([
                                        { userId: groupRow_1.owner_id, role: 'owner' }
                                    ], ((members_1 || []).filter(function (m) { return m.user_id !== groupRow_1.owner_id; }).map(function (m) { return ({ userId: m.user_id, role: 'member' }); })), true),
                                    subscriptions: (personalSubs_1 || []).map(transformSubscription),
                                    sharedSubscriptions: [],
                                    costSplits: [],
                                    recommendations: recommendations,
                                    metrics: metrics,
                                    familyDataSharingEnabled: false,
                                })];
                        case 8:
                            // Get all members of the group
                            if (!members_1) {
                                return [2 /*return*/, res.status(500).json({ error: 'Failed to fetch family members' })];
                            }
                            isOwner = groupRow_1.owner_id === userId;
                            return [4 /*yield*/, supabase
                                    .from('shared_subscriptions')
                                    .select("\n          id,\n          subscription_id,\n          shared_by_user_id,\n          shared_at\n        ")
                                    .eq('family_group_id', groupId)];
                        case 9:
                            sharedSubs = (_o.sent()).data;
                            sharedSubscriptionsDetailed_1 = sharedSubs || [];
                            _o.label = 10;
                        case 10:
                            _o.trys.push([10, 18, , 19]);
                            sharedSubscriptionIds = (sharedSubs || []).map(function (s) { return s.subscription_id; }).filter(Boolean);
                            sharedByUserIds = Array.from(new Set((sharedSubs || []).map(function (s) { return s.shared_by_user_id; }).filter(Boolean)));
                            sharedRows_1 = [];
                            userRows_1 = {};
                            if (!(sharedSubscriptionIds.length > 0)) return [3 /*break*/, 12];
                            return [4 /*yield*/, supabase
                                    .from('subscriptions')
                                    .select('*')
                                    .in('id', sharedSubscriptionIds)];
                        case 11:
                            _sharedRows = (_o.sent()).data;
                            sharedRows_1 = _sharedRows || [];
                            _o.label = 12;
                        case 12:
                            if (!(sharedByUserIds.length > 0)) return [3 /*break*/, 17];
                            usersById = {};
                            _o.label = 13;
                        case 13:
                            _o.trys.push([13, 15, , 16]);
                            return [4 /*yield*/, supabase.auth.admin.listUsers()];
                        case 14:
                            listUsersResult = _o.sent();
                            users = (_m = (_l = listUsersResult.data) === null || _l === void 0 ? void 0 : _l.users) !== null && _m !== void 0 ? _m : [];
                            if (users.length > 0) {
                                usersById = users.reduce(function (acc, u) {
                                    var _a;
                                    if (!(u === null || u === void 0 ? void 0 : u.id))
                                        return acc;
                                    acc[u.id] = {
                                        email: u.email || '',
                                        name: ((_a = u.user_metadata) === null || _a === void 0 ? void 0 : _a.name) || u.email || '',
                                    };
                                    return acc;
                                }, usersById);
                            }
                            return [3 /*break*/, 16];
                        case 15:
                            err_24 = _o.sent();
                            console.warn('[Routes] Failed to fetch user info for shared subscriptions', err_24);
                            return [3 /*break*/, 16];
                        case 16:
                            userRows_1 = usersById;
                            _o.label = 17;
                        case 17:
                            // Merge the subscription row and owner info into each shared subscription entry
                            sharedSubscriptionsDetailed_1 = (sharedSubs || []).map(function (ss) { return (__assign(__assign({}, ss), { subscription: (sharedRows_1 || []).find(function (r) { return r.id === ss.subscription_id; }) || null, owner: userRows_1[ss.shared_by_user_id] || { email: ss.shared_by_user_id, name: ss.shared_by_user_id } })); });
                            return [3 /*break*/, 19];
                        case 18:
                            err_25 = _o.sent();
                            console.warn('[Routes] Failed to fetch detailed shared subscriptions', err_25);
                            return [3 /*break*/, 19];
                        case 19:
                            ownerId_2 = String(groupRow_1.owner_id);
                            memberIds = Array.from(new Set((members_1 || [])
                                .map(function (m) { return m.user_id; })
                                .filter(Boolean)
                                .map(String)
                                .filter(function (id) { return id !== ownerId_2; })));
                            return [4 /*yield*/, supabase
                                    .from('subscriptions')
                                    .select('*')
                                    .eq('user_id', ownerId_2)];
                        case 20:
                            _f = _o.sent(), ownerSubscriptions = _f.data, ownerSubscriptionsError = _f.error;
                            if (ownerSubscriptionsError) {
                                console.error('[Routes] /api/family-groups/:id/family-data failed to load owner subscriptions', ownerSubscriptionsError);
                                return [2 /*return*/, res.status(500).json({ error: 'Failed to load family subscriptions' })];
                            }
                            memberSubscriptions = [];
                            if (!(memberIds.length > 0)) return [3 /*break*/, 22];
                            return [4 /*yield*/, supabase
                                    .from('subscriptions')
                                    .select('*')
                                    .in('user_id', memberIds)];
                        case 21:
                            _g = _o.sent(), memberSubs = _g.data, memberSubscriptionsError = _g.error;
                            if (memberSubscriptionsError) {
                                console.error('[Routes] /api/family-groups/:id/family-data failed to load member subscriptions', memberSubscriptionsError);
                                return [2 /*return*/, res.status(500).json({ error: 'Failed to load family subscriptions' })];
                            }
                            memberSubscriptions = memberSubs || [];
                            _o.label = 22;
                        case 22:
                            combinedSubscriptionsById_1 = new Map();
                            (ownerSubscriptions || []).forEach(function (sub) { return combinedSubscriptionsById_1.set(sub.id, sub); });
                            memberSubscriptions.forEach(function (sub) { return combinedSubscriptionsById_1.set(sub.id, sub); });
                            allSubscriptions_1 = Array.from(combinedSubscriptionsById_1.values());
                            return [4 /*yield*/, supabase
                                    .from('cost_splits')
                                    .select('*')
                                    .in('shared_subscription_id', (sharedSubs === null || sharedSubs === void 0 ? void 0 : sharedSubs.map(function (s) { return s.id; })) || [])];
                        case 23:
                            costSplits = (_o.sent()).data;
                            res.json({
                                members: __spreadArray([
                                    // Always include the owner as a member
                                    { userId: groupRow_1.owner_id, role: 'owner' }
                                ], members_1.filter(function (m) { return m.user_id !== groupRow_1.owner_id; }).map(function (m) { return ({
                                    userId: m.user_id,
                                    role: m.role,
                                }); }), true),
                                subscriptions: (allSubscriptions_1 || []).map(transformSubscription),
                                // Provide detailed shared subscription objects (includes `subscription` field when available)
                                sharedSubscriptions: sharedSubscriptionsDetailed_1 || [],
                                costSplits: costSplits || [],
                                recommendations: generateAIRecommendations(allSubscriptions_1 || []),
                                // compute simple family metrics server-side so client doesn't have to
                                metrics: (function () {
                                    var allSubs = (allSubscriptions_1 || []);
                                    var subs = allSubs.filter(function (s) {
                                        var st = normalizeStatus(s.status);
                                        return st !== 'deleted' && st !== 'canceled';
                                    });
                                    var deletedSubs = allSubs.filter(function (s) { return normalizeStatus(s.status) === 'deleted'; });
                                    var sharedRaw = (sharedSubscriptionsDetailed_1 || []).filter(function (sh) {
                                        var _a;
                                        var status = normalizeStatus(sh.status || ((_a = sh.subscription) === null || _a === void 0 ? void 0 : _a.status));
                                        return status !== 'deleted' && status !== 'canceled';
                                    });
                                    // dedupe shared entries if the underlying subscription is already in
                                    // the main list (common when owner shares their own subscription)
                                    var uniqueShared = sharedRaw.filter(function (sh) {
                                        return !subs.some(function (s) { var _a; return s.id === (sh.subscription_id || ((_a = sh.subscription) === null || _a === void 0 ? void 0 : _a.id)); });
                                    });
                                    var monthlyAmountForSubscription = function (item) {
                                        var amount = Number(item.amount) || 0;
                                        var frequency = (item.frequency || 'monthly').toLowerCase();
                                        var monthly = frequency === 'yearly'
                                            ? amount / 12
                                            : frequency === 'quarterly'
                                                ? amount / 3
                                                : frequency === 'weekly'
                                                    ? amount * 4
                                                    : amount;
                                        return convertToUSD(monthly, item.currency || 'USD');
                                    };
                                    var currentDate = now_2;
                                    var currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                                    var nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
                                    var currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
                                    var previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
                                    var previousMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0, 23, 59, 59);
                                    var totalSubscriptions = subs.length + uniqueShared.length;
                                    var activeSubscriptions = subs.filter(function (s) { return normalizeStatus(s.status) === 'active'; }).length +
                                        uniqueShared.filter(function (sh) {
                                            var _a;
                                            return normalizeStatus(((_a = sh.subscription) === null || _a === void 0 ? void 0 : _a.status) || sh.status) === 'active';
                                        }).length;
                                    var unusedSubscriptions = subs.filter(function (s) { return normalizeStatus(s.status) === 'unused'; }).length +
                                        uniqueShared.filter(function (sh) {
                                            var _a;
                                            return normalizeStatus(((_a = sh.subscription) === null || _a === void 0 ? void 0 : _a.status) || sh.status) === 'unused';
                                        }).length;
                                    var potentialSavings = subs
                                        .filter(function (s) {
                                        var status = normalizeStatus(s.status);
                                        return status === 'unused' || status === 'to-cancel';
                                    })
                                        .reduce(function (sum, s) { return sum + monthlyAmountForSubscription(s); }, 0);
                                    var monthlyFromSubs = subs.reduce(function (acc, s) {
                                        if (!isSubscriptionBilledInMonth(s, currentMonth, currentMonthEnd, currentDate, true, offsetMinutes_2)) {
                                            return acc;
                                        }
                                        return acc + monthlyAmountForSubscription(s);
                                    }, 0);
                                    var monthlyFromShared = uniqueShared.reduce(function (acc, sh) {
                                        var subscription = sh.subscription || {};
                                        if (!isSubscriptionBilledInMonth(subscription, currentMonth, currentMonthEnd, currentDate, true, offsetMinutes_2)) {
                                            return acc;
                                        }
                                        return acc + monthlyAmountForSubscription(subscription);
                                    }, 0);
                                    var deletedSavings = deletedSubs
                                        .filter(function (s) {
                                        var ts = getSubscriptionDeletedTimestamp(s);
                                        return isTimestampInCurrentMonth(ts);
                                    })
                                        .reduce(function (sum, s) { return sum + monthlyAmountForSubscription(s); }, 0);
                                    var previousMonthSpendFromSubs = subs.reduce(function (sum, s) {
                                        if (!isSubscriptionBilledInMonth(s, previousMonth, previousMonthEnd, currentDate, false, offsetMinutes_2)) {
                                            return sum;
                                        }
                                        return sum + monthlyAmountForSubscription(s);
                                    }, 0);
                                    var previousMonthSpendFromShared = uniqueShared.reduce(function (sum, sh) {
                                        var subscription = sh.subscription || {};
                                        if (!isSubscriptionBilledInMonth(subscription, previousMonth, previousMonthEnd, currentDate, false, offsetMinutes_2)) {
                                            return sum;
                                        }
                                        return sum + monthlyAmountForSubscription(subscription);
                                    }, 0);
                                    var previousMonthSpend = previousMonthSpendFromSubs + previousMonthSpendFromShared;
                                    var monthlySpendChange = previousMonthSpend > 0
                                        ? Math.round(((monthlyFromSubs + monthlyFromShared - previousMonthSpend) / previousMonthSpend) * 100)
                                        : 0;
                                    var allUniqueSubscriptionsById = new Map();
                                    subs.forEach(function (s) {
                                        if (s === null || s === void 0 ? void 0 : s.id)
                                            allUniqueSubscriptionsById.set(s.id, s);
                                    });
                                    uniqueShared.forEach(function (sh) {
                                        var subscription = sh.subscription;
                                        if ((subscription === null || subscription === void 0 ? void 0 : subscription.id) && !allUniqueSubscriptionsById.has(subscription.id)) {
                                            allUniqueSubscriptionsById.set(subscription.id, subscription);
                                        }
                                    });
                                    var newServicesTracked = Array.from(allUniqueSubscriptionsById.values()).filter(function (s) {
                                        var createdDate = new Date(s.created_at);
                                        return createdDate >= currentMonth && createdDate < nextMonth;
                                    }).length;
                                    var uniqueMemberCount = new Set(__spreadArray([
                                        String(groupRow_1.owner_id)
                                    ], (members_1 || []).map(function (m) { return String(m.user_id); }), true)).size;
                                    return {
                                        totalSubscriptions: totalSubscriptions,
                                        activeSubscriptions: activeSubscriptions,
                                        totalMonthlySpending: Math.round((monthlyFromSubs + monthlyFromShared) * 100) / 100,
                                        memberCount: uniqueMemberCount,
                                        potentialSavings: Math.round(potentialSavings * 100) / 100,
                                        thisMonthSavings: Math.round(deletedSavings * 100) / 100,
                                        unusedSubscriptions: unusedSubscriptions,
                                        averageCostPerUse: 0,
                                        monthlySpendChange: monthlySpendChange,
                                        newServicesTracked: newServicesTracked,
                                    };
                                })(),
                            });
                            return [3 /*break*/, 25];
                        case 24:
                            err_26 = _o.sent();
                            console.error('[Routes] GET family data error:', err_26);
                            res.status(500).json({ error: 'Failed to fetch family data' });
                            return [3 /*break*/, 25];
                        case 25: return [2 /*return*/];
                    }
                });
            }); });
            // Upgrade current user to family plan
            app.post('/api/user/upgrade-to-family', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, authHeader, upgradeToPlan, err_27, message;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _d.trys.push([0, 3, , 4]);
                            userId = (_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id;
                            if (!userId) {
                                authHeader = (_c = req.headers.authorization) === null || _c === void 0 ? void 0 : _c.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId) {
                                return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                            }
                            return [4 /*yield*/, Promise.resolve().then(function () { return require('./family-sharing.cjs'); })];
                        case 1:
                            upgradeToPlan = (_d.sent()).upgradeToPlan;
                            return [4 /*yield*/, upgradeToPlan(userId, 'family')];
                        case 2:
                            _d.sent();
                            res.json({ success: true, message: 'Upgraded to family plan' });
                            return [3 /*break*/, 4];
                        case 3:
                            err_27 = _d.sent();
                            console.error('[Routes] POST /api/user/upgrade-to-family error:', err_27);
                            message = err_27 instanceof Error ? err_27.message : 'Unknown error';
                            res.status(500).json({ error: 'Failed to upgrade to family plan', message: message });
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
            // Trigger renewal checks (for testing/manual trigger)
            app.post("/api/admin/renewal-checks", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var apiKey, _a, summary, runLogId, err_28, message;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            apiKey = req.headers["x-api-key"];
                            if (apiKey !== process.env.ADMIN_API_KEY) {
                                return [2 /*return*/, res.status(403).json({ error: "Unauthorized - invalid API key" })];
                            }
                            console.log("[Routes] Manual renewal trigger requested");
                            return [4 /*yield*/, (0, renewal_manager_js_1.runRenewalChecks)({ mode: "manual" })];
                        case 1:
                            _a = _b.sent(), summary = _a.summary, runLogId = _a.runLogId;
                            res.json({ success: true, message: "Renewal checks completed", summary: summary, runLogId: runLogId });
                            return [3 /*break*/, 3];
                        case 2:
                            err_28 = _b.sent();
                            console.error("[Routes] Error triggering renewal checks:", err_28);
                            message = err_28 instanceof Error ? err_28.message : "Unknown error";
                            res.status(500).json({ error: "Failed to trigger renewal checks", message: message });
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            app.get("/api/admin/renewal-checks/logs", (0, errorHandler_js_1.asyncHandler)(function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var apiKey, supabase, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            apiKey = req.headers["x-api-key"];
                            if (apiKey !== process.env.ADMIN_API_KEY) {
                                return [2 /*return*/, res.status(403).json({ error: "Unauthorized - invalid API key" })];
                            }
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase
                                    .from("renewal_run_logs")
                                    .select("*")
                                    .order("created_at", { ascending: false })
                                    .limit(50)];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error) {
                                console.error("[Routes] Failed to fetch renewal run logs:", error);
                                return [2 /*return*/, res.status(200).json({
                                        success: false,
                                        items: [],
                                        message: "Renewal run logs not available yet. Ensure the renewal_run_logs table exists in your DB.",
                                    })];
                            }
                            res.json({ success: true, items: data || [] });
                            return [2 /*return*/];
                    }
                });
            }); }));
            // Stripe: Create checkout session
            app.post("/api/stripe/create-checkout-session", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var priceId, userId, authHeader, protocol, host, origin_1, successUrl, cancelUrl, StripeService, result, err_29, message;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _d.trys.push([0, 3, , 4]);
                            console.log("[Stripe] Create checkout session request received");
                            console.log("[Stripe] Request body:", req.body);
                            priceId = req.body.priceId;
                            if (!priceId) {
                                console.log("[Stripe] No price ID provided");
                                return [2 /*return*/, res.status(400).json({ error: "Price ID required" })];
                            }
                            userId = (_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id;
                            if (!userId) {
                                authHeader = (_c = req.headers.authorization) === null || _c === void 0 ? void 0 : _c.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId) {
                                console.warn('[Stripe] Unauthorized checkout session request');
                                return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                            }
                            protocol = req.headers['x-forwarded-proto'] || req.protocol;
                            host = req.headers.host;
                            if (!host) {
                                console.error('[Stripe] Could not determine request host for redirect URLs');
                                return [2 /*return*/, res.status(500).json({ error: 'Unable to create checkout session' })];
                            }
                            origin_1 = "".concat(protocol, "://").concat(host);
                            successUrl = process.env.STRIPE_CHECKOUT_SUCCESS_URL || "".concat(origin_1, "/pricing?checkout=success");
                            cancelUrl = process.env.STRIPE_CHECKOUT_CANCEL_URL || "".concat(origin_1, "/pricing?checkout=cancel");
                            return [4 /*yield*/, Promise.resolve().then(function () { return require('./stripe.cjs'); })];
                        case 1:
                            StripeService = (_d.sent()).StripeService;
                            return [4 /*yield*/, StripeService.createSubscriptionCheckoutSession(userId, priceId, successUrl, cancelUrl)];
                        case 2:
                            result = _d.sent();
                            if (result && typeof result === 'object') {
                                if ('url' in result && result.url) {
                                    return [2 /*return*/, res.json({ url: result.url })];
                                }
                                if ('success' in result && result.success) {
                                    return [2 /*return*/, res.json(result)];
                                }
                            }
                            console.error('[Stripe] Stripe checkout session did not return a URL:', result);
                            return [2 /*return*/, res.status(500).json({
                                    error: 'Failed to start Stripe checkout session',
                                    message: 'Stripe returned no redirect URL. Please check your Stripe configuration.',
                                })];
                        case 3:
                            err_29 = _d.sent();
                            console.error("[Stripe] Error in create-checkout-session:", err_29);
                            message = err_29 instanceof Error ? err_29.message : "Unknown error";
                            res.status(500).json({ error: "Failed to create checkout session", message: message });
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
            // Stripe: Complete checkout session after redirect
            app.post("/api/stripe/complete-checkout-session", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var sessionId, StripeService, err_30, message;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 3, , 4]);
                            sessionId = req.body.sessionId;
                            if (!sessionId) {
                                return [2 /*return*/, res.status(400).json({ error: 'sessionId is required' })];
                            }
                            return [4 /*yield*/, Promise.resolve().then(function () { return require('./stripe.cjs'); })];
                        case 1:
                            StripeService = (_a.sent()).StripeService;
                            return [4 /*yield*/, StripeService.completeCheckoutSession(sessionId)];
                        case 2:
                            _a.sent();
                            res.json({ success: true });
                            return [3 /*break*/, 4];
                        case 3:
                            err_30 = _a.sent();
                            console.error("[Stripe] Error in complete-checkout-session:", err_30);
                            message = err_30 instanceof Error ? err_30.message : "Unknown error";
                            res.status(500).json({ error: "Failed to complete checkout session", message: message });
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
            // Stripe: Get subscription status
            app.get("/api/stripe/subscription-status", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, authHeader, supabase, subscription, err_31;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _d.trys.push([0, 2, , 3]);
                            userId = (_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id;
                            if (!userId) {
                                authHeader = (_c = req.headers.authorization) === null || _c === void 0 ? void 0 : _c.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId) {
                                return [2 /*return*/, res.status(401).json({ error: "Unauthorized" })];
                            }
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase
                                    .from('user_subscriptions')
                                    .select('*')
                                    .eq('user_id', userId)
                                    .single()];
                        case 1:
                            subscription = (_d.sent()).data;
                            if (!subscription) {
                                return [2 /*return*/, res.json({ status: 'free', tier: 'free' })];
                            }
                            res.json({
                                status: subscription.stripe_subscription_id ? 'active' : 'inactive',
                                tier: subscription.plan_type || 'free',
                                subscriptionId: subscription.stripe_subscription_id,
                            });
                            return [3 /*break*/, 3];
                        case 2:
                            err_31 = _d.sent();
                            console.error("[Routes] Error getting subscription status:", err_31);
                            res.status(500).json({ error: "Failed to get subscription status" });
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            // Stripe: Cancel subscription
            app.post("/api/stripe/cancel-subscription", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, authHeader, StripeService, cancelResult, message, err_32, message;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _d.trys.push([0, 3, , 4]);
                            userId = (_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id;
                            if (!userId) {
                                authHeader = (_c = req.headers.authorization) === null || _c === void 0 ? void 0 : _c.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId) {
                                return [2 /*return*/, res.status(401).json({ error: "Unauthorized" })];
                            }
                            return [4 /*yield*/, Promise.resolve().then(function () { return require('./stripe.cjs'); })];
                        case 1:
                            StripeService = (_d.sent()).StripeService;
                            return [4 /*yield*/, StripeService.cancelSubscription(userId)];
                        case 2:
                            cancelResult = _d.sent();
                            message = cancelResult.alreadyFree
                                ? 'No active subscription found; already on free plan.'
                                : cancelResult.alreadyCanceled
                                    ? 'Subscription already canceled or already on free plan.'
                                    : cancelResult.cleaned
                                        ? 'Stale Stripe subscription cleared and downgraded to free.'
                                        : 'Subscription cancelled';
                            res.json({ success: true, message: message });
                            return [3 /*break*/, 4];
                        case 3:
                            err_32 = _d.sent();
                            console.error("[Routes] Error cancelling subscription:", err_32);
                            message = err_32 instanceof Error ? err_32.message : "Unknown error";
                            res.status(500).json({ error: "Failed to cancel subscription", message: message });
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
            // Stripe: Reactivate subscription
            app.post("/api/stripe/reactivate-subscription", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, authHeader, StripeService, err_33, message;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _d.trys.push([0, 3, , 4]);
                            userId = (_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id;
                            if (!userId) {
                                authHeader = (_c = req.headers.authorization) === null || _c === void 0 ? void 0 : _c.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId) {
                                return [2 /*return*/, res.status(401).json({ error: "Unauthorized" })];
                            }
                            return [4 /*yield*/, Promise.resolve().then(function () { return require('./stripe.cjs'); })];
                        case 1:
                            StripeService = (_d.sent()).StripeService;
                            return [4 /*yield*/, StripeService.reactivateSubscription(userId)];
                        case 2:
                            _d.sent();
                            res.json({ success: true, message: "Subscription reactivated" });
                            return [3 /*break*/, 4];
                        case 3:
                            err_33 = _d.sent();
                            console.error("[Routes] Error reactivating subscription:", err_33);
                            message = err_33 instanceof Error ? err_33.message : "Unknown error";
                            res.status(500).json({ error: "Failed to reactivate subscription", message: message });
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
            // Stripe webhook - handles payment completion and subscription updates
            app.post("/api/stripe/webhook", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var sig, webhookSecret, payload, stripeWebhookClient, event_1, supabaseAdmin, _a, session, subscription, priceId, planType, userId, customer, customerEmail_1, userData, user, _b, existingRow, lookupError, updateError, insertError, subscription, priceId, planType, userId_5, userSubBySubscription, userSubByCustomer, updateError, _c, getFamilyGroups, getFamilyMembers, groups, ownedGroups, _i, ownedGroups_1, group, members, _d, members_2, member, downgradeFromFamilyPlan, err_34, err_35, invoice, subscription, priceId, planType, updateData, updateError, invoice, subscription, userSub, updateError, err_36, message;
                var _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            _f.trys.push([0, 46, , 47]);
                            console.log("[Webhook] Received webhook request", {
                                path: req.path,
                                method: req.method,
                                hasSignature: !!req.headers["stripe-signature"],
                                hasRawBody: !!req.rawBody,
                                stripeVersionHeader: req.headers["stripe-version"] || req.headers["Stripe-Version"],
                            });
                            sig = req.headers["stripe-signature"];
                            webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
                            if (!webhookSecret) {
                                console.warn("[Webhook] STRIPE_WEBHOOK_SECRET not configured");
                                return [2 /*return*/, res.status(400).json({ error: "Webhook not configured" })];
                            }
                            payload = req.rawBody
                                ? typeof req.rawBody === 'string'
                                    ? req.rawBody
                                    : Buffer.isBuffer(req.rawBody)
                                        ? req.rawBody.toString('utf8')
                                        : JSON.stringify(req.rawBody)
                                : typeof req.body === 'string'
                                    ? req.body
                                    : JSON.stringify(req.body);
                            console.log('[Webhook] Using Stripe API version:', stripe_js_1.STRIPE_API_VERSION);
                            stripeWebhookClient = (0, stripe_js_1.createStripeClient)(process.env.STRIPE_SECRET_KEY);
                            event_1 = stripeWebhookClient.webhooks.constructEvent(payload, sig, webhookSecret);
                            console.log("[Webhook] Received event:", event_1.type);
                            supabaseAdmin = (0, supabase_js_2.getSupabaseClient)();
                            _a = event_1.type;
                            switch (_a) {
                                case "checkout.session.completed": return [3 /*break*/, 1];
                                case "customer.subscription.created": return [3 /*break*/, 11];
                                case "customer.subscription.updated": return [3 /*break*/, 11];
                                case "invoice.payment_succeeded": return [3 /*break*/, 35];
                                case "invoice.payment_failed": return [3 /*break*/, 39];
                                case "customer.subscription.deleted": return [3 /*break*/, 40];
                            }
                            return [3 /*break*/, 44];
                        case 1:
                            session = event_1.data.object;
                            console.log("[Webhook] Checkout session completed:", session.id);
                            if (!(session.customer && session.subscription)) return [3 /*break*/, 10];
                            return [4 /*yield*/, stripe_js_1.stripe.subscriptions.retrieve(session.subscription)];
                        case 2:
                            subscription = _f.sent();
                            priceId = (0, stripe_js_1.getPriceIdFromSubscription)(subscription);
                            planType = (0, stripe_js_1.getPlanTypeFromSubscription)(subscription) || (priceId ? stripe_js_1.PRICE_ID_TO_PLAN_TYPE[priceId] : undefined);
                            if (!planType) return [3 /*break*/, 10];
                            console.log("[Webhook] Subscription created with plan: ".concat(planType));
                            userId = (_e = session.metadata) === null || _e === void 0 ? void 0 : _e.user_id;
                            if (!!userId) return [3 /*break*/, 5];
                            return [4 /*yield*/, stripe_js_1.stripe.customers.retrieve(session.customer)];
                        case 3:
                            customer = _f.sent();
                            customerEmail_1 = customer.email;
                            if (!customerEmail_1) return [3 /*break*/, 5];
                            return [4 /*yield*/, supabaseAdmin.auth.admin.listUsers()];
                        case 4:
                            userData = (_f.sent()).data;
                            user = userData.users.find(function (u) { return u.email === customerEmail_1; });
                            if (user) {
                                userId = user.id;
                                console.log("[Webhook] Found user ".concat(userId, " for email ").concat(customerEmail_1));
                            }
                            _f.label = 5;
                        case 5:
                            if (!userId) return [3 /*break*/, 10];
                            return [4 /*yield*/, supabaseAdmin
                                    .from("user_subscriptions")
                                    .select("id")
                                    .eq("user_id", userId)
                                    .single()];
                        case 6:
                            _b = _f.sent(), existingRow = _b.data, lookupError = _b.error;
                            if (lookupError && lookupError.code !== 'PGRST116') {
                                console.error("[Webhook] Error looking up existing subscription row:", lookupError);
                            }
                            if (!existingRow) return [3 /*break*/, 8];
                            return [4 /*yield*/, supabaseAdmin
                                    .from("user_subscriptions")
                                    .update({
                                    stripe_customer_id: session.customer,
                                    stripe_subscription_id: session.subscription,
                                    stripe_price_id: priceId,
                                    plan_type: planType,
                                    status: "active",
                                    current_period_start: new Date(subscription.current_period_start * 1000),
                                    current_period_end: new Date(subscription.current_period_end * 1000),
                                    cancel_at_period_end: subscription.cancel_at_period_end,
                                    updated_at: new Date(),
                                })
                                    .eq("user_id", userId)];
                        case 7:
                            updateError = (_f.sent()).error;
                            if (updateError) {
                                console.error("[Webhook] Error updating subscription:", updateError);
                            }
                            else {
                                console.log("[Webhook] Subscription updated successfully for user:", userId);
                            }
                            return [3 /*break*/, 10];
                        case 8: return [4 /*yield*/, supabaseAdmin
                                .from("user_subscriptions")
                                .insert({
                                user_id: userId,
                                stripe_customer_id: session.customer,
                                stripe_subscription_id: session.subscription,
                                stripe_price_id: priceId,
                                plan_type: planType,
                                status: "active",
                                current_period_start: new Date(subscription.current_period_start * 1000),
                                current_period_end: new Date(subscription.current_period_end * 1000),
                                cancel_at_period_end: subscription.cancel_at_period_end,
                                updated_at: new Date(),
                            })];
                        case 9:
                            insertError = (_f.sent()).error;
                            if (insertError) {
                                console.error("[Webhook] Error inserting subscription:", insertError);
                            }
                            else {
                                console.log("[Webhook] Subscription created successfully for user:", userId);
                            }
                            _f.label = 10;
                        case 10: return [3 /*break*/, 45];
                        case 11:
                            subscription = event_1.data.object;
                            console.log("[Webhook] Subscription updated/created:", subscription.id);
                            priceId = (0, stripe_js_1.getPriceIdFromSubscription)(subscription);
                            planType = (0, stripe_js_1.getPlanTypeFromSubscription)(subscription) || (priceId ? stripe_js_1.PRICE_ID_TO_PLAN_TYPE[priceId] : undefined);
                            if (!planType) return [3 /*break*/, 34];
                            return [4 /*yield*/, supabaseAdmin
                                    .from("user_subscriptions")
                                    .select("user_id")
                                    .eq("stripe_subscription_id", subscription.id)
                                    .single()];
                        case 12:
                            userSubBySubscription = (_f.sent()).data;
                            if (!(userSubBySubscription === null || userSubBySubscription === void 0 ? void 0 : userSubBySubscription.user_id)) return [3 /*break*/, 13];
                            userId_5 = userSubBySubscription.user_id;
                            return [3 /*break*/, 15];
                        case 13:
                            if (!subscription.customer) return [3 /*break*/, 15];
                            return [4 /*yield*/, supabaseAdmin
                                    .from("user_subscriptions")
                                    .select("user_id")
                                    .eq("stripe_customer_id", subscription.customer)
                                    .single()];
                        case 14:
                            userSubByCustomer = (_f.sent()).data;
                            userId_5 = userSubByCustomer === null || userSubByCustomer === void 0 ? void 0 : userSubByCustomer.user_id;
                            _f.label = 15;
                        case 15:
                            if (!userId_5) return [3 /*break*/, 33];
                            return [4 /*yield*/, supabaseAdmin
                                    .from("user_subscriptions")
                                    .update({
                                    stripe_price_id: priceId,
                                    plan_type: planType,
                                    status: subscription.status,
                                    cancel_at_period_end: subscription.cancel_at_period_end,
                                    current_period_end: new Date(subscription.current_period_end * 1000),
                                    updated_at: new Date(),
                                })
                                    .eq("stripe_subscription_id", subscription.id)];
                        case 16:
                            updateError = (_f.sent()).error;
                            if (!updateError) return [3 /*break*/, 17];
                            console.error("[Webhook] Error updating subscription:", updateError);
                            return [3 /*break*/, 32];
                        case 17:
                            console.log("[Webhook] Subscription upgraded/downgraded successfully for user:", userId_5);
                            _f.label = 18;
                        case 18:
                            _f.trys.push([18, 31, , 32]);
                            if (!(planType === 'premium')) return [3 /*break*/, 30];
                            return [4 /*yield*/, Promise.resolve().then(function () { return require('./family-sharing.cjs'); })];
                        case 19:
                            _c = _f.sent(), getFamilyGroups = _c.getFamilyGroups, getFamilyMembers = _c.getFamilyMembers;
                            return [4 /*yield*/, getFamilyGroups(userId_5)];
                        case 20:
                            groups = _f.sent();
                            ownedGroups = groups.filter(function (g) { return g.ownerId === userId_5; });
                            _i = 0, ownedGroups_1 = ownedGroups;
                            _f.label = 21;
                        case 21:
                            if (!(_i < ownedGroups_1.length)) return [3 /*break*/, 30];
                            group = ownedGroups_1[_i];
                            return [4 /*yield*/, getFamilyMembers(group.id)];
                        case 22:
                            members = _f.sent();
                            _d = 0, members_2 = members;
                            _f.label = 23;
                        case 23:
                            if (!(_d < members_2.length)) return [3 /*break*/, 29];
                            member = members_2[_d];
                            if (!(member.userId !== userId_5)) return [3 /*break*/, 28];
                            _f.label = 24;
                        case 24:
                            _f.trys.push([24, 27, , 28]);
                            return [4 /*yield*/, Promise.resolve().then(function () { return require('./family-sharing.cjs'); })];
                        case 25:
                            downgradeFromFamilyPlan = (_f.sent()).downgradeFromFamilyPlan;
                            return [4 /*yield*/, downgradeFromFamilyPlan(member.userId, group.id)];
                        case 26:
                            _f.sent();
                            console.log("[Webhook] Reverted member ".concat(member.userId, " in group ").concat(group.id, " to original plan."));
                            return [3 /*break*/, 28];
                        case 27:
                            err_34 = _f.sent();
                            console.error("[Webhook] Failed to revert member ".concat(member.userId, " in group ").concat(group.id, ":"), err_34);
                            return [3 /*break*/, 28];
                        case 28:
                            _d++;
                            return [3 /*break*/, 23];
                        case 29:
                            _i++;
                            return [3 /*break*/, 21];
                        case 30: return [3 /*break*/, 32];
                        case 31:
                            err_35 = _f.sent();
                            console.error('[Webhook] Error in family group downgrade logic:', err_35);
                            return [3 /*break*/, 32];
                        case 32: return [3 /*break*/, 34];
                        case 33:
                            console.warn("[Webhook] Could not resolve user for subscription ".concat(subscription.id));
                            _f.label = 34;
                        case 34: return [3 /*break*/, 45];
                        case 35:
                            invoice = event_1.data.object;
                            console.log("[Webhook] Invoice payment succeeded:", invoice.id);
                            if (!invoice.subscription) return [3 /*break*/, 38];
                            return [4 /*yield*/, stripe_js_1.stripe.subscriptions.retrieve(invoice.subscription)];
                        case 36:
                            subscription = _f.sent();
                            priceId = (0, stripe_js_1.getPriceIdFromSubscription)(subscription);
                            planType = (0, stripe_js_1.getPlanTypeFromSubscription)(subscription) || (priceId ? stripe_js_1.PRICE_ID_TO_PLAN_TYPE[priceId] : undefined);
                            updateData = {
                                status: subscription.status,
                                current_period_start: new Date(subscription.current_period_start * 1000),
                                current_period_end: new Date(subscription.current_period_end * 1000),
                                updated_at: new Date(),
                                plan_type: planType,
                            };
                            if (priceId) {
                                updateData.stripe_price_id = priceId;
                            }
                            return [4 /*yield*/, supabaseAdmin
                                    .from("user_subscriptions")
                                    .update(updateData)
                                    .eq("stripe_subscription_id", invoice.subscription)];
                        case 37:
                            updateError = (_f.sent()).error;
                            if (updateError) {
                                console.error("[Webhook] Error updating subscription on invoice payment success:", updateError);
                            }
                            else {
                                console.log("[Webhook] Subscription updated to active on renewal for subscription:", invoice.subscription);
                            }
                            _f.label = 38;
                        case 38: return [3 /*break*/, 45];
                        case 39:
                            {
                                invoice = event_1.data.object;
                                console.log("[Webhook] Invoice payment failed:", invoice.id);
                                return [3 /*break*/, 45];
                            }
                            _f.label = 40;
                        case 40:
                            subscription = event_1.data.object;
                            console.log("[Webhook] Subscription deleted:", subscription.id);
                            return [4 /*yield*/, supabaseAdmin
                                    .from("user_subscriptions")
                                    .select("user_id")
                                    .eq("stripe_subscription_id", subscription.id)
                                    .single()];
                        case 41:
                            userSub = (_f.sent()).data;
                            if (!userSub) return [3 /*break*/, 43];
                            return [4 /*yield*/, supabaseAdmin
                                    .from("user_subscriptions")
                                    .update({
                                    status: "canceled",
                                    plan_type: "free",
                                    updated_at: new Date(),
                                })
                                    .eq("stripe_subscription_id", subscription.id)];
                        case 42:
                            updateError = (_f.sent()).error;
                            if (updateError) {
                                console.error("[Webhook] Error canceling subscription:", updateError);
                            }
                            else {
                                console.log("[Webhook] Subscription canceled for user:", userSub.user_id);
                            }
                            _f.label = 43;
                        case 43: return [3 /*break*/, 45];
                        case 44:
                            console.log("[Webhook] Unhandled event type:", event_1.type);
                            _f.label = 45;
                        case 45:
                            res.json({ received: true });
                            return [3 /*break*/, 47];
                        case 46:
                            err_36 = _f.sent();
                            console.error("[Webhook] Error processing webhook:", err_36);
                            message = err_36 instanceof Error ? err_36.message : "Unknown error";
                            res.status(400).json({ error: "Webhook error", message: message });
                            return [3 /*break*/, 47];
                        case 47: return [2 /*return*/];
                    }
                });
            }); });
            // Contact form endpoint
            app.post("/api/contact", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var _a, name_2, email, subject, message, emailRegex, emailResult, emailSuccess, err_37, message;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            _a = req.body, name_2 = _a.name, email = _a.email, subject = _a.subject, message = _a.message;
                            // Basic validation
                            if (!name_2 || !email || !message) {
                                return [2 /*return*/, res.status(400).json({
                                        error: "Missing required fields",
                                        message: "Name, email, and message are required."
                                    })];
                            }
                            emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                            if (!emailRegex.test(email)) {
                                return [2 /*return*/, res.status(400).json({
                                        error: "Invalid email",
                                        message: "Please provide a valid email address."
                                    })];
                            }
                            return [4 /*yield*/, email_js_1.emailService.sendContactEmail({
                                    name: name_2,
                                    email: email,
                                    subject: subject || "No subject",
                                    message: message
                                })];
                        case 1:
                            emailResult = _b.sent();
                            emailSuccess = emailResult.success === true;
                            if (!emailSuccess) {
                                console.error("[Contact] Failed to send email:", emailResult.error);
                                return [2 /*return*/, res.status(500).json({
                                        error: "Failed to send support message",
                                        message: emailResult.error ? String(emailResult.error) : "Email provider failed to deliver the message."
                                    })];
                            }
                            // Log the contact request
                            console.log("[Contact] Email sent successfully for contact form", {
                                emailResult: emailResult,
                                name: name_2,
                                email: email,
                                subject: subject || "No subject",
                                timestamp: new Date().toISOString(),
                                ip: req.ip,
                            });
                            console.log("[Contact] New contact form submission:", {
                                name: name_2,
                                email: email,
                                subject: subject || "No subject",
                                message: message,
                                timestamp: new Date().toISOString(),
                                ip: req.ip,
                                emailSent: emailSuccess
                            });
                            res.json({
                                message: "Thank you for your message! We'll get back to you soon.",
                                success: true
                            });
                            return [3 /*break*/, 3];
                        case 2:
                            err_37 = _b.sent();
                            console.error("[Contact] Error processing contact form:", err_37);
                            message = err_37 instanceof Error ? err_37.message : "Unknown error";
                            res.status(500).json({
                                error: "Failed to process contact form",
                                message: message
                            });
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            // Push notification routes
            app.get("/api/notifications/vapid-public-key", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var vapidPublicKey;
                return __generator(this, function (_a) {
                    try {
                        vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
                        if (!vapidPublicKey) {
                            console.warn("[Push] VAPID_PUBLIC_KEY not configured");
                            return [2 /*return*/, res.status(500).json({ error: "Push notifications not configured" })];
                        }
                        res.json({ vapidPublicKey: vapidPublicKey });
                    }
                    catch (error) {
                        console.error("[Push] Error getting VAPID public key:", error);
                        res.status(500).json({ error: "Failed to get VAPID public key" });
                    }
                    return [2 /*return*/];
                });
            }); });
            app.post("/api/notifications/subscribe", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, authHeader, _a, endpoint, keys, supabase, error, error_26;
                var _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            _e.trys.push([0, 2, , 3]);
                            userId = (_c = (_b = req.session) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.id;
                            if (!userId) {
                                authHeader = (_d = req.headers.authorization) === null || _d === void 0 ? void 0 : _d.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                            _a = req.body, endpoint = _a.endpoint, keys = _a.keys;
                            if (!endpoint || !(keys === null || keys === void 0 ? void 0 : keys.auth) || !(keys === null || keys === void 0 ? void 0 : keys.p256dh)) {
                                return [2 /*return*/, res.status(400).json({ error: 'Invalid subscription data' })];
                            }
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase
                                    .from('push_subscriptions')
                                    .upsert({
                                    user_id: userId,
                                    endpoint: endpoint,
                                    auth_key: keys.auth,
                                    p256dh_key: keys.p256dh,
                                    updated_at: new Date().toISOString()
                                }, {
                                    onConflict: 'user_id,endpoint'
                                })];
                        case 1:
                            error = (_e.sent()).error;
                            if (error) {
                                console.error("[Push] Error saving subscription:", error);
                                return [2 /*return*/, res.status(500).json({ error: 'Failed to save subscription' })];
                            }
                            res.json({ success: true });
                            return [3 /*break*/, 3];
                        case 2:
                            error_26 = _e.sent();
                            console.error("[Push] Error subscribing:", error_26);
                            res.status(500).json({ error: 'Failed to subscribe' });
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            app.post("/api/notifications/unsubscribe", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, authHeader, endpoint, supabase, error, error_27;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _d.trys.push([0, 2, , 3]);
                            userId = (_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id;
                            if (!userId) {
                                authHeader = (_c = req.headers.authorization) === null || _c === void 0 ? void 0 : _c.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                            endpoint = req.body.endpoint;
                            if (!endpoint) {
                                return [2 /*return*/, res.status(400).json({ error: 'Endpoint required' })];
                            }
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase
                                    .from('push_subscriptions')
                                    .delete()
                                    .eq('user_id', userId)
                                    .eq('endpoint', endpoint)];
                        case 1:
                            error = (_d.sent()).error;
                            if (error) {
                                console.error("[Push] Error removing subscription:", error);
                                return [2 /*return*/, res.status(500).json({ error: 'Failed to unsubscribe' })];
                            }
                            res.json({ success: true });
                            return [3 /*break*/, 3];
                        case 2:
                            error_27 = _d.sent();
                            console.error("[Push] Error unsubscribing:", error_27);
                            res.status(500).json({ error: 'Failed to unsubscribe' });
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            app.get("/api/notifications/subscriptions", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var userId, authHeader, supabase, _a, data, error, error_28;
                var _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            _e.trys.push([0, 2, , 3]);
                            userId = (_c = (_b = req.session) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.id;
                            if (!userId) {
                                authHeader = (_d = req.headers.authorization) === null || _d === void 0 ? void 0 : _d.replace('Bearer ', '');
                                if (authHeader)
                                    userId = extractUserIdFromToken(authHeader) || undefined;
                            }
                            if (!userId)
                                return [2 /*return*/, res.status(401).json({ error: 'Unauthorized' })];
                            supabase = (0, supabase_js_2.getSupabaseClient)();
                            return [4 /*yield*/, supabase
                                    .from('push_subscriptions')
                                    .select('endpoint, created_at, updated_at')
                                    .eq('user_id', userId)];
                        case 1:
                            _a = _e.sent(), data = _a.data, error = _a.error;
                            if (error) {
                                console.error("[Push] Error fetching subscriptions:", error);
                                return [2 /*return*/, res.status(500).json({ error: 'Failed to fetch subscriptions' })];
                            }
                            res.json(data || []);
                            return [3 /*break*/, 3];
                        case 2:
                            error_28 = _e.sent();
                            console.error("[Push] Error getting subscriptions:", error_28);
                            res.status(500).json({ error: 'Failed to get subscriptions' });
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            // Download extension endpoint
            app.get("/api/extension/download", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var archiver, e_9, extensionPath, archive, err_38, message;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 6, , 7]);
                            console.log("[Extension] Download requested");
                            archiver = void 0;
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, Promise.resolve().then(function () { return require("archiver"); })];
                        case 2:
                            archiver = (_a.sent()).default;
                            return [3 /*break*/, 4];
                        case 3:
                            e_9 = _a.sent();
                            console.warn("[Extension] archiver module not found, trying to create ZIP manually");
                            // Fallback: create a simple tar.gz or ZIP using raw bytes
                            // For now, send an error directing user to install archiver
                            return [2 /*return*/, res.status(500).json({
                                    error: "Extension download not available",
                                    message: "Please try again later or load the extension manually from the folder."
                                })];
                        case 4:
                            extensionPath = (0, path_1.join)(process.cwd(), 'extension');
                            archive = archiver('zip', { zlib: { level: 9 } });
                            res.setHeader('Content-Type', 'application/zip');
                            res.setHeader('Content-Disposition', 'attachment; filename=subveris-extension.zip');
                            archive.on('error', function (err) {
                                console.error('[Extension] Archive error:', err);
                                res.status(500).json({ error: 'Failed to create archive' });
                            });
                            // Pipe archive to response
                            archive.pipe(res);
                            // Add extension folder to archive
                            archive.directory(extensionPath, 'subveris-extension');
                            // Finalize the archive
                            return [4 /*yield*/, archive.finalize()];
                        case 5:
                            // Finalize the archive
                            _a.sent();
                            console.log('[Extension] Download completed successfully');
                            return [3 /*break*/, 7];
                        case 6:
                            err_38 = _a.sent();
                            console.error('[Extension] Download error:', err_38);
                            message = err_38 instanceof Error ? err_38.message : 'Unknown error';
                            res.status(500).json({ error: 'Failed to download extension', message: message });
                            return [3 /*break*/, 7];
                        case 7: return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/, httpServer];
        });
    });
}
