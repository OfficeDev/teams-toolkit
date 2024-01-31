// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

export enum LogLevel {
  /**
   * For debugging and development.
   */
  Debug = 1,
  /**
   * Contain the most detailed messages.
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
}

export interface LogProvider {
  /**
   * log by level
   */
  log(logLevel: LogLevel, message: string): void;

  /**
   * diagnostic information used by user
   */
  verbose(message: string): void;

  /**
   * debug information used internally
   */
  debug(message: string): void;

  /**
   * normal output information
   */
  info(message: string): void;

  /**
   * normal output information, colored version
   */
  info(message: Array<{ content: string; color: Colors }>): void;

  /**
   * warning information
   */
  warning(message: string): void;

  /**
   * error information
   */
  error(message: string): void;

  /**
   * log content into file
   */
  logInFile(logLevel: LogLevel, message: string): Promise<void>;
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
}
