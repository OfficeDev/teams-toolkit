// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

export class ConstantString {
  static readonly CancelledMessage = "Operation cancelled";
  static readonly SpecVersionNotSupported = "OpenAPI version lower than 3.0.0 is not supported";
  static readonly NoServerInformation =
    "No server information found in the OpenAPI specification file";
  static readonly MultipleServerInformation =
    "Multiple server information found in the OpenAPI specification file";
  static readonly RemoteRefNotSupported = "Remote reference is not supported: %s";
  static readonly MissingOperationId = "Missing operationId: %s";
  static readonly NoSupportedApi = "No supported API found in the OpenAPI specification file";
  static readonly GetMethod = "get";
  static readonly PostMethod = "post";
}
