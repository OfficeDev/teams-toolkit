// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  SystemError,
  SystemErrorOptions,
  UserError,
  UserErrorOptions,
} from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import { ErrorCategory } from "./types";

/**
 * Azure token/credential is invalid (usually not happen because TTK will ask user to login)
 */
export class InvalidAzureCredentialError extends SystemError {
  constructor(source?: string) {
    const key = "error.azure.InvalidAzureCredentialError";
    const errorOptions: SystemErrorOptions = {
      source: source || "coordinator",
      name: "InvalidAzureCredentialError",
      message: getDefaultString(key),
      displayMessage: getLocalizedString(key),
      categories: [ErrorCategory.External],
    };
    super(errorOptions);
  }
}

/**
 * Azure subscription not available in the login tenant
 * may caused by user's account it not right
 */
export class InvalidAzureSubscriptionError extends UserError {
  constructor(subscriptionId: string, source?: string) {
    const key = "error.azure.InvalidAzureSubscriptionError";
    const errorOptions: UserErrorOptions = {
      source: source || "coordinator",
      name: "InvalidAzureSubscriptionError",
      message: getDefaultString(key, subscriptionId),
      displayMessage: getLocalizedString(key, subscriptionId),
      categories: [ErrorCategory.External],
    };
    super(errorOptions);
  }
}

/**
 * Failed to select subscription in current account.
 */
export class SelectSubscriptionError extends UserError {
  constructor(source?: string) {
    const key = "error.azure.SelectSubscriptionError";
    const errorOptions: UserErrorOptions = {
      source: source || "coordinator",
      name: "SelectSubscriptionError",
      message: getDefaultString(key),
      displayMessage: getLocalizedString(key),
      categories: [ErrorCategory.External],
    };
    super(errorOptions);
  }
}

/**
 * Resource group name exists when trying to create it
 */
export class ResourceGroupConflictError extends UserError {
  constructor(resourceGroupName: string, subscriptionId: string) {
    const key = "error.azure.ResourceGroupConflictError";
    const errorOptions: UserErrorOptions = {
      source: "coordinator",
      name: "ResourceGroupConflictError",
      message: getDefaultString(key, resourceGroupName, subscriptionId),
      displayMessage: getLocalizedString(key, resourceGroupName, subscriptionId),
      categories: [ErrorCategory.External],
    };
    super(errorOptions);
  }
}

/**
 * Resource group does not exist when try to use it
 */
export class ResourceGroupNotExistError extends UserError {
  constructor(resourceGroupName: string, subscriptionId: string) {
    const key = "error.azure.ResourceGroupNotExistError";
    const errorOptions: UserErrorOptions = {
      source: "coordinator",
      name: "ResourceGroupNotExistError",
      message: getDefaultString(key, resourceGroupName, subscriptionId),
      displayMessage: getLocalizedString(key, resourceGroupName, subscriptionId),
      categories: [ErrorCategory.External],
    };
    super(errorOptions);
  }
}

/**
 * Create resource group error
 */
export class CreateResourceGroupError extends UserError {
  constructor(resourceGroupName: string, subscriptionId: string, message: string, error?: any) {
    const key = "error.azure.CreateResourceGroupError";
    const errorOptions: UserErrorOptions = {
      source: "coordinator",
      name: "CreateResourceGroupError",
      message: getDefaultString(key, resourceGroupName, subscriptionId, message),
      displayMessage: getLocalizedString(key, resourceGroupName, subscriptionId, message),
      categories: [ErrorCategory.External],
      error: error,
    };
    super(errorOptions);
  }
}

/**
 * Check resource group existence error
 */
export class CheckResourceGroupExistenceError extends UserError {
  constructor(resourceGroupName: string, subscriptionId: string, message: string, error?: any) {
    const key = "error.azure.CheckResourceGroupExistenceError";
    const errorOptions: UserErrorOptions = {
      source: "coordinator",
      name: "CheckResourceGroupExistenceError",
      message: getDefaultString(key, resourceGroupName, subscriptionId, message),
      displayMessage: getLocalizedString(key, resourceGroupName, subscriptionId, message),
      categories: [ErrorCategory.External],
      error: error,
    };
    super(errorOptions);
  }
}

/**
 * List resource groups error
 */
export class ListResourceGroupsError extends UserError {
  constructor(subscriptionId: string, message: string, error?: any) {
    const key = "error.azure.ListResourceGroupsError";
    const errorOptions: UserErrorOptions = {
      source: "coordinator",
      name: "ListResourceGroupsError",
      message: getDefaultString(key, subscriptionId, message),
      displayMessage: getLocalizedString(key, subscriptionId, message),
      categories: [ErrorCategory.External],
      error: error,
    };
    super(errorOptions);
  }
}

/**
 * Get resource group error
 */
export class GetResourceGroupError extends UserError {
  constructor(resourceGroupName: string, subscriptionId: string, message: string, error?: any) {
    const key = "error.azure.GetResourceGroupError";
    const errorOptions: UserErrorOptions = {
      source: "coordinator",
      name: "GetResourceGroupError",
      message: getDefaultString(key, resourceGroupName, subscriptionId, message),
      displayMessage: getLocalizedString(key, resourceGroupName, subscriptionId, message),
      categories: [ErrorCategory.External],
      error: error,
    };
    super(errorOptions);
  }
}

/**
 * List resource group locations error
 */
export class ListResourceGroupLocationsError extends UserError {
  constructor(subscriptionId: string, message: string, error?: any) {
    const key = "error.azure.ListResourceGroupLocationsError";
    const errorOptions: UserErrorOptions = {
      source: "coordinator",
      name: "ListResourceGroupLocationsError",
      message: getDefaultString(key, subscriptionId, message),
      displayMessage: getLocalizedString(key, subscriptionId, message),
      categories: [ErrorCategory.External],
      error: error,
    };
    super(errorOptions);
  }
}
