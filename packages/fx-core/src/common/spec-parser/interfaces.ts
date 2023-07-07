// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

/**
 * An interface that represents the result of validating an OpenAPI specification file.
 */
export interface ValidateResult {
  /**
   * The validation status of the OpenAPI specification file.
   */
  status: ValidationStatus;

  /**
   * An array of warning results generated during validation.
   */
  warnings: WarningResult[];

  /**
   * An array of error results generated during validation.
   */
  errors: ErrorResult[];
}

/**
 * An interface that represents a warning result generated during validation.
 */
export interface WarningResult {
  /**
   * The type of warning.
   */
  type: WarningType;

  /**
   * The content of the warning.
   */
  content: string;

  /**
   * The api path of the warning.
   */
  apiPath?: string;
}

/**
 * An interface that represents an error result generated during validation.
 */
export interface ErrorResult {
  /**
   * The type of error.
   */
  type: ErrorType;

  /**
   * The content of the error.
   */
  content: string;

  /**
   * The api path of the error.
   */
  apiPath?: string;
}

/**
 * An enum that represents the types of errors that can occur during validation.
 */
export enum ErrorType {
  SpecNotValid,
  VersionNotSupported,
  RemoteReferenceNotSupported,

  ListFailed,
  Cancelled,
  Unknown,
}

/**
 * An enum that represents the types of warnings that can occur during validation.
 */
export enum WarningType {
  AuthNotSupported,
  MethodNotSupported,
  OperationIdMissing,
  Unknown,
}

/**
 * An enum that represents the validation status of an OpenAPI specification file.
 */
export enum ValidationStatus {
  Valid,
  Warning, // If there are any warnings, the file is still valid
  Error, // If there are any errors, the file is not valid
}
