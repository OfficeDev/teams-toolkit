// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export class CommonConstants {
  public static readonly msInOneSecond: number = 1000;
  public static readonly zipTimeMSGranularity: number = 2 * CommonConstants.msInOneSecond;
  public static readonly latestTrustMtime: number = new Date(2000, 1, 1).getTime();
  public static readonly deployTimeoutInMs: number = 10 * 60 * 1000;
}

export class FuncHostedBotDeployConfigs {
  public static readonly DEPLOYMENT_INFO_FILE = "deployment.json";
  public static readonly DEPLOYMENT_ZIP_CACHE_FILE = "deployment.zip";
  public static readonly FUNC_IGNORE_FILE = ".funcignore";
  public static readonly GIT_IGNORE_FILE = ".gitignore";
}
