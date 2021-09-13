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
  source?: string,
  name?: string,
  message?: string,
  error?: Error,
  userData?: any;
}

export interface UserErrorOptions extends ErrorOptionBase {
  helpLink?: string,
}

export interface SystemErrorOptions extends ErrorOptionBase {
  issueLink?: string,
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

  constructor(
    error: Error, 
    source?: string, 
    name?: string, 
    helpLink?: string
  ); 
  constructor(opt: UserErrorOptions); 
  constructor(
    name: string,
    message: string,
    source: string,
    stack?: string,
    helpLink?: string,
    innerError?: any
  );
  constructor(
    param1: string | Error | UserErrorOptions,
    param2?: string,
    param3?: string,
    param4?: string,
    param5?: string,
    innerError?: any
  ) 
  {
    let option:UserErrorOptions;
    let stack: string|undefined;
    if(typeof param1 === "string") {
      option = {
        name: param1,
        message: param2,
        source: param3,
        helpLink: param5,
        error: innerError instanceof Error ? innerError : undefined,
      };
      if(innerError instanceof Error) {
        stack = innerError.stack;
      }
    }
    else if(param1 instanceof Error) {
      option = {
        error: param1,
        name: param3,
        source: param2,
        helpLink: param4,
      };
      stack = param1.stack;
    }
    else {
      option = param1;
    }

    // message
    const messages = new Set<string>();
    if (option.message) messages.add(option.message);
    if (option.error && option.error.message) messages.add(option.error.message);
    const message = Array.from(messages).join(", ") || "";
    super(message);

    //name
    this.name = option.name || (option.error && option.error.name) || new.target.name;

    //source
    this.source = option.source || "unknown";
    this.helpLink = option.helpLink;
    this.userData = option.userData;
    
    this.timestamp = new Date();

    if(stack) {
      this.stack = stack;
    }
    else {
      Error.captureStackTrace(this, new.target);
    }
    Object.setPrototypeOf(this, new.target.prototype);
    if(typeof param1 === "string") {
      this.innerError = innerError;
    }
    else if(param1 instanceof Error) {
      this.innerError = param1;
    }
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
    error: Error, 
    source?: string, 
    name?: string, 
    issueLink?: string
  ); 
  constructor(opt: SystemErrorOptions); 
  constructor(
    name: string,
    message: string,
    source: string,
    stack?: string,
    issueLink?: string,
    innerError?: any
  );
  constructor(
    param1: string | Error | SystemErrorOptions,
    param2?: string,
    param3?: string,
    param4?: string,
    param5?: string,
    innerError?: any
  ) 
  {
    let option:SystemErrorOptions;
    let stack: string|undefined;
    if(typeof param1 === "string") {
      option = {
        name: param1,
        message: param2,
        source: param3,
        issueLink: param5,
        error: innerError instanceof Error ? innerError : undefined,
      };
      if(innerError instanceof Error) {
        stack = innerError.stack;
      }
    }
    else if(param1 instanceof Error) {
      option = {
        error: param1,
        name: param3,
        source: param2,
        issueLink: param4,
      };
      stack = param1.stack;
    }
    else {
      option = param1;
    }

    // message
    const messages = new Set<string>();
    if (option.message) messages.add(option.message);
    if (option.error && option.error.message) messages.add(option.error.message);
    const message = Array.from(messages).join(", ") || "";
    super(message);

    //name
    this.name = option.name || (option.error && option.error.name) || new.target.name;

    //source
    this.source = option.source || "unknown";
    this.issueLink = option.issueLink;
    this.userData = option.userData;
    
    this.timestamp = new Date();

    if(stack) {
      this.stack = stack;
    }
    else {
      Error.captureStackTrace(this, new.target);
    }
    Object.setPrototypeOf(this, new.target.prototype);
    if(typeof param1 === "string") {
      this.innerError = innerError;
    }
    else if(param1 instanceof Error) {
      this.innerError = param1;
    }
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
  return new UserError(e, source, name, helpLink);
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
  return new SystemError(e, source, name, issueLink);
}


export function assembleError(e: any, source?: string): FxError {
  if (e instanceof UserError || e instanceof SystemError) return e;
  if (!source) source = "unknown";
  const type = typeof e;
  if (type === "string") {
    return new UnknownError(source, e as string);
  } else if (e instanceof Error) {
    const err = e as Error;
    const fxError = new SystemError(err, source);
    fxError.stack = err.stack;
    return fxError;
  } else {
    return new UnknownError(source, JSON.stringify(e));
  }
}

export class UnknownError extends SystemError {
  constructor(source?: string, message?: string) {
    super({ source: source || "API", message: message});
  }
}

export const UserCancelError: UserError = new UserError("UserCancel", "UserCancel", "UI");

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

export class PathNotExistError extends UserError {
  constructor(source: string, path: string) {
    super({ source: source, message: `Path ${path} does not exist.` });
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
    super({ source: source, error: e, name: "WriteFileError"});
  }
}

export class ReadFileError extends SystemError {
  constructor(source: string, e: Error) {
    super({ source: source, error: e , name: "ReadFileError"});
  }
}

export class NoProjectOpenedError extends UserError {
  constructor(source: string) {
    super({ source: source, message: "No project opened, you can create a new project or open an existing one." });
  }
}

export class ConcurrentError extends UserError {
  constructor(source: string) {
    super({ source: source, message: "Concurrent operation error, please wait until the running task finish or you can reload the window to cancel it." });
  }
}

export class InvalidInputError extends UserError {
  constructor(source: string, name: string, reason?: string) {
    super({ source: source, message: `Input '${name}' is invalid: ${reason}` });
  }
}

export class InvalidProjectError extends UserError {
  constructor(source: string, msg?: string) {
    super({ source: source, message: `The command only works for project created by Teamsfx Toolkit. ${msg ? ": " + msg : ""}` });
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