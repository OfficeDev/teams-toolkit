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
  scaffoldSourceCode,
  generateResourceTemplate,
  provisionResource,
  publishApplication,
  addResource,
  addCapability,
} from "./scaffolding";
import { Service } from "typedi";
import { SolutionPluginsV2 } from "../../../core/SolutionPluginContainer";
import { getQuestionsForScaffolding } from "./questions";

@Service(SolutionPluginsV2.TeamsSPFxSolution)
export class TeamsSPFxSolution implements v3.SolutionPluginV3 {
  name = "fx-solution-spfx";
  displayName: string = PluginDisplayName.SpfxSolution;

  scaffoldSourceCode: (ctx: v2.Context, inputs: Inputs) => Promise<Result<Void, FxError>> =
    scaffoldSourceCode;
  generateResourceTemplate: (ctx: v2.Context, inputs: Inputs) => Promise<Result<Json, FxError>> =
    generateResourceTemplate;

  provisionResources: (
    ctx: v2.Context,
    inputs: Inputs,
    envInfo: v2.EnvInfoV2,
    tokenProvider: TokenProvider
  ) => Promise<v2.FxResult<v2.SolutionProvisionOutput, FxError>> = provisionResource;

  publishApplication: (
    ctx: v2.Context,
    inputs: Inputs,
    envInfo: v2.EnvInfoV2,
    tokenProvider: AppStudioTokenProvider
  ) => Promise<Result<Void, FxError>> = publishApplication;

  addResource: (
    ctx: v2.Context,
    localSettings: Json,
    inputs: v2.InputsWithProjectPath & { module?: keyof Module }
  ) => Promise<Result<Void, FxError>> = addResource;

  addCapability: (
    ctx: v2.Context,
    localSettings: Json,
    inputs: v2.InputsWithProjectPath
  ) => Promise<Result<Void, FxError>> = addCapability;

  getQuestionsForScaffolding?: (
    ctx: v2.Context,
    inputs: Inputs
  ) => Promise<Result<QTreeNode | QTreeNode[] | undefined, FxError>> = getQuestionsForScaffolding;
}
