// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { HookContext } from "@feathersjs/hooks";
import { Json, ProjectSettings, Solution, SolutionContext, v2, v3 } from "@microsoft/teamsfx-api";
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

  envOutput?: Map<string, string>;
}
