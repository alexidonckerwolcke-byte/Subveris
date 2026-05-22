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
exports.generateVapidKeys = generateVapidKeys;
exports.createVapidJwt = createVapidJwt;
exports.sendPushNotification = sendPushNotification;
exports.sendBatchPushNotifications = sendBatchPushNotifications;
var crypto = require("crypto");
/**
 * Generate VAPID keys for Web Push API
 * These should be generated once and stored in .env
 * Run this once: node -e "import('./server/push-notifications.ts').then(m => console.log(m.generateVapidKeys()))"
 */
function generateVapidKeys() {
    var vapidKeys = crypto.generateKeyPairSync('ec', {
        namedCurve: 'prime256v1',
    });
    var publicKey = vapidKeys.publicKey.export({ type: 'spki', format: 'pem' });
    var privateKey = vapidKeys.privateKey.export({ type: 'pkcs8', format: 'pem' });
    // Convert to base64 for use in Web Push
    var publicKeyB64 = Buffer.from(publicKey).toString('base64');
    var privateKeyB64 = Buffer.from(privateKey).toString('base64');
    return {
        publicKey: publicKeyB64,
        privateKey: privateKeyB64,
    };
}
/**
 * Create a signed JWT for Web Push
 * @param subject Contact email or URL
 * @param vapidPrivateKey VAPID private key
 */
function createVapidJwt(subject, vapidPrivateKey) {
    var header = {
        typ: 'JWT',
        alg: 'ES256',
    };
    var payload = {
        aud: 'https://fcm.googleapis.com', // or appropriate push service
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
        sub: subject,
    };
    var headerEncoded = Buffer.from(JSON.stringify(header)).toString('base64url');
    var payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    var message = "".concat(headerEncoded, ".").concat(payloadEncoded);
    // Sign with private key
    var privateKeyPem = Buffer.from(vapidPrivateKey, 'base64').toString('utf-8');
    var signature = crypto.sign('SHA256', Buffer.from(message), { key: privateKeyPem });
    var signatureB64 = Buffer.from(signature).toString('base64url');
    return "".concat(message, ".").concat(signatureB64);
}
/**
 * Send a push notification to a subscription
 * @param subscription Push subscription from database
 * @param payload Notification payload
 * @param vapidPrivateKey VAPID private key
 * @param vapidPublicKey VAPID public key
 * @param subject Contact email/URL for push service
 */
function sendPushNotification(subscription, payload, vapidPrivateKey, vapidPublicKey, subject) {
    return __awaiter(this, void 0, void 0, function () {
        var jwt, body, response, error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    jwt = createVapidJwt(subject, vapidPrivateKey);
                    body = JSON.stringify(payload);
                    return [4 /*yield*/, fetch(subscription.endpoint, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Content-Encoding': 'aes128gcm',
                                Authorization: "vapid t=".concat(jwt, ", k=").concat(vapidPublicKey),
                            },
                            body: body,
                        })];
                case 1:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.text()];
                case 2:
                    error = _a.sent();
                    throw new Error("Failed to send push notification: ".concat(response.status, " ").concat(error));
                case 3: return [2 /*return*/, response];
            }
        });
    });
}
/**
 * Batch send push notifications to multiple users
 */
function sendBatchPushNotifications(subscriptions, payload, vapidPrivateKey, vapidPublicKey, subject) {
    return __awaiter(this, void 0, void 0, function () {
        var results, _i, subscriptions_1, subscription, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    results = {
                        successful: 0,
                        failed: 0,
                        errors: [],
                    };
                    _i = 0, subscriptions_1 = subscriptions;
                    _a.label = 1;
                case 1:
                    if (!(_i < subscriptions_1.length)) return [3 /*break*/, 6];
                    subscription = subscriptions_1[_i];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, sendPushNotification(subscription, payload, vapidPrivateKey, vapidPublicKey, subject)];
                case 3:
                    _a.sent();
                    results.successful++;
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    results.failed++;
                    results.errors.push(error_1 instanceof Error ? error_1.message : String(error_1));
                    return [3 /*break*/, 5];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/, results];
            }
        });
    });
}
