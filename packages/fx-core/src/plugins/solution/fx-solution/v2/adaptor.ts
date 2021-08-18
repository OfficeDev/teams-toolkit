import {
  v2,
  SolutionContext,
  Inputs,
  SolutionConfig,
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
  ConfigMap,
} from "@microsoft/teamsfx-api";

class BaseSolutionContextAdaptor implements SolutionContext {
  config: SolutionConfig = new Map();
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
    (this.answers = inputs), //tbd
      (this.projectSettings = v2context.projectSetting);
    this.localSettings = undefined;
    this.ui = v2context.userInteraction;
    this.cryptoProvider = undefined;
    this.config = new Map(); // tbd
  }
}
