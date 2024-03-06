// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError, UserErrorOptions } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import { ErrorCategory } from "./types";

/**
 * Failed to compile bicep into ARM template
 */
export class CompileBicepError extends UserError {
  constructor(filePath: string, error: Error) {
    const key = "error.arm.CompileBicepError";
    const errorOptions: UserErrorOptions = {
      source: "armDeploy",
      name: "CompileBicepError",
      message: getDefaultString(key, filePath, error.message || ""),
      displayMessage: getLocalizedString(key, filePath, error.message || ""),
      categories: [ErrorCategory.Internal],
      error: error,
    };
    super(errorOptions);
  }
}

/**
 * Failed to deploy arm templates for some reason
 */
export class DeployArmError extends UserError {
  constructor(deployName: string, resourceGroup: string, error: Error) {
    const key = "error.arm.DeployArmError";
    const errorOptions: UserErrorOptions = {
      source: "armDeploy",
      name: "DeployArmError",
      message: getDefaultString(key, deployName, resourceGroup, error.message || ""),
      displayMessage: getLocalizedString(key + ".Notification", deployName, resourceGroup),
      error: error,
      categories: [ErrorCategory.External],
    };
    super(errorOptions);
  }
}

/**
 * Failed to deploy arm templates and get error message failed
 */
export class GetArmDeploymentError extends UserError {
  constructor(deployName: string, resourceGroup: string, deployError: Error, getError: Error) {
    const errorOptions: UserErrorOptions = {
      source: "armDeploy",
      name: "GetArmDeploymentError",
      message: getDefaultString(
        "error.arm.GetArmDeploymentError",
        deployName,
        resourceGroup,
        deployError.message || "",
        getError.message || "",
        resourceGroup
      ),
      displayMessage: getLocalizedString(
        "error.arm.DeployArmError.Notification",
        deployName,
        resourceGroup
      ),
      categories: [ErrorCategory.External],
      error: deployError,
    };
    super(errorOptions);
  }
}

/**
 * Failed to convert ARM deployment result to action output
 */
export class ConvertArmOutputError extends UserError {
  constructor(outputKey: string) {
    const key = "error.arm.ConvertArmOutputError";
    const errorOptions: UserErrorOptions = {
      source: "armDeploy",
      name: "ConvertArmOutputError",
      message: getDefaultString(key, outputKey),
      displayMessage: getLocalizedString(key, outputKey),
      categories: [ErrorCategory.Internal],
    };
    super(errorOptions);
  }
}

/**
 * Failed to download to action output
 */
export class DownloadBicepCliError extends UserError {
  constructor(url: string, error: Error) {
    const key = "error.arm.DownloadBicepCliError";
    const errorOptions: UserErrorOptions = {
      source: "armDeploy",
      name: "DownloadBicepCliError",
      message: getDefaultString(key, url, error.message),
      displayMessage: getLocalizedString(key, url, error.message),
      categories: [ErrorCategory.External],
      error: error,
    };
    super(errorOptions);
  }
}
