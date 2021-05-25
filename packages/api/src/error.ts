// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface FxError extends Error {
    /**
     * Custom error details.
     */
    innerError?: any;
    /**
     * Source name of error. (plugin name, eg: tab-scaffhold-plugin)
     */
    source: string;
    /**
     * Time of error.
     */
    timestamp: Date;
}

/**
 * Users can recover by themselves, e.g., users input invalid app names.
 */
export class UserError implements FxError {
    /**
     * Custom error details .
     */
    innerError?: any;
    /**
     * Source name of error. (plugin name, eg: tab-scaffhold-plugin)
     */
    source: string;
    /**
     * Time of error.
     */
    timestamp: Date;
    /**
     * A wiki website that shows mapping relationship between error names, descriptions, and fix solutions.
     */
    helpLink?: string;
    /**
     * Name of error. (error name, eg: Dependency not found)
     */
    name: string;
    /**
     * Message to explain what happened and what to do next.
     */
    message: string;
    /**
     * A string that describes the immediate frames of the call stack.
     */
    stack?: string;

    constructor(name: string, message: string, source: string, stack?: string, helpLink?: string, innerError?: any) {
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

/**
 * Users cannot handle it by themselves.
 */
export class SystemError implements FxError {
    /**
     * Custom error details.
     */
    innerError?: any;
    /**
     * Source name of error. (plugin name, eg: tab-scaffhold-plugin)
     */
    source: string;
    /**
     * Time of error.
     */
    timestamp: Date;
    /**
     * A github issue page where users can submit a new issue.
     */
    issueLink?: string;
    /**
     * Name of error. (error name, eg: Dependency not found)
     */
    name: string;
    /**
     * Message to explain what happened and what to do next.
     */
    message: string;
    /**
     * A string that describes the immediate frames of the call stack.
     */
    stack?: string;

    constructor(name: string, message: string, source: string, stack?: string, issueLink?: string, innerError?: any) {
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
export function returnUserError(
    e: Error,
    source: string,
    name: string,
    helpLink?: string,
    innerError?: any,
): UserError {
    if (!name) {
        return new UserError(e.name, e.message, source, e.stack, helpLink, innerError);
    } else {
        return new UserError(name, e.message, source, e.stack, helpLink, innerError);
    }
}

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
export function returnSystemError(
    e: Error,
    source: string,
    name: string,
    issueLink?: string,
    innerError?: any,
): SystemError {
    if (!name) {
        return new SystemError(e.name, e.message, source, e.stack, issueLink, innerError);
    } else {
        return new SystemError(name, e.message, source, e.stack, issueLink, innerError);
    }
}


export const UserCancelError:UserError = new UserError("UserCancel", "UserCancel", "UI");