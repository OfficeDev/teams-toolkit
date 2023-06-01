// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { HookContext } from "@feathersjs/hooks";
import * as dotenv from "dotenv";
import { VersionState } from "../common/versionMetadata";
export interface CoreHookContext extends HookContext {
  envVars?: dotenv.DotenvParseOutput;
}

export interface VersionCheckRes {
  currentVersion: string;
  isSupport: VersionState;
  trackingId: string;
  versionSource: string;
}

export interface PreProvisionResForVS {
  needAzureLogin: boolean;
  needM365Login: boolean;
  resolvedAzureSubscriptionId?: string;
  resolvedAzureResourceGroupName?: string;
}
