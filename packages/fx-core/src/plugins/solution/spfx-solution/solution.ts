// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { v3 } from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { PluginDisplayName } from "../../../common/constants";
import { BuiltInSolutionNames } from "../fx-solution/v3/constants";
import { scaffold } from "../fx-solution/v3/scaffold";
import { addModule } from "./addModule";
import { getQuestionsForInit, init } from "./init";
import { addResource, getQuestionsForScaffold, publishApplication } from "./scaffold";

@Service(BuiltInSolutionNames.spfx)
export class TeamsSPFxSolution implements v3.ISolution {
  name = BuiltInSolutionNames.spfx;
  displayName: string = PluginDisplayName.SpfxSolution;

  init = init;
  getQuestionsForInit = getQuestionsForInit;

  scaffold = scaffold;
  getQuestionsForScaffold = getQuestionsForScaffold;

  publishApplication = publishApplication;

  addResource = addResource;

  addModule = addModule;
}
