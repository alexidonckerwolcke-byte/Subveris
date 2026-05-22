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
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoAdvanceRenewalDates = autoAdvanceRenewalDates;
exports.sendRenewalReminders = sendRenewalReminders;
exports.runRenewalChecks = runRenewalChecks;
var supabase_js_1 = require("./supabase.cjs");
var crypto_1 = require("crypto");
// Helper to format a Date as YYYY-MM-DD using its local year/month/day (avoid toISOString timezone shifts)
function formatDateLocal(d) {
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return "".concat(yyyy, "-").concat(mm, "-").concat(dd);
}
function formatBillingMonth(date) {
    return "".concat(date.getFullYear(), "-").concat(String(date.getMonth() + 1).padStart(2, '0'));
}
// Parse a date string as a local date (YYYY-MM-DD or ISO). This avoids
// timezone shifts when creating Date objects from date-only strings.
function parseDateLocal(dateStr) {
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
    // Fallback: try standard Date parsing then clamp to local midnight
    var parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime()))
        return null;
    parsed.setHours(0, 0, 0, 0);
    return parsed;
}
// Exchange rates relative to USD (matching email.ts)
var EXCHANGE_RATES = {
    USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.35, AUD: 1.52, JPY: 152.0,
    CHF: 0.88, SEK: 10.85, NOK: 10.75, DKK: 6.95, PLN: 4.05, CZK: 23.5,
    HUF: 365.0, BRL: 5.25, MXN: 18.5, ARS: 950.0, TRY: 34.0, ZAR: 18.5,
    INR: 84.0, CNY: 7.25, KRW: 1350.0, SGD: 1.35, HKD: 7.8, NZD: 1.65,
};
var currencySymbols = {
    'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'CAD': 'C$', 'AUD': 'A$',
    'CHF': 'CHF', 'CNY': '¥', 'INR': '₹', 'NZD': 'NZ$', 'SEK': 'kr',
    'NOK': 'kr', 'DKK': 'kr', 'PLN': 'zł', 'CZK': 'Kč', 'HUF': 'Ft',
    'BRL': 'R$', 'MXN': '$', 'ARS': '$', 'TRY': '₺', 'ZAR': 'R',
    'KRW': '₩', 'SGD': 'S$', 'HKD': 'HK$',
};
// Helper function for email formatting
function formatForEmail(amount, from, to) {
    var fromRate = EXCHANGE_RATES[from.toUpperCase()] || 1;
    var toRate = EXCHANGE_RATES[to.toUpperCase()] || 1;
    var converted = (amount / fromRate) * toRate;
    var symbol = currencySymbols[to.toUpperCase()] || to;
    return "".concat(symbol).concat(converted.toFixed(2));
}
// Auto-advance renewal dates that have passed
function autoAdvanceRenewalDates(userId) {
    return __awaiter(this, void 0, void 0, function () {
        // helper to advance a date by a subscription frequency
        function advanceByFrequency(d, freq) {
            var result = new Date(d);
            if (freq === "monthly") {
                var day = result.getDate();
                result.setMonth(result.getMonth() + 1);
                // if month overflow occurred (e.g. Jan 31 -> Mar 3), clamp to last day of
                // the intended month by setting date 0 which yields the previous month's
                // last day.
                if (result.getDate() !== day) {
                    result.setDate(0); // last day of previous month, effectively month-end
                }
            }
            else if (freq === "yearly") {
                result.setFullYear(result.getFullYear() + 1);
            }
            else if (freq === "quarterly") {
                result.setMonth(result.getMonth() + 3);
            }
            else if (freq === "weekly") {
                result.setDate(result.getDate() + 7);
            }
            return result;
        }
        var supabase, today, _a, subscriptions, error, _i, _b, sub, nextBillingDate, currentMonthStart, renewalMonthStart, newDate, lastRenewalDate, newDateStr, billingMonthValue, updateError;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    supabase = (0, supabase_js_1.getSupabaseClient)();
                    today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return [4 /*yield*/, supabase
                            .from("subscriptions")
                            .select("id, name, next_billing_at, frequency, user_id")
                            .eq("user_id", userId)
                            .in("status", ["active", "unused"])];
                case 1:
                    _a = _c.sent(), subscriptions = _a.data, error = _a.error;
                    if (error) {
                        console.error("[Renewal] Error fetching subscriptions:", error);
                        return [2 /*return*/];
                    }
                    _i = 0, _b = subscriptions || [];
                    _c.label = 2;
                case 2:
                    if (!(_i < _b.length)) return [3 /*break*/, 5];
                    sub = _b[_i];
                    if (!sub.next_billing_at)
                        return [3 /*break*/, 4];
                    nextBillingDate = parseDateLocal(sub.next_billing_at);
                    if (!nextBillingDate)
                        return [3 /*break*/, 4];
                    if (!(nextBillingDate < today)) return [3 /*break*/, 4];
                    currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                    renewalMonthStart = new Date(nextBillingDate.getFullYear(), nextBillingDate.getMonth(), 1);
                    if (renewalMonthStart.getTime() === currentMonthStart.getTime()) {
                        return [3 /*break*/, 4];
                    }
                    newDate = nextBillingDate;
                    lastRenewalDate = nextBillingDate;
                    while (newDate < today) {
                        lastRenewalDate = newDate;
                        newDate = advanceByFrequency(newDate, sub.frequency || "monthly");
                    }
                    newDateStr = formatDateLocal(newDate);
                    billingMonthValue = formatBillingMonth(lastRenewalDate);
                    return [4 /*yield*/, supabase
                            .from("subscriptions")
                            .update({ next_billing_at: newDateStr, billing_month: billingMonthValue })
                            .eq("id", sub.id)];
                case 3:
                    updateError = (_c.sent()).error;
                    if (!updateError) {
                        console.log("[Renewal] Advanced ".concat(sub.name, " from ").concat(sub.next_billing_at, " to ").concat(newDateStr));
                    }
                    else {
                        console.error("[Renewal] Error updating ".concat(sub.name, ":"), updateError);
                    }
                    _c.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function sendRenewalReminders(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var summary, resend, ResendModule, err_1, msg, supabase, today, tomorrow, _a, recentRuns, logError, msg, startDate, endDate, startStr, endStr, query, _b, upcomingSubscriptions, error, msg, byUser_1, _loop_1, _i, _c, _d, uid, subs, err_2;
        var _e, _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    summary = {
                        runAt: new Date().toISOString(),
                        userId: userId,
                        subscriptionRows: 0,
                        userGroups: 0,
                        emailAttempted: 0,
                        emailSent: 0,
                        emailSkippedNoAddress: 0,
                        emailSendErrors: 0,
                        notices: [],
                        shouldPersist: true,
                    };
                    _h.label = 1;
                case 1:
                    _h.trys.push([1, 13, , 14]);
                    resend = void 0;
                    _h.label = 2;
                case 2:
                    _h.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("resend"); })];
                case 3:
                    ResendModule = _h.sent();
                    resend = new ResendModule.Resend(process.env.RESEND_API_KEY);
                    return [3 /*break*/, 5];
                case 4:
                    err_1 = _h.sent();
                    msg = "[Renewal] Resend module not available, skipping email reminders";
                    console.warn(msg);
                    summary.notices.push(msg);
                    return [2 /*return*/, summary];
                case 5:
                    supabase = (0, supabase_js_1.getSupabaseClient)();
                    if (!userId) return [3 /*break*/, 7];
                    today = new Date();
                    today.setHours(0, 0, 0, 0);
                    tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    return [4 /*yield*/, supabase
                            .from('renewal_run_logs')
                            .select('id, run_at, email_sent')
                            .eq('user_id', userId)
                            .gte('run_at', today.toISOString())
                            .lt('run_at', tomorrow.toISOString())
                            .gt('email_sent', 0)
                            .limit(1)];
                case 6:
                    _a = _h.sent(), recentRuns = _a.data, logError = _a.error;
                    if (!logError && recentRuns && recentRuns.length > 0) {
                        msg = "[Renewal] Already sent renewal email to user ".concat(userId, " today, skipping");
                        console.log(msg);
                        summary.notices.push(msg);
                        return [2 /*return*/, summary];
                    }
                    _h.label = 7;
                case 7:
                    startDate = new Date();
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + 5); // 5 days from today
                    startStr = formatDateLocal(startDate);
                    endStr = formatDateLocal(endDate);
                    query = supabase
                        .from("subscriptions")
                        .select("id, name, amount, frequency, next_billing_at, user_id, currency")
                        .eq("status", "active")
                        .gte("next_billing_at", startStr)
                        .lte("next_billing_at", endStr);
                    if (userId) {
                        query = query.eq("user_id", userId);
                    }
                    return [4 /*yield*/, query];
                case 8:
                    _b = _h.sent(), upcomingSubscriptions = _b.data, error = _b.error;
                    if (error) {
                        console.error("[Renewal] Error fetching upcoming renewals:", error);
                        summary.notices.push("Error querying upcoming renewals");
                        if (((_e = error.message) === null || _e === void 0 ? void 0 : _e.includes('fetch failed')) || ((_f = error.details) === null || _f === void 0 ? void 0 : _f.includes('ConnectTimeoutError'))) {
                            summary.shouldPersist = false;
                        }
                        return [2 /*return*/, summary];
                    }
                    if (!upcomingSubscriptions || upcomingSubscriptions.length === 0) {
                        msg = "[Renewal] No upcoming renewals to notify";
                        console.log(msg);
                        summary.notices.push(msg);
                        return [2 /*return*/, summary];
                    }
                    summary.subscriptionRows = upcomingSubscriptions.length;
                    byUser_1 = new Map();
                    (upcomingSubscriptions || []).forEach(function (sub) {
                        if (!byUser_1.has(sub.user_id)) {
                            byUser_1.set(sub.user_id, []);
                        }
                        byUser_1.get(sub.user_id).push(sub);
                    });
                    summary.userGroups = byUser_1.size;
                    _loop_1 = function (uid, subs) {
                        var data, email, msg, userRecord, userCurrency_1, subscriptionList, content, emailHtml, sendError, msg, msg, err_3, msg;
                        return __generator(this, function (_j) {
                            switch (_j.label) {
                                case 0:
                                    _j.trys.push([0, 4, , 5]);
                                    return [4 /*yield*/, supabase.auth.admin.getUserById(uid)];
                                case 1:
                                    data = (_j.sent()).data;
                                    email = (_g = data === null || data === void 0 ? void 0 : data.user) === null || _g === void 0 ? void 0 : _g.email;
                                    if (!email) {
                                        msg = "[Renewal] Could not find email for user ".concat(uid);
                                        console.log(msg);
                                        summary.notices.push(msg);
                                        summary.emailSkippedNoAddress += 1;
                                        return [2 /*return*/, "continue"];
                                    }
                                    summary.emailAttempted += 1;
                                    return [4 /*yield*/, supabase
                                            .from('users')
                                            .select('currency')
                                            .eq('id', uid)
                                            .single()];
                                case 2:
                                    userRecord = (_j.sent()).data;
                                    userCurrency_1 = (userRecord === null || userRecord === void 0 ? void 0 : userRecord.currency) || 'USD';
                                    subscriptionList = subs
                                        .map(function (s) {
                                        return "<li><strong>".concat(s.name, "</strong>: ").concat(formatForEmail(s.amount, s.currency, userCurrency_1), " (").concat(s.frequency, ") - Renews: ").concat(s.next_billing_at, "</li>");
                                    })
                                        .join("");
                                    content = "\n          <p>Hi there,</p>\n          <p>Your subscriptions are renewing soon:</p>\n          <ul style=\"line-height: 1.8;\">\n            ".concat(subscriptionList, "\n          </ul>\n          <p>Please make sure you have sufficient funds to cover these charges.</p>\n          <p>You can manage your subscriptions anytime in your Subveris dashboard.</p>\n        ");
                                    emailHtml = "\n          <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;\">\n            <div style=\"background-color: #f0f7ff; padding: 20px; border-radius: 8px 8px 0 0; border-left: 4px solid #007bff;\">\n              <h1 style=\"color: #007bff; margin: 0; font-size: 24px;\">Upcoming Subscription Renewals</h1>\n            </div>\n            <div style=\"padding: 30px; background-color: #fff; border: 1px solid #e0e0e0; border-top: none;\">\n              ".concat(content, "\n              <p style=\"margin-top: 30px; color: #666; font-size: 12px; border-top: 1px solid #e0e0e0; padding-top: 20px;\">\n                Best regards,<br/>\n                The Subveris Team\n              </p>\n            </div>\n          </div>\n        ");
                                    return [4 /*yield*/, resend.emails.send({
                                            from: "Subveris <onboarding@resend.dev>",
                                            to: email,
                                            subject: "Upcoming Subscription Renewals",
                                            html: emailHtml,
                                        })];
                                case 3:
                                    sendError = (_j.sent()).error;
                                    if (sendError) {
                                        summary.emailSendErrors += 1;
                                        msg = "[Renewal] Error sending email to ".concat(email, ": ").concat(sendError.message || JSON.stringify(sendError));
                                        console.error(msg);
                                        summary.notices.push(msg);
                                    }
                                    else {
                                        summary.emailSent += 1;
                                        msg = "[Renewal] Sent reminder email to ".concat(email, " for ").concat(subs.length, " subscriptions");
                                        console.log(msg);
                                        summary.notices.push(msg);
                                    }
                                    return [3 /*break*/, 5];
                                case 4:
                                    err_3 = _j.sent();
                                    summary.emailSendErrors += 1;
                                    msg = "[Renewal] Error sending email to user ".concat(uid, ": ").concat(err_3 instanceof Error ? err_3.message : JSON.stringify(err_3));
                                    console.error(msg);
                                    summary.notices.push(msg);
                                    return [3 /*break*/, 5];
                                case 5: return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, _c = Array.from(byUser_1);
                    _h.label = 9;
                case 9:
                    if (!(_i < _c.length)) return [3 /*break*/, 12];
                    _d = _c[_i], uid = _d[0], subs = _d[1];
                    return [5 /*yield**/, _loop_1(uid, subs)];
                case 10:
                    _h.sent();
                    _h.label = 11;
                case 11:
                    _i++;
                    return [3 /*break*/, 9];
                case 12: return [3 /*break*/, 14];
                case 13:
                    err_2 = _h.sent();
                    summary.notices.push("[Renewal] Error in sendRenewalReminders");
                    console.error("[Renewal] Error in sendRenewalReminders:", err_2);
                    summary.emailSendErrors += 1;
                    return [3 /*break*/, 14];
                case 14: return [2 /*return*/, summary];
            }
        });
    });
}
function persistRenewalRun(summary, options) {
    return __awaiter(this, void 0, void 0, function () {
        var supabase, record, _a, data, error;
        var _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    supabase = (0, supabase_js_1.getSupabaseClient)();
                    record = {
                        id: (0, crypto_1.randomUUID)(),
                        run_at: summary.runAt,
                        mode: options.mode,
                        user_id: (_b = options.userId) !== null && _b !== void 0 ? _b : null,
                        subscription_rows: summary.subscriptionRows,
                        user_groups: summary.userGroups,
                        email_attempted: summary.emailAttempted,
                        email_sent: summary.emailSent,
                        email_skipped_no_address: summary.emailSkippedNoAddress,
                        email_send_errors: summary.emailSendErrors,
                        notices: JSON.stringify(summary.notices),
                        created_at: new Date().toISOString(),
                    };
                    return [4 /*yield*/, supabase.from('renewal_run_logs').insert(record).select('*').single()];
                case 1:
                    _a = _e.sent(), data = _a.data, error = _a.error;
                    if (error) {
                        console.error('[Renewal] Failed to persist renewal run log:', error);
                        // guidance for missing schema/table
                        if (((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes("Could not find the table")) ||
                            ((_d = error.message) === null || _d === void 0 ? void 0 : _d.includes("renewal_run_logs")) ||
                            error.code === 'PGRST205') {
                            summary.notices.push("Missing table renewal_run_logs. Create it in your DB using the migration SQL in migrations/2026-03-16-add-renewal-run-logs.sql or supabase-schema.sql.");
                        }
                        return [2 /*return*/, { id: record.id, error: error }];
                    }
                    return [2 /*return*/, { id: record.id, row: data }];
            }
        });
    });
}
// Run renewal checks periodically (call from a cron job or on startup)
// This function is used for both manual admin triggers and scheduled background runs.
// Each run is persisted to the renewal_run_logs table for auditing and troubleshooting.
function runRenewalChecks() {
    return __awaiter(this, arguments, void 0, function (options) {
        var mode, summary, msg, logResult, err_4;
        var _a;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    mode = (_a = options.mode) !== null && _a !== void 0 ? _a : "scheduled";
                    console.log("[Renewal] Running renewal checks (".concat(mode, ")..."));
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, sendRenewalReminders(options.userId)];
                case 2:
                    summary = _b.sent();
                    console.log("[Renewal] Renewal checks completed", summary);
                    if (summary.shouldPersist === false) {
                        msg = "[Renewal] Skipping renewal run persistence because upstream Supabase fetch failed.";
                        console.warn(msg);
                        summary.notices.push(msg);
                        return [2 /*return*/, { summary: summary, runLogId: '' }];
                    }
                    return [4 /*yield*/, persistRenewalRun(summary, { mode: mode, userId: options.userId })];
                case 3:
                    logResult = _b.sent();
                    if (logResult.error) {
                        summary.notices.push("Failed to persist renewal run log");
                    }
                    else {
                        summary.notices.push("Persisted renewal run as ".concat(logResult.id));
                    }
                    return [2 /*return*/, { summary: summary, runLogId: logResult.id }];
                case 4:
                    err_4 = _b.sent();
                    console.error("[Renewal] Error running renewal checks:", err_4);
                    throw err_4;
                case 5: return [2 /*return*/];
            }
        });
    });
}
