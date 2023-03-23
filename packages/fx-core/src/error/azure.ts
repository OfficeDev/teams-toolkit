import {
  SystemError,
  SystemErrorOptions,
  UserError,
  UserErrorOptions,
} from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";

/**
 * Azure token/credential is invalid (usually not happen because TTK will ask user to login)
 */
export class InvalidAzureCredentialError extends SystemError {
  constructor() {
    const key = "error.azure.InvalidAzureCredentialError";
    const errorOptions: SystemErrorOptions = {
      source: "coordinator",
      name: "InvalidAzureCredentialError",
      message: getDefaultString(key),
      displayMessage: getLocalizedString(key),
    };
    super(errorOptions);
  }
}

/**
 * Azure subscription not available in the login tenant
 * may caused by user's account it not right
 */
export class InvalidAzureSubscriptionError extends UserError {
  constructor(subscriptionId: string) {
    const key = "error.azure.InvalidAzureSubscriptionError";
    const errorOptions: UserErrorOptions = {
      source: "coordinator",
      name: "InvalidAzureSubscriptionError",
      message: getDefaultString(key, subscriptionId),
      displayMessage: getLocalizedString(key, subscriptionId),
    };
    super(errorOptions);
  }
}

/**
 * Failed to select subscription in current account.
 */
export class SelectSubscriptionError extends UserError {
  constructor() {
    const key = "error.azure.SelectSubscriptionError";
    const errorOptions: UserErrorOptions = {
      source: "coordinator",
      name: "SelectSubscriptionError",
      message: getDefaultString(key),
      displayMessage: getLocalizedString(key),
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
    };
    super(errorOptions);
  }
}
