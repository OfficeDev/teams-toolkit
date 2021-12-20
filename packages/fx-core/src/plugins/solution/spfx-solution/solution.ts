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
} from "@microsoft/teamsfx-api";
import { PluginDisplayName } from "../../../common/constants";
import Module from "module";
import {
  init,
  scaffold,
  generateResourceTemplate,
  publishApplication,
  addResource,
  addModule,
} from "./scaffolding";
import { getQuestionsForInit } from "./init";
import { Service } from "typedi";
import { getQuestionsForScaffolding } from "./questions";
import { BuiltInSolutionNames } from "../fx-solution/v3/constants";
import { OptionItem } from "@microsoft/teamsfx-api";

@Service(BuiltInSolutionNames.spfx)
export class TeamsSPFxSolution implements v3.ISolution {
  name = BuiltInSolutionNames.spfx;
  displayName: string = PluginDisplayName.SpfxSolution;

  init: (ctx: v2.Context, inputs: v2.InputsWithProjectPath) => Promise<Result<Void, FxError>> =
    init;
  getQuestionsForInit?: (
    ctx: v2.Context,
    inputs: Inputs
  ) => Promise<Result<QTreeNode | undefined, FxError>> = getQuestionsForInit;

  scaffold: (
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath & { module?: string; template?: OptionItem }
  ) => Promise<Result<Void, FxError>> = scaffold;

  generateResourceTemplate: (ctx: v2.Context, inputs: Inputs) => Promise<Result<Json, FxError>> =
    generateResourceTemplate;

  publishApplication: (
    ctx: v2.Context,
    inputs: Inputs,
    envInfo: v2.EnvInfoV2,
    tokenProvider: AppStudioTokenProvider
  ) => Promise<Result<Void, FxError>> = publishApplication;

  addResource: (
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath & { module?: string; resource?: string }
  ) => Promise<Result<Void, FxError>> = addResource;

  addModule: (
    ctx: v2.Context,
    localSettings: Json,
    inputs: v2.InputsWithProjectPath & { capabilities?: string[] }
  ) => Promise<Result<Void, FxError>> = addModule;

  getQuestionsForScaffold?: (
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath
  ) => Promise<Result<QTreeNode | undefined, FxError>> = getQuestionsForScaffolding;
}
