import {
  v2,
  SolutionContext,
  Inputs,
  AppStudioTokenProvider,
  AzureAccountProvider,
  CryptoProvider,
  GraphTokenProvider,
  LocalSettings,
  LogProvider,
  ProjectSettings,
  TelemetryReporter,
  TreeProvider,
  UserInteraction,
} from "@microsoft/teamsfx-api";
import { profile } from "console";
import { newEnvInfo } from "../../../../core/tools";

class BaseSolutionContextAdaptor implements SolutionContext {
  envInfo = newEnvInfo();
  root = "";
  targetEnvName?: string | undefined;
  logProvider?: LogProvider | undefined;
  telemetryReporter?: TelemetryReporter | undefined;
  azureAccountProvider?: AzureAccountProvider | undefined;
  graphTokenProvider?: GraphTokenProvider | undefined;
  appStudioToken?: AppStudioTokenProvider | undefined;
  treeProvider?: TreeProvider | undefined;
  answers?: Inputs | undefined;
  projectSettings?: ProjectSettings | undefined;
  localSettings?: LocalSettings | undefined;
  ui?: UserInteraction | undefined;
  cryptoProvider?: CryptoProvider | undefined;
}

/**
 * An adpator for making API v2 compatible with legacy api.
 */
export class ScaffoldingContextAdapter extends BaseSolutionContextAdaptor {
  constructor(params: Parameters<NonNullable<v2.SolutionPlugin["scaffoldSourceCode"]>>) {
    super();
    const v2context: v2.Context = params[0];
    const inputs: Inputs = params[1];
    this.root = inputs.projectPath ?? "";
    this.targetEnvName = inputs.targetEnvName;
    this.logProvider = v2context.logProvider;
    this.telemetryReporter = v2context.telemetryReporter;
    this.azureAccountProvider = undefined;
    this.graphTokenProvider = undefined;
    this.appStudioToken = undefined;
    this.treeProvider = undefined;
    this.answers = inputs;
    this.projectSettings = v2context.projectSetting;
    this.localSettings = undefined;
    this.ui = v2context.userInteraction;
    this.cryptoProvider = undefined;
    this.envInfo = newEnvInfo(); // tbd
  }
}

export class ProvisionContextAdapter extends BaseSolutionContextAdaptor {
  constructor(params: Parameters<NonNullable<v2.SolutionPlugin["provisionResources"]>>) {
    super();
    const v2context: v2.Context = params[0];
    const inputs: Inputs = params[1];
    const templates = params[2];
    const tokenProvidier = params[3];

    this.root = inputs.projectPath ?? "";
    this.targetEnvName = inputs.targetEnvName;
    this.logProvider = v2context.logProvider;
    this.telemetryReporter = v2context.telemetryReporter;
    this.azureAccountProvider = tokenProvidier.azureAccountProvider;
    this.graphTokenProvider = tokenProvidier.graphTokenProvider;
    this.appStudioToken = tokenProvidier.appStudioToken;
    this.treeProvider = undefined;
    this.answers = inputs;
    this.projectSettings = v2context.projectSetting;
    this.localSettings = undefined;
    this.ui = v2context.userInteraction;
    this.cryptoProvider = undefined;
    this.envInfo = {
      envName: "default",
      config: undefined,
      profile: undefined,
    };
  }
}
