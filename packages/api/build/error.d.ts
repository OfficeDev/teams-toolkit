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
export declare class UserError implements FxError {
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
    constructor(name: string, message: string, source: string, stack?: string, helpLink?: string, innerError?: any);
}
/**
 * Users cannot handle it by themselves.
 */
export declare class SystemError implements FxError {
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
    constructor(name: string, message: string, source: string, stack?: string, issueLink?: string, innerError?: any);
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
export declare function returnUserError(e: Error, source: string, name: string, helpLink?: string, innerError?: any): UserError;
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
export declare function returnSystemError(e: Error, source: string, name: string, issueLink?: string, innerError?: any): SystemError;
//# sourceMappingURL=error.d.ts.map