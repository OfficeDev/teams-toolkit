// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { getDefaultString, getLocalizedString } from "../localizeUtils";

export class AppServiceBicepConstant {
  static readonly resourceId: string = "provisionOutputs.botOutput.value.resourceId";
  static readonly hostName: string = "provisionOutputs.botOutput.value.validDomain";
  static readonly webAppEndpoint: string = "provisionOutputs.botOutputs.value.botWebAppEndpoint";
}

export class DeployStatusConstant {
  public static readonly RETRY_TIMES = 120; // Timeout: 20 min
  public static readonly BACKOFF_TIME_S = 10;
}

export class AzureOpsConstant {
  public static readonly TRY_LOGIN_AZURE = getLocalizedString("plugin.hosting.LoginToAzure");
  public static readonly CHECK_OUTPUT_LOG_AND_TRY_TO_FIX = getLocalizedString(
    "plugin.hosting.CheckLogAndFix"
  );
  public static readonly RETRY_CURRENT_STEP = getLocalizedString("suggestions.retryTheCurrentStep");
  public static readonly FAIL_TO_GET_AZURE_CREDENTIALS: [string, string] = [
    getDefaultString("plugin.hosting.FailRetrieveAzureCredentials"),
    getLocalizedString("plugin.hosting.FailRetrieveAzureCredentials"),
  ];
  public static readonly FAIL_TO_UPDATE_MESSAGE_ENDPOINT = (endpoint: string): [string, string] => [
    getDefaultString("plugin.hosting.FailedUpdateMessageEndpoint", endpoint),
    getLocalizedString("plugin.hosting.FailedUpdateMessageEndpoint", endpoint),
  ];
  public static readonly FAIL_TO_PROVISION_SOME_RESOURCE = (resource: string): [string, string] => [
    getDefaultString("plugin.hosting.FailedToProvision", resource),
    getLocalizedString("plugin.hosting.FailedToProvision", resource),
  ];
  public static readonly FAIL_TO_LIST_PUBLISHING_CREDENTIALS: [string, string] = [
    getDefaultString("plugin.hosting.FailedListPublishingCredentials"),
    getLocalizedString("plugin.hosting.FailedListPublishingCredentials"),
  ];
  public static readonly FAIL_TO_DO_ZIP_DEPLOY: [string, string] = [
    getDefaultString("plugin.hosting.FailedDeployZipFile"),
    getLocalizedString("plugin.hosting.FailedDeployZipFile"),
  ];
  public static readonly FAIL_TO_CHECK_DEPLOY_STATUS: [string, string] = [
    // eslint-disable-next-line no-secrets/no-secrets
    getDefaultString("plugin.hosting.FailedCheckDeployStatus"),
    // eslint-disable-next-line no-secrets/no-secrets
    getLocalizedString("plugin.hosting.FailedCheckDeployStatus"),
  ];
  public static readonly CHECK_DEPLOY_STATUS_TIMEOUT: [string, string] = [
    // eslint-disable-next-line no-secrets/no-secrets
    getDefaultString("plugin.hosting.CheckDeployStatusTimeout"),
    // eslint-disable-next-line no-secrets/no-secrets
    getLocalizedString("plugin.hosting.CheckDeployStatusTimeout"),
  ];
  public static readonly FAIL_TO_RESTART_APP_SERVICE: [string, string] = [
    getDefaultString("plugin.hosting.FailedRestartWebApp"),
    getLocalizedString("plugin.hosting.FailedRestartWebApp"),
  ];
}

export class ErrorNameConstant {
  public static readonly PRECONDITION_ERROR = "PreconditionError";
  public static readonly MSG_ENDPOINT_UPDATING_ERROR = "MessageEndpointUpdatingError";
  public static readonly PROVISION_ERROR = "ProvisionError";
  public static readonly LIST_PUBLISHING_CREDENTIALS_ERROR = "ListPublishingCredentialsError";
  public static readonly ZIP_DEPLOY_ERROR = "ZipDeployError";
  public static readonly DEPLOY_STATUS_ERROR = "DeployStatusError";
  public static readonly DEPLOY_TIMEOUT_ERROR = "DeployTimeoutError";
  public static readonly RESTART_WEBAPP_ERROR = "RestartWebappError";
}

export class AzureOperationCommonConstants {
  public static readonly msInOneSecond: number = 1000;
  public static readonly zipTimeMSGranularity: number =
    2 * AzureOperationCommonConstants.msInOneSecond;
  public static readonly latestTrustMtime: number = new Date(2000, 1, 1).getTime();
  public static readonly deployTimeoutInMs: number = 10 * 60 * 1000;
}

export class DeployConfigsConstants {
  public static readonly DEPLOYMENT_FOLDER = ".deployment";
  public static readonly DEPLOYMENT_INFO_FILE = "deployment.json";
  public static readonly DEPLOYMENT_ZIP_CACHE_FILE = "deployment.zip";
  public static readonly FUNC_IGNORE_FILE = ".funcignore";
  public static readonly GIT_IGNORE_FILE = ".gitignore";
}
