// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

export class ConstantString {
  static readonly CancelledMessage = "Operation cancelled.";
  static readonly SpecVersionNotSupported = "OpenAPI version lower than 3.0.0 is not supported.";
  static readonly NoServerInformation =
    "No server information found in the OpenAPI specification file.";
  static readonly MultipleServerInformation =
    "Multiple server information found in the OpenAPI specification file.";
  static readonly RemoteRefNotSupported = "Remote reference is not supported: %s.";
  static readonly MissingOperationId = "Missing operationIds: %s.";
  static readonly NoSupportedApi = "No supported API found in the OpenAPI specification file.";
  static readonly AdditionalPropertiesNotSupported =
    "additionalProperties is not supported, and will be ignored.";
  static readonly SchemaNotSupported = "oneOf, anyOf, and not schema is not supported: %s.";
  static readonly UnknownSchema = "Unknown schema: %s.";
  static readonly GetMethod = "get";
  static readonly PostMethod = "post";
  static readonly AdaptiveCardVersion = "1.5";
  static readonly AdaptiveCardSchema = "http://adaptivecards.io/schemas/adaptive-card.json";
  static readonly AdaptiveCardType = "AdaptiveCard";
  static readonly TextBlockType = "TextBlock";
  static readonly ContainerType = "Container";
}
