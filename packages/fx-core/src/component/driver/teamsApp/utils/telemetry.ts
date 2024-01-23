// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Context, SystemError, UserError } from "@microsoft/teamsfx-api";
import { DriverContext } from "../../interface/commonArgs";
import { Constants } from "../constants";

export enum TelemetryPropertyKey {
  component = "component",
  errorType = "error-type",
  errorCode = "error-code",
  errorMessage = "error-message",
  updateExistingApp = "update",
  success = "success",
  appId = "appid",
  tenantId = "tenant-id",
  publishedAppId = "published-app-id",
  customizedKeys = "customized-manifest-keys",
  customizedOpenAPIKeys = "customized-openapi-keys",
  validationErrors = "validation-errors",
  validationWarnings = "validation-warnings",
  OverwriteIfAppAlreadyExists = "overwrite-if-app-already-exists",
  region = "region",
}

export enum TelemetryPropertyValue {
  UserError = "user",
  SystemError = "system",
  success = "yes",
  failure = "no",
  Global = "global",
}

export enum TelemetryEventName {
  checkPermission = "check-permission",
  grantPermission = "grant-permission",
  listCollaborator = "list-collaborator",
  appStudioApi = "app-studio-api",
  authSvcApi = "auth-svc-api",
}

export class TelemetryUtils {
  static ctx: Context | DriverContext;

  public static init(ctx: Context | DriverContext) {
    TelemetryUtils.ctx = ctx;
  }
}
