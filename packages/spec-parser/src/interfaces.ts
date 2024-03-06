// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { OpenAPIV3 } from "openapi-types";

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
   * data of the warning.
   */
  data?: any;
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
   * data of the error.
   */
  data?: any;
}

export interface GenerateResult {
  allSuccess: boolean;
  warnings: WarningResult[];
}

/**
 * An enum that represents the types of errors that can occur during validation.
 */
export enum ErrorType {
  SpecNotValid = "spec-not-valid",
  RemoteRefNotSupported = "remote-ref-not-supported",
  NoServerInformation = "no-server-information",
  UrlProtocolNotSupported = "url-protocol-not-supported",
  RelativeServerUrlNotSupported = "relative-server-url-not-supported",
  NoSupportedApi = "no-supported-api",
  NoExtraAPICanBeAdded = "no-extra-api-can-be-added",
  ResolveServerUrlFailed = "resolve-server-url-failed",
  SwaggerNotSupported = "swagger-not-supported",
  MultipleAPIKeyNotSupported = "multiple-api-key-not-supported",

  ListFailed = "list-failed",
  listSupportedAPIInfoFailed = "list-supported-api-info-failed",
  FilterSpecFailed = "filter-spec-failed",
  UpdateManifestFailed = "update-manifest-failed",
  GenerateAdaptiveCardFailed = "generate-adaptive-card-failed",
  GenerateFailed = "generate-failed",
  ValidateFailed = "validate-failed",
  GetSpecFailed = "get-spec-failed",

  Cancelled = "cancelled",
  Unknown = "unknown",
}

/**
 * An enum that represents the types of warnings that can occur during validation.
 */
export enum WarningType {
  OperationIdMissing = "operationid-missing",
  GenerateCardFailed = "generate-card-failed",
  OperationOnlyContainsOptionalParam = "operation-only-contains-optional-param",
  ConvertSwaggerToOpenAPI = "convert-swagger-to-openapi",
  Unknown = "unknown",
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

export interface ImageElement {
  type: string;
  url: string;
  $when: string;
}

export interface ArrayElement {
  type: string;
  $data: string;
  items: Array<TextBlockElement | ImageElement | ArrayElement>;
}

export interface AdaptiveCard {
  type: string;
  $schema: string;
  version: string;
  body: Array<TextBlockElement | ImageElement | ArrayElement>;
}

export interface PreviewCardTemplate {
  title: string;
  subtitle?: string;
  image?: {
    url: string;
    alt?: string;
    $when?: string;
  };
}

export interface WrappedAdaptiveCard {
  version: string;
  $schema?: string;
  jsonPath?: string;
  responseLayout: string;
  responseCardTemplate: AdaptiveCard;
  previewCardTemplate: PreviewCardTemplate;
}

export interface ChoicesItem {
  title: string;
  value: string;
}

export interface Parameter {
  name: string;
  title: string;
  description: string;
  inputType?: "text" | "textarea" | "number" | "date" | "time" | "toggle" | "choiceset";
  value?: string;
  choices?: ChoicesItem[];
}

export interface CheckParamResult {
  requiredNum: number;
  optionalNum: number;
  isValid: boolean;
}

export interface ParseOptions {
  allowMissingId?: boolean;
  allowSwagger?: boolean;
  allowAPIKeyAuth?: boolean;
  allowMultipleParameters?: boolean;
  allowOauth2?: boolean;
}

export interface APIInfo {
  method: string;
  path: string;
  title: string;
  id: string;
  parameters: Parameter[];
  description: string;
  warning?: WarningResult;
}

export interface ListAPIResult {
  api: string;
  server: string;
  operationId: string;
  auth?: OpenAPIV3.SecuritySchemeObject;
}

export interface AuthSchema {
  authSchema: OpenAPIV3.SecuritySchemeObject;
  name: string;
}
