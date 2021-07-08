"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseError = exports.ErrorType = void 0;
// eslint-disable-next-line no-shadow
var ErrorType;
(function (ErrorType) {
    ErrorType[ErrorType["User"] = 0] = "User";
    ErrorType[ErrorType["System"] = 1] = "System";
})(ErrorType = exports.ErrorType || (exports.ErrorType = {}));
class BaseError extends Error {
    constructor(type, name, details, suggestions, innerError, showHelpLink = false) {
        super(details);
        this.name = name;
        this.details = details;
        this.suggestions = suggestions;
        this.errorType = type;
        this.innerError = innerError;
        this.showHelpLink = showHelpLink;
        Object.setPrototypeOf(this, BaseError.prototype);
    }
    genMessage() {
        return `${this.message} Suggestions: ${this.suggestions.join('\n')}`;
    }
}
exports.BaseError = BaseError;
