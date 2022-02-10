// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { v3 } from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { PluginDisplayName } from "../../../common/constants";
import { BuiltInSolutionNames } from "../fx-solution/v3/constants";
import { addFeature, getQuestionsForAddFeature, publishApplication } from "./addFeature";

@Service(BuiltInSolutionNames.spfx)
export class TeamsSPFxSolution implements v3.ISolution {
  name = BuiltInSolutionNames.spfx;
  displayName: string = PluginDisplayName.SpfxSolution;

  getQuestionsForAddFeature = getQuestionsForAddFeature;
  addFeature = addFeature;

  publishApplication = publishApplication;
}
