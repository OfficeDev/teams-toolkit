import {
  v2,
  SolutionContext,
  Inputs,
  M365TokenProvider,
  AzureAccountProvider,
  CryptoProvider,
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
  SystemError,
} from "@microsoft/teamsfx-api";
import { EnvInfoV2 } from "@microsoft/teamsfx-api/build/v2";
import { SolutionError, SolutionSource } from "../constants";
import { ArmTemplateResult, NamedArmResourcePlugin } from "../../../../common/armInterface";
import { LocalCrypto } from "../../../../core/crypto";
import { newEnvInfo } from "../../../../core/environment";
import { flattenConfigMap, legacyConfig2EnvState } from "../../../resource/utils4v2";
import { combineRecords } from "./utils";

class BaseSolutionContextAdaptor implements SolutionContext {
  envInfo = newEnvInfo();
  root = "";
  targetEnvName?: string | undefined;
  logProvider?: LogProvider | undefined;
  telemetryReporter?: TelemetryReporter | undefined;
  azureAccountProvider?: AzureAccountProvider | undefined;
  m365TokenProvider?: M365TokenProvider | undefined;
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
      throw new Error(`invalid project path: ${inputs.projectPath}`);
    }
    this.root = inputs.projectPath;
    this.targetEnvName = inputs.targetEnvName;
    this.logProvider = v2context.logProvider;
    this.telemetryReporter = v2context.telemetryReporter;
    this.azureAccountProvider = undefined;
    this.m365TokenProvider = undefined;
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
    this.m365TokenProvider = tokenProvider.m365TokenProvider;
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
    this.m365TokenProvider = tokenProvider.m365TokenProvider;
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
  updateArmTemplates?: (ctx: PluginContext) => Promise<Result<ArmTemplateResult, FxError>>;
  constructor(v2Plugin: v2.ResourcePlugin) {
    this.name = v2Plugin.name;
    if (v2Plugin.generateResourceTemplate) {
      const fn = v2Plugin.generateResourceTemplate.bind(v2Plugin);
      this.generateArmTemplates = this._generateArmTemplates(fn);
    }
    if (v2Plugin.updateResourceTemplate) {
      const fn = v2Plugin.updateResourceTemplate.bind(v2Plugin);
      this.updateArmTemplates = this._updateArmTemplates(fn);
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
          new SystemError(SolutionSource, SolutionError.InternelError, "invalid plugin context")
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
      const result = await fn(v2ctx, ctx.answers as Inputs & { existingResources: string[] });
      return result.map((r) => r.template);
    };
  }

  _updateArmTemplates(
    fn: NonNullable<v2.ResourcePlugin["updateResourceTemplate"]>
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
          new SystemError(SolutionSource, SolutionError.InternelError, "invalid plugin context")
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
      const result = await fn(v2ctx, ctx.answers as Inputs & { existingResources: string[] });
      return result.map((r) => r.template);
    };
  }
}
