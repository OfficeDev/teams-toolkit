// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { getDefaultString, getLocalizedString } from "../localizeUtils";

export class DeployStatusConstant {
  public static readonly RETRY_TIMES = 120; // Timeout: 20 min
  public static readonly BACKOFF_TIME_S = 10;
}

export class AzureOpsConstant {
  public static TRY_LOGIN_AZURE = () => getLocalizedString("plugin.hosting.LoginToAzure");
  public static CHECK_OUTPUT_LOG_AND_TRY_TO_FIX = () =>
    getLocalizedString("plugin.hosting.CheckLogAndFix");
  public static RETRY_CURRENT_STEP = () => getLocalizedString("suggestions.retryTheCurrentStep");
  public static FAIL_TO_GET_AZURE_CREDENTIALS: () => [string, string] = () => [
    getDefaultString("plugin.hosting.FailRetrieveAzureCredentials"),
    getLocalizedString("plugin.hosting.FailRetrieveAzureCredentials"),
  ];
  public static readonly FAIL_TO_LIST_PUBLISHING_CREDENTIALS: () => [string, string] = () => [
    getDefaultString("plugin.hosting.FailedListPublishingCredentials"),
    getLocalizedString("plugin.hosting.FailedListPublishingCredentials"),
  ];
  public static readonly FAIL_TO_DO_ZIP_DEPLOY: () => [string, string] = () => [
    getDefaultString("plugin.hosting.FailedDeployZipFile"),
    getLocalizedString("plugin.hosting.FailedDeployZipFile"),
  ];
  public static readonly FAIL_TO_CHECK_DEPLOY_STATUS: () => [string, string] = () => [
    // eslint-disable-next-line no-secrets/no-secrets
    getDefaultString("plugin.hosting.FailedCheckDeployStatus"),
    // eslint-disable-next-line no-secrets/no-secrets
    getLocalizedString("plugin.hosting.FailedCheckDeployStatus"),
  ];
  public static readonly CHECK_DEPLOY_STATUS_TIMEOUT: () => [string, string] = () => [
    // eslint-disable-next-line no-secrets/no-secrets
    getDefaultString("plugin.hosting.CheckDeployStatusTimeout"),
    // eslint-disable-next-line no-secrets/no-secrets
    getLocalizedString("plugin.hosting.CheckDeployStatusTimeout"),
  ];
  public static readonly FAIL_TO_RESTART_APP_SERVICE: () => [string, string] = () => [
    getDefaultString("plugin.hosting.FailedRestartWebApp"),
    getLocalizedString("plugin.hosting.FailedRestartWebApp"),
  ];
}

export class ErrorNameConstant {
  public static readonly PRECONDITION_ERROR = "PreconditionError";
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
