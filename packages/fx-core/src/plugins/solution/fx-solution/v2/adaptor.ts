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
  ConfigMap,
  EnvConfig,
  PermissionRequestProvider,
  Json,
  PluginContext,
  Result,
  FxError,
  err,
  returnSystemError,
} from "@microsoft/teamsfx-api";
import { EnvInfoV2 } from "@microsoft/teamsfx-api/build/v2";
import { PluginNames, SolutionError, SolutionSource } from "..";
import { ArmTemplateResult, NamedArmResourcePlugin } from "../../../../common/armInterface";
import { LocalCrypto } from "../../../../core/crypto";
import { newEnvInfo } from "../../../../core/tools";
import { flattenConfigMap, legacyConfig2EnvState } from "../../../resource/utils4v2";
import { combineRecords } from "./utils";

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
  cryptoProvider: CryptoProvider = new LocalCrypto("");
  permissionRequestProvider?: PermissionRequestProvider;
}

/**
 * An adpator for making API v2 compatible with legacy api.
 */
export class ScaffoldingContextAdapter extends BaseSolutionContextAdaptor {
  constructor(params: Parameters<NonNullable<v2.SolutionPlugin["scaffoldSourceCode"]>>) {
    super();
    const v2context: v2.Context = params[0];
    const inputs: Inputs = params[1];
    if (!inputs.projectPath) {
      throw new Error(`ivalid project path: ${inputs.projectPath}`);
    }
    this.root = inputs.projectPath;
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
    this.cryptoProvider = v2context.cryptoProvider;
    this.envInfo = newEnvInfo(); // tbd
  }
}

export class ProvisionContextAdapter extends BaseSolutionContextAdaptor {
  constructor(params: Parameters<NonNullable<v2.SolutionPlugin["provisionResources"]>>) {
    super();
    const v2context: v2.Context = params[0];
    const inputs: Inputs = params[1];
    const envInfo: EnvInfoV2 = params[2];
    const tokenProvider = params[3];

    if (!inputs.projectPath) {
      throw new Error(`ivalid project path: ${inputs.projectPath}`);
    }
    this.root = inputs.projectPath;
    this.targetEnvName = inputs.targetEnvName;
    this.logProvider = v2context.logProvider;
    this.telemetryReporter = v2context.telemetryReporter;
    this.azureAccountProvider = tokenProvider.azureAccountProvider;
    this.graphTokenProvider = tokenProvider.graphTokenProvider;
    this.appStudioToken = tokenProvider.appStudioToken;
    this.treeProvider = undefined;
    this.answers = inputs;
    this.projectSettings = v2context.projectSetting;
    this.localSettings = undefined;
    this.ui = v2context.userInteraction;
    this.cryptoProvider = v2context.cryptoProvider;
    this.permissionRequestProvider = v2context.permissionRequestProvider;
    const state = ConfigMap.fromJSON(envInfo.state);
    if (!state) {
      throw new Error(`failed to convert profile ${JSON.stringify(envInfo.state)}`);
    }
    this.envInfo = {
      envName: envInfo.envName,
      config: envInfo.config as EnvConfig,
      state: flattenConfigMap(state),
    };
  }

  getEnvStateJson(): Json {
    return combineRecords(
      [...this.envInfo.state].map(([pluginName, state]) => {
        return { name: pluginName, result: legacyConfig2EnvState(state, pluginName) };
      })
    );
  }
}

export class CollaboratorContextAdapter extends BaseSolutionContextAdaptor {
  constructor(params: Parameters<NonNullable<v2.SolutionPlugin["grantPermission"]>>) {
    super();
    const v2context: v2.Context = params[0];
    const inputs: Inputs = params[1];
    const envInfo = params[2];
    const tokenProvider = params[3];
    if (!inputs.projectPath) {
      throw new Error(`ivalid project path: ${inputs.projectPath}`);
    }
    this.root = inputs.projectPath;
    this.targetEnvName = inputs.targetEnvName;
    this.logProvider = v2context.logProvider;
    this.telemetryReporter = v2context.telemetryReporter;
    this.azureAccountProvider = tokenProvider.azureAccountProvider;
    this.graphTokenProvider = tokenProvider.graphTokenProvider;
    this.appStudioToken = tokenProvider.appStudioToken;
    this.treeProvider = undefined;
    this.answers = inputs;
    this.projectSettings = v2context.projectSetting;
    this.localSettings = undefined;
    this.ui = v2context.userInteraction;
    this.cryptoProvider = v2context.cryptoProvider;
    this.permissionRequestProvider = v2context.permissionRequestProvider;
    const state = ConfigMap.fromJSON(envInfo.state);
    if (!state) {
      throw new Error(`failed to convert profile ${JSON.stringify(envInfo.state)}`);
    }
    this.envInfo = {
      envName: envInfo.envName,
      config: envInfo.config as EnvConfig,
      state: flattenConfigMap(state),
    };
  }
}

export class NamedArmResourcePluginAdaptor implements NamedArmResourcePlugin {
  name: string;
  generateArmTemplates?: (ctx: PluginContext) => Promise<Result<ArmTemplateResult, FxError>>;

  constructor(v2Plugin: v2.ResourcePlugin) {
    this.name = v2Plugin.name;
    if (v2Plugin.generateResourceTemplate) {
      const fn = v2Plugin.generateResourceTemplate.bind(v2Plugin);
      this.generateArmTemplates = this._generateArmTemplates(fn);
    }
  }

  _generateArmTemplates(
    fn: NonNullable<v2.ResourcePlugin["generateResourceTemplate"]>
  ): (ctx: PluginContext) => Promise<Result<ArmTemplateResult, FxError>> {
    return async (ctx: PluginContext): Promise<Result<ArmTemplateResult, FxError>> => {
      if (
        !ctx.ui ||
        !ctx.logProvider ||
        !ctx.telemetryReporter ||
        !ctx.cryptoProvider ||
        !ctx.projectSettings ||
        !ctx.answers
      ) {
        return err(
          returnSystemError(
            new Error(`invalid plugin context`),
            SolutionSource,
            SolutionError.InternelError
          )
        );
      }
      const v2ctx: v2.Context = {
        userInteraction: ctx.ui,
        logProvider: ctx.logProvider,
        telemetryReporter: ctx.telemetryReporter,
        cryptoProvider: ctx.cryptoProvider,
        projectSetting: ctx.projectSettings,
      };
      ctx.answers.projectPath = ctx.root;
      const result = await fn(v2ctx, ctx.answers);
      return result.map((r) => r.template);
    };
  }
}
