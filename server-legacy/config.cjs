"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequiredEnv = getRequiredEnv;
exports.getOptionalEnv = getOptionalEnv;
exports.validateStripePriceId = validateStripePriceId;
exports.getStripePriceId = getStripePriceId;
exports.validateEnvironment = validateEnvironment;
function getRequiredEnv(name) {
    var value = process.env[name];
    if (!value || value.trim() === '') {
        throw new Error("Missing required environment variable: ".concat(name));
    }
    return value;
}
function getOptionalEnv(name) {
    var value = process.env[name];
    return value && value.trim() ? value : undefined;
}
function validateStripePriceId(envName, value) {
    if (value.startsWith('prod_')) {
        console.warn("[Stripe] ".concat(envName, " appears to be a Stripe product ID (starts with 'prod_'). ") +
            "Stripe checkout expects a price ID beginning with 'price_'.");
    }
    if (value.startsWith('price_') || value.startsWith('prod_')) {
        return value;
    }
    var warningMessage = "[Stripe] ".concat(envName, " does not look like a standard Stripe price ID. ") +
        "Expected a value starting with 'price_', got '".concat(value, "'.");
    if (process.env.NODE_ENV === 'production') {
        throw new Error(warningMessage);
    }
    console.warn(warningMessage);
    return value;
}
function getStripePriceId(envNames, fallback, envName) {
    for (var _i = 0, envNames_1 = envNames; _i < envNames_1.length; _i++) {
        var name_1 = envNames_1[_i];
        var value = getOptionalEnv(name_1);
        if (value) {
            return validateStripePriceId(name_1, value);
        }
    }
    if (process.env.NODE_ENV === 'production') {
        throw new Error("Missing required Stripe price ID environment variable: ".concat(envNames.join(' or '), ". ") +
            "Set ".concat(envNames.join(' or '), " to a Stripe price ID starting with 'price_'."));
    }
    return validateStripePriceId(envName, fallback);
}
function validateEnvironment() {
    getRequiredEnv('SUPABASE_URL');
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    getRequiredEnv('STRIPE_SECRET_KEY');
    if (process.env.NODE_ENV === 'production') {
        getRequiredEnv('STRIPE_WEBHOOK_SECRET');
    }
    getStripePriceId(['STRIPE_PREMIUM_PRICE_ID', 'VITE_STRIPE_PREMIUM_PRICE_ID'], 'price_1TM9r1JSf7SJ8WWRiocez8wo', 'STRIPE_PREMIUM_PRICE_ID');
    getStripePriceId(['STRIPE_FAMILY_PRICE_ID', 'VITE_STRIPE_FAMILY_PRICE_ID'], 'price_1TM9sSJSf7SJ8WWR4H26rSZ9', 'STRIPE_FAMILY_PRICE_ID');
}
