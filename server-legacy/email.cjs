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
exports.emailService = void 0;
var dotenv_1 = require("dotenv");
var resend_1 = require("resend");
var notification_preferences_js_1 = require("./notification-preferences.cjs");
var push_notifications_js_1 = require("./push-notifications.cjs");
var supabase_js_1 = require("@supabase/supabase-js");
// Load environment variables
(0, dotenv_1.config)();
// Resend provider
var ResendProvider = /** @class */ (function () {
    function ResendProvider() {
        this.name = 'Resend';
        this.client = null;
        var apiKey = process.env.RESEND_API_KEY;
        if (apiKey) {
            this.client = new resend_1.Resend(apiKey);
        }
    }
    ResendProvider.prototype.isConfigured = function () {
        return !!this.client;
    };
    ResendProvider.prototype.canSendTo = function (email) {
        // Always allow support inbox delivery for the contact form.
        if (email.toLowerCase() === 'help.subveris@gmail.com') {
            return true;
        }
        // In production, Resend allows sending to any verified domain.
        if (process.env.NODE_ENV === 'production') {
            return true;
        }
        // Testing restriction - only to the configured allowed email.
        var allowedEmail = process.env.RESEND_TESTING_EMAIL || 'alexi.donckerwolcke@gmail.com';
        return email.toLowerCase() === allowedEmail.toLowerCase();
    };
    ResendProvider.prototype.send = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var from, result, error_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.client) {
                            return [2 /*return*/, { success: false, error: 'Resend not configured' }];
                        }
                        if (!this.canSendTo(options.to)) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: "Cannot send to ".concat(options.to, " - ").concat(this.name, " restrictions")
                                }];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        from = options.from || 'Subveris <noreply@subveris.com>';
                        return [4 /*yield*/, this.client.emails.send({
                                from: from,
                                to: options.to,
                                subject: options.subject,
                                html: options.html,
                                replyTo: options.replyTo,
                            })];
                    case 2:
                        result = _b.sent();
                        return [2 /*return*/, {
                                success: true,
                                messageId: (_a = result.data) === null || _a === void 0 ? void 0 : _a.id,
                            }];
                    case 3:
                        error_1 = _b.sent();
                        console.error("[".concat(this.name, "] Send error:"), error_1);
                        return [2 /*return*/, {
                                success: false,
                                error: error_1 instanceof Error ? error_1.message : 'Unknown error',
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return ResendProvider;
}());
// SendGrid provider (fallback)
var SendGridProvider = /** @class */ (function () {
    function SendGridProvider() {
        this.name = 'SendGrid';
        this.apiKey = null;
        this.apiKey = process.env.SENDGRID_API_KEY || null;
    }
    SendGridProvider.prototype.isConfigured = function () {
        return !!this.apiKey;
    };
    SendGridProvider.prototype.canSendTo = function (email) {
        return true; // SendGrid allows sending to any email
    };
    SendGridProvider.prototype.send = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var sgMailModule, sgMail, msg, result, error_2;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!this.apiKey) {
                            return [2 /*return*/, { success: false, error: 'SendGrid not configured' }];
                        }
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@sendgrid/mail'); })];
                    case 2:
                        sgMailModule = (_c.sent());
                        sgMail = sgMailModule.default || sgMailModule;
                        msg = {
                            to: options.to,
                            from: options.from || 'noreply@subveris.com',
                            subject: options.subject,
                            html: options.html,
                            replyTo: options.replyTo,
                        };
                        return [4 /*yield*/, sgMail.send(msg)];
                    case 3:
                        result = _c.sent();
                        return [2 /*return*/, {
                                success: true,
                                messageId: (_b = (_a = result[0]) === null || _a === void 0 ? void 0 : _a.headers) === null || _b === void 0 ? void 0 : _b['x-message-id'],
                            }];
                    case 4:
                        error_2 = _c.sent();
                        console.error("[".concat(this.name, "] Send error:"), error_2);
                        return [2 /*return*/, {
                                success: false,
                                error: error_2 instanceof Error ? error_2.message : 'Unknown error',
                            }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    return SendGridProvider;
}());
// Email service with provider failover
var EmailService = /** @class */ (function () {
    function EmailService() {
        this.providers = [];
        // Initialize Supabase client
        this.supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        // Initialize providers in order of preference
        this.providers.push(new ResendProvider());
        this.providers.push(new SendGridProvider());
        console.log('[Email] Initialized providers:', this.providers.map(function (p) { return ({
            name: p.name,
            configured: p.isConfigured()
        }); }));
    }
    EmailService.prototype.getSendGridProvider = function () {
        return this.providers.find(function (p) { return p.name === 'SendGrid' && p.isConfigured(); });
    };
    EmailService.prototype.logEmailAttempt = function (options, result, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_3;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.supabase.from('email_logs').insert({
                                user_id: userId,
                                to_email: options.to,
                                subject: options.subject,
                                provider: ((_a = this.providers.find(function (p) { return p.isConfigured(); })) === null || _a === void 0 ? void 0 : _a.name) || 'none',
                                success: result.success,
                                error_message: result.error,
                                message_id: result.messageId,
                                created_at: new Date().toISOString(),
                            })];
                    case 1:
                        _b.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_3 = _b.sent();
                        console.error('[Email] Failed to log email attempt:', error_3);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    EmailService.prototype.getActiveProvider = function () {
        return this.providers.find(function (provider) { return provider.isConfigured(); }) || null;
    };
    EmailService.prototype.send = function (options, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, provider, result, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _i = 0, _a = this.providers;
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 5];
                        provider = _a[_i];
                        if (!provider.isConfigured())
                            return [3 /*break*/, 4];
                        if (!provider.canSendTo(options.to))
                            return [3 /*break*/, 4];
                        console.log("[Email] Attempting to send via ".concat(provider.name, " to ").concat(options.to));
                        return [4 /*yield*/, provider.send(options)];
                    case 2:
                        result = _b.sent();
                        return [4 /*yield*/, this.logEmailAttempt(options, result, userId)];
                    case 3:
                        _b.sent();
                        if (result.success) {
                            console.log("[Email] Successfully sent via ".concat(provider.name, ":"), result.messageId);
                            return [2 /*return*/, result];
                        }
                        else {
                            console.warn("[Email] Failed via ".concat(provider.name, ":"), result.error);
                        }
                        _b.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 1];
                    case 5:
                        error = 'All email providers failed or are not configured';
                        console.error('[Email]', error);
                        return [4 /*yield*/, this.logEmailAttempt(options, { success: false, error: error }, userId)];
                    case 6:
                        _b.sent();
                        return [2 /*return*/, { success: false, error: error }];
                }
            });
        });
    };
    return EmailService;
}());
// Global email service instance
var emailServiceInstance = new EmailService();
// Legacy functions for backward compatibility
var resendApiKey = process.env.RESEND_API_KEY;
console.log('[Email] RESEND_API_KEY check at load time:', !!resendApiKey, resendApiKey ? 'configured' : 'not configured');
// Create resend client function that checks at runtime (deprecated - use emailService instead)
function getResendClient() {
    var _this = this;
    var apiKey = process.env.RESEND_API_KEY;
    return apiKey
        ? new resend_1.Resend(apiKey)
        : {
            emails: {
                send: function () { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        console.warn('[Email] RESEND_API_KEY not configured. Skipping email send.');
                        return [2 /*return*/, { data: null, error: null }];
                    });
                }); },
            },
        };
}
// Check if email can be sent (deprecated - use provider.canSendTo instead)
function canSendEmail(to) {
    var provider = emailServiceInstance.getActiveProvider();
    return provider ? provider.canSendTo(to) : false;
}
// Exchange rates relative to USD (matching client/src/lib/currency-context.tsx)
var EXCHANGE_RATES = {
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
// Helper to get currency symbol
function getCurrencySymbol(currency) {
    var currencySymbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'CAD': 'C$',
        'AUD': 'A$',
        'CHF': 'CHF',
        'CNY': '¥',
        'INR': '₹',
        'NZD': 'NZ$',
        'SEK': 'kr',
        'NOK': 'kr',
        'DKK': 'kr',
        'PLN': 'zł',
        'CZK': 'Kč',
        'HUF': 'Ft',
        'BRL': 'R$',
        'MXN': '$',
        'ARS': '$',
        'TRY': '₺',
        'ZAR': 'R',
        'KRW': '₩',
        'SGD': 'S$',
        'HKD': 'HK$',
    };
    return currencySymbols[currency.toUpperCase()] || currency;
}
// Helper to get user's preferred currency
function getUserCurrency(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var supabase, data, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
                    return [4 /*yield*/, supabase
                            .from('users')
                            .select('currency')
                            .eq('id', userId)
                            .single()];
                case 1:
                    data = (_a.sent()).data;
                    return [2 /*return*/, (data === null || data === void 0 ? void 0 : data.currency) || 'USD'];
                case 2:
                    err_1 = _a.sent();
                    return [2 /*return*/, 'USD'];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Helper to format amount in user's currency
function formatAmountForEmail(amount, fromCurrency, toCurrency) {
    var fromRate = EXCHANGE_RATES[fromCurrency.toUpperCase()] || 1;
    var toRate = EXCHANGE_RATES[toCurrency.toUpperCase()] || 1;
    var convertedAmount = (amount / fromRate) * toRate;
    var symbol = getCurrencySymbol(toCurrency);
    return "".concat(symbol).concat(convertedAmount.toFixed(2));
}
var emailTemplate = function (title, content) { return "\n  <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;\">\n    <div style=\"background-color: #f0f7ff; padding: 20px; border-radius: 8px 8px 0 0; border-left: 4px solid #007bff; display: flex; align-items: center; gap: 15px;\">\n      <img src=\"https://files.manuscdn.com/user_upload_by_module/session_file/310519663486926530/yZNjWlFaCygNTvdJ.png\" alt=\"Subveris Logo\" style=\"height: 40px; width: 40px; border-radius: 8px; object-fit: cover;\" />\n      <h1 style=\"color: #007bff; margin: 0; font-size: 24px;\">".concat(title, "</h1>\n    </div>\n    <div style=\"padding: 30px; background-color: #fff; border: 1px solid #e0e0e0; border-top: none;\">\n      ").concat(content, "\n      <p style=\"margin-top: 30px; color: #666; font-size: 12px; border-top: 1px solid #e0e0e0; padding-top: 20px;\">\n        Best regards,<br/>\n        The Subveris Team\n      </p>\n    </div>\n  </div>\n"); };
exports.emailService = {
    // Welcome email for new signups
    sendWelcomeEmail: function (userEmail, userName) {
        return __awaiter(this, void 0, void 0, function () {
            var name_1, content, result, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        name_1 = userName || 'there';
                        content = "\n        <p>Hi ".concat(name_1, ",</p>\n        <p>Welcome to Subveris! We're excited to have you on board.</p>\n        <p>Subveris helps you take complete control of your subscription spending by:</p>\n        <ul style=\"line-height: 1.8;\">\n          <li>\uD83C\uDFAF Tracking all your subscriptions in one place</li>\n          <li>\uD83D\uDCA1 Getting AI-powered recommendations to save money</li>\n          <li>\uD83C\uDFE6 Connecting your bank accounts to auto-detect subscriptions</li>\n          <li>\uD83D\uDCCA Analyzing your spending patterns</li>\n          <li>\u23F0 Scheduling automatic cancellations</li>\n        </ul>\n        <p><strong>Get Started:</strong> Log in to your dashboard to add your first subscription or connect your bank account.</p>\n        <p>Questions? Check out our help center or reply to this email.</p>\n        <p>For support, contact us at: <strong>help.subveris@gmail.com</strong></p>\n      ");
                        return [4 /*yield*/, emailServiceInstance.send({
                                to: userEmail,
                                subject: 'Welcome to Subveris! 🎉',
                                html: emailTemplate('Welcome to Subveris', content),
                                from: 'Subveris <onboarding@subveris.com>',
                            })];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result];
                    case 2:
                        error_4 = _a.sent();
                        console.error('[Email] Error sending welcome email:', error_4);
                        return [2 /*return*/, { success: false, error: error_4 instanceof Error ? error_4.message : String(error_4) }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    },
    // Subscription added notification
    sendSubscriptionAddedEmail: function (userEmail, userId, data) {
        return __awaiter(this, void 0, void 0, function () {
            var hasEmailPreference, userCurrency, formattedAmount, annualAmount, formattedAnnual, content, result, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, (0, notification_preferences_js_1.checkNotificationPreference)(userId, 'email')];
                    case 1:
                        hasEmailPreference = _a.sent();
                        if (!hasEmailPreference) {
                            console.log('[Email] Email notifications disabled for user, skipping subscription added email');
                            return [2 /*return*/, { success: true, skipped: true }];
                        }
                        return [4 /*yield*/, getUserCurrency(userId)];
                    case 2:
                        userCurrency = _a.sent();
                        formattedAmount = formatAmountForEmail(data.amount, data.currency, userCurrency);
                        annualAmount = data.frequency === 'yearly' ? data.amount :
                            data.frequency === 'monthly' ? data.amount * 12 :
                                data.frequency === 'quarterly' ? data.amount * 4 :
                                    data.frequency === 'weekly' ? data.amount * 52 : data.amount * 12;
                        formattedAnnual = formatAmountForEmail(annualAmount, data.currency, userCurrency);
                        content = "\n        <p>Hi there,</p>\n        <p>You've successfully added a new subscription to your Subveris dashboard!</p>\n        <div style=\"background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;\">\n          <p style=\"margin: 0;\">\n            <strong>Subscription:</strong> ".concat(data.subscriptionName, "<br/>\n            <strong>Amount:</strong> ").concat(formattedAmount, "/").concat(data.frequency, "<br/>\n            <strong>Annual Cost:</strong> ").concat(formattedAnnual, "\n          </p>\n        </div>\n        <p>Your subscription is now being tracked. You can:</p>\n        <ul>\n          <li>View your cost-per-use analytics</li>\n          <li>Schedule automatic cancellation if needed</li>\n          <li>Track your usage</li>\n          <li>Get AI recommendations</li>\n        </ul>\n      ");
                        return [4 /*yield*/, emailServiceInstance.send({
                                to: userEmail,
                                subject: "New subscription added: ".concat(data.subscriptionName),
                                html: emailTemplate('Subscription Added', content),
                                from: 'Subveris <onboarding@subveris.com>',
                            }, userId)];
                    case 3:
                        result = _a.sent();
                        return [2 /*return*/, result];
                    case 4:
                        error_5 = _a.sent();
                        console.error('[Email] Error sending subscription added email:', error_5);
                        return [2 /*return*/, { success: false, error: error_5 }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    },
    // Subscription deleted notification
    sendSubscriptionDeletedEmail: function (userEmail, userId, data) {
        return __awaiter(this, void 0, void 0, function () {
            var hasEmailPreference, userCurrency, formattedAmount, formattedAnnual, content, result, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, (0, notification_preferences_js_1.checkNotificationPreference)(userId, 'email')];
                    case 1:
                        hasEmailPreference = _a.sent();
                        if (!hasEmailPreference) {
                            console.log('[Email] Email notifications disabled for user, skipping subscription deleted email');
                            return [2 /*return*/, { success: true, skipped: true }];
                        }
                        return [4 /*yield*/, getUserCurrency(userId)];
                    case 2:
                        userCurrency = _a.sent();
                        formattedAmount = formatAmountForEmail(data.amount, data.currency, userCurrency);
                        formattedAnnual = formatAmountForEmail(data.amount * 12, data.currency, userCurrency);
                        content = "\n        <p>Hi there,</p>\n        <p>You've successfully removed <strong>".concat(data.subscriptionName, "</strong> from your subscriptions.</p>\n        <div style=\"background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;\">\n          <p style=\"margin: 0;\">\n            <strong>Subscription:</strong> ").concat(data.subscriptionName, "<br/>\n            <strong>Monthly Savings:</strong> ").concat(formattedAmount, "<br/>\n            <strong>Annual Savings:</strong> ").concat(formattedAnnual, "\n          </p>\n        </div>\n        <p>\uD83C\uDF89 Great job optimizing your subscriptions! You're saving money every month.</p>\n      ");
                        return [4 /*yield*/, emailServiceInstance.send({
                                to: userEmail,
                                subject: "Subscription cancelled: ".concat(data.subscriptionName),
                                html: emailTemplate('Subscription Cancelled', content),
                                from: 'Subveris <onboarding@subveris.com>',
                            }, userId)];
                    case 3:
                        result = _a.sent();
                        return [2 /*return*/, result];
                    case 4:
                        error_6 = _a.sent();
                        console.error('[Email] Error sending subscription deleted email:', error_6);
                        return [2 /*return*/, { success: false, error: error_6 }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    },
    // Bank account connected notification
    sendBankConnectedEmail: function (userEmail, userId, data) {
        return __awaiter(this, void 0, void 0, function () {
            var hasEmailPreference, content, result, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, (0, notification_preferences_js_1.checkNotificationPreference)(userId, 'email')];
                    case 1:
                        hasEmailPreference = _a.sent();
                        if (!hasEmailPreference) {
                            console.log('[Email] Email notifications disabled for user, skipping bank connected email');
                            return [2 /*return*/, { success: true, skipped: true }];
                        }
                        content = "\n        <p>Hi there,</p>\n        <p>Your <strong>".concat(data.bankName, "</strong> account has been successfully connected to Subveris!</p>\n        <div style=\"background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;\">\n          <p style=\"margin: 0;\">\n            <strong>Bank:</strong> ").concat(data.bankName, "<br/>\n            ").concat(data.accountType ? "<strong>Account Type:</strong> ".concat(data.accountType, "<br/>") : '', "\n            <strong>Status:</strong> Connected \u2705\n          </p>\n        </div>\n        <p>Subveris is now analyzing your transactions to automatically detect subscriptions.</p>\n        <p>This helps us:</p>\n        <ul>\n          <li>Find all your subscriptions automatically</li>\n          <li>Alert you about duplicate subscriptions</li>\n          <li>Provide better savings recommendations</li>\n        </ul>\n      ");
                        return [4 /*yield*/, emailServiceInstance.send({
                                to: userEmail,
                                subject: "Bank account connected: ".concat(data.bankName),
                                html: emailTemplate('Bank Account Connected', content),
                                from: 'Subveris <onboarding@subveris.com>',
                            }, userId)];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result];
                    case 3:
                        error_7 = _a.sent();
                        console.error('[Email] Error sending bank connected email:', error_7);
                        return [2 /*return*/, { success: false, error: error_7 }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    },
    // Subscription status changed notification
    sendStatusChangedEmail: function (userEmail, userId, data) {
        return __awaiter(this, void 0, void 0, function () {
            var hasEmailPreference, statusEmoji, content, result, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, (0, notification_preferences_js_1.checkNotificationPreference)(userId, 'email')];
                    case 1:
                        hasEmailPreference = _a.sent();
                        if (!hasEmailPreference) {
                            console.log('[Email] Email notifications disabled for user, skipping status changed email');
                            return [2 /*return*/, { success: true, skipped: true }];
                        }
                        statusEmoji = {
                            'active': '✅',
                            'unused': '⏸️',
                            'to-cancel': '❌',
                            'deleted': '🗑️',
                        };
                        content = "\n        <p>Hi there,</p>\n        <p>The status of your <strong>".concat(data.subscriptionName, "</strong> subscription has changed.</p>\n        <div style=\"background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;\">\n          <p style=\"margin: 0;\">\n            <strong>Subscription:</strong> ").concat(data.subscriptionName, "<br/>\n            <strong>Previous Status:</strong> ").concat(statusEmoji[data.oldStatus] || '', " ").concat(data.oldStatus, "<br/>\n            <strong>New Status:</strong> ").concat(statusEmoji[data.newStatus] || '', " ").concat(data.newStatus, "\n          </p>\n        </div>\n        <p>If you didn't make this change, please log in to your dashboard to review your subscriptions.</p>\n      ");
                        return [4 /*yield*/, emailServiceInstance.send({
                                to: userEmail,
                                subject: "Subscription status changed: ".concat(data.subscriptionName),
                                html: emailTemplate('Status Updated', content),
                                from: 'Subveris <onboarding@subveris.com>',
                            }, userId)];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result];
                    case 3:
                        error_8 = _a.sent();
                        console.error('[Email] Error sending status changed email:', error_8);
                        return [2 /*return*/, { success: false, error: error_8 }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    },
    // 2FA enabled notification
    send2FAEnabledEmail: function (userEmail, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var hasEmailPreference, content, result, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, (0, notification_preferences_js_1.checkNotificationPreference)(userId, 'email')];
                    case 1:
                        hasEmailPreference = _a.sent();
                        if (!hasEmailPreference) {
                            console.log('[Email] Email notifications disabled for user, skipping 2FA enabled email');
                            return [2 /*return*/, { success: true, skipped: true }];
                        }
                        content = "\n        <p>Hi there,</p>\n        <p>Two-factor authentication (2FA) has been successfully enabled on your Subveris account.</p>\n        <div style=\"background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;\">\n          <p style=\"margin: 0;\">\n            <strong>Security Status:</strong> Enhanced \u2705<br/>\n            <strong>2FA Method:</strong> Authenticator App<br/>\n            <strong>Protected:</strong> Account Login\n          </p>\n        </div>\n        <p>Your account is now more secure. When you log in, you'll be asked for a code from your authenticator app in addition to your password.</p>\n        <p><strong>Important:</strong> Keep your recovery codes in a safe place. You can find them in your account settings.</p>\n      ";
                        return [4 /*yield*/, emailServiceInstance.send({
                                to: userEmail,
                                subject: 'Two-Factor Authentication Enabled',
                                html: emailTemplate('Security Enhanced', content),
                                from: 'Subveris <onboarding@subveris.com>',
                            }, userId)];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result];
                    case 3:
                        error_9 = _a.sent();
                        console.error('[Email] Error sending 2FA enabled email:', error_9);
                        return [2 /*return*/, { success: false, error: error_9 }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    },
    // Premium upgrade notification
    sendPremiumUpgradeEmail: function (userEmail, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var hasEmailPreference, content, result, error_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, (0, notification_preferences_js_1.checkNotificationPreference)(userId, 'email')];
                    case 1:
                        hasEmailPreference = _a.sent();
                        if (!hasEmailPreference) {
                            console.log('[Email] Email notifications disabled for user, skipping premium upgrade email');
                            return [2 /*return*/, { success: true, skipped: true }];
                        }
                        content = "\n        <p>Hi there,</p>\n        <p>\uD83C\uDF89 Welcome to Subveris Premium! Your upgrade was successful.</p>\n        <div style=\"background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;\">\n          <p style=\"margin: 0;\">\n            <strong>Plan:</strong> Premium<br/>\n            <strong>Status:</strong> Active \u2705<br/>\n            <strong>Renewal:</strong> Auto-renewal enabled\n          </p>\n        </div>\n        <p>You now have access to premium features:</p>\n        <ul>\n          <li>\u23F0 Schedule automatic cancellations</li>\n          <li>\uD83E\uDD16 Advanced AI recommendations</li>\n          <li>\uD83D\uDCE7 Unlimited email notifications</li>\n          <li>\uD83D\uDCCA Detailed analytics reports</li>\n          <li>\uD83D\uDD12 Priority support</li>\n        </ul>\n        <p>Start using your premium features in your dashboard!</p>\n      ";
                        return [4 /*yield*/, emailServiceInstance.send({
                                to: userEmail,
                                subject: 'Welcome to Subveris Premium! 🎉',
                                html: emailTemplate('Premium Plan Activated', content),
                                from: 'Subveris <onboarding@subveris.com>',
                            }, userId)];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result];
                    case 3:
                        error_10 = _a.sent();
                        console.error('[Email] Error sending premium upgrade email:', error_10);
                        return [2 /*return*/, { success: false, error: error_10 }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    },
    // AI Recommendation notification
    sendRecommendationEmail: function (userEmail, userId, data) {
        return __awaiter(this, void 0, void 0, function () {
            var hasEmailPreference, content, result, error_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, (0, notification_preferences_js_1.checkNotificationPreference)(userId, 'email')];
                    case 1:
                        hasEmailPreference = _a.sent();
                        if (!hasEmailPreference) {
                            console.log('[Email] Email notifications disabled for user, skipping recommendation email');
                            return [2 /*return*/, { success: true, skipped: true }];
                        }
                        content = "\n        <p>Hi there,</p>\n        <p>We have a recommendation that could help you save money! \uD83D\uDCB0</p>\n        <div style=\"background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;\">\n          <p style=\"margin: 0;\">\n            <strong>Recommendation:</strong> ".concat(data.recommendationType, "<br/>\n            <strong>Subscription:</strong> ").concat(data.subscriptionName, "<br/>\n            ").concat(data.savings ? "<strong>Potential Savings:</strong> ".concat(data.currency, " ").concat(data.savings, "/month<br/>") : '', "\n            <strong>Status:</strong> Review in dashboard\n          </p>\n        </div>\n        <p>Log in to your Subveris dashboard to review this recommendation and take action.</p>\n      ");
                        return [4 /*yield*/, emailServiceInstance.send({
                                to: userEmail,
                                subject: "\uD83D\uDCA1 Money-saving recommendation: ".concat(data.subscriptionName),
                                html: emailTemplate('New Recommendation', content),
                                from: 'Subveris <recommendations@subveris.com>',
                            }, userId)];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result];
                    case 3:
                        error_11 = _a.sent();
                        console.error('[Email] Error sending recommendation email:', error_11);
                        return [2 /*return*/, { success: false, error: error_11 }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    },
    // Cancellation reminder (existing)
    sendCancellationScheduledReminder: function (userEmail, userId, data) {
        return __awaiter(this, void 0, void 0, function () {
            var hasEmailPreference, cancellationDate, content, result, error_12;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, (0, notification_preferences_js_1.checkNotificationPreference)(userId, 'email')];
                    case 1:
                        hasEmailPreference = _a.sent();
                        if (!hasEmailPreference) {
                            console.log('[Email] Email notifications disabled for user, skipping cancellation scheduled reminder');
                            return [2 /*return*/, { success: true, skipped: true }];
                        }
                        cancellationDate = new Date(data.cancellationDate).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                        });
                        content = "\n        <p>Hi there,</p>\n        <p>This is a friendly reminder that your <strong>".concat(data.subscriptionName, "</strong> subscription cancellation reminder is set for <strong>").concat(cancellationDate, "</strong>.</p>\n        \n        <div style=\"background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;\">\n          <p style=\"margin: 0;\">\n            <strong>Subscription:</strong> ").concat(data.subscriptionName, "<br/>\n            <strong>Monthly Cost:</strong> ").concat(data.currency, " ").concat(data.amount, "<br/>\n            <strong>Reminder Date:</strong> ").concat(cancellationDate, "\n          </p>\n        </div>\n\n        <p>If you'd like to cancel this reminder or keep the subscription active, please log in to your Subveris dashboard.</p>\n      ");
                        return [4 /*yield*/, emailServiceInstance.send({
                                to: userEmail,
                                subject: "Reminder scheduled for ".concat(data.subscriptionName, " on ").concat(cancellationDate),
                                html: emailTemplate('Cancellation Reminder Scheduled', content),
                                from: 'Subveris <onboarding@subveris.com>',
                            }, userId)];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result];
                    case 3:
                        error_12 = _a.sent();
                        console.error('[Email] Error sending cancellation scheduled reminder:', error_12);
                        return [2 /*return*/, { success: false, error: error_12 }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    },
    // Cancellation confirmation (existing)
    sendCancellationConfirmation: function (userEmail, userId, data) {
        return __awaiter(this, void 0, void 0, function () {
            var hasEmailPreference, userCurrency, formattedAmount, formattedAnnual, content, result, error_13;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, (0, notification_preferences_js_1.checkNotificationPreference)(userId, 'email')];
                    case 1:
                        hasEmailPreference = _a.sent();
                        if (!hasEmailPreference) {
                            console.log('[Email] Email notifications disabled for user, skipping cancellation confirmation');
                            return [2 /*return*/, { success: true, skipped: true }];
                        }
                        return [4 /*yield*/, getUserCurrency(userId)];
                    case 2:
                        userCurrency = _a.sent();
                        formattedAmount = formatAmountForEmail(data.amount, data.currency, userCurrency);
                        formattedAnnual = formatAmountForEmail(data.amount * 12, data.currency, userCurrency);
                        content = "\n        <p>Hi there,</p>\n        <p>Your <strong>".concat(data.subscriptionName, "</strong> subscription has been successfully cancelled.</p>\n        \n        <div style=\"background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;\">\n          <p style=\"margin: 0;\">\n            <strong>Subscription:</strong> ").concat(data.subscriptionName, "<br/>\n            <strong>Monthly Savings:</strong> ").concat(formattedAmount, "<br/>\n            <strong>Annual Savings:</strong> ").concat(formattedAnnual, "\n          </p>\n        </div>\n\n        <p>Great job optimizing your subscriptions! You're now saving <strong>").concat(formattedAmount, " per month</strong>.</p>\n      ");
                        return [4 /*yield*/, emailServiceInstance.send({
                                to: userEmail,
                                subject: "".concat(data.subscriptionName, " has been cancelled"),
                                html: emailTemplate('Subscription Cancelled', content),
                                from: 'Subveris <onboarding@subveris.com>',
                            }, userId)];
                    case 3:
                        result = _a.sent();
                        return [2 /*return*/, result];
                    case 4:
                        error_13 = _a.sent();
                        console.error('[Email] Error sending cancellation confirmation:', error_13);
                        return [2 /*return*/, { success: false, error: error_13 }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    },
    // Smart cancellation reminder email
    sendCancellationReminder: function (userEmail, userId, data) {
        return __awaiter(this, void 0, void 0, function () {
            var userCurrency, formattedAmount, formattedAnnual, actionButton, content, hasEmailPreference, result, hasPushPreference, error_14;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 8, , 9]);
                        return [4 /*yield*/, getUserCurrency(userId)];
                    case 1:
                        userCurrency = _a.sent();
                        formattedAmount = formatAmountForEmail(data.amount, data.currency, userCurrency);
                        formattedAnnual = formatAmountForEmail(data.amount * 12, data.currency, userCurrency);
                        actionButton = '';
                        if (data.cancellationUrl) {
                            actionButton = "\n          <div style=\"margin: 30px 0; text-align: center;\">\n            <a href=\"".concat(data.cancellationUrl, "\" style=\"display: inline-block; background-color: #ef4444; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;\">\n              Cancel ").concat(data.subscriptionName, "\n            </a>\n            <p style=\"margin-top: 12px; font-size: 12px; color: #666;\">\n              Click the button above to go directly to the cancellation page\n            </p>\n          </div>\n        ");
                        }
                        content = "\n        <p>Hi there,</p>\n        <p>Today is the day you scheduled to cancel <strong>".concat(data.subscriptionName, "</strong>!</p>\n        <div style=\"background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;\">\n          <p style=\"margin: 0;\">\n            <strong>Subscription:</strong> ").concat(data.subscriptionName, "<br/>\n            <strong>Monthly Cost:</strong> ").concat(formattedAmount, "<br/>\n            <strong>Annual Cost:</strong> ").concat(formattedAnnual, "<br/>\n            <strong>Potential Annual Savings:</strong> ").concat(formattedAnnual, "\n          </p>\n        </div>\n\n        <h3 style=\"color: #333; margin-top: 25px;\">Next Steps:</h3>\n        <ol style=\"line-height: 1.8; color: #555;\">\n          <li><strong>Review your decision</strong> - Make sure you still want to cancel</li>\n          <li><strong>Cancel the subscription</strong> - Use the button below or visit the provider's website</li>\n          <li><strong>Confirm cancellation</strong> - Save any data you might need before it's deleted</li>\n        </ol>\n\n        ").concat(actionButton, "\n\n        <p style=\"margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;\">\n          <strong>Didn't mean to cancel?</strong> You can always log back into ").concat(data.subscriptionName, " to reactivate your subscription.\n        </p>\n      ");
                        return [4 /*yield*/, (0, notification_preferences_js_1.checkNotificationPreference)(userId, 'email')];
                    case 2:
                        hasEmailPreference = _a.sent();
                        if (!hasEmailPreference) return [3 /*break*/, 4];
                        return [4 /*yield*/, emailServiceInstance.send({
                                to: userEmail,
                                subject: "Time to cancel ".concat(data.subscriptionName, "? Save ").concat(formattedAnnual, "/year"),
                                html: emailTemplate('Cancellation Reminder', content),
                                from: 'Subveris <onboarding@subveris.com>',
                            }, userId)];
                    case 3:
                        result = _a.sent();
                        if (!result.success) {
                            console.error('[Email] Failed to send cancellation reminder:', result.error);
                        }
                        else {
                            console.log('[Email] Cancellation reminder sent to', userEmail);
                        }
                        _a.label = 4;
                    case 4: return [4 /*yield*/, (0, notification_preferences_js_1.checkNotificationPreference)(userId, 'push')];
                    case 5:
                        hasPushPreference = _a.sent();
                        if (!hasPushPreference) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.sendCancellationReminderPush(userId, {
                                subscriptionName: data.subscriptionName,
                                amount: data.amount,
                                currency: data.currency,
                                cancellationUrl: data.cancellationUrl,
                            })];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7: return [2 /*return*/, { success: true }];
                    case 8:
                        error_14 = _a.sent();
                        console.error('[Email] Error sending cancellation reminder:', error_14);
                        return [2 /*return*/, { success: false, error: error_14 }];
                    case 9: return [2 /*return*/];
                }
            });
        });
    },
    // Helper: Send push notification for cancellation reminder
    sendCancellationReminderPush: function (userId, data) {
        return __awaiter(this, void 0, void 0, function () {
            var supabase, _a, subscriptions, error, vapidPrivateKey, vapidPublicKey, payload, results, error_15;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
                        return [4 /*yield*/, supabase
                                .from('push_subscriptions')
                                .select('endpoint, auth_key, p256dh_key')
                                .eq('user_id', userId)];
                    case 1:
                        _a = _b.sent(), subscriptions = _a.data, error = _a.error;
                        if (error || !subscriptions || subscriptions.length === 0) {
                            console.log('[Push] No push subscriptions found for user', userId);
                            return [2 /*return*/];
                        }
                        vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
                        vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
                        if (!vapidPrivateKey || !vapidPublicKey) {
                            console.warn('[Push] VAPID keys not configured');
                            return [2 /*return*/];
                        }
                        payload = {
                            title: 'Cancellation Reminder',
                            body: "Time to cancel ".concat(data.subscriptionName, "! Save ").concat(data.currency).concat((data.amount * 12).toFixed(2), "/year"),
                            tag: "cancellation-".concat(data.subscriptionName),
                            data: {
                                url: data.cancellationUrl || '/dashboard',
                                subscriptionName: data.subscriptionName,
                                amount: data.amount,
                                currency: data.currency,
                            },
                        };
                        return [4 /*yield*/, (0, push_notifications_js_1.sendBatchPushNotifications)(subscriptions.map(function (s) { return ({
                                endpoint: s.endpoint,
                                authKey: s.auth_key,
                                p256dhKey: s.p256dh_key,
                            }); }), payload, vapidPrivateKey, vapidPublicKey, 'help.subveris@gmail.com')];
                    case 2:
                        results = _b.sent();
                        console.log('[Push] Cancellation reminder sent:', results);
                        return [3 /*break*/, 4];
                    case 3:
                        error_15 = _b.sent();
                        console.error('[Push] Error sending cancellation reminder:', error_15);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    },
    // Weekly digest email
    sendWeeklyDigest: function (userId, userEmail, data) {
        return __awaiter(this, void 0, void 0, function () {
            var hasDigestPreference, userCurrency_1, formattedMonthly, formattedAnnual, topSubscriptionsHtml, content, result, error_16;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, (0, notification_preferences_js_1.checkNotificationPreference)(userId, 'digest')];
                    case 1:
                        hasDigestPreference = _a.sent();
                        if (!hasDigestPreference) {
                            console.log('[Email] Weekly digest disabled for user, skipping');
                            return [2 /*return*/, { success: true, skipped: true }];
                        }
                        return [4 /*yield*/, getUserCurrency(userId)];
                    case 2:
                        userCurrency_1 = _a.sent();
                        formattedMonthly = formatAmountForEmail(data.monthlySpending, data.currency, userCurrency_1);
                        formattedAnnual = formatAmountForEmail(data.monthlySpending * 12, data.currency, userCurrency_1);
                        topSubscriptionsHtml = data.topSubscriptions
                            .map(function (sub) {
                            return "<tr style=\"border-bottom: 1px solid #e0e0e0;\">\n              <td style=\"padding: 12px; text-align: left;\">".concat(sub.name, "</td>\n              <td style=\"padding: 12px; text-align: right;\"><strong>").concat(formatAmountForEmail(sub.amount, data.currency, userCurrency_1), "/month</strong></td>\n            </tr>");
                        })
                            .join('');
                        content = "\n        <p>Hi there,</p>\n        <p>Here's your weekly subscription summary for the week of ".concat(new Date().toLocaleDateString(), ":</p>\n\n        <div style=\"background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;\">\n          <table style=\"width: 100%; border-collapse: collapse;\">\n            <tr>\n              <td style=\"padding: 12px;\">\n                <p style=\"margin: 0; color: #666; font-size: 12px;\">Total Subscriptions</p>\n                <p style=\"margin: 8px 0 0 0; font-size: 24px; font-weight: bold; color: #007bff;\">").concat(data.totalSubscriptions, "</p>\n              </td>\n              <td style=\"padding: 12px;\">\n                <p style=\"margin: 0; color: #666; font-size: 12px;\">Monthly Spending</p>\n                <p style=\"margin: 8px 0 0 0; font-size: 24px; font-weight: bold; color: #007bff;\">").concat(formattedMonthly, "</p>\n              </td>\n              <td style=\"padding: 12px;\">\n                <p style=\"margin: 0; color: #666; font-size: 12px;\">Annual Cost</p>\n                <p style=\"margin: 8px 0 0 0; font-size: 24px; font-weight: bold; color: #28a745;\">").concat(formattedAnnual, "</p>\n              </td>\n            </tr>\n          </table>\n        </div>\n\n        <h3 style=\"color: #333; margin: 25px 0 15px 0;\">Your Top Subscriptions</h3>\n        <table style=\"width: 100%; border-collapse: collapse; background-color: #f8f9fa;\">\n          <thead>\n            <tr style=\"background-color: #e9ecef; border-bottom: 2px solid #dee2e6;\">\n              <th style=\"padding: 12px; text-align: left; font-weight: bold;\">Subscription</th>\n              <th style=\"padding: 12px; text-align: right; font-weight: bold;\">Cost</th>\n            </tr>\n          </thead>\n          <tbody>\n            ").concat(topSubscriptionsHtml, "\n          </tbody>\n        </table>\n\n        <p style=\"margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;\">\n          <strong>\uD83D\uDCA1 Tip:</strong> Review your subscriptions regularly to identify ones you're no longer using. \n          Log in to Subveris to see AI-powered recommendations for potential savings!\n        </p>\n      ");
                        // Check if we can send to this email address (Resend testing restriction)
                        if (!canSendEmail(userEmail)) {
                            console.log('[Email] Skipping weekly digest due to Resend testing restriction');
                            return [2 /*return*/, { success: true, skipped: true, reason: 'resend_restriction' }];
                        }
                        return [4 /*yield*/, emailServiceInstance.send({
                                to: userEmail,
                                subject: "Your Weekly Subscription Summary - ".concat(formattedMonthly, "/month"),
                                html: emailTemplate('Weekly Digest', content),
                                from: 'Subveris <onboarding@subveris.com>',
                            }, userId)];
                    case 3:
                        result = _a.sent();
                        return [2 /*return*/, result];
                    case 4:
                        error_16 = _a.sent();
                        console.error('[Email] Error sending weekly digest:', error_16);
                        return [2 /*return*/, { success: false, error: error_16 }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    },
    // Contact form submission email
    sendContactEmail: function (contactData) {
        return __awaiter(this, void 0, void 0, function () {
            var content, sendGridProvider, result_1, result, error_17;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        content = "\n        <p><strong>New contact form submission from Subveris website</strong></p>\n        <div style=\"background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;\">\n          <p style=\"margin: 0;\">\n            <strong>From:</strong> ".concat(contactData.name, " (").concat(contactData.email, ")<br/>\n            <strong>Subject:</strong> ").concat(contactData.subject, "<br/>\n            <strong>Received:</strong> ").concat(new Date().toLocaleString(), "\n          </p>\n        </div>\n        <h3 style=\"color: #333; margin: 25px 0 15px 0;\">Message:</h3>\n        <div style=\"background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff;\">\n          <p style=\"margin: 0; white-space: pre-wrap;\">").concat(contactData.message, "</p>\n        </div>\n        <p style=\"margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;\">\n          <strong>Reply to:</strong> ").concat(contactData.email, "<br/>\n          <strong>Dashboard:</strong> <a href=\"https://app.subveris.com\" style=\"color: #007bff;\">https://app.subveris.com</a>\n        </p>\n      ");
                        sendGridProvider = emailServiceInstance.getSendGridProvider();
                        if (!(sendGridProvider && sendGridProvider.canSendTo('help.subveris@gmail.com'))) return [3 /*break*/, 2];
                        console.log('[Email] Using SendGrid for contact email to avoid Resend test mode');
                        return [4 /*yield*/, sendGridProvider.send({
                                to: 'help.subveris@gmail.com',
                                replyTo: contactData.email,
                                subject: "Contact Form: ".concat(contactData.subject),
                                html: emailTemplate('New Contact Form Submission', content),
                                from: 'Subveris <onboarding@subveris.com>',
                            })];
                    case 1:
                        result_1 = _a.sent();
                        if (result_1.success) {
                            console.log('[Email] Contact email sent successfully via SendGrid');
                            return [2 /*return*/, result_1];
                        }
                        else {
                            console.warn('[Email] SendGrid failed for contact email:', result_1.error);
                        }
                        _a.label = 2;
                    case 2: return [4 /*yield*/, emailServiceInstance.send({
                            to: 'help.subveris@gmail.com',
                            replyTo: contactData.email,
                            subject: "Contact Form: ".concat(contactData.subject),
                            html: emailTemplate('New Contact Form Submission', content),
                            from: 'Subveris <onboarding@subveris.com>',
                        })];
                    case 3:
                        result = _a.sent();
                        return [2 /*return*/, result];
                    case 4:
                        error_17 = _a.sent();
                        console.error('[Email] Error sending contact email:', error_17);
                        return [2 /*return*/, { success: false, error: error_17 }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    },
    // Unified send method for direct email sending
    send: function (options, userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, emailServiceInstance.send(options, userId)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
};
