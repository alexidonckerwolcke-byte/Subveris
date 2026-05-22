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
var _a;
var _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeService = exports.PRICE_ID_TO_PLAN_TYPE = exports.stripe = exports.STRIPE_API_VERSION = exports.DEFAULT_STRIPE_API_VERSION = void 0;
exports.createStripeClient = createStripeClient;
exports.getPriceIdFromSubscription = getPriceIdFromSubscription;
exports.getPlanTypeFromSubscription = getPlanTypeFromSubscription;
exports.doesSubscriptionIncludePriceId = doesSubscriptionIncludePriceId;
var stripe_1 = require("stripe");
var supabase_js_1 = require("@supabase/supabase-js");
var config_js_1 = require("./config.cjs");
exports.DEFAULT_STRIPE_API_VERSION = '2026-03-25.dahlia';
var configuredStripeApiVersion = (_b = process.env.STRIPE_API_VERSION) === null || _b === void 0 ? void 0 : _b.trim();
exports.STRIPE_API_VERSION = configuredStripeApiVersion || exports.DEFAULT_STRIPE_API_VERSION;
function createStripeClient(apiKey) {
    try {
        return new stripe_1.default(apiKey, {
            apiVersion: exports.STRIPE_API_VERSION,
        });
    }
    catch (error) {
        console.warn("[Stripe] Failed to initialize Stripe with apiVersion=".concat(exports.STRIPE_API_VERSION, ". Falling back to ").concat(exports.DEFAULT_STRIPE_API_VERSION), error);
        if (exports.STRIPE_API_VERSION !== exports.DEFAULT_STRIPE_API_VERSION) {
            return new stripe_1.default(apiKey, {
                apiVersion: exports.DEFAULT_STRIPE_API_VERSION,
            });
        }
        throw error;
    }
}
exports.stripe = createStripeClient((0, config_js_1.getRequiredEnv)('STRIPE_SECRET_KEY'));
var supabase = (0, supabase_js_1.createClient)((0, config_js_1.getRequiredEnv)('SUPABASE_URL'), (0, config_js_1.getRequiredEnv)('SUPABASE_SERVICE_ROLE_KEY'));
// Map Stripe price IDs to plan types
// These should match your actual Stripe price IDs from your dashboard
var premiumPriceId = (0, config_js_1.getStripePriceId)(['STRIPE_PREMIUM_PRICE_ID', 'VITE_STRIPE_PREMIUM_PRICE_ID'], 'price_1TM9r1JSf7SJ8WWRiocez8wo', 'STRIPE_PREMIUM_PRICE_ID');
var familyPriceId = (0, config_js_1.getStripePriceId)(['STRIPE_FAMILY_PRICE_ID', 'VITE_STRIPE_FAMILY_PRICE_ID'], 'price_1TM9sSJSf7SJ8WWR4H26rSZ9', 'STRIPE_FAMILY_PRICE_ID');
exports.PRICE_ID_TO_PLAN_TYPE = (_a = {},
    _a[premiumPriceId] = 'premium',
    _a[familyPriceId] = 'family',
    _a);
