"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.RateLimitError = exports.AppError = void 0;
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
exports.asyncHandler = asyncHandler;
var fs = require("fs");
var path = require("path");
var url_1 = require("url");
// __dirname is not available in ESM; compute from import.meta.url
var __dirname = path.dirname((0, url_1.fileURLToPath)(import.meta.url));
/**
 * Custom error class for application errors
 */
var AppError = /** @class */ (function (_super) {
    __extends(AppError, _super);
    function AppError(statusCode, message, details) {
        var _this = _super.call(this, message) || this;
        _this.statusCode = statusCode;
        _this.details = details;
        _this.name = 'AppError';
        return _this;
    }
    return AppError;
}(Error));
exports.AppError = AppError;
/**
 * Global error handling middleware for Express
 * Should be added LAST in the middleware chain
 */
function errorHandler(err, req, res, next) {
    var _a, _b, _c;
    var timestamp = new Date().toISOString();
    // Log the error for debugging
    console.error('[Error Handler]', {
        timestamp: timestamp,
        path: req.path,
        method: req.method,
        userId: ((_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id) || 'anonymous',
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        statusCode: err.statusCode || 500,
    });
    // Handle AppError (custom application errors)
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.message,
            message: err.message,
            statusCode: err.statusCode,
            timestamp: timestamp,
            path: req.path,
            details: err.details,
        });
    }
    // Handle Zod validation errors
    if (err.name === 'ZodError') {
        return res.status(400).json({
            error: 'Validation failed',
            message: 'Request validation failed',
            statusCode: 400,
            timestamp: timestamp,
            path: req.path,
            details: (_c = err.errors) === null || _c === void 0 ? void 0 : _c.slice(0, 5), // Limit to first 5 errors
        });
    }
    // Handle JSON parsing errors
    if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({
            error: 'Invalid JSON',
            message: 'Request body contains invalid JSON',
            statusCode: 400,
            timestamp: timestamp,
            path: req.path,
        });
    }
    // Handle generic errors
    var statusCode = err.statusCode || err.status || 500;
    var message = err.message || 'Internal server error';
    res.status(statusCode).json({
        error: message,
        message: process.env.NODE_ENV === 'production'
            ? 'An error occurred processing your request'
            : message,
        statusCode: statusCode,
        timestamp: timestamp,
        path: req.path,
    });
}
/**
 * 404 Not Found handler
 * Should be added near the end of middleware chain but before error handler
 */
function notFoundHandler(req, res) {
    var _a, _b;
    var timestamp = new Date().toISOString();
    console.warn('[404 Not Found]', {
        timestamp: timestamp,
        path: req.path,
        method: req.method,
        userId: ((_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id) || 'anonymous',
    });
    // For API routes, return JSON error
    if (req.path.startsWith('/api/')) {
        res.status(404).json({
            error: 'Not found',
            message: "Route ".concat(req.method, " ").concat(req.path, " not found"),
            statusCode: 404,
            timestamp: timestamp,
            path: req.path,
        });
        return;
    }
    // For SPA routes, serve index.html to let the client handle routing
    var indexPath = path.resolve(__dirname, '../../dist/public/index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    }
    else {
        // Fallback if index.html doesn't exist
        res.status(404).json({
            error: 'Not found',
            message: "Route ".concat(req.method, " ").concat(req.path, " not found"),
            statusCode: 404,
            timestamp: timestamp,
            path: req.path,
        });
    }
}
/**
 * Async route wrapper to catch errors in async route handlers
 * Usage: app.get('/route', asyncHandler(async (req, res) => { ... }))
 */
function asyncHandler(fn) {
    return function (req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
/**
 * Rate limiting error handler
 */
var RateLimitError = /** @class */ (function (_super) {
    __extends(RateLimitError, _super);
    function RateLimitError(message) {
        if (message === void 0) { message = 'Too many requests. Please try again later.'; }
        var _this = _super.call(this, 429, message) || this;
        _this.name = 'RateLimitError';
        return _this;
    }
    return RateLimitError;
}(AppError));
exports.RateLimitError = RateLimitError;
/**
 * Unauthorized error handler
 */
var UnauthorizedError = /** @class */ (function (_super) {
    __extends(UnauthorizedError, _super);
    function UnauthorizedError(message) {
        if (message === void 0) { message = 'Unauthorized: Authentication required'; }
        var _this = _super.call(this, 401, message) || this;
        _this.name = 'UnauthorizedError';
        return _this;
    }
    return UnauthorizedError;
}(AppError));
exports.UnauthorizedError = UnauthorizedError;
/**
 * Forbidden error handler
 */
var ForbiddenError = /** @class */ (function (_super) {
    __extends(ForbiddenError, _super);
    function ForbiddenError(message) {
        if (message === void 0) { message = 'Forbidden: Access denied'; }
        var _this = _super.call(this, 403, message) || this;
        _this.name = 'ForbiddenError';
        return _this;
    }
    return ForbiddenError;
}(AppError));
exports.ForbiddenError = ForbiddenError;
/**
 * Not Found error handler
 */
var NotFoundError = /** @class */ (function (_super) {
    __extends(NotFoundError, _super);
    function NotFoundError(resource) {
        if (resource === void 0) { resource = 'Resource'; }
        var _this = _super.call(this, 404, "".concat(resource, " not found")) || this;
        _this.name = 'NotFoundError';
        return _this;
    }
    return NotFoundError;
}(AppError));
exports.NotFoundError = NotFoundError;
