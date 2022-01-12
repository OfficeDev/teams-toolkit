// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  TokenProvider,
  FxError,
  Inputs,
  Json,
  Result,
  v2,
  v3,
  AppStudioTokenProvider,
  Void,
  QTreeNode,
  OptionItem,
} from "@microsoft/teamsfx-api";
import { PluginDisplayName } from "../../../common/constants";
import Module from "module";
import {
  scaffold,
  getQuestionsForScaffold,
  generateResourceTemplate,
  publishApplication,
  addResource,
} from "./scaffold";
import { getQuestionsForInit, init } from "./init";
import { Service } from "typedi";
import { BuiltInSolutionNames } from "../fx-solution/v3/constants";
import { addModule } from "./addModule";

@Service(BuiltInSolutionNames.spfx)
export class TeamsSPFxSolution implements v3.ISolution {
  name = BuiltInSolutionNames.spfx;
  displayName: string = PluginDisplayName.SpfxSolution;

  init = init;
  getQuestionsForInit = getQuestionsForInit;

  scaffold = scaffold;
  getQuestionsForScaffold = getQuestionsForScaffold;

  generateResourceTemplate = generateResourceTemplate;

  publishApplication = publishApplication;

  addResource = addResource;

  addModule = addModule;
}
