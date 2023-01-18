// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { HookContext } from "@feathersjs/hooks";
import { Json, ProjectSettings, Solution, SolutionContext, v2, v3 } from "@microsoft/teamsfx-api";
import * as dotenv from "dotenv";
import { VersionState } from "../common/versionMetadata";
export interface CoreHookContext extends HookContext {
  projectSettings?: ProjectSettings;
  solutionContext?: SolutionContext;
  solution?: Solution;

  contextV2?: v2.Context;
  solutionV2?: v2.SolutionPlugin;
  envInfoV2?: v2.EnvInfoV2;
  localSettings?: Json;

  //
  envInfoV3?: v3.EnvInfoV3;
  solutionV3?: v3.ISolution;

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
