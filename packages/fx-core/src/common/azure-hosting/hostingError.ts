// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { getDefaultString, getLocalizedString } from "../localizeUtils";
import { AzureOpsConstant, ErrorNameConstant } from "./hostingConstant";

export type InnerError = HttpError | Error | unknown;

export type HttpError = {
  response: {
    status?: number;
    data?: {
      errorMessage?: string;
      error?: {
        code?: string;
        message?: string;
      };
    };
  };
};

export class CommonHostingError extends Error {
  public name: string;
  public details: [string, string];
  public suggestions: string[];
  public innerError?: InnerError;

  constructor(
    name: string,
    details: [string, string],
    innerError?: InnerError,
    suggestions?: string[]
  ) {
    super(details[0]);
    this.name = name;
    this.details = details;
    this.suggestions = suggestions ?? [
      AzureOpsConstant.CHECK_OUTPUT_LOG_AND_TRY_TO_FIX(),
      AzureOpsConstant.RETRY_CURRENT_STEP(),
    ];
    this.innerError = innerError;
  }

  genMessage(): string {
    let msg = `${this.details[0]} `;
    if (this.suggestions.length > 0) {
      msg += getDefaultString(
        "plugins.common.hosting.ErrorSuggestions",
        this.suggestions.join(" ")
      );
    }
    return msg;
  }
  genDisplayMessage(): string {
    let msg = `${this.details[1]} `;
    if (this.suggestions.length > 0) {
      msg += getLocalizedString(
        "plugins.common.hosting.ErrorSuggestions",
        this.suggestions.join(" ")
      );
    }
    return msg;
  }
}

export class PreconditionError extends CommonHostingError {
  constructor(message: [string, string], suggestions: string[]) {
    super(ErrorNameConstant.PRECONDITION_ERROR, message, suggestions);
  }
}

export class MessageEndpointUpdatingError extends CommonHostingError {
  constructor(endpoint: string, innerError?: InnerError) {
    super(
      ErrorNameConstant.MSG_ENDPOINT_UPDATING_ERROR,
      AzureOpsConstant.FAIL_TO_UPDATE_MESSAGE_ENDPOINT(endpoint),
      innerError
    );
  }
}

export class ProvisionError extends CommonHostingError {
  constructor(resource: string, innerError?: InnerError) {
    super(
      ErrorNameConstant.PROVISION_ERROR,
      AzureOpsConstant.FAIL_TO_PROVISION_SOME_RESOURCE(resource),
      innerError
    );
  }
}

export class ListPublishingCredentialsError extends CommonHostingError {
  constructor(innerError?: InnerError) {
    super(
      ErrorNameConstant.LIST_PUBLISHING_CREDENTIALS_ERROR,
      AzureOpsConstant.FAIL_TO_LIST_PUBLISHING_CREDENTIALS(),
      innerError
    );
  }
}

export class ZipDeployError extends CommonHostingError {
  constructor(innerError?: InnerError) {
    super(ErrorNameConstant.ZIP_DEPLOY_ERROR, AzureOpsConstant.FAIL_TO_DO_ZIP_DEPLOY(), innerError);
  }
}

export class DeployStatusError extends CommonHostingError {
  constructor(innerError?: InnerError) {
    super(
      ErrorNameConstant.DEPLOY_STATUS_ERROR,
      AzureOpsConstant.FAIL_TO_CHECK_DEPLOY_STATUS(),
      innerError
    );
  }
}

export class DeployTimeoutError extends CommonHostingError {
  constructor() {
    super(ErrorNameConstant.DEPLOY_TIMEOUT_ERROR, AzureOpsConstant.CHECK_DEPLOY_STATUS_TIMEOUT());
  }
}

export class RestartWebAppError extends CommonHostingError {
  constructor(innerError?: InnerError) {
    super(
      ErrorNameConstant.RESTART_WEBAPP_ERROR,
      AzureOpsConstant.FAIL_TO_RESTART_APP_SERVICE(),
      innerError
    );
  }
}
