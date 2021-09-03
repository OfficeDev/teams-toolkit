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

  errorCode(): string;
}

/**
 * Users can recover by themselves, e.g., users input invalid app names.
 */
export class UserError extends Error implements FxError {
  /**
   * Custom error details .
   */
  innerError?: any;
  /**
   * Source name of error. (plugin name, eg: tab-scaffold-plugin)
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

  constructor(
    name: string,
    message: string,
    source: string,
    stack?: string,
    helpLink?: string,
    innerError?: any
  ) {
    super(message);
    this.name = name ? name : new.target.name;
    this.source = source;
    this.timestamp = new Date();
    this.helpLink = helpLink;
    this.innerError = innerError;
    if (typeof (Error as any).captureStackTrace === "function") {
      (Error as any).captureStackTrace(this, new.target);
    }
    if (typeof Object.setPrototypeOf === "function") {
      Object.setPrototypeOf(this, new.target.prototype);
    } else {
      (this as any).__proto__ = new.target.prototype;
    }
  }

  static build(source: string, name?: string, message?: string, helpLink?: string): UserError;
  static build(source: string, error: Error, helpLink?: string): UserError;
  static build(
    source: string,
    nameOrError?: string | Error,
    messageOrHelplink?: string,
    helpLink?: string
  ): UserError {
    let error: UserError;
    if (nameOrError !== undefined && nameOrError instanceof Error) {
      const err = nameOrError as Error;
      error = new UserError(err.name, err.message, source, undefined, messageOrHelplink);
      Object.assign(this, err);
      error.name = err.name;
      error.stack = err.stack;
    } else {
      error = new UserError(
        nameOrError || "",
        messageOrHelplink || "",
        source,
        undefined,
        helpLink
      );
    }
    error.timestamp = new Date();
    return error;
  }

  errorCode(): string {
    return `${this.source}.${this.name}`;
  }
}

/**
 * Users cannot handle it by themselves.
 */
export class SystemError extends Error implements FxError {
  /**
   * Custom error details.
   */
  innerError?: any;
  /**
   * Source name of error. (plugin name, eg: tab-scaffold-plugin)
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
   * data that only be reported to github issue  manually by user and will not be reported as telemetry data
   */
  userData?: string;

  constructor(
    name: string,
    message: string,
    source: string,
    stack?: string,
    issueLink?: string,
    innerError?: any
  ) {
    super(message);
    this.name = name ? name : new.target.name;
    this.source = source;
    this.timestamp = new Date();
    this.issueLink = issueLink;
    this.innerError = innerError;
    if (typeof (Error as any).captureStackTrace === "function") {
      (Error as any).captureStackTrace(this, new.target);
    }
    if (typeof Object.setPrototypeOf === "function") {
      Object.setPrototypeOf(this, new.target.prototype);
    } else {
      (this as any).__proto__ = new.target.prototype;
    }
  }

  static build(source: string, name?: string, message?: string, issueLink?: string): SystemError;
  static build(source: string, error: Error, issueLink?: string): SystemError;
  static build(
    source: string,
    nameOrError?: string | Error,
    messageOrIssuelink?: string,
    issueLink?: string
  ): SystemError {
    let error: SystemError;
    if (nameOrError !== undefined && nameOrError instanceof Error) {
      const err = nameOrError as Error;
      error = new SystemError(err.name, err.message, source, undefined, messageOrIssuelink);
      Object.assign(this, err);
      error.name = err.name;
      error.stack = err.stack;
    } else {
      error = new SystemError(
        nameOrError || "",
        messageOrIssuelink || "",
        source,
        undefined,
        issueLink
      );
    }
    error.timestamp = new Date();
    return error;
  }

  errorCode(): string {
    return `${this.source}.${this.name}`;
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
  innerError?: any
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
  innerError?: any
): SystemError {
  if (!name) {
    return new SystemError(e.name, e.message, source, e.stack, issueLink, innerError);
  } else {
    return new SystemError(name, e.message, source, e.stack, issueLink, innerError);
  }
}

export function newUserError(
  source: string,
  name: string,
  message: string,
  helpLink?: string,
  innerError?: any
): UserError {
  return new UserError(name, message, source, undefined, helpLink, innerError);
}

export function newSystemError(
  source: string,
  name: string,
  message: string,
  issueLink?: string,
  innerError?: any
): SystemError {
  return new SystemError(name, message, source, undefined, issueLink, innerError);
}

export const UserCancelError: UserError = new UserError("UserCancel", "UserCancel", "UI");

export function assembleError(e: any, source?: string): FxError {
  if (e instanceof UserError || e instanceof SystemError) return e;
  if (!source) source = "unknown";
  const type = typeof e;
  if (type === "string") {
    return new SystemError("Error", e, source, undefined, undefined, e);
  } else if (type === "object") {
    if (e.code || e.name || e.message) {
      const fxError = new SystemError(
        e.code || e.name || "Error",
        e.message || JSON.stringify(e, Object.getOwnPropertyNames(e)),
        source,
        undefined,
        undefined,
        e
      );
      Object.assign(fxError, e);
      if (e.stack) {
        fxError.stack = e.stack;
      }
      return fxError;
    }
  }
  return new SystemError(
    "Error",
    e ? JSON.stringify(e, Object.getOwnPropertyNames(e)) : "undefined",
    source,
    undefined,
    undefined,
    e
  );
}
