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
}

/**
 * An enum that represents the types of errors that can occur during validation.
 */
export enum ErrorType {
  SpecNotValid,
  VersionNotSupported,
  RemoteRefNotSupported,
  NoServerInformation,
  MultipleServerInformation,
  NoSupportedApi,

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

export interface TextBlockElement {
  type: string;
  text: string;
  wrap: boolean;
}

export interface ArrayElement {
  type: string;
  $data: string;
  items: Array<TextBlockElement | ArrayElement>;
}

export interface AdaptiveCard {
  type: string;
  $schema: string;
  version: string;
  body: Array<TextBlockElement | ArrayElement>;
}

export interface PartialManifest {
  name: Name;
  description: Description;
  composeExtensions: ComposeExtension[];
}

export interface Name {
  short: string;
  full: string;
}

export interface Description {
  short: string;
  full: string;
}

export interface ComposeExtension {
  type: string;
  apiSpecFile: string;
  commands: Command[];
}

export interface Command {
  id: string;
  type: string;
  context: string[];
  title: string;
  description?: string;
  parameters: Parameter[];
  apiResponseRenderingTemplate?: string;
}

export interface Parameter {
  name: string;
  title: string;
  description: string;
}
