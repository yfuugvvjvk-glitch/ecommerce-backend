"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = exports.NotFoundError = exports.UnauthorizedError = exports.ValidationError = void 0;
class ValidationError extends Error {
    constructor(details) {
        super('Validation failed');
        this.details = details;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class UnauthorizedError extends Error {
    constructor(message = 'Unauthorized') {
        super(message);
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
class NotFoundError extends Error {
    constructor(resource) {
        super(`${resource} not found`);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
