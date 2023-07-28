// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

export enum LogLevel {
  /**
   * Contain the most detailed messages.
   */
  Trace = 0,
  /**
   * For debugging and development.
   */
  Debug = 1,

  /**
   * Diagnostics for users.
   */
  Verbose = 2,

  /**
   * Tracks the general flow of the app. May have long-term value.
   */
  Info = 3,
  /**
   * For abnormal or unexpected events. Typically includes errors or conditions that don't cause the app to fail.
   */
  Warning = 4,
  /**
   * For errors and exceptions that cannot be handled. These messages indicate a failure in the current operation or request, not an app-wide failure.
   */
  Error = 5,
  /**
   * For failures that require immediate attention. Examples: data loss scenarios.
   */
  Fatal = 6,
}

export interface LogProvider {
  /**
   * Use to record information
   * @param logLevel Defines logging severity levels.
   * @param message Information of log event
   */
  log(logLevel: LogLevel, message: string): Promise<boolean>;

  /**
   * Use to record trace information
   * @param message Information of log event
   */
  trace(message: string): Promise<boolean>;

  /**
   * Verbose should include every event that happened, but not necessarily as much detail as debug.
   */
  verbose(message: string): Promise<boolean>;

  /**
   * Debug level can contain things like stack traces, input and output parameters, or special messages for developers.
   */
  debug(message: string): Promise<boolean>;

  /**
   * Use to record info information
   * @param message Information of log event
   */
  info(message: string, logToFile?: boolean): Promise<boolean>;

  /**
   * Use to record info information
   * @param message Information of log event
   */
  info(message: Array<{ content: string; color: Colors }>, logToFile?: boolean): Promise<boolean>;

  /**
   * Use to record warning information
   * @param message Information of log event
   */
  warning(message: string, logToFile?: boolean): Promise<boolean>;

  /**
   * Use to record error information
   * @param message Information of log event
   */
  error(message: string, logToFile?: boolean): Promise<boolean>;

  /**
   * Use to record critical information
   * @param message Information of log event
   */
  fatal(message: string): Promise<boolean>;

  /**
   * Get log file path
   */
  getLogFilePath(): string;
}

/**
 * Colors for CLI output message
 */
export enum Colors {
  /**
   * Primary text color
   */
  BRIGHT_WHITE = 0,
  /**
   * Secondary text color
   */
  WHITE = 1,
  /**
   * Important text color
   */
  BRIGHT_MAGENTA = 2,
  /**
   * Success message indicator
   */
  BRIGHT_GREEN = 3,
  /**
   * Warning message indicator
   */
  BRIGHT_YELLOW = 4,
  /**
   * Error message indicator
   */
  BRIGHT_RED = 5,
  /**
   * Hyperlink
   */
  BRIGHT_CYAN = 6,
  /**
   * Commands, parameters, system inputs
   */
  BRIGHT_BLUE = 7,
}
