"use strict";
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
exports.generateAIRecommendations = generateAIRecommendations;
exports.upgradeToPlan = upgradeToPlan;
exports.downgradeFromFamilyPlan = downgradeFromFamilyPlan;
exports.createFamilyGroup = createFamilyGroup;
exports.getFamilyGroups = getFamilyGroups;
exports.updateFamilyGroup = updateFamilyGroup;
exports.deleteFamilyGroup = deleteFamilyGroup;
exports.addFamilyMember = addFamilyMember;
exports.getFamilyMembers = getFamilyMembers;
exports.getFamilyMembersWithSubscriptions = getFamilyMembersWithSubscriptions;
exports.removeFamilyMember = removeFamilyMember;
exports.shareSubscription = shareSubscription;
exports.getSharedSubscriptions = getSharedSubscriptions;
exports.unshareSubscription = unshareSubscription;
exports.setCostSplit = setCostSplit;
exports.getCostSplits = getCostSplits;
exports.createCalendarEvent = createCalendarEvent;
exports.getCalendarEvents = getCalendarEvents;
exports.updateCalendarEvent = updateCalendarEvent;
exports.deleteCalendarEvent = deleteCalendarEvent;
var supabase_js_1 = require("@supabase/supabase-js");
var crypto_1 = require("crypto");
var supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
// Create admin client for auth operations
var supabaseAdmin = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
// Helper to calculate monthly cost
function monthlyAmountFor(sub) {
    if (!sub)
        return 0;
    var amt = sub.amount || 0;
    var freq = sub.frequency || 'monthly';
    if (freq === 'yearly')
        return Math.round((amt / 12) * 100) / 100;
    if (freq === 'quarterly')
        return Math.round((amt / 3) * 100) / 100;
    if (freq === 'weekly')
        return Math.round(amt * 4 * 100) / 100;
    return Math.round(amt * 100) / 100;
}
// Helper to generate AI recommendations from a list of subscriptions
function generateAIRecommendations(subs) {
    var recommendations = [];
    if (!subs || subs.length === 0)
        return recommendations;
    var normalizeText = function (value) { return String(value || "").trim().toLowerCase(); };
    var getUsageValue = function (sub) {
        var _a, _b, _c;
        var usage = (_c = (_b = (_a = sub.monthly_usage_count) !== null && _a !== void 0 ? _a : sub.monthlyUsageCount) !== null && _b !== void 0 ? _b : sub.usage_count) !== null && _c !== void 0 ? _c : sub.usageCount;
        return typeof usage === "number" ? usage : null;
    };
    var getRenewalText = function (sub) {
        var nextBilling = sub.nextBillingDate || sub.next_billing_date || sub.next_billing_at || sub.next_billing;
        if (!nextBilling)
            return "";
        var date = new Date(nextBilling);
        if (Number.isNaN(date.getTime()))
            return "";
        return " Next payment is due ".concat(date.toLocaleDateString("en-US", { month: "short", day: "numeric" }), ".");
    };
    var isStreamingService = function (sub) {
        var lower = normalizeText(sub.name);
        return sub.category === "streaming" || /(netflix|disney|hulu|prime video|hbomax|peacock|paramount|peacock|spotify|streaming)/.test(lower);
    };
    var isProductivityService = function (sub) {
        var lower = normalizeText(sub.name);
        return sub.category === "productivity" || sub.category === "software" || /(adobe|microsoft 365|office|photoshop|illustrator|creative cloud|notion|figma|canva)/.test(lower);
    };
    var isCloudStorageService = function (sub) {
        var lower = normalizeText(sub.name);
        return sub.category === "cloud-storage" || /(dropbox|google drive|icloud|onedrive|box|cloud storage|storage)/.test(lower);
    };
    var isAnnualPlan = function (sub) { return normalizeText(sub.frequency) === "yearly"; };
    var validSubs = subs.filter(function (sub) { return sub && (sub.status === "unused" || sub.status === "to-cancel"); });
    var activeStreamingSubs = validSubs.filter(function (sub) { return sub.status === "active" && isStreamingService(sub); });
    var streamingTotal = activeStreamingSubs.reduce(function (sum, sub) { return sum + monthlyAmountFor(sub); }, 0);
    if (activeStreamingSubs.length >= 2 && streamingTotal >= 30) {
        var sub = activeStreamingSubs[0];
        recommendations.push({
            id: (0, crypto_1.randomUUID)(),
            type: "downgrade",
            title: "Consolidate or rotate your streaming services",
            description: "You are paying ".concat(streamingTotal.toFixed(2), " ").concat(sub.currency || "USD", "/mo for ").concat(activeStreamingSubs.length, " streaming services. Pausing one service and rotating selections can lower that spend by roughly one-third without losing access to favorites."), currentCost: streamingTotal,
            suggestedCost: Math.round((streamingTotal * 0.65) * 100) / 100,
            savings: Math.round((streamingTotal * 0.35) * 100) / 100,
            subscriptionId: sub.id,
            confidence: 0.9,
            currency: sub.currency || "USD",
        });
    }
    for (var _i = 0, validSubs_1 = validSubs; _i < validSubs_1.length; _i++) {
        var sub = validSubs_1[_i];
        try {
            var monthly = monthlyAmountFor(sub);
            var usage = getUsageValue(sub);
            var renewalText = getRenewalText(sub);
            var name_1 = String(sub.name || "Service");
            var currency = sub.currency || "USD";
            var lowerName = normalizeText(name_1);
            var id = (0, crypto_1.randomUUID)();
            var isStreaming = isStreamingService(sub);
            var isProductivity = isProductivityService(sub);
            var isCloudStorage = isCloudStorageService(sub);
            var isAnnual = isAnnualPlan(sub);
            if (sub.status === "unused") {
                var usageMessage = usage === null ? "You have not used it recently." : usage === 0 ? "You have not used it recently." : "You used it only ".concat(usage, " time").concat(usage === 1 ? "" : "s", " this month.");
                recommendations.push({
                    id: id,
                    type: "cancel",
                    title: "Cancel ".concat(name_1),
                    description: "".concat(usageMessage, " ").concat(name_1, " costs ").concat(monthly.toFixed(2), " ").concat(currency, "/mo. Canceling now avoids another renewal.").concat(renewalText),
                    currentCost: monthly,
                    suggestedCost: 0,
                    savings: monthly,
                    subscriptionId: sub.id,
                    confidence: 0.99,
                    currency: currency,
                });
                continue;
            }
            if (sub.status === "to-cancel") {
                recommendations.push({
                    id: id,
                    type: "cancel",
                    title: "Complete cancellation of ".concat(name_1),
                    description: "".concat(name_1, " is already marked for cancellation. Finalize it before the next bill to stop future charges.").concat(renewalText),
                    currentCost: monthly,
                    suggestedCost: 0,
                    savings: monthly,
                    subscriptionId: sub.id,
                    confidence: 0.98,
                    currency: currency,
                });
                continue;
            }
            if (sub.status === "active") {
                if (usage === 0 && monthly >= 8) {
                    recommendations.push({
                        id: id,
                        type: "cancel",
                        title: "Cancel ".concat(name_1, " \u2014 no usage this month"),
                        description: "You did not use ".concat(name_1, " this month, yet it costs ").concat(monthly.toFixed(2), " ").concat(currency, "/mo. Cancel it to reclaim budget immediately.").concat(renewalText),
                        currentCost: monthly,
                        suggestedCost: 0,
                        savings: monthly,
                        subscriptionId: sub.id,
                        confidence: 0.97,
                        currency: currency,
                    });
                    continue;
                }
                if (isProductivity && monthly >= 12) {
                    recommendations.push({
                        id: id,
                        type: "alternative",
                        title: "Explore a lighter productivity plan for ".concat(name_1),
                        description: "".concat(name_1, " costs ").concat(monthly.toFixed(2), " ").concat(currency, "/mo. If your work is primarily documents, notes, or casual design, a simpler alternative could cut your spend by more than 40%."), currentCost: monthly,
                        suggestedCost: Math.round((monthly * 0.45) * 100) / 100,
                        savings: Math.round((monthly * 0.55) * 100) / 100,
                        subscriptionId: sub.id,
                        alternativeName: "Affinity, Canva, or Google Workspace",
                        confidence: 0.86,
                        currency: currency,
                    });
                    continue;
                }
                if (isStreaming && monthly >= 14 && (usage === null || usage <= 3)) {
                    recommendations.push({
                        id: id,
                        type: "downgrade",
                        title: "Rotate or share ".concat(name_1),
                        description: "".concat(name_1, " costs ").concat(monthly.toFixed(2), " ").concat(currency, "/mo. If you only watch it occasionally, a shared plan or alternating between services could lower your monthly streaming bill."), currentCost: monthly,
                        suggestedCost: Math.round((monthly * 0.65) * 100) / 100,
                        savings: Math.round((monthly * 0.35) * 100) / 100,
                        subscriptionId: sub.id,
                        confidence: 0.88,
                        currency: currency,
                    });
                    continue;
                }
                if (isCloudStorage && monthly >= 10 && (usage === null || usage <= 2)) {
                    recommendations.push({
                        id: id,
                        type: "downgrade",
                        title: "Review storage tier for ".concat(name_1),
                        description: "".concat(name_1, " costs ").concat(monthly.toFixed(2), " ").concat(currency, "/mo. If you are using little of the capacity, a lower tier can keep your files safe while trimming the bill."), currentCost: monthly,
                        suggestedCost: Math.round((monthly * 0.65) * 100) / 100,
                        savings: Math.round((monthly * 0.35) * 100) / 100,
                        subscriptionId: sub.id,
                        confidence: 0.84,
                        currency: currency,
                    });
                    continue;
                }
                if (isAnnual && monthly >= 15) {
                    recommendations.push({
                        id: id,
                        type: "negotiate",
                        title: "Review annual pricing for ".concat(name_1),
                        description: "".concat(name_1, " is currently billed annually. Check whether switching to monthly, negotiating a loyalty discount, or using a promo can reduce the effective monthly cost."), currentCost: monthly,
                        suggestedCost: Math.round((monthly * 0.75) * 100) / 100,
                        savings: Math.round((monthly * 0.25) * 100) / 100,
                        subscriptionId: sub.id,
                        confidence: 0.78,
                        currency: currency,
                    });
                    continue;
                }
                if (monthly >= 25) {
                    var usageDescriptor = usage === null ? "" : "You used it ".concat(usage, " time").concat(usage === 1 ? "" : "s", " this month.");
                    recommendations.push({
                        id: id,
                        type: "negotiate",
                        title: "Review ".concat(name_1, " for potential savings"),
                        description: "".concat(name_1, " costs ").concat(monthly.toFixed(2), " ").concat(currency, "/mo. ").concat(usageDescriptor, " A lower tier, promotion, or alternate vendor could shrink this cost by 20\u201340%."), currentCost: monthly,
                        suggestedCost: Math.round((monthly * 0.7) * 100) / 100,
                        savings: Math.round((monthly * 0.3) * 100) / 100,
                        subscriptionId: sub.id,
                        confidence: 0.7,
                        currency: currency,
                    });
                    continue;
                }
                if (usage !== null && usage <= 2 && monthly >= 10) {
                    recommendations.push({
                        id: id,
                        type: "downgrade",
                        title: "Check value for ".concat(name_1),
                        description: "You used ".concat(name_1, " only ").concat(usage, " time").concat(usage === 1 ? "" : "s", " this month, while it costs ").concat(monthly.toFixed(2), " ").concat(currency, "/mo. A smaller plan may still cover what you need."), currentCost: monthly,
                        suggestedCost: Math.round((monthly * 0.8) * 100) / 100,
                        savings: Math.round((monthly * 0.2) * 100) / 100,
                        subscriptionId: sub.id,
                        confidence: 0.68,
                        currency: currency,
                    });
                }
            }
        }
        catch (e) {
            console.warn('[FamilySharing] Recommendation generation error for sub', sub === null || sub === void 0 ? void 0 : sub.id, e);
        }
    }
    return recommendations.sort(function (a, b) { return b.confidence - a.confidence; });
}
// Helper function to upgrade user to family plan
function upgradeToPlan(userId, planType) {
    return __awaiter(this, void 0, void 0, function () {
        var existingBackups, currentSub, backupId, _a, existingSubs, selectError, updateError, subId, insertError;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, supabase
                        .from('family_group_plan_backups')
                        .select('*')
                        .eq('user_id', userId)];
                case 1:
                    existingBackups = (_b.sent()).data;
                    if (!(!existingBackups || existingBackups.length === 0)) return [3 /*break*/, 4];
                    return [4 /*yield*/, supabase
                            .from('user_subscriptions')
                            .select('plan_type, status')
                            .eq('user_id', userId)
                            .single()];
                case 2:
                    currentSub = (_b.sent()).data;
                    if (!(currentSub && (currentSub.plan_type === 'free' || currentSub.plan_type === 'premium'))) return [3 /*break*/, 4];
                    backupId = (0, crypto_1.randomUUID)();
                    return [4 /*yield*/, supabase
                            .from('family_group_plan_backups')
                            .insert({
                            id: backupId,
                            user_id: userId,
                            family_group_id: '', // Placeholder, will be updated with actual group ID
                            original_plan_type: currentSub.plan_type,
                            original_status: currentSub.status,
                        })];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4:
                    // Upgrade the user to family plan
                    console.log("[upgradeToPlan] Upgrading user ".concat(userId, " to ").concat(planType, " plan"));
                    return [4 /*yield*/, supabase
                            .from('user_subscriptions')
                            .select('id')
                            .eq('user_id', userId)];
                case 5:
                    _a = _b.sent(), existingSubs = _a.data, selectError = _a.error;
                    if (selectError && selectError.code !== 'PGRST116') {
                        throw new Error("Failed to check existing subscriptions: ".concat(selectError.message));
                    }
                    if (!(existingSubs && existingSubs.length > 0)) return [3 /*break*/, 7];
                    // Update existing subscription
                    console.log("[upgradeToPlan] Updating existing subscription for user ".concat(userId));
                    return [4 /*yield*/, supabase
                            .from('user_subscriptions')
                            .update({
                            plan_type: planType,
                            status: 'active',
                        })
                            .eq('user_id', userId)];
                case 6:
                    updateError = (_b.sent()).error;
                    if (updateError) {
                        throw new Error("Failed to upgrade user to ".concat(planType, " plan: ").concat(updateError.message));
                    }
                    console.log("[upgradeToPlan] Successfully updated user ".concat(userId, " to ").concat(planType, " plan"));
                    return [3 /*break*/, 9];
                case 7:
                    // Create new subscription if it doesn't exist
                    console.log("[upgradeToPlan] Creating new subscription for user ".concat(userId));
                    subId = (0, crypto_1.randomUUID)();
                    return [4 /*yield*/, supabase
                            .from('user_subscriptions')
                            .insert({
                            id: subId,
                            user_id: userId,
                            plan_type: planType,
                            status: 'active',
                        })];
                case 8:
                    insertError = (_b.sent()).error;
                    if (insertError) {
                        throw new Error("Failed to create ".concat(planType, " plan subscription: ").concat(insertError.message));
                    }
                    console.log("[upgradeToPlan] Successfully created new subscription for user ".concat(userId));
                    _b.label = 9;
                case 9: return [2 /*return*/];
            }
        });
    });
}
// Helper function to downgrade user from family plan to their original plan
function downgradeFromFamilyPlan(userId, familyGroupId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, backup, backupError, _b, generalBackup, generalBackupError, _c, group, groupError, sharedError, _d, members, membersError, _i, members_1, member, err_1, updateError;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, supabase
                        .from('family_group_plan_backups')
                        .select('original_plan_type, original_status')
                        .eq('user_id', userId)
                        .eq('family_group_id', familyGroupId)
                        .single()];
                case 1:
                    _a = _e.sent(), backup = _a.data, backupError = _a.error;
                    if (backupError && backupError.code !== 'PGRST116') {
                        throw new Error("Failed to fetch plan backup: ".concat(backupError.message));
                    }
                    if (!!backup) return [3 /*break*/, 4];
                    return [4 /*yield*/, supabase
                            .from('family_group_plan_backups')
                            .select('original_plan_type, original_status')
                            .eq('user_id', userId)
                            .eq('family_group_id', '')
                            .single()];
                case 2:
                    _b = _e.sent(), generalBackup = _b.data, generalBackupError = _b.error;
                    if (generalBackupError && generalBackupError.code !== 'PGRST116') {
                        throw new Error("Failed to fetch general plan backup: ".concat(generalBackupError.message));
                    }
                    if (!generalBackup) return [3 /*break*/, 4];
                    backup = generalBackup;
                    // Update the backup to point to this specific group for cleanup
                    return [4 /*yield*/, supabase
                            .from('family_group_plan_backups')
                            .update({ family_group_id: familyGroupId })
                            .eq('user_id', userId)
                            .eq('family_group_id', '')];
                case 3:
                    // Update the backup to point to this specific group for cleanup
                    _e.sent();
                    _e.label = 4;
                case 4:
                    if (!backup) return [3 /*break*/, 17];
                    return [4 /*yield*/, supabase
                            .from('family_groups')
                            .select('owner_id')
                            .eq('id', familyGroupId)
                            .single()];
                case 5:
                    _c = _e.sent(), group = _c.data, groupError = _c.error;
                    if (groupError) {
                        throw new Error("Failed to fetch family group: ".concat(groupError.message));
                    }
                    if (!(group.owner_id === userId)) return [3 /*break*/, 14];
                    return [4 /*yield*/, supabase
                            .from('shared_subscriptions')
                            .delete()
                            .eq('family_group_id', familyGroupId)];
                case 6:
                    sharedError = (_e.sent()).error;
                    if (sharedError) {
                        console.error('Failed to delete shared_subscriptions on owner downgrade:', sharedError);
                    }
                    return [4 /*yield*/, supabase
                            .from('family_group_members')
                            .select('user_id')
                            .eq('family_group_id', familyGroupId)];
                case 7:
                    _d = _e.sent(), members = _d.data, membersError = _d.error;
                    if (!membersError) return [3 /*break*/, 8];
                    console.error('Failed to fetch family group members for downgrade:', membersError);
                    return [3 /*break*/, 14];
                case 8:
                    if (!(members && members.length > 0)) return [3 /*break*/, 14];
                    _i = 0, members_1 = members;
                    _e.label = 9;
                case 9:
                    if (!(_i < members_1.length)) return [3 /*break*/, 14];
                    member = members_1[_i];
                    if (!(member.user_id !== userId)) return [3 /*break*/, 13];
                    _e.label = 10;
                case 10:
                    _e.trys.push([10, 12, , 13]);
                    return [4 /*yield*/, downgradeFromFamilyPlan(member.user_id, familyGroupId)];
                case 11:
                    _e.sent();
                    return [3 /*break*/, 13];
                case 12:
                    err_1 = _e.sent();
                    console.error("Failed to downgrade member ".concat(member.user_id, ":"), err_1);
                    return [3 /*break*/, 13];
                case 13:
                    _i++;
                    return [3 /*break*/, 9];
                case 14: return [4 /*yield*/, supabase
                        .from('user_subscriptions')
                        .update({
                        plan_type: backup.original_plan_type,
                        status: backup.original_status,
                    })
                        .eq('user_id', userId)];
                case 15:
                    updateError = (_e.sent()).error;
                    if (updateError) {
                        throw new Error("Failed to restore original plan: ".concat(updateError.message));
                    }
                    // Delete the backup entry
                    return [4 /*yield*/, supabase
                            .from('family_group_plan_backups')
                            .delete()
                            .eq('user_id', userId)
                            .eq('family_group_id', familyGroupId)];
                case 16:
                    // Delete the backup entry
                    _e.sent();
                    return [3 /*break*/, 18];
                case 17:
                    // NOTE: DO NOT auto-downgrade to free plan. Keep the user on family plan.
                    // This prevents accidental downgrade when leaving/deleting family groups.
                    // Users must explicitly request a plan change.
                    console.log("[downgradeFromFamilyPlan] Skipping auto-downgrade for user ".concat(userId, " - keeping family plan active"));
                    return [2 /*return*/];
                case 18: return [2 /*return*/];
            }
        });
    });
}
// Family Group Management
function createFamilyGroup(userId, name) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, ownedGroups, ownedGroupsError, _b, data, error, ownerEmail, _c, userData, userError, userPayload, supabaseUrl, serviceKey, response, userData, err_2, memberError;
        var _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0: return [4 /*yield*/, supabase
                        .from('family_groups')
                        .select('id')
                        .eq('owner_id', userId)];
                case 1:
                    _a = _f.sent(), ownedGroups = _a.data, ownedGroupsError = _a.error;
                    if (ownedGroupsError) {
                        throw new Error("Failed to check existing family groups: ".concat(ownedGroupsError.message));
                    }
                    if (((_d = ownedGroups === null || ownedGroups === void 0 ? void 0 : ownedGroups.length) !== null && _d !== void 0 ? _d : 0) >= 1) {
                        throw new Error('You can only create 1 family group.');
                    }
                    return [4 /*yield*/, supabase
                            .from('family_groups')
                            .insert({
                            name: name,
                            owner_id: userId,
                        })
                            .select()
                            .single()];
                case 2:
                    _b = _f.sent(), data = _b.data, error = _b.error;
                    if (error)
                        throw new Error("Failed to create family group: ".concat(error.message));
                    ownerEmail = null;
                    _f.label = 3;
                case 3:
                    _f.trys.push([3, 9, , 10]);
                    if (!(supabaseAdmin.auth && supabaseAdmin.auth.admin)) return [3 /*break*/, 5];
                    return [4 /*yield*/, supabaseAdmin.auth.admin.getUserById(userId)];
                case 4:
                    _c = _f.sent(), userData = _c.data, userError = _c.error;
                    userPayload = userData;
                    if (!userError && (userPayload === null || userPayload === void 0 ? void 0 : userPayload.user)) {
                        ownerEmail = userPayload.user.email || null;
                    }
                    _f.label = 5;
                case 5:
                    if (!!ownerEmail) return [3 /*break*/, 8];
                    supabaseUrl = process.env.SUPABASE_URL;
                    serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
                    return [4 /*yield*/, fetch("".concat(supabaseUrl, "/auth/v1/admin/users/").concat(userId), {
                            method: 'GET',
                            headers: {
                                'Authorization': "Bearer ".concat(serviceKey),
                                'apikey': serviceKey,
                            },
                        })];
                case 6:
                    response = _f.sent();
                    if (!response.ok) return [3 /*break*/, 8];
                    return [4 /*yield*/, response.json()];
                case 7:
                    userData = (_f.sent());
                    ownerEmail = (_e = userData.email) !== null && _e !== void 0 ? _e : null;
                    _f.label = 8;
                case 8: return [3 /*break*/, 10];
                case 9:
                    err_2 = _f.sent();
                    console.error('Error fetching email for group owner:', err_2);
                    return [3 /*break*/, 10];
                case 10: return [4 /*yield*/, supabase
                        .from('family_group_members')
                        .insert({
                        family_group_id: data.id,
                        user_id: userId,
                        role: 'owner',
                        email: ownerEmail,
                    })];
                case 11:
                    memberError = (_f.sent()).error;
                    if (memberError) {
                        console.error('Error adding owner to members table:', memberError);
                        // Don't throw here as the group was created successfully
                    }
                    return [2 /*return*/, {
                            id: data.id,
                            name: data.name,
                            ownerId: data.owner_id,
                            createdAt: data.created_at,
                            updatedAt: data.updated_at,
                        }];
            }
        });
    });
}
function getFamilyGroups(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, ownerGroups, ownerError, _b, memberGroups, memberError, memberGroupIds, memberGroupData, validMemberGroupIds, _c, data, error, orphaned, orphanedIds, allGroups, uniqueGroups, groupsWithCounts;
        var _this = this;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, supabase
                        .from('family_groups')
                        .select('*')
                        .eq('owner_id', userId)];
                case 1:
                    _a = _d.sent(), ownerGroups = _a.data, ownerError = _a.error;
                    if (ownerError)
                        throw new Error("Failed to fetch family groups: ".concat(ownerError.message));
                    return [4 /*yield*/, supabase
                            .from('family_group_members')
                            .select('family_group_id, id')
                            .eq('user_id', userId)];
                case 2:
                    _b = _d.sent(), memberGroups = _b.data, memberError = _b.error;
                    if (memberError)
                        throw new Error("Failed to fetch family group memberships: ".concat(memberError.message));
                    memberGroupIds = (memberGroups === null || memberGroups === void 0 ? void 0 : memberGroups.map(function (m) { return m.family_group_id; })) || [];
                    memberGroupData = [];
                    validMemberGroupIds = [];
                    if (!(memberGroupIds.length > 0)) return [3 /*break*/, 5];
                    return [4 /*yield*/, supabase
                            .from('family_groups')
                            .select('*')
                            .in('id', memberGroupIds)];
                case 3:
                    _c = _d.sent(), data = _c.data, error = _c.error;
                    if (error)
                        throw new Error("Failed to fetch member groups: ".concat(error.message));
                    memberGroupData = data || [];
                    validMemberGroupIds = memberGroupData.map(function (g) { return g.id; });
                    orphaned = memberGroups.filter(function (m) { return !validMemberGroupIds.includes(m.family_group_id); });
                    if (!(orphaned.length > 0)) return [3 /*break*/, 5];
                    orphanedIds = orphaned.map(function (m) { return m.id; });
                    return [4 /*yield*/, supabase
                            .from('family_group_members')
                            .delete()
                            .in('id', orphanedIds)];
                case 4:
                    _d.sent();
                    _d.label = 5;
                case 5:
                    allGroups = __spreadArray(__spreadArray([], (ownerGroups || []), true), memberGroupData, true);
                    uniqueGroups = Array.from(new Map(allGroups.map(function (g) { return [g.id, g]; })).values());
                    return [4 /*yield*/, Promise.all(uniqueGroups.map(function (group) { return __awaiter(_this, void 0, void 0, function () {
                            var _a, count, countError;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0: return [4 /*yield*/, supabase
                                            .from('family_group_members')
                                            .select('*', { count: 'exact', head: true })
                                            .eq('family_group_id', group.id)];
                                    case 1:
                                        _a = _b.sent(), count = _a.count, countError = _a.error;
                                        return [2 /*return*/, {
                                                id: group.id,
                                                name: group.name,
                                                ownerId: group.owner_id,
                                                createdAt: group.created_at,
                                                updatedAt: group.updated_at,
                                                memberCount: countError ? 0 : (count || 0),
                                            }];
                                }
                            });
                        }); }))];
                case 6:
                    groupsWithCounts = _d.sent();
                    return [2 /*return*/, groupsWithCounts];
            }
        });
    });
}
function updateFamilyGroup(groupId, userId, name) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, group, fetchError, _b, data, error;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, supabase
                        .from('family_groups')
                        .select('owner_id')
                        .eq('id', groupId)
                        .single()];
                case 1:
                    _a = _c.sent(), group = _a.data, fetchError = _a.error;
                    if (fetchError || group.owner_id !== userId) {
                        throw new Error('Only group owner can update');
                    }
                    return [4 /*yield*/, supabase
                            .from('family_groups')
                            .update({ name: name })
                            .eq('id', groupId)
                            .select()
                            .single()];
                case 2:
                    _b = _c.sent(), data = _b.data, error = _b.error;
                    if (error)
                        throw new Error("Failed to update family group: ".concat(error.message));
                    return [2 /*return*/, {
                            id: data.id,
                            name: data.name,
                            ownerId: data.owner_id,
                            createdAt: data.created_at,
                            updatedAt: data.updated_at,
                        }];
            }
        });
    });
}
function deleteFamilyGroup(groupId, userId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, group, fetchError, _b, members, membersFetchError, _i, members_2, member, err_3, err_4, err_5, deleteError;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, supabase
                        .from('family_groups')
                        .select('owner_id')
                        .eq('id', groupId)
                        .single()];
                case 1:
                    _a = _c.sent(), group = _a.data, fetchError = _a.error;
                    if (fetchError) {
                        console.error("[deleteFamilyGroup] Error fetching group:", fetchError);
                        throw new Error("[deleteFamilyGroup] Error fetching group: ".concat(fetchError.message));
                    }
                    if (!group || group.owner_id !== userId) {
                        console.error("[deleteFamilyGroup] Only group owner can delete. group.owner_id: ".concat(group === null || group === void 0 ? void 0 : group.owner_id, ", userId: ").concat(userId));
                        throw new Error('[deleteFamilyGroup] Only group owner can delete');
                    }
                    return [4 /*yield*/, supabase
                            .from('family_group_members')
                            .select('user_id')
                            .eq('family_group_id', groupId)];
                case 2:
                    _b = _c.sent(), members = _b.data, membersFetchError = _b.error;
                    if (membersFetchError) {
                        console.error("[deleteFamilyGroup] Error fetching group members:", membersFetchError);
                        throw new Error("[deleteFamilyGroup] Error fetching group members: ".concat(membersFetchError.message));
                    }
                    if (!(members && members.length > 0)) return [3 /*break*/, 11];
                    _i = 0, members_2 = members;
                    _c.label = 3;
                case 3:
                    if (!(_i < members_2.length)) return [3 /*break*/, 11];
                    member = members_2[_i];
                    _c.label = 4;
                case 4:
                    _c.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, downgradeFromFamilyPlan(member.user_id, groupId)];
                case 5:
                    _c.sent();
                    return [3 /*break*/, 7];
                case 6:
                    err_3 = _c.sent();
                    console.error("[deleteFamilyGroup] Failed to downgrade member ".concat(member.user_id, ":"), err_3);
                    throw new Error("[deleteFamilyGroup] Failed to downgrade member ".concat(member.user_id, ": ").concat(err_3 instanceof Error ? err_3.message : err_3));
                case 7:
                    _c.trys.push([7, 9, , 10]);
                    return [4 /*yield*/, supabase
                            .from('family_group_members')
                            .delete()
                            .eq('family_group_id', groupId)
                            .eq('user_id', member.user_id)];
                case 8:
                    _c.sent();
                    return [3 /*break*/, 10];
                case 9:
                    err_4 = _c.sent();
                    console.error("[deleteFamilyGroup] Failed to remove member ".concat(member.user_id, " from family_group_members:"), err_4);
                    throw new Error("[deleteFamilyGroup] Failed to remove member ".concat(member.user_id, " from family_group_members: ").concat(err_4 instanceof Error ? err_4.message : err_4));
                case 10:
                    _i++;
                    return [3 /*break*/, 3];
                case 11:
                    _c.trys.push([11, 13, , 14]);
                    return [4 /*yield*/, supabase
                            .from('shared_subscriptions')
                            .delete()
                            .eq('family_group_id', groupId)];
                case 12:
                    _c.sent();
                    return [3 /*break*/, 14];
                case 13:
                    err_5 = _c.sent();
                    console.error("[deleteFamilyGroup] Failed to delete shared_subscriptions for group ".concat(groupId, ":"), err_5);
                    throw new Error("[deleteFamilyGroup] Failed to delete shared_subscriptions for group ".concat(groupId, ": ").concat(err_5 instanceof Error ? err_5.message : err_5));
                case 14: return [4 /*yield*/, supabase
                        .from('family_groups')
                        .delete()
                        .eq('id', groupId)];
                case 15:
                    deleteError = (_c.sent()).error;
                    if (deleteError) {
                        console.error("[deleteFamilyGroup] Failed to delete family group:", deleteError);
                        throw new Error("[deleteFamilyGroup] Failed to delete family group: ".concat(deleteError.message));
                    }
                    return [2 /*return*/];
            }
        });
    });
}
// Family Group Members
function addFamilyMember(groupId, userId, memberUserId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, group, ownerError, _b, existingMembers, existingMembersError, _c, currentSub, currentSubError, originalPlanType, originalStatus, backupId, backupError, _d, existingSubData, existingError, updateError, subId, _e, insertData, insertError, memberEmail, _f, userData, userError, userPayload, supabaseUrl, serviceKey, response, userData, err_6, _g, data, error;
        var _h, _j;
        return __generator(this, function (_k) {
            switch (_k.label) {
                case 0:
                    console.log('[addFamilyMember] START - groupId:', groupId, 'ownerId:', userId, 'memberUserId:', memberUserId);
                    return [4 /*yield*/, supabase
                            .from('family_groups')
                            .select('owner_id')
                            .eq('id', groupId)
                            .single()];
                case 1:
                    _a = _k.sent(), group = _a.data, ownerError = _a.error;
                    if (ownerError || group.owner_id !== userId) {
                        throw new Error('Only group owner can add members');
                    }
                    console.log('[addFamilyMember] Owner verified');
                    return [4 /*yield*/, supabase
                            .from('family_group_members')
                            .select('id')
                            .eq('family_group_id', groupId)];
                case 2:
                    _b = _k.sent(), existingMembers = _b.data, existingMembersError = _b.error;
                    if (existingMembersError) {
                        throw new Error("Failed to check family group size: ".concat(existingMembersError.message));
                    }
                    if (((_h = existingMembers === null || existingMembers === void 0 ? void 0 : existingMembers.length) !== null && _h !== void 0 ? _h : 0) >= 5) {
                        throw new Error('A family group can contain up to 5 people.');
                    }
                    return [4 /*yield*/, supabase
                            .from('user_subscriptions')
                            .select('plan_type, status')
                            .eq('user_id', memberUserId)];
                case 3:
                    _c = _k.sent(), currentSub = _c.data, currentSubError = _c.error;
                    originalPlanType = (currentSub && currentSub.length > 0) ? currentSub[0].plan_type : 'free';
                    originalStatus = (currentSub && currentSub.length > 0) ? currentSub[0].status : 'inactive';
                    console.log('[addFamilyMember] Member current plan:', originalPlanType, 'status:', originalStatus);
                    backupId = (0, crypto_1.randomUUID)();
                    console.log('[addFamilyMember] Creating backup with original plan:', originalPlanType);
                    return [4 /*yield*/, supabase
                            .from('family_group_plan_backups')
                            .insert({
                            id: backupId,
                            user_id: memberUserId,
                            family_group_id: groupId,
                            original_plan_type: originalPlanType,
                            original_status: originalStatus,
                        })];
                case 4:
                    backupError = (_k.sent()).error;
                    console.log('[addFamilyMember] Backup creation error:', backupError);
                    if (backupError) {
                        console.error('Error creating plan backup:', backupError);
                        // Don't fail completely if backup fails
                    }
                    return [4 /*yield*/, supabase
                            .from('user_subscriptions')
                            .select('id')
                            .eq('user_id', memberUserId)];
                case 5:
                    _d = _k.sent(), existingSubData = _d.data, existingError = _d.error;
                    if (!(existingSubData && existingSubData.length > 0)) return [3 /*break*/, 7];
                    return [4 /*yield*/, supabase
                            .from('user_subscriptions')
                            .update({
                            plan_type: 'family',
                            status: 'active',
                        })
                            .eq('id', existingSubData[0].id)];
                case 6:
                    updateError = (_k.sent()).error;
                    if (updateError) {
                        throw new Error("Failed to upgrade member to family plan: ".concat(updateError.message));
                    }
                    return [3 /*break*/, 9];
                case 7:
                    subId = (0, crypto_1.randomUUID)();
                    console.log('[addFamilyMember] Inserting new subscription for member:', memberUserId, 'with plan_type: family');
                    return [4 /*yield*/, supabase
                            .from('user_subscriptions')
                            .insert({
                            id: subId,
                            user_id: memberUserId,
                            plan_type: 'family',
                            status: 'active',
                        })];
                case 8:
                    _e = _k.sent(), insertData = _e.data, insertError = _e.error;
                    console.log('[addFamilyMember] Insert response - error:', insertError, 'data:', insertData);
                    if (insertError) {
                        throw new Error("Failed to create family plan subscription: ".concat(insertError.message));
                    }
                    _k.label = 9;
                case 9:
                    memberEmail = null;
                    _k.label = 10;
                case 10:
                    _k.trys.push([10, 16, , 17]);
                    if (!(supabaseAdmin.auth && supabaseAdmin.auth.admin)) return [3 /*break*/, 12];
                    return [4 /*yield*/, supabaseAdmin.auth.admin.getUserById(memberUserId)];
                case 11:
                    _f = _k.sent(), userData = _f.data, userError = _f.error;
                    userPayload = userData;
                    if (!userError && (userPayload === null || userPayload === void 0 ? void 0 : userPayload.user)) {
                        memberEmail = userPayload.user.email || null;
                    }
                    _k.label = 12;
                case 12:
                    if (!!memberEmail) return [3 /*break*/, 15];
                    supabaseUrl = process.env.SUPABASE_URL;
                    serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
                    return [4 /*yield*/, fetch("".concat(supabaseUrl, "/auth/v1/admin/users/").concat(memberUserId), {
                            method: 'GET',
                            headers: {
                                'Authorization': "Bearer ".concat(serviceKey),
                                'apikey': serviceKey,
                            },
                        })];
                case 13:
                    response = _k.sent();
                    if (!response.ok) return [3 /*break*/, 15];
                    return [4 /*yield*/, response.json()];
                case 14:
                    userData = (_k.sent());
                    memberEmail = (_j = userData.email) !== null && _j !== void 0 ? _j : null;
                    _k.label = 15;
                case 15: return [3 /*break*/, 17];
                case 16:
                    err_6 = _k.sent();
                    console.error('Error fetching email for new member:', err_6);
                    return [3 /*break*/, 17];
                case 17: return [4 /*yield*/, supabase
                        .from('family_group_members')
                        .insert({
                        family_group_id: groupId,
                        user_id: memberUserId,
                        role: 'member',
                        email: memberEmail,
                    })
                        .select()
                        .single()];
                case 18:
                    _g = _k.sent(), data = _g.data, error = _g.error;
                    if (error)
                        throw new Error("Failed to add family member: ".concat(error.message));
                    console.log('[addFamilyMember] SUCCESS - Member added, returning:', {
                        id: data.id,
                        userId: data.user_id,
                        familyGroupId: data.family_group_id,
                        role: data.role
                    });
                    return [2 /*return*/, {
                            id: data.id,
                            familyGroupId: data.family_group_id,
                            userId: data.user_id,
                            role: data.role,
                            joinedAt: data.joined_at,
                            email: data.email,
                        }];
            }
        });
    });
}
function getFamilyMembers(groupId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error, members, missingEmailIds, emailById, result;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, supabase
                        .from('family_group_members')
                        .select('*')
                        .eq('family_group_id', groupId)];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw new Error("Failed to fetch family members: ".concat(error.message));
                    members = data || [];
                    missingEmailIds = Array.from(new Set(members.filter(function (m) { return !m.email && m.user_id; }).map(function (m) { return m.user_id; })));
                    emailById = {};
                    if (!(missingEmailIds.length > 0)) return [3 /*break*/, 3];
                    return [4 /*yield*/, Promise.all(missingEmailIds.map(function (uid) { return __awaiter(_this, void 0, void 0, function () {
                            var _a, userData, userError, e_1, _b, userRow, userRowErr, e_2;
                            var _c;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        _d.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, supabaseAdmin.auth.admin.getUserById(uid)];
                                    case 1:
                                        _a = _d.sent(), userData = _a.data, userError = _a.error;
                                        if (!userError && ((_c = userData === null || userData === void 0 ? void 0 : userData.user) === null || _c === void 0 ? void 0 : _c.email)) {
                                            emailById[uid] = userData.user.email;
                                            return [2 /*return*/];
                                        }
                                        return [3 /*break*/, 3];
                                    case 2:
                                        e_1 = _d.sent();
                                        return [3 /*break*/, 3];
                                    case 3:
                                        _d.trys.push([3, 5, , 6]);
                                        return [4 /*yield*/, supabase
                                                .from('users')
                                                .select('email')
                                                .eq('id', uid)
                                                .single()];
                                    case 4:
                                        _b = _d.sent(), userRow = _b.data, userRowErr = _b.error;
                                        if (!userRowErr && (userRow === null || userRow === void 0 ? void 0 : userRow.email)) {
                                            emailById[uid] = userRow.email;
                                            return [2 /*return*/];
                                        }
                                        return [3 /*break*/, 6];
                                    case 5:
                                        e_2 = _d.sent();
                                        return [3 /*break*/, 6];
                                    case 6:
                                        emailById[uid] = null;
                                        return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 2:
                    _b.sent();
                    _b.label = 3;
                case 3:
                    result = members.map(function (m) {
                        var _a, _b;
                        return ({
                            id: m.id,
                            familyGroupId: m.family_group_id,
                            userId: m.user_id,
                            role: m.role,
                            joinedAt: m.joined_at,
                            email: (_b = (_a = m.email) !== null && _a !== void 0 ? _a : emailById[m.user_id]) !== null && _b !== void 0 ? _b : null,
                        });
                    });
                    return [4 /*yield*/, Promise.all(members
                            .filter(function (m) { return !m.email && emailById[m.user_id]; })
                            .map(function (m) {
                            return supabase
                                .from('family_group_members')
                                .update({ email: emailById[m.user_id] })
                                .eq('family_group_id', groupId)
                                .eq('user_id', m.user_id);
                        }))];
                case 4:
                    _b.sent();
                    return [2 /*return*/, result];
            }
        });
    });
}
function getFamilyMembersWithSubscriptions(groupId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, members, membersError, _b, subscriptions, subsError, subsMap;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, supabase
                        .from('family_group_members')
                        .select('*')
                        .eq('family_group_id', groupId)];
                case 1:
                    _a = _c.sent(), members = _a.data, membersError = _a.error;
                    if (membersError)
                        throw new Error("Failed to fetch family members: ".concat(membersError.message));
                    return [4 /*yield*/, supabase
                            .from('user_subscriptions')
                            .select('id, user_id, plan_type, status')
                            .in('user_id', members.map(function (m) { return m.user_id; }))];
                case 2:
                    _b = _c.sent(), subscriptions = _b.data, subsError = _b.error;
                    if (subsError)
                        throw new Error("Failed to fetch subscriptions: ".concat(subsError.message));
                    subsMap = new Map((subscriptions === null || subscriptions === void 0 ? void 0 : subscriptions.map(function (s) { return [s.user_id, s]; })) || []);
                    // Combine members with their subscriptions
                    return [2 /*return*/, members.map(function (m) { return ({
                            id: m.id,
                            familyGroupId: m.family_group_id,
                            userId: m.user_id,
                            role: m.role,
                            joinedAt: m.joined_at,
                            email: m.email,
                            subscription: subsMap.get(m.user_id) || null,
                        }); })];
            }
        });
    });
}
function removeFamilyMember(groupId, userId, memberUserId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, group, ownerError, _b, shared, sharedError, sharedIds, csError, delSharedError, e_3, error;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!(userId !== memberUserId)) return [3 /*break*/, 2];
                    return [4 /*yield*/, supabase
                            .from('family_groups')
                            .select('owner_id')
                            .eq('id', groupId)
                            .single()];
                case 1:
                    _a = _c.sent(), group = _a.data, ownerError = _a.error;
                    if (ownerError || group.owner_id !== userId) {
                        throw new Error('Only group owner or the member themselves can remove');
                    }
                    _c.label = 2;
                case 2: 
                // Downgrade the member from family plan to their original plan
                return [4 /*yield*/, downgradeFromFamilyPlan(memberUserId, groupId)];
                case 3:
                    // Downgrade the member from family plan to their original plan
                    _c.sent();
                    _c.label = 4;
                case 4:
                    _c.trys.push([4, 10, , 11]);
                    return [4 /*yield*/, supabase
                            .from('shared_subscriptions')
                            .select('id')
                            .eq('family_group_id', groupId)
                            .eq('shared_by_user_id', memberUserId)];
                case 5:
                    _b = _c.sent(), shared = _b.data, sharedError = _b.error;
                    if (!sharedError) return [3 /*break*/, 6];
                    console.error('Failed to fetch shared subscriptions for removed member:', sharedError);
                    return [3 /*break*/, 9];
                case 6:
                    if (!(shared && shared.length > 0)) return [3 /*break*/, 9];
                    sharedIds = shared.map(function (s) { return s.id; });
                    return [4 /*yield*/, supabase
                            .from('cost_splits')
                            .delete()
                            .in('shared_subscription_id', sharedIds)];
                case 7:
                    csError = (_c.sent()).error;
                    if (csError)
                        console.error('Failed to delete cost_splits for removed member:', csError);
                    return [4 /*yield*/, supabase
                            .from('shared_subscriptions')
                            .delete()
                            .in('id', sharedIds)];
                case 8:
                    delSharedError = (_c.sent()).error;
                    if (delSharedError)
                        console.error('Failed to delete shared_subscriptions for removed member:', delSharedError);
                    _c.label = 9;
                case 9: return [3 /*break*/, 11];
                case 10:
                    e_3 = _c.sent();
                    console.error('Error while cleaning up shared subscriptions for removed member:', e_3);
                    return [3 /*break*/, 11];
                case 11: return [4 /*yield*/, supabase
                        .from('family_group_members')
                        .delete()
                        .eq('family_group_id', groupId)
                        .eq('user_id', memberUserId)];
                case 12:
                    error = (_c.sent()).error;
                    if (error)
                        throw new Error("Failed to remove family member: ".concat(error.message));
                    return [2 /*return*/];
            }
        });
    });
}
// Shared Subscriptions
function shareSubscription(groupId, subscriptionId, userId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, supabase
                        .from('shared_subscriptions')
                        .insert({
                        family_group_id: groupId,
                        subscription_id: subscriptionId,
                        shared_by_user_id: userId,
                    })
                        .select()
                        .single()];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw new Error("Failed to share subscription: ".concat(error.message));
                    return [2 /*return*/, {
                            id: data.id,
                            familyGroupId: data.family_group_id,
                            subscriptionId: data.subscription_id,
                            sharedByUserId: data.shared_by_user_id,
                            sharedAt: data.shared_at,
                        }];
            }
        });
    });
}
function getSharedSubscriptions(groupId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, supabase
                        .from('shared_subscriptions')
                        .select('*')
                        .eq('family_group_id', groupId)];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw new Error("Failed to fetch shared subscriptions: ".concat(error.message));
                    return [2 /*return*/, data.map(function (s) { return ({
                            id: s.id,
                            familyGroupId: s.family_group_id,
                            subscriptionId: s.subscription_id,
                            sharedByUserId: s.shared_by_user_id,
                            sharedAt: s.shared_at,
                        }); })];
            }
        });
    });
}
function unshareSubscription(sharedSubscriptionId) {
    return __awaiter(this, void 0, void 0, function () {
        var error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, supabase
                        .from('shared_subscriptions')
                        .delete()
                        .eq('id', sharedSubscriptionId)];
                case 1:
                    error = (_a.sent()).error;
                    if (error)
                        throw new Error("Failed to unshare subscription: ".concat(error.message));
                    return [2 /*return*/];
            }
        });
    });
}
// Cost Splits
function setCostSplit(sharedSubscriptionId, userId, percentage) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, supabase
                        .from('cost_splits')
                        .upsert({
                        shared_subscription_id: sharedSubscriptionId,
                        user_id: userId,
                        percentage: percentage,
                    }, {
                        onConflict: 'shared_subscription_id,user_id'
                    })
                        .select()
                        .single()];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw new Error("Failed to set cost split: ".concat(error.message));
                    return [2 /*return*/, {
                            id: data.id,
                            sharedSubscriptionId: data.shared_subscription_id,
                            userId: data.user_id,
                            percentage: data.percentage,
                            createdAt: data.created_at,
                            updatedAt: data.updated_at,
                        }];
            }
        });
    });
}
function getCostSplits(sharedSubscriptionId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, supabase
                        .from('cost_splits')
                        .select('*')
                        .eq('shared_subscription_id', sharedSubscriptionId)];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw new Error("Failed to fetch cost splits: ".concat(error.message));
                    return [2 /*return*/, data.map(function (c) { return ({
                            id: c.id,
                            sharedSubscriptionId: c.shared_subscription_id,
                            userId: c.user_id,
                            percentage: c.percentage,
                            createdAt: c.created_at,
                            updatedAt: c.updated_at,
                        }); })];
            }
        });
    });
}
// Calendar Events
function createCalendarEvent(userId, subscriptionId, eventDate, eventType, title, description, amount) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, supabase
                        .from('subscription_calendar_events')
                        .insert({
                        user_id: userId,
                        subscription_id: subscriptionId,
                        event_date: eventDate,
                        event_type: eventType,
                        title: title,
                        description: description,
                        amount: amount,
                    })
                        .select()
                        .single()];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw new Error("Failed to create calendar event: ".concat(error.message));
                    return [2 /*return*/, {
                            id: data.id,
                            subscriptionId: data.subscription_id,
                            userId: data.user_id,
                            eventDate: data.event_date,
                            eventType: data.event_type,
                            title: data.title,
                            description: data.description,
                            amount: data.amount,
                            createdAt: data.created_at,
                            updatedAt: data.updated_at,
                        }];
            }
        });
    });
}
function getCalendarEvents(userId, startDate, endDate) {
    return __awaiter(this, void 0, void 0, function () {
        var query, _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    query = supabase
                        .from('subscription_calendar_events')
                        .select('*')
                        .eq('user_id', userId);
                    if (startDate) {
                        query = query.gte('event_date', startDate);
                    }
                    if (endDate) {
                        query = query.lte('event_date', endDate);
                    }
                    return [4 /*yield*/, query.order('event_date', { ascending: true })];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw new Error("Failed to fetch calendar events: ".concat(error.message));
                    return [2 /*return*/, data.map(function (e) { return ({
                            id: e.id,
                            subscriptionId: e.subscription_id,
                            userId: e.user_id,
                            eventDate: e.event_date,
                            eventType: e.event_type,
                            title: e.title,
                            description: e.description,
                            amount: e.amount,
                            createdAt: e.created_at,
                            updatedAt: e.updated_at,
                        }); })];
            }
        });
    });
}
function updateCalendarEvent(eventId, userId, updates) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, supabase
                        .from('subscription_calendar_events')
                        .update(updates)
                        .eq('id', eventId)
                        .eq('user_id', userId)
                        .select()
                        .single()];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw new Error("Failed to update calendar event: ".concat(error.message));
                    return [2 /*return*/, {
                            id: data.id,
                            subscriptionId: data.subscription_id,
                            userId: data.user_id,
                            eventDate: data.event_date,
                            eventType: data.event_type,
                            title: data.title,
                            description: data.description,
                            amount: data.amount,
                            createdAt: data.created_at,
                            updatedAt: data.updated_at,
                        }];
            }
        });
    });
}
function deleteCalendarEvent(eventId, userId) {
    return __awaiter(this, void 0, void 0, function () {
        var error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, supabase
                        .from('subscription_calendar_events')
                        .delete()
                        .eq('id', eventId)
                        .eq('user_id', userId)];
                case 1:
                    error = (_a.sent()).error;
                    if (error)
                        throw new Error("Failed to delete calendar event: ".concat(error.message));
                    return [2 /*return*/];
            }
        });
    });
}
