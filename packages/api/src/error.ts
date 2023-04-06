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
    return new UnknownError(source, e as string);
  } else if (e instanceof Error) {
    const err = e as Error;
    const fxError = new SystemError({ error: err, source });
    fxError.stack = err.stack;
    return fxError;
  } else {
    return new UnknownError(source, JSON.stringify(e));
  }
}

export class UnknownError extends SystemError {
  constructor(source?: string, message?: string) {
    super({ source: source || "API", message: message });
  }
}

export const UserCancelError: UserError = new UserError("UI", "UserCancel", "User canceled.");

export class EmptyOptionError extends SystemError {
  constructor(source?: string) {
    super({ source: source || "API" });
  }
}

export class PathAlreadyExistsError extends UserError {
  constructor(source: string, path: string) {
    super({ source: source, message: `Path ${path} already exists.` });
  }
}

export class ObjectAlreadyExistsError extends UserError {
  constructor(source: string, name: string) {
    super({ source: source, message: `${name} already exists.` });
  }
}

export class ObjectNotExistError extends UserError {
  constructor(source: string, name: string) {
    super({ source: source, message: `${name} does not exist.` });
  }
}

export class UndefinedError extends SystemError {
  constructor(source: string, name: string) {
    super({ source: source, message: `${name} is undefined, which is not expected` });
  }
}

export class NotImplementedError extends SystemError {
  constructor(source: string, method: string) {
    super({ source: source, message: `Method not implemented:${method}` });
  }
}

export class WriteFileError extends SystemError {
  constructor(source: string, e: Error) {
    super({ source: source, error: e, name: "WriteFileError" });
  }
}

export class ReadFileError extends SystemError {
  constructor(source: string, e: Error) {
    super({ source: source, error: e, name: "ReadFileError" });
  }
}

export class NoProjectOpenedError extends UserError {
  constructor(source: string) {
    super({
      source: source,
      message: "No project opened, you can create a new project or open an existing one.",
    });
  }
}

export class ConcurrentError extends UserError {
  constructor(source: string) {
    super({
      source: source,
      message:
        "Previous task is still running. Please wait util your previous task to finish and try again.",
    });
  }
}

export class InvalidInputError extends UserError {
  constructor(source: string, name: string, reason?: string) {
    super({ source: source, message: `Input '${name}' is invalid: ${reason}` });
  }
}

export class InvalidProjectError extends UserError {
  constructor(source: string, msg?: string) {
    super({
      source: source,
      message: `The command only works for project created by Teams Toolkit. ${
        msg ? ": " + msg : ""
      }`,
    });
  }
}

export class InvalidObjectError extends UserError {
  constructor(source: string, name: string, reason?: string) {
    super({ source: source, message: `${name} is invalid: ${reason}` });
  }
}

export class InvalidOperationError extends UserError {
  constructor(source: string, name: string, reason?: string) {
    super({ source: source, message: `Invalid operation: ${name} ${reason}` });
  }
}
