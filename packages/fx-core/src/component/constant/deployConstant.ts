// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export class DeployConstant {
  // deploy error type
  public static readonly DEPLOY_ERROR_TYPE = "DeployError";
  // deploy temp folder
  public static readonly DEPLOYMENT_TMP_FOLDER = ".deployment";
  // seconds to millisecond
  public static readonly MILLIS_SECONDS: number = 1000;
  // If mtime is valid and the two mtime is same in two-seconds, we think the two are same file.
  public static readonly ZIP_TIME_MS_GRANULARITY: number = 2 * DeployConstant.MILLIS_SECONDS;
  // Some files' mtime in node_modules are too old, which may be invalid,
  // so we arbitrarily add a limitation to update this kind of files.
  public static readonly LATEST_TRUST_MS_TIME: Date = new Date(2000, 1, 1);
  // deploy zip file name
  public static readonly DEPLOYMENT_ZIP_CACHE_FILE = "deployment.zip";
  // call zip deploy api timeout
  public static readonly DEPLOY_TIMEOUT_IN_MS: number = 10 * 60 * 1000;
  // check deploy status timeout
  public static readonly DEPLOY_CHECK_RETRY_TIMES = 120; // Timeout: 20 min
  // check deploy status interval
  public static readonly BACKOFF_TIME_S = 10;
  // azure storage container name for static website
  public static readonly AZURE_STORAGE_CONTAINER_NAME = "$web";
  // days to millisecond
  public static readonly DAY_IN_MS = 1000 * 60 * 60 * 24;
  // The time at which the Azure storage shared access signature becomes valid.
  public static readonly SAS_TOKEN_LIFE_TIME_PADDING = DeployConstant.DAY_IN_MS;
  // The time at which the Azure storage shared access signature becomes invalid.
  public static readonly SAS_TOKEN_LIFE_TIME = DeployConstant.DAY_IN_MS * 3;
  // default index document for Azure storage static website
  public static readonly DEFAULT_INDEX_DOCUMENT = "index.html";
  // default error document for Azure storage static website
  public static readonly DEFAULT_ERROR_DOCUMENT = DeployConstant.DEFAULT_INDEX_DOCUMENT;
  // default deploy over time
  public static readonly DEPLOY_OVER_TIME = 1000 * 120;
  // default deploy retry times
  public static readonly DEPLOY_UPLOAD_RETRY_TIMES = 2;
}

export enum DeployStatus {
  Pending = 0,
  Building = 1,
  Deploying = 2,
  Failed = 3,
  Success = 4,
}