// Helper to determine plan type from price or subscription
function getPriceIdFromSubscription(subscription) {
    var _a, _b, _c;
    if (!((_b = (_a = subscription === null || subscription === void 0 ? void 0 : subscription.items) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.length)) {
        return undefined;
    }
    var items = subscription.items.data;
    var recurringItems = items.filter(function (item) {
        var _a;
        return ((_a = item === null || item === void 0 ? void 0 : item.price) === null || _a === void 0 ? void 0 : _a.type) === 'recurring' &&
            (item === null || item === void 0 ? void 0 : item.quantity) > 0 &&
            (item === null || item === void 0 ? void 0 : item.deleted) !== true;
    });
    var item = recurringItems[0] ||
        items.find(function (item) { var _a; return ((_a = item === null || item === void 0 ? void 0 : item.price) === null || _a === void 0 ? void 0 : _a.type) === 'recurring'; }) ||
        items[0];
    return (_c = item === null || item === void 0 ? void 0 : item.price) === null || _c === void 0 ? void 0 : _c.id;
}
function getPlanTypeFromSubscription(subscription) {
    var _a, _b, _c;
    try {
        var priceId = getPriceIdFromSubscription(subscription);
        if (priceId && exports.PRICE_ID_TO_PLAN_TYPE[priceId]) {
            return exports.PRICE_ID_TO_PLAN_TYPE[priceId];
        }
        var item = (_b = (_a = subscription.items) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b[0];
        var price = item === null || item === void 0 ? void 0 : item.price;
        if ((_c = price === null || price === void 0 ? void 0 : price.metadata) === null || _c === void 0 ? void 0 : _c.plan_type) {
            return price.metadata.plan_type;
        }
    }
    catch (e) {
        console.error('[Stripe] Error inferring plan type from subscription:', e);
    }
    return 'premium';
}
function doesSubscriptionIncludePriceId(subscription, priceId) {
    var _a, _b;
    if (!((_b = (_a = subscription === null || subscription === void 0 ? void 0 : subscription.items) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.length)) {
        return false;
    }
    return subscription.items.data.some(function (item) {
        var _a, _b;
        return ((_a = item === null || item === void 0 ? void 0 : item.price) === null || _a === void 0 ? void 0 : _a.id) === priceId &&
            ((_b = item === null || item === void 0 ? void 0 : item.price) === null || _b === void 0 ? void 0 : _b.type) === 'recurring' &&
            (item === null || item === void 0 ? void 0 : item.quantity) > 0 &&
            (item === null || item === void 0 ? void 0 : item.deleted) !== true;
    });
}
var StripeService = /** @class */ (function () {
    function StripeService() {
    }
    StripeService.createCustomer = function (userId, email, name) {
        return __awaiter(this, void 0, void 0, function () {
            var existingSub, customerId, err_1, msg, isMissing, customer, existingRows, planType, error_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 12, , 13]);
                        return [4 /*yield*/, supabase
                                .from('user_subscriptions')
                                .select('stripe_customer_id')
                                .eq('user_id', userId)
                                .single()];
                    case 1:
                        existingSub = (_b.sent()).data;
                        customerId = existingSub === null || existingSub === void 0 ? void 0 : existingSub.stripe_customer_id;
                        if (!customerId) return [3 /*break*/, 5];
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        // Verify the stored Stripe customer still exists
                        return [4 /*yield*/, exports.stripe.customers.retrieve(customerId)];
                    case 3:
                        // Verify the stored Stripe customer still exists
                        _b.sent();
                        return [2 /*return*/, customerId];
                    case 4:
                        err_1 = _b.sent();
                        msg = (err_1 === null || err_1 === void 0 ? void 0 : err_1.message) || String(err_1);
                        isMissing = msg.includes('No such customer') || (err_1 === null || err_1 === void 0 ? void 0 : err_1.statusCode) === 404;
                        if (!isMissing) {
                            console.error('[StripeService] Error verifying existing customer:', err_1);
                            throw err_1;
                        }
                        console.warn('[StripeService] Stored Stripe customer not found, creating a new one:', customerId);
                        customerId = undefined;
                        return [3 /*break*/, 5];
                    case 5: return [4 /*yield*/, exports.stripe.customers.create({
                            email: email,
                            name: name,
                            metadata: {
                                user_id: userId,
                            },
                        })];
                    case 6:
                        customer = _b.sent();
                        return [4 /*yield*/, supabase
                                .from('user_subscriptions')
                                .select('id, plan_type')
                                .eq('user_id', userId)];
                    case 7:
                        existingRows = (_b.sent()).data;
                        planType = ((_a = existingRows === null || existingRows === void 0 ? void 0 : existingRows[0]) === null || _a === void 0 ? void 0 : _a.plan_type) || 'free';
                        if (!(existingRows === null || existingRows === void 0 ? void 0 : existingRows.length)) return [3 /*break*/, 9];
                        return [4 /*yield*/, supabase
                                .from('user_subscriptions')
                                .update({
                                stripe_customer_id: customer.id,
                                status: 'inactive',
                                plan_type: planType,
                                updated_at: new Date().toISOString(),
                            })
                                .eq('user_id', userId)];
                    case 8:
                        _b.sent();
                        return [3 /*break*/, 11];
                    case 9: return [4 /*yield*/, supabase.from('user_subscriptions').insert({
                            user_id: userId,
                            stripe_customer_id: customer.id,
                            status: 'inactive',
                            plan_type: planType,
                            updated_at: new Date().toISOString(),
                        })];
                    case 10:
                        _b.sent();
                        _b.label = 11;
                    case 11: return [2 /*return*/, customer.id];
                    case 12:
                        error_1 = _b.sent();
                        console.error('Error creating Stripe customer:', error_1);
                        throw error_1;
                    case 13: return [2 /*return*/];
                }
            });
        });
    };
    StripeService.createSubscriptionCheckoutSession = function (userId, priceId, successUrl, cancelUrl) {
        return __awaiter(this, void 0, void 0, function () {
            var userData, customerId, existingSubscriptionRow, existingStripeSubscriptionId, currentSubscription, recurringPriceIds, hasRequestedPrice, isOnlyRequestedPrice, currentPriceId, isActive, updateErr_1, successUrlWithCheckout, cancelUrlWithCheckout, successUrlWithSessionId, session, error_2;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 9, , 10]);
                        console.log('[StripeService] Creating checkout session...');
                        console.log('[StripeService] User ID:', userId);
                        console.log('[StripeService] Price ID:', priceId);
                        // Check if Stripe is configured
                        if (!process.env.STRIPE_SECRET_KEY) {
                            throw new Error('STRIPE_SECRET_KEY is not configured');
                        }
                        console.log('[StripeService] Stripe API configured: ✓');
                        // Get or create customer
                        console.log('[StripeService] Fetching user from Supabase...');
                        return [4 /*yield*/, supabase.auth.admin.getUserById(userId)];
                    case 1:
                        userData = (_e.sent()).data;
                        if (!userData.user) {
                            throw new Error('User not found in Supabase');
                        }
                        console.log('[StripeService] User found:', userData.user.email);
                        console.log('[StripeService] Creating/Finding Stripe customer...');
                        return [4 /*yield*/, this.createCustomer(userId, userData.user.email, (_a = userData.user.user_metadata) === null || _a === void 0 ? void 0 : _a.name)];
                    case 2:
                        customerId = _e.sent();
                        console.log('[StripeService] Customer ID:', customerId);
                        console.log('[StripeService] Looking for existing Stripe subscription for user...');
                        return [4 /*yield*/, supabase
                                .from('user_subscriptions')
                                .select('stripe_subscription_id, stripe_price_id, status, cancel_at_period_end')
                                .eq('user_id', userId)
                                .single()];
                    case 3:
                        existingSubscriptionRow = (_e.sent()).data;
                        existingStripeSubscriptionId = existingSubscriptionRow === null || existingSubscriptionRow === void 0 ? void 0 : existingSubscriptionRow.stripe_subscription_id;
                        if (!existingStripeSubscriptionId) return [3 /*break*/, 7];
                        _e.label = 4;
                    case 4:
                        _e.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, exports.stripe.subscriptions.retrieve(existingStripeSubscriptionId, {
                                expand: ['items.data.price'],
                            })];
                    case 5:
                        currentSubscription = _e.sent();
                        recurringPriceIds = (_d = (_c = (_b = currentSubscription.items) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.filter(function (item) {
                            var _a;
                            return ((_a = item === null || item === void 0 ? void 0 : item.price) === null || _a === void 0 ? void 0 : _a.type) === 'recurring' &&
                                (item === null || item === void 0 ? void 0 : item.quantity) > 0 &&
                                (item === null || item === void 0 ? void 0 : item.deleted) !== true;
                        }).map(function (item) { return item.price.id; })) !== null && _d !== void 0 ? _d : [];
                        hasRequestedPrice = recurringPriceIds.includes(priceId);
                        isOnlyRequestedPrice = hasRequestedPrice && new Set(recurringPriceIds).size === 1;
                        currentPriceId = getPriceIdFromSubscription(currentSubscription);
                        isActive = ['active', 'trialing'].includes(currentSubscription.status);
                        if (isActive && isOnlyRequestedPrice) {
                            console.log('[StripeService] User already on requested plan. No checkout needed.');
                            return [2 /*return*/, { success: true, message: 'Already on requested plan' }];
                        }
                        if (isActive && hasRequestedPrice && recurringPriceIds.length > 1) {
                            console.log('[StripeService] Subscription contains requested price plus other active recurring prices. Redirecting to checkout to preserve standard upgrade flow.', recurringPriceIds);
                        }
                        else if (isActive && currentPriceId && currentPriceId !== priceId) {
                            console.log('[StripeService] Active Stripe subscription found with a different price. Redirecting to checkout to preserve standard upgrade flow.');
                        }
                        return [3 /*break*/, 7];
                    case 6:
                        updateErr_1 = _e.sent();
                        console.error('[StripeService] Failed to inspect existing subscription, falling back to checkout:', updateErr_1);
                        return [3 /*break*/, 7];
                    case 7:
                        // Create checkout session
                        console.log('[StripeService] Creating Stripe checkout session...');
                        successUrlWithCheckout = successUrl.includes('checkout=success')
                            ? successUrl
                            : "".concat(successUrl).concat(successUrl.includes('?') ? '&' : '?', "checkout=success");
                        cancelUrlWithCheckout = cancelUrl.includes('checkout=cancel')
                            ? cancelUrl
                            : "".concat(cancelUrl).concat(cancelUrl.includes('?') ? '&' : '?', "checkout=cancel");
                        successUrlWithSessionId = "".concat(successUrlWithCheckout).concat(successUrlWithCheckout.includes('?') ? '&' : '?', "session_id={CHECKOUT_SESSION_ID}");
                        return [4 /*yield*/, exports.stripe.checkout.sessions.create({
                                customer: customerId,
                                payment_method_types: ['card'],
                                line_items: [
                                    {
                                        price: priceId,
                                        quantity: 1,
                                    },
                                ],
                                mode: 'subscription',
                                success_url: successUrlWithSessionId,
                                cancel_url: cancelUrlWithCheckout,
                                metadata: {
                                    user_id: userId,
                                },
                                subscription_data: {
                                    metadata: {
                                        user_id: userId,
                                    },
                                },
                            })];
                    case 8:
                        session = _e.sent();
                        console.log('[StripeService] Checkout session created successfully:', session.id);
                        console.log('[StripeService] Session URL:', session.url);
                        if (!session.url) {
                            console.error('[StripeService] Stripe checkout session created without a redirect URL:', session);
                            throw new Error('Stripe checkout session could not be created. No redirect URL was returned.');
                        }
                        return [2 /*return*/, session];
                    case 9:
                        error_2 = _e.sent();
                        console.error('[StripeService] Error creating checkout session:', error_2);
                        if (error_2 instanceof Error) {
                            console.error('[StripeService] Error message:', error_2.message);
                            console.error('[StripeService] Error stack:', error_2.stack);
                        }
                        throw error_2;
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    StripeService.cancelSubscription = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, subscription, queryError, stripeErr_1, missing, error_3;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 9, , 10]);
                        return [4 /*yield*/, supabase
                                .from('user_subscriptions')
                                .select('stripe_subscription_id')
                                .eq('user_id', userId)
                                .single()];
                    case 1:
                        _a = _c.sent(), subscription = _a.data, queryError = _a.error;
                        // If no subscription row exists, treat as already free
                        if (queryError && queryError.code === 'PGRST116') {
                            console.log('[Stripe] No subscription row found for user; already free');
                            return [2 /*return*/, { success: true, alreadyFree: true }];
                        }
                        if (!(subscription === null || subscription === void 0 ? void 0 : subscription.stripe_subscription_id)) {
                            console.log('[Stripe] User has no Stripe subscription_id; already free or already canceled');
                            return [2 /*return*/, { success: true, alreadyCanceled: true }];
                        }
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, 5, , 8]);
                        return [4 /*yield*/, exports.stripe.subscriptions.update(subscription.stripe_subscription_id, {
                                cancel_at_period_end: true,
                            })];
                    case 3:
                        _c.sent();
                        // Update database
                        return [4 /*yield*/, supabase
                                .from('user_subscriptions')
                                .update({
                                cancel_at_period_end: true,
                                updated_at: new Date().toISOString(),
                            })
                                .eq('user_id', userId)];
                    case 4:
                        // Update database
                        _c.sent();
                        console.log('[Stripe] Subscription marked cancel_at_period_end for user:', userId);
                        return [2 /*return*/, { success: true }];
                    case 5:
                        stripeErr_1 = _c.sent();
                        console.error('Error canceling subscription:', stripeErr_1);
                        missing = (stripeErr_1 === null || stripeErr_1 === void 0 ? void 0 : stripeErr_1.code) === 'resource_missing' || ((_b = stripeErr_1 === null || stripeErr_1 === void 0 ? void 0 : stripeErr_1.raw) === null || _b === void 0 ? void 0 : _b.code) === 'resource_missing';
                        if (!missing) return [3 /*break*/, 7];
                        console.warn('[Stripe] Subscription not found in Stripe; cleaning local record for user:', userId);
                        return [4 /*yield*/, supabase
                                .from('user_subscriptions')
                                .update({
                                status: 'canceled',
                                plan_type: 'free',
                                stripe_subscription_id: null,
                                updated_at: new Date().toISOString(),
                            })
                                .eq('user_id', userId)];
                    case 6:
                        _c.sent();
                        return [2 /*return*/, { success: true, cleaned: true }];
                    case 7: throw stripeErr_1;
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        error_3 = _c.sent();
                        console.error('Error canceling subscription:', error_3);
                        throw error_3;
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    StripeService.reactivateSubscription = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, subscription, queryError, error_4;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, supabase
                                .from('user_subscriptions')
                                .select('stripe_subscription_id')
                                .eq('user_id', userId)
                                .single()];
                    case 1:
                        _a = _b.sent(), subscription = _a.data, queryError = _a.error;
                        if (queryError && queryError.code === 'PGRST116') {
                            throw new Error('No subscription to reactivate');
                        }
                        if (!(subscription === null || subscription === void 0 ? void 0 : subscription.stripe_subscription_id)) {
                            throw new Error('No subscription to reactivate');
                        }
                        // Remove cancellation
                        return [4 /*yield*/, exports.stripe.subscriptions.update(subscription.stripe_subscription_id, {
                                cancel_at_period_end: false,
                            })];
                    case 2:
                        // Remove cancellation
                        _b.sent();
                        // Update database
                        return [4 /*yield*/, supabase
                                .from('user_subscriptions')
                                .update({
                                cancel_at_period_end: false,
                                updated_at: new Date().toISOString(),
                            })
                                .eq('user_id', userId)];
                    case 3:
                        // Update database
                        _b.sent();
                        return [2 /*return*/, { success: true }];
                    case 4:
                        error_4 = _b.sent();
                        console.error('Error reactivating subscription:', error_4);
                        throw error_4;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    StripeService.getSubscriptionStatus = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var subscription, isActive, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, supabase
                                .from('user_subscriptions')
                                .select('*')
                                .eq('user_id', userId)
                                .single()];
                    case 1:
                        subscription = (_a.sent()).data;
                        if (!subscription) {
                            return [2 /*return*/, { status: 'inactive', tier: 'free' }];
                        }
                        isActive = subscription.status === 'active' && !subscription.cancel_at_period_end;
                        return [2 /*return*/, {
                                status: subscription.status,
                                tier: isActive ? 'premium' : 'free',
                                currentPeriodEnd: subscription.current_period_end,
                                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                            }];
                    case 2:
                        error_5 = _a.sent();
                        console.error('Error getting subscription status:', error_5);
                        return [2 /*return*/, { status: 'inactive', tier: 'free' }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    StripeService.completeCheckoutSession = function (sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var session, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, exports.stripe.checkout.sessions.retrieve(sessionId)];
                    case 1:
                        session = _a.sent();
                        if (!session || !session.subscription) {
                            throw new Error('Checkout session did not complete a subscription');
                        }
                        return [4 /*yield*/, this.handleCheckoutCompleted(session)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, { success: true }];
                    case 3:
                        error_6 = _a.sent();
                        console.error('[StripeService] Error completing checkout session:', error_6);
                        throw error_6;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    StripeService.handleWebhook = function (rawBody, signature) {
        return __awaiter(this, void 0, void 0, function () {
            var bodyString, event_1, _a, error_7;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 13, , 14]);
                        bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString();
                        if (!process.env.STRIPE_WEBHOOK_SECRET) {
                            throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
                        }
                        event_1 = exports.stripe.webhooks.constructEvent(bodyString, signature, process.env.STRIPE_WEBHOOK_SECRET);
                        console.log("[Stripe] Processing webhook event: ".concat(event_1.type));
                        _a = event_1.type;
                        switch (_a) {
                            case 'checkout.session.completed': return [3 /*break*/, 1];
                            case 'invoice.payment_succeeded': return [3 /*break*/, 3];
                            case 'invoice.payment_failed': return [3 /*break*/, 5];
                            case 'customer.subscription.updated': return [3 /*break*/, 7];
                            case 'customer.subscription.deleted': return [3 /*break*/, 9];
                        }
                        return [3 /*break*/, 11];
                    case 1: return [4 /*yield*/, this.handleCheckoutCompleted(event_1.data.object)];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 12];
                    case 3: return [4 /*yield*/, this.handlePaymentSucceeded(event_1.data.object)];
                    case 4:
                        _b.sent();
                        return [3 /*break*/, 12];
                    case 5: return [4 /*yield*/, this.handlePaymentFailed(event_1.data.object)];
                    case 6:
                        _b.sent();
                        return [3 /*break*/, 12];
                    case 7: return [4 /*yield*/, this.handleSubscriptionUpdated(event_1.data.object)];
                    case 8:
                        _b.sent();
                        return [3 /*break*/, 12];
                    case 9: return [4 /*yield*/, this.handleSubscriptionDeleted(event_1.data.object)];
                    case 10:
                        _b.sent();
                        return [3 /*break*/, 12];
                    case 11:
                        console.log("[Stripe] Unhandled event type: ".concat(event_1.type));
                        _b.label = 12;
                    case 12:
                        console.log("[Stripe] Webhook processed successfully: ".concat(event_1.id));
                        return [2 /*return*/, { received: true }];
                    case 13:
                        error_7 = _b.sent();
                        console.error('[Stripe] Webhook error:', error_7);
                        throw error_7;
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    StripeService.handleCheckoutCompleted = function (session) {
        return __awaiter(this, void 0, void 0, function () {
            var customerId, userId, subscriptionId, existingCustomer, customer, err_2, subscription, priceId, planType, upsertPayload, _a, existingRows, lookupError, updateError, insertError;
            var _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        customerId = typeof session.customer === 'string' ? session.customer : (_b = session.customer) === null || _b === void 0 ? void 0 : _b.id;
                        userId = (_c = session.metadata) === null || _c === void 0 ? void 0 : _c.user_id;
                        subscriptionId = typeof session.subscription === 'string' ? session.subscription : (_d = session.subscription) === null || _d === void 0 ? void 0 : _d.id;
                        console.log("[Stripe] Checkout completed - User: ".concat(userId, ", Customer: ").concat(customerId, ", Subscription: ").concat(subscriptionId));
                        if (!subscriptionId) {
                            console.warn("[Stripe] Checkout session completed without subscription id: ".concat(session.id));
                            return [2 /*return*/];
                        }
                        if (!(!userId && customerId)) return [3 /*break*/, 2];
                        return [4 /*yield*/, supabase
                                .from('user_subscriptions')
                                .select('user_id')
                                .eq('stripe_customer_id', customerId)
                                .single()];
                    case 1:
                        existingCustomer = (_f.sent()).data;
                        if (existingCustomer === null || existingCustomer === void 0 ? void 0 : existingCustomer.user_id) {
                            userId = existingCustomer.user_id;
                            console.log("[Stripe] Resolved user_id from existing subscription row: ".concat(userId));
                        }
                        _f.label = 2;
                    case 2:
                        if (!(!userId && customerId)) return [3 /*break*/, 6];
                        _f.label = 3;
                    case 3:
                        _f.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, exports.stripe.customers.retrieve(customerId)];
                    case 4:
                        customer = _f.sent();
                        if ((_e = customer === null || customer === void 0 ? void 0 : customer.metadata) === null || _e === void 0 ? void 0 : _e.user_id) {
                            userId = customer.metadata.user_id;
                            console.log("[Stripe] Resolved user_id from Stripe customer metadata: ".concat(userId));
                        }
                        return [3 /*break*/, 6];
                    case 5:
                        err_2 = _f.sent();
                        console.warn('[Stripe] Failed to resolve Stripe customer for checkout completion:', err_2);
                        return [3 /*break*/, 6];
                    case 6:
                        if (!userId) {
                            console.warn("[Stripe] Unable to resolve user_id for checkout session ".concat(session.id, ". Skipping DB update."));
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, exports.stripe.subscriptions.retrieve(subscriptionId)];
                    case 7:
                        subscription = _f.sent();
                        priceId = getPriceIdFromSubscription(subscription);
                        planType = (priceId && exports.PRICE_ID_TO_PLAN_TYPE[priceId]) || getPlanTypeFromSubscription(subscription);
                        upsertPayload = {
                            user_id: userId,
                            stripe_customer_id: customerId,
                            stripe_subscription_id: subscriptionId,
                            stripe_price_id: priceId !== null && priceId !== void 0 ? priceId : null,
                            status: subscription.status,
                            plan_type: planType,
                            current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000) : null,
                            current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
                            cancel_at_period_end: !!subscription.cancel_at_period_end,
                            updated_at: new Date().toISOString(),
                        };
                        return [4 /*yield*/, supabase
                                .from('user_subscriptions')
                                .select('id')
                                .eq('user_id', userId)];
                    case 8:
                        _a = _f.sent(), existingRows = _a.data, lookupError = _a.error;
                        if (lookupError) {
                            console.error('[Stripe] Error querying existing subscription rows:', lookupError);
                        }
                        if (!(existingRows === null || existingRows === void 0 ? void 0 : existingRows.length)) return [3 /*break*/, 10];
                        return [4 /*yield*/, supabase
                                .from('user_subscriptions')
                                .update(upsertPayload)
                                .eq('user_id', userId)];
                    case 9:
                        updateError = (_f.sent()).error;
                        if (updateError) {
                            console.error('[Stripe] Error updating subscription on checkout completed:', updateError);
                        }
                        else {
                            console.log("[Stripe] Subscription updated in DB for user ".concat(userId));
                        }
                        return [3 /*break*/, 12];
                    case 10: return [4 /*yield*/, supabase
                            .from('user_subscriptions')
                            .insert(upsertPayload)];
                    case 11:
                        insertError = (_f.sent()).error;
                        if (insertError) {
                            console.error('[Stripe] Error inserting subscription on checkout completed:', insertError);
                        }
                        else {
                            console.log("[Stripe] Subscription created in DB for user ".concat(userId));
                        }
                        _f.label = 12;
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    StripeService.handlePaymentSucceeded = function (invoice) {
        return __awaiter(this, void 0, void 0, function () {
            var subscription, existing, newPlanType, oldPlanType;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!invoice.subscription) return [3 /*break*/, 4];
                        console.log("[Stripe] Payment succeeded - Subscription: ".concat(invoice.subscription));
                        return [4 /*yield*/, exports.stripe.subscriptions.retrieve(invoice.subscription)];
                    case 1:
                        subscription = _b.sent();
                        return [4 /*yield*/, supabase
                                .from('user_subscriptions')
                                .select('plan_type, stripe_price_id')
                                .eq('stripe_subscription_id', invoice.subscription)
                                .single()];
                    case 2:
                        existing = (_b.sent()).data;
                        newPlanType = getPlanTypeFromSubscription(subscription);
                        oldPlanType = (existing === null || existing === void 0 ? void 0 : existing.plan_type) || 'premium';
                        if (newPlanType !== oldPlanType) {
                            console.log("[Stripe] Plan change detected in payment: ".concat(oldPlanType, " \u2192 ").concat(newPlanType));
                        }
                        return [4 /*yield*/, supabase
                                .from('user_subscriptions')
                                .update({
                                status: subscription.status,
                                plan_type: newPlanType,
                                stripe_price_id: (_a = getPriceIdFromSubscription(subscription)) !== null && _a !== void 0 ? _a : null,
                                current_period_start: new Date(subscription.current_period_start * 1000),
                                current_period_end: new Date(subscription.current_period_end * 1000),
                                updated_at: new Date().toISOString(),
                            })
                                .eq('stripe_subscription_id', invoice.subscription)];
                    case 3:
                        _b.sent();
                        console.log("[Stripe] Updated subscription status to ".concat(subscription.status, " with plan_type: ").concat(newPlanType));
                        _b.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    StripeService.handlePaymentFailed = function (invoice) {
        return __awaiter(this, void 0, void 0, function () {
            var existing;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!invoice.subscription) return [3 /*break*/, 3];
                        console.log("[Stripe] Payment failed - Subscription: ".concat(invoice.subscription));
                        return [4 /*yield*/, supabase
                                .from('user_subscriptions')
                                .select('plan_type')
                                .eq('stripe_subscription_id', invoice.subscription)
                                .single()];
                    case 1:
                        existing = (_a.sent()).data;
                        return [4 /*yield*/, supabase
                                .from('user_subscriptions')
                                .update({
                                status: 'past_due',
                                plan_type: (existing === null || existing === void 0 ? void 0 : existing.plan_type) || 'premium', // Preserve existing plan_type
                                updated_at: new Date().toISOString(),
                            })
                                .eq('stripe_subscription_id', invoice.subscription)];
                    case 2:
                        _a.sent();
                        console.log("[Stripe] Updated subscription to past_due");
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    StripeService.handleSubscriptionUpdated = function (subscription) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, newPlanType, oldPlanType;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log("[Stripe] Subscription updated - ID: ".concat(subscription.id, ", Status: ").concat(subscription.status));
                        return [4 /*yield*/, supabase
                                .from('user_subscriptions')
                                .select('plan_type, stripe_price_id')
                                .eq('stripe_subscription_id', subscription.id)
                                .single()];
                    case 1:
                        existing = (_b.sent()).data;
                        newPlanType = getPlanTypeFromSubscription(subscription);
                        oldPlanType = (existing === null || existing === void 0 ? void 0 : existing.plan_type) || 'premium';
                        // Log if plan type is changing (downgrade/upgrade)
                        if (newPlanType !== oldPlanType) {
                            console.log("[Stripe] Plan change detected for subscription ".concat(subscription.id, ": ").concat(oldPlanType, " \u2192 ").concat(newPlanType));
                        }
                        // Update subscription with new plan type if it changed
                        return [4 /*yield*/, supabase
                                .from('user_subscriptions')
                                .update({
                                status: subscription.status,
                                plan_type: newPlanType,
                                stripe_price_id: (_a = getPriceIdFromSubscription(subscription)) !== null && _a !== void 0 ? _a : null,
                                current_period_start: new Date(subscription.current_period_start * 1000),
                                current_period_end: new Date(subscription.current_period_end * 1000),
                                cancel_at_period_end: subscription.cancel_at_period_end,
                                updated_at: new Date().toISOString(),
                            })
                                .eq('stripe_subscription_id', subscription.id)];
                    case 2:
                        // Update subscription with new plan type if it changed
                        _b.sent();
                        console.log("[Stripe] Subscription updated in DB with plan_type: ".concat(newPlanType));
                        return [2 /*return*/];
                }
            });
        });
    };
    StripeService.handleSubscriptionDeleted = function (subscription) {
        return __awaiter(this, void 0, void 0, function () {
            var existing;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("[Stripe] Subscription deleted - ID: ".concat(subscription.id));
                        return [4 /*yield*/, supabase
                                .from('user_subscriptions')
                                .select('plan_type')
                                .eq('stripe_subscription_id', subscription.id)
                                .single()];
                    case 1:
                        existing = (_a.sent()).data;
                        return [4 /*yield*/, supabase
                                .from('user_subscriptions')
                                .update({
                                status: 'canceled',
                                plan_type: (existing === null || existing === void 0 ? void 0 : existing.plan_type) || 'premium', // Preserve existing plan_type
                                stripe_subscription_id: null,
                                updated_at: new Date().toISOString(),
                            })
                                .eq('stripe_subscription_id', subscription.id)];
                    case 2:
                        _a.sent();
                        console.log("[Stripe] Subscription marked as canceled");
                        return [2 /*return*/];
                }
            });
        });
    };
    return StripeService;
}());
exports.StripeService = StripeService;
