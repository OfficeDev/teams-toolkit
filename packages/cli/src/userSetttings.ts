// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import os from "os";
import fs from "fs-extra";
import path from "path";

import { ConfigFolderName, FxError, err, ok, Result } from "@microsoft/teamsfx-api";
import { WriteFileError, jsonUtils } from "@microsoft/teamsfx-core";
import { cliSource } from "./constants";

export enum CliConfigOptions {
  Telemetry = "telemetry",
  EnvCheckerValidateDotnetSdk = "validate-dotnet-sdk",
  EnvCheckerValidateFuncCoreTools = "validate-func-core-tools",
  EnvCheckerValidateNode = "validate-node",
  EnvCheckerValidateNgrok = "validate-ngrok",
  TrustDevCert = "trust-development-certificate",
  RunFrom = "run-from",
  Interactive = "interactive",
}

export enum CliConfigRunFrom {
  GitHub = "GitHub",
  AzDo = "AzDo",
  Jenkins = "Jenkins",
  Other = "Other",
}
