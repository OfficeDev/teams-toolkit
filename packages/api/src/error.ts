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

  userData?: any;
}
export interface ErrorOptionBase {
  source?: string;
  name?: string;
  message?: string;
  error?: Error;
  userData?: any;
  displayMessage?: string;
}

export interface UserErrorOptions extends ErrorOptionBase {
  helpLink?: string;
}

export interface SystemErrorOptions extends ErrorOptionBase {
  issueLink?: string;
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
  /**
   * data that only be reported to github issue  manually by user and will not be reported as telemetry data
   */
  userData?: string;
  /**
   * message show in the UI
   */
  displayMessage?: string;

  constructor(opt: UserErrorOptions);
  constructor(source: string, name: string, message: string, displayMessage?: string);
  constructor(
    param1: string | UserErrorOptions,
    param2?: string,
    param3?: string,
    param4?: string
  ) {
    let option: UserErrorOptions;
    let stack: string | undefined;
    if (typeof param1 === "string") {
      option = {
        source: param1,
        name: param2,
        message: param3,
        displayMessage: param4,
      };
    } else {
      option = param1;
    }

    // message
    const message = option.message || option.error?.message;
    super(message);

    //name
    this.name = option.name || option.error?.name || new.target.name;

    //source
    this.source = option.source || "unknown";

    //stack
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, new.target);
    }

    //prototype
    Object.setPrototypeOf(this, new.target.prototype);

    //innerError
    this.innerError = option.error;

    //other fields
    this.helpLink = option.helpLink;
    this.userData = option.userData;
    this.displayMessage = option.displayMessage;
    this.timestamp = new Date();
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
  /**
   * message show in the UI
   */
  displayMessage?: string;

  constructor(opt: SystemErrorOptions);
  constructor(source: string, name: string, message: string, displayMessage?: string);
  constructor(
    param1: string | SystemErrorOptions,
    param2?: string,
    param3?: string,
    param4?: string
  ) {
    let option: SystemErrorOptions;
    let stack: string | undefined;
    if (typeof param1 === "string") {
      option = {
        source: param1,
        name: param2,
        message: param3,
        displayMessage: param4,
      };
    } else {
      option = param1;
    }

    // message
    const message = option.message || option.error?.message;
    super(message);

    //name
    this.name = option.name || option.error?.name || new.target.name;

    //source
    this.source = option.source || "unknown";

    //stack
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, new.target);
    }

    //prototype
    Object.setPrototypeOf(this, new.target.prototype);

    //innerError
    this.innerError = option.error;

    //other fields
    this.issueLink = option.issueLink;
    this.userData = option.userData;
    this.displayMessage = option.displayMessage;
    this.timestamp = new Date();
  }
}

export function assembleError(e: any, source?: string): FxError {
  if (e instanceof UserError || e instanceof SystemError) return e;
  if (!source) source = "unknown";
  const type = typeof e;
  if (type === "string") {
    return new SystemError({ name: "UnhandledError", message: e as string, source: source });
  } else if (e instanceof Error) {
    const err = e as Error;
    const fxError = new SystemError({ name: "UnhandledError", error: err, source: source });
    fxError.stack = err.stack;
    return fxError;
  } else {
    const message = JSON.stringify(e, Object.getOwnPropertyNames(e));
    return new SystemError({ name: "UnhandledError", message: message, source: source });
  }
}
