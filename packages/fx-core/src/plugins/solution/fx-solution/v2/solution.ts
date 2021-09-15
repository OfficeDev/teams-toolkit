import {
  v2,
  Inputs,
  FxError,
  Result,
  ok,
  err,
  Void,
  AppStudioTokenProvider,
  AzureAccountProvider,
  Func,
  Json,
  QTreeNode,
  TokenProvider,
} from "@microsoft/teamsfx-api";
import { DeploymentInputs, EnvInfoV2, ProvisionInputs } from "@microsoft/teamsfx-api/build/v2";
import { Service } from "typedi";
import { PluginDisplayName } from "../../../../common/constants";
import { SolutionPluginsV2 } from "../../../../core/SolutionPluginContainer";
import { createEnv } from "./createEnv";
import { deploy } from "./deploy";
import { executeUserTask } from "./executeUserTask";
import { generateResourceTemplate } from "./generateResourceTemplate";
import { getQuestionsForScaffolding } from "./getQuestions";
import { provisionResource } from "./provision";
import { provisionLocalResource } from "./provisionLocal";
import { publishApplication } from "./publish";
import { scaffoldSourceCode } from "./scaffolding";

@Service(SolutionPluginsV2.AzureTeamsSolutionV2)
export class TeamsAppSolutionV2 implements v2.SolutionPlugin {
  name = "fx-solution-azure";
  displayName: string = PluginDisplayName.Solution;

  scaffoldSourceCode: (ctx: v2.Context, inputs: Inputs) => Promise<Result<Void, FxError>> =
    scaffoldSourceCode;
  generateResourceTemplate: (ctx: v2.Context, inputs: Inputs) => Promise<Result<Json, FxError>> =
    generateResourceTemplate;

  provisionResources: (
    ctx: v2.Context,
    inputs: Inputs,
    envInfo: EnvInfoV2,
    tokenProvider: TokenProvider
  ) => Promise<v2.FxResult<v2.SolutionProvisionOutput, FxError>> = provisionResource;

  deploy?: (
    ctx: v2.Context,
    inputs: Inputs,
    provisionOutputs: Json,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>> = deploy;

  publishApplication: (
    ctx: v2.Context,
    inputs: Inputs,
    provisionInputConfig: Json,
    provisionOutputs: Json,
    tokenProvider: AppStudioTokenProvider
  ) => Promise<Result<Void, FxError>> = publishApplication;
  provisionLocalResource?: (
    ctx: v2.Context,
    inputs: Inputs,
    localSettings: Json,
    tokenProvider: TokenProvider
  ) => Promise<v2.FxResult<Json, FxError>> = provisionLocalResource;

  getQuestionsForScaffolding?: (
    ctx: v2.Context,
    inputs: Inputs
  ) => Promise<Result<QTreeNode | undefined, FxError>> = getQuestionsForScaffolding;

  executeUserTask?: (
    ctx: v2.Context,
    inputs: Inputs,
    func: Func,
    tokenProvider: TokenProvider
  ) => Promise<Result<unknown, FxError>> = executeUserTask;

  createEnv?: (ctx: v2.Context, inputs: Inputs) => Promise<Result<Void, FxError>> = createEnv;

  // grantPermission?: (
  //   ctx: v2.Context,
  //   inputs: Inputs,
  //   tokenProvider: TokenProvider
  // ) => Promise<Result<any, FxError>>;
  // checkPermission?: (
  //   ctx: v2.Context,
  //   inputs: Inputs,
  //   tokenProvider: TokenProvider
  // ) => Promise<Result<any, FxError>>;
  // listCollaborator?: (
  //   ctx: v2.Context,
  //   inputs: Inputs,
  //   tokenProvider: TokenProvider
  // ) => Promise<Result<any, FxError>>;
}
