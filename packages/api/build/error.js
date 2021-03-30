"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
exports.returnSystemError = exports.returnUserError = exports.SystemError = exports.UserError = void 0;
/**
 * Users can recover by themselves, e.g., users input invalid app names.
 */
class UserError {
    constructor(name, message, source, stack, helpLink, innerError) {
        this.name = name;
        this.message = message;
        this.source = source;
        this.timestamp = new Date();
        this.stack = stack;
        this.helpLink = helpLink;
        this.innerError = innerError;
        Object.setPrototypeOf(this, UserError.prototype);
    }
}
exports.UserError = UserError;
/**
 * Users cannot handle it by themselves.
 */
class SystemError {
    constructor(name, message, source, stack, issueLink, innerError) {
        this.name = name;
        this.message = message;
        this.source = source;
        this.timestamp = new Date();
        this.stack = stack;
        this.issueLink = issueLink;
        this.innerError = innerError;
        Object.setPrototypeOf(this, SystemError.prototype);
    }
}
exports.SystemError = SystemError;
/**
 *
 * @param e Original error
 * @param source Source name of error. (plugin name, eg: tab-scaffhold-plugin)
 * @param name Name of error. (error name, eg: Dependency not found)
 * @param helpLink A wiki website that shows mapping relationship between error names, descriptions, and fix solutions.
 * @param innerError Custom error details.
 *
 * @returns UserError.
 */
function returnUserError(e, source, name, helpLink, innerError) {
    if (!name) {
        return new UserError(e.name, e.message, source, e.stack, helpLink, innerError);
    }
    else {
        return new UserError(name, e.message, source, e.stack, helpLink, innerError);
    }
}
exports.returnUserError = returnUserError;
/**
 *
 * @param e Original error
 * @param source Source name of error. (plugin name, eg: tab-scaffhold-plugin)
 * @param name Name of error. (error name, eg: Dependency not found)
 * @param issueLink A github issue page where users can submit a new issue.
 * @param innerError Custom error details.
 *
 * @returns SystemError.
 */
function returnSystemError(e, source, name, issueLink, innerError) {
    if (!name) {
        return new SystemError(e.name, e.message, source, e.stack, issueLink, innerError);
    }
    else {
        return new SystemError(name, e.message, source, e.stack, issueLink, innerError);
    }
}
exports.returnSystemError = returnSystemError;
//# sourceMappingURL=error.js.map