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
import { Service } from "typedi";
import { SolutionPluginsV2 } from "../../../core/SolutionPluginContainer";
import { getQuestionsForScaffolding } from "./questions";

@Service(SolutionPluginsV2.TeamsSPFxSolution)
export class TeamsSPFxSolution implements v3.ISolution {
  name = "fx-solution-spfx";
  displayName: string = PluginDisplayName.SpfxSolution;

  init: (ctx: v2.Context, inputs: v2.InputsWithProjectPath) => Promise<Result<Void, FxError>> =
    init;

  scaffold: (
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath & { moduleIndex?: number }
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
    inputs: v2.InputsWithProjectPath & { moduleIndex?: number }
  ) => Promise<Result<Void, FxError>> = addResource;

  addModule: (
    ctx: v2.Context,
    localSettings: Json,
    inputs: v2.InputsWithProjectPath & { capabilities?: string[] }
  ) => Promise<Result<Void, FxError>> = addModule;

  getQuestionsForScaffolding?: (
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath
  ) => Promise<Result<QTreeNode | QTreeNode[] | undefined, FxError>> = getQuestionsForScaffolding;
}
