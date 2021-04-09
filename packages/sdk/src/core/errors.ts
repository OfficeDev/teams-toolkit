// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Error code to help debugging.
 * @beta
 */
export enum ErrorCode {
  /**
   * Invalid parameter error.
   */
  InvalidParameter = "InvalidParameter",

  /**
   * Invalid configuration.
   */
  InvalidConfiguration = "InvalidConfiguration",

  /**
   * Internal error.
   */
  InternalError = "InternalError",

  /**
   * Channel is not supported error.
   */
  ChannelNotSupported = "ChannelNotSupported",

  /**
   * Runtime is not supported.
   */
  RuntimeNotSupported = "RuntimeNotSupported",

  /**
   * User failed to finish the AAD consent flow.
   */
  ConsentFailed = "ConsentFailed",

  /**
   * The user or administrator has not consented to use the application.
   */
  UiRequiredError = "UiRequiredError",

  /**
   * Call service (AAD or simple authentication server) failed
   */
  ServiceError = "ServiceError",

  /**
   * operation failed error.
   */
  FailedOperation = "FailedOperation"
}

export class ErrorMessage {
  // InvalidConfiguration Error
  static readonly InvalidConfiguration = "{0} in configuration is invalid: {1}.";
  static readonly ConfigurationNotExists = "Configuration does not exist. {0}";
  static readonly ResourceConfigurationNotExists = "{0} resource configuration does not exist.";
  static readonly MissingResourceConfiguration =
    "Missing resource configuration with type: {0}, name: {1}.";
  static readonly AuthenticationConfigurationNotExists =
    "Authentication configuration does not exist.";

  // RuntimeNotSupported Error
  static readonly BrowserRuntimeNotSupported = "{0} is not supported in browser.";
  static readonly NodejsRuntimeNotSupported = "{0} is not supported in Node.";

  // Internal Error
  static readonly FailToAcquireTokenOnBehalfOfUser =
    "Failed to acquire access token on behalf of user: {0}";

  // ChannelNotSupported Error
  static readonly OnlyMSTeamsChannelSupported = "{0} is only supported in MS Teams Channel";
}

/**
 * Error class with code and message thrown by the SDK library.
 *
 * @beta
 */
export class ErrorWithCode extends Error {
  /**
   * error code
   *
   * @readonly
   */
  code: string | undefined;

  /**
   * Constructor of ErrorWithCode
   *
   * @param {string} message - error message
   * @param {ErrorCode} code - error code
   */
  constructor(message?: string, code?: ErrorCode) {
    if (!code) {
      super(message);
      return;
    }

    super(message);
    Object.setPrototypeOf(this, ErrorWithCode.prototype);
    this.name = `${new.target.name}.${code}`;
    this.code = code;
  }
}
