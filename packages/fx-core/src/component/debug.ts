// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ContextV3,
  err,
  FxError,
  InputsWithProjectPath,
  ok,
  Platform,
  Result,
  v3,
  VsCodeEnv,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { BotHostTypes } from "../common/local/constants";
import { LocalCertificateManager } from "../common/local/localCertificateManager";
import {
  EnvKeysBackend,
  EnvKeysBot,
  EnvKeysFrontend,
  LocalEnvProvider,
} from "../common/local/localEnvProvider";
import {
  hasAAD,
  hasAzureTab,
  hasBot,
  hasApi,
  hasFunctionBot,
  hasSimpleAuth,
  hasSPFxTab,
} from "../common/projectSettingsHelperV3";
import { getAllowedAppIds } from "../common/tools";
import {
  ConfigLocalDebugSettingsError,
  InvalidLocalBotEndpointFormat,
  LocalBotEndpointNotConfigured,
  NgrokTunnelNotConnected,
  ScaffoldLocalDebugSettingsError,
  SetupLocalDebugSettingsError,
} from "../plugins/solution/fx-solution/debug/error";
import {
  getCodespaceName,
  getCodespaceUrl,
} from "../plugins/solution/fx-solution/debug/util/codespace";
import { prepareLocalAuthService } from "../plugins/solution/fx-solution/debug/util/localService";
import { getNgrokHttpUrl } from "../plugins/solution/fx-solution/debug/util/ngrok";
import {
  TelemetryEventName,
  TelemetryUtils,
} from "../plugins/solution/fx-solution/debug/util/telemetry";
import { ComponentNames } from "./constants";
import * as Launch from "../plugins/solution/fx-solution/debug/util/launch";
import * as LaunchNext from "../plugins/solution/fx-solution/debug/util/launchNext";
import * as Tasks from "../plugins/solution/fx-solution/debug/util/tasks";
import * as TasksNext from "../plugins/solution/fx-solution/debug/util/tasksNext";
import * as Settings from "../plugins/solution/fx-solution/debug/util/settings";
import fs from "fs-extra";
import { updateJson, useNewTasks } from "../plugins/solution/fx-solution/debug/scaffolding";
import { isV3, TOOLS } from "../core";
import { getComponent } from "./workflow";
import { BuiltInFeaturePluginNames } from "../plugins/solution/fx-solution/v3/constants";

export interface LocalEnvConfig {
  vscodeEnv?: VsCodeEnv;
  trustDevCert?: boolean;
  hasAzureTab: boolean;
  hasSPFxTab?: boolean;
  hasApi: boolean;
  hasBot: boolean;
  hasAAD: boolean;
  hasSimpleAuth: boolean;
  skipNgrok?: boolean;
  hasFunctionBot: boolean;
  botCapabilities: string[];
  defaultFunctionName: string;
  programmingLanguage: string;
  isM365?: boolean;
}

function convertToConfig(context: ContextV3, inputs: InputsWithProjectPath): LocalEnvConfig {
  const settings = context.projectSetting;
  const bot = getComponent(settings, ComponentNames.TeamsBot);
  const botCapabilities = bot?.capabilities || [];
  const config: LocalEnvConfig = {
    hasAzureTab: hasAzureTab(settings),
    hasSPFxTab: hasSPFxTab(settings),
    hasApi: hasApi(settings),
    hasBot: hasBot(settings),
    hasAAD: hasAAD(settings),
    hasSimpleAuth: hasSimpleAuth(settings),
    hasFunctionBot: hasFunctionBot(settings),
    botCapabilities: botCapabilities,
    defaultFunctionName: settings.defaultFunctionName!,
    programmingLanguage: settings.programmingLanguage! || "",
    isM365: settings.isM365,
    skipNgrok: inputs.checkerInfo?.skipNgrok as boolean,
    vscodeEnv: inputs.vscodeEnv,
    trustDevCert: inputs.checkerInfo?.trustDevCert as boolean | undefined,
  };
  return config;
}
export async function setupLocalEnvironment(
  context: ContextV3,
  inputs: InputsWithProjectPath
): Promise<Result<undefined, FxError>> {
  const config: LocalEnvConfig = convertToConfig(context, inputs);
  return await setupLocalEnvironmentCommon(inputs, config, context.envInfo!);
}
export async function configLocalEnvironment(
  context: ContextV3,
  inputs: InputsWithProjectPath
): Promise<Result<undefined, FxError>> {
  const config: LocalEnvConfig = convertToConfig(context, inputs);
  return await configLocalEnvironmentCommon(inputs, config, context.envInfo!);
}
export async function generateLocalDebugSettings(
  context: ContextV3,
  inputs: InputsWithProjectPath
): Promise<Result<undefined, FxError>> {
  const config: LocalEnvConfig = convertToConfig(context, inputs);
  return await generateLocalDebugSettingsCommon(inputs, config);
}

export async function setupLocalEnvironmentCommon(
  inputs: InputsWithProjectPath,
  config: LocalEnvConfig,
  envInfo: v3.EnvInfoV3
): Promise<Result<undefined, FxError>> {
  const API_STATE_KEY = isV3() ? ComponentNames.TeamsApi : BuiltInFeaturePluginNames.function;
  const TAB_STATE_KEY = isV3() ? ComponentNames.TeamsTab : BuiltInFeaturePluginNames.frontend;
  const BOT_STATE_KEY = isV3() ? ComponentNames.TeamsBot : BuiltInFeaturePluginNames.bot;
  const SIMPLE_AUTH_STATE_KEY = isV3()
    ? ComponentNames.SimpleAuth
    : BuiltInFeaturePluginNames.simpleAuth;

  const vscEnv = inputs.vscodeEnv;
  const includeTab = config.hasAzureTab;
  const includeBackend = config.hasApi;
  const includeBot = config.hasBot;
  const includeAAD = config.hasAAD;
  const includeSimpleAuth = config.hasSimpleAuth;
  const skipNgrok = config.skipNgrok;
  const includeFuncHostedBot = config.hasFunctionBot;
  const botCapabilities = config.botCapabilities;

  const telemetryProperties = {
    platform: inputs.platform as string,
    vscenv: vscEnv as string,
    frontend: includeTab ? "true" : "false",
    function: includeBackend ? "true" : "false",
    bot: includeBot ? "true" : "false",
    auth: includeAAD && includeSimpleAuth ? "true" : "false",
    "skip-ngrok": skipNgrok ? "true" : "false",
    "bot-host-type": includeFuncHostedBot ? BotHostTypes.AzureFunctions : BotHostTypes.AppService,
    "bot-capabilities": JSON.stringify(botCapabilities),
  };
  TelemetryUtils.init(TOOLS.telemetryReporter!);
  TelemetryUtils.sendStartEvent(TelemetryEventName.setupLocalDebugSettings, telemetryProperties);

  try {
    // setup configs used by other plugins
    // TODO: dynamicly determine local ports
    if (inputs.platform === Platform.VSCode || inputs.platform === Platform.CLI) {
      const frontendPort = 53000;
      const authPort = 55000;
      let localTabEndpoint: string;
      let localTabDomain: string;
      let localAuthEndpoint: string;
      let localFuncEndpoint: string;

      if (vscEnv === VsCodeEnv.codespaceBrowser || vscEnv === VsCodeEnv.codespaceVsCode) {
        const codespaceName = await getCodespaceName();

        localTabEndpoint = getCodespaceUrl(codespaceName, frontendPort);
        localTabDomain = new URL(localTabEndpoint).host;
        localAuthEndpoint = getCodespaceUrl(codespaceName, authPort);
        localFuncEndpoint = getCodespaceUrl(codespaceName, 7071);
      } else {
        localTabDomain = "localhost";
        localTabEndpoint = `https://localhost:${frontendPort}`;
        localAuthEndpoint = `http://localhost:${authPort}`;
        localFuncEndpoint = "http://localhost:7071";
      }

      if (includeAAD) {
        envInfo.state[SIMPLE_AUTH_STATE_KEY] = envInfo.state[SIMPLE_AUTH_STATE_KEY] || {};
        if (includeSimpleAuth) {
          envInfo.state[SIMPLE_AUTH_STATE_KEY].endpoint = localAuthEndpoint;
        }
      }

      if (includeTab) {
        envInfo.state[TAB_STATE_KEY] = envInfo.state[TAB_STATE_KEY] || {};
        envInfo.state[TAB_STATE_KEY].endpoint = localTabEndpoint;
        envInfo.state[TAB_STATE_KEY].domain = localTabDomain;
      }

      if (includeBackend) {
        envInfo.state[API_STATE_KEY] = envInfo.state[API_STATE_KEY] || {};
        envInfo.state[API_STATE_KEY].functionEndpoint = localFuncEndpoint;
      }

      if (includeBot) {
        envInfo.state[BOT_STATE_KEY] = envInfo.state[BOT_STATE_KEY] || {};
        if (skipNgrok) {
          const localBotEndpoint = envInfo.config.bot?.siteEndpoint as string;
          if (localBotEndpoint === undefined) {
            const error = LocalBotEndpointNotConfigured();
            TelemetryUtils.sendErrorEvent(TelemetryEventName.setupLocalDebugSettings, error);
            return err(error);
          }

          const botEndpointRegex = /https:\/\/.*(:\d+)?/g;
          if (!botEndpointRegex.test(localBotEndpoint)) {
            const error = InvalidLocalBotEndpointFormat(localBotEndpoint);
            TelemetryUtils.sendErrorEvent(TelemetryEventName.setupLocalDebugSettings, error);
            return err(error);
          }

          envInfo.state[BOT_STATE_KEY].siteEndpoint = localBotEndpoint;
          envInfo.state[BOT_STATE_KEY].validDomain = localBotEndpoint.slice(8);
        } else {
          const ngrokHttpUrl = await getNgrokHttpUrl(3978);
          if (!ngrokHttpUrl) {
            const error = NgrokTunnelNotConnected();
            TelemetryUtils.sendErrorEvent(TelemetryEventName.setupLocalDebugSettings, error);
            return err(error);
          } else {
            envInfo.state[BOT_STATE_KEY].siteEndpoint = ngrokHttpUrl;
            envInfo.state[BOT_STATE_KEY].validDomain = ngrokHttpUrl.slice(8);
          }
        }
      }
    } else if (inputs.platform === Platform.VS) {
      if (includeTab) {
        envInfo.state[TAB_STATE_KEY] ??= {};
        envInfo.state[TAB_STATE_KEY].endpoint = "https://localhost:44302";
        envInfo.state[TAB_STATE_KEY].domain = "localhost";
      }

      if (includeBot) {
        envInfo.state[BOT_STATE_KEY] ??= {};
        const ngrokHttpUrl = await getNgrokHttpUrl(5130);
        if (!ngrokHttpUrl) {
          const error = NgrokTunnelNotConnected();
          TelemetryUtils.sendErrorEvent(TelemetryEventName.setupLocalDebugSettings, error);
          return err(error);
        } else {
          envInfo.state[BOT_STATE_KEY].siteEndpoint = ngrokHttpUrl;
          envInfo.state[BOT_STATE_KEY].validDomain = ngrokHttpUrl.slice(8);
        }
      }
    }
  } catch (error: any) {
    const systemError = SetupLocalDebugSettingsError(error);
    TelemetryUtils.sendErrorEvent(TelemetryEventName.setupLocalDebugSettings, systemError);
    return err(systemError);
  }
  TelemetryUtils.sendSuccessEvent(TelemetryEventName.setupLocalDebugSettings, telemetryProperties);
  return ok(undefined);
}

export async function configLocalEnvironmentCommon(
  inputs: InputsWithProjectPath,
  config: LocalEnvConfig,
  envInfo: v3.EnvInfoV3
): Promise<Result<undefined, FxError>> {
  const API_STATE_KEY = isV3() ? ComponentNames.TeamsApi : BuiltInFeaturePluginNames.function;
  const AAD_STATE_KEY = isV3() ? ComponentNames.AadApp : BuiltInFeaturePluginNames.aad;
  const TAB_STATE_KEY = isV3() ? ComponentNames.TeamsTab : BuiltInFeaturePluginNames.frontend;
  const BOT_STATE_KEY = isV3() ? ComponentNames.TeamsBot : BuiltInFeaturePluginNames.bot;
  const SIMPLE_AUTH_STATE_KEY = isV3()
    ? ComponentNames.SimpleAuth
    : BuiltInFeaturePluginNames.simpleAuth;
  const APP_MANIFEST_KEY = isV3()
    ? ComponentNames.AppManifest
    : BuiltInFeaturePluginNames.appStudio;

  const includeTab = config.hasAzureTab;
  const includeBackend = config.hasApi;
  const includeBot = config.hasBot;
  const includeAAD = config.hasAAD;
  const includeSimpleAuth = config.hasSimpleAuth;
  const includeFuncHostedBot = config.hasFunctionBot;
  const botCapabilities = config.botCapabilities;
  let trustDevCert = config.trustDevCert as boolean | undefined;

  const telemetryProperties = {
    platform: inputs.platform as string,
    frontend: includeTab ? "true" : "false",
    function: includeBackend ? "true" : "false",
    bot: includeBot ? "true" : "false",
    auth: includeAAD && includeSimpleAuth ? "true" : "false",
    "bot-host-type": includeFuncHostedBot ? BotHostTypes.AzureFunctions : BotHostTypes.AppService,
    "bot-capabilities": JSON.stringify(botCapabilities),
    "trust-development-certificate": trustDevCert + "",
  };
  TelemetryUtils.init(TOOLS.telemetryReporter!);
  TelemetryUtils.sendStartEvent(TelemetryEventName.configLocalDebugSettings, telemetryProperties);

  try {
    if (inputs.platform === Platform.VSCode || inputs.platform === Platform.CLI) {
      const localEnvProvider = new LocalEnvProvider(inputs.projectPath!);
      const frontendEnvs = includeTab
        ? await localEnvProvider.loadFrontendLocalEnvs(includeBackend, includeAAD)
        : undefined;
      const backendEnvs = includeBackend
        ? await localEnvProvider.loadBackendLocalEnvs()
        : undefined;
      const botEnvs = includeBot ? await localEnvProvider.loadBotLocalEnvs() : undefined;

      // get config for local debug
      const clientId = envInfo.state[AAD_STATE_KEY]?.clientId;
      const clientSecret = envInfo.state[AAD_STATE_KEY]?.clientSecret;
      const applicationIdUri = envInfo.state[AAD_STATE_KEY]?.applicationIdUris;
      const teamsAppTenantId = envInfo.state[APP_MANIFEST_KEY]?.tenantId;
      const localTabEndpoint = envInfo.state[TAB_STATE_KEY]?.endpoint;
      const localFuncEndpoint = envInfo.state[API_STATE_KEY]?.functionEndpoint;

      const localAuthEndpoint = envInfo.state[SIMPLE_AUTH_STATE_KEY]?.endpoint as string;
      const localAuthPackagePath = envInfo.state[SIMPLE_AUTH_STATE_KEY]
        ?.simpleAuthFilePath as string;

      if (includeTab) {
        frontendEnvs!.teamsfxLocalEnvs[EnvKeysFrontend.Port] = "53000";

        if (includeAAD) {
          frontendEnvs!.teamsfxLocalEnvs[
            EnvKeysFrontend.LoginUrl
          ] = `${localTabEndpoint}/auth-start.html`;
          frontendEnvs!.teamsfxLocalEnvs[EnvKeysFrontend.ClientId] = clientId;
        }

        if (includeSimpleAuth) {
          frontendEnvs!.teamsfxLocalEnvs[EnvKeysFrontend.TeamsFxEndpoint] = localAuthEndpoint;
          await prepareLocalAuthService(localAuthPackagePath);
        }

        if (includeBackend) {
          frontendEnvs!.teamsfxLocalEnvs[EnvKeysFrontend.FuncEndpoint] = localFuncEndpoint;
          frontendEnvs!.teamsfxLocalEnvs[EnvKeysFrontend.FuncName] = config.defaultFunctionName;

          backendEnvs!.teamsfxLocalEnvs[EnvKeysBackend.FuncWorkerRuntime] = "node";
          backendEnvs!.teamsfxLocalEnvs[EnvKeysBackend.ClientId] = clientId;
          backendEnvs!.teamsfxLocalEnvs[EnvKeysBackend.ClientSecret] = clientSecret;
          backendEnvs!.teamsfxLocalEnvs[EnvKeysBackend.AuthorityHost] =
            "https://login.microsoftonline.com";
          backendEnvs!.teamsfxLocalEnvs[EnvKeysBackend.TenantId] = teamsAppTenantId;
          backendEnvs!.teamsfxLocalEnvs[EnvKeysBackend.ApiEndpoint] = localFuncEndpoint;
          backendEnvs!.teamsfxLocalEnvs[EnvKeysBackend.ApplicationIdUri] = applicationIdUri;
          backendEnvs!.teamsfxLocalEnvs[EnvKeysBackend.AllowedAppIds] =
            getAllowedAppIds().join(";");
        }

        // setup local certificate
        try {
          if (trustDevCert === undefined) {
            trustDevCert = true;
          }

          const certManager = new LocalCertificateManager(TOOLS.ui, TOOLS.logProvider);

          const localCert = await certManager.setupCertificate(trustDevCert);
          if (
            envInfo.config.frontend &&
            envInfo.config.frontend.sslCertFile &&
            envInfo.config.frontend.sslKeyFile
          ) {
            envInfo.state[TAB_STATE_KEY].sslCertFile = envInfo.config.frontend.sslCertFile;
            envInfo.state[TAB_STATE_KEY].sslKeyFile = envInfo.config.frontend.sslKeyFile;
            frontendEnvs!.teamsfxLocalEnvs[EnvKeysFrontend.SslCrtFile] =
              envInfo.config.frontend.sslCertFile;
            frontendEnvs!.teamsfxLocalEnvs[EnvKeysFrontend.SslKeyFile] =
              envInfo.config.frontend.sslKeyFile;
          } else if (localCert) {
            envInfo.state[TAB_STATE_KEY].sslCertFile = localCert.certPath;
            envInfo.state[TAB_STATE_KEY].sslKeyFile = localCert.keyPath;
            frontendEnvs!.teamsfxLocalEnvs[EnvKeysFrontend.SslCrtFile] = localCert.certPath;
            frontendEnvs!.teamsfxLocalEnvs[EnvKeysFrontend.SslKeyFile] = localCert.keyPath;
          }
        } catch (error) {
          // do not break if cert error
        }
      }

      if (includeBot) {
        const botId = envInfo.state[BOT_STATE_KEY]?.botId as string;
        const botPassword = envInfo.state[BOT_STATE_KEY]?.botPassword as string;

        botEnvs!.teamsfxLocalEnvs[EnvKeysBot.BotId] = botId;
        botEnvs!.teamsfxLocalEnvs[EnvKeysBot.BotPassword] = botPassword;

        if (includeAAD) {
          botEnvs!.teamsfxLocalEnvs[EnvKeysBot.ClientId] = clientId;
          botEnvs!.teamsfxLocalEnvs[EnvKeysBot.ClientSecret] = clientSecret;
          botEnvs!.teamsfxLocalEnvs[EnvKeysBot.TenantID] = teamsAppTenantId;
          botEnvs!.teamsfxLocalEnvs[EnvKeysBot.OauthAuthority] =
            "https://login.microsoftonline.com";
          botEnvs!.teamsfxLocalEnvs[EnvKeysBot.LoginEndpoint] = `${
            envInfo.state[BOT_STATE_KEY]?.siteEndpoint as string
          }/auth-start.html`;
          botEnvs!.teamsfxLocalEnvs[EnvKeysBot.ApplicationIdUri] = applicationIdUri;
        }

        if (includeBackend) {
          backendEnvs!.teamsfxLocalEnvs[EnvKeysBackend.ApiEndpoint] = localFuncEndpoint;
          botEnvs!.teamsfxLocalEnvs[EnvKeysBot.ApiEndpoint] = localFuncEndpoint;
        }
      }

      // save .env.teamsfx.local
      await localEnvProvider.saveLocalEnvs(frontendEnvs, backendEnvs, botEnvs);
    }
  } catch (error: any) {
    const systemError = ConfigLocalDebugSettingsError(error);
    TelemetryUtils.sendErrorEvent(TelemetryEventName.configLocalDebugSettings, systemError);
    return err(systemError);
  }
  TelemetryUtils.sendSuccessEvent(TelemetryEventName.configLocalDebugSettings, telemetryProperties);
  return ok(undefined);
}

export async function generateLocalDebugSettingsCommon(
  inputs: InputsWithProjectPath,
  config: LocalEnvConfig
): Promise<Result<undefined, FxError>> {
  const isSpfx = config.hasSPFxTab === true;
  const includeFrontend = config.hasAzureTab;
  const includeBackend = config.hasApi;
  const includeBot = config.hasBot;
  const includeAAD = config.hasAAD;
  const includeSimpleAuth = config.hasSimpleAuth;
  const includeFuncHostedBot = config.hasFunctionBot;
  const botCapabilities = config.botCapabilities;
  const programmingLanguage = config.programmingLanguage;
  const isM365 = config.isM365;
  const telemetryProperties = {
    platform: inputs.platform as string,
    spfx: isSpfx ? "true" : "false",
    frontend: includeFrontend ? "true" : "false",
    function: includeBackend ? "true" : "false",
    bot: includeBot ? "true" : "false",
    auth: includeAAD && includeSimpleAuth ? "true" : "false",
    "bot-host-type": includeFuncHostedBot ? BotHostTypes.AzureFunctions : BotHostTypes.AppService,
    "bot-capabilities": JSON.stringify(botCapabilities),
    "programming-language": programmingLanguage,
  };
  TelemetryUtils.init(TOOLS.telemetryReporter!);
  TelemetryUtils.sendStartEvent(TelemetryEventName.scaffoldLocalDebugSettings, telemetryProperties);
  try {
    // scaffold for both vscode and cli
    if (inputs.platform === Platform.VSCode || inputs.platform === Platform.CLI) {
      if (isSpfx) {
        // Only generate launch.json and tasks.json for SPFX
        const launchConfigurations = Launch.generateSpfxConfigurations();
        const launchCompounds = Launch.generateSpfxCompounds();
        const tasks = Tasks.generateSpfxTasks();
        const tasksInputs = Tasks.generateInputs();

        //TODO: save files via context api
        await fs.ensureDir(`${inputs.projectPath}/.vscode/`);
        await updateJson(
          `${inputs.projectPath}/.vscode/launch.json`,
          {
            version: "0.2.0",
            configurations: launchConfigurations,
            compounds: launchCompounds,
          },
          LaunchNext.mergeLaunches
        );

        await updateJson(
          `${inputs.projectPath}/.vscode/tasks.json`,
          {
            version: "2.0.0",
            tasks: tasks,
            inputs: tasksInputs,
          },
          TasksNext.mergeTasks
        );
      } else {
        const launchConfigurations = isM365
          ? LaunchNext.generateM365Configurations(includeFrontend, includeBackend, includeBot)
          : (await useNewTasks(inputs.projectPath))
          ? LaunchNext.generateConfigurations(includeFrontend, includeBackend, includeBot)
          : Launch.generateConfigurations(includeFrontend, includeBackend, includeBot);
        const launchCompounds = isM365
          ? LaunchNext.generateM365Compounds(includeFrontend, includeBackend, includeBot)
          : (await useNewTasks(inputs.projectPath))
          ? LaunchNext.generateCompounds(includeFrontend, includeBackend, includeBot)
          : Launch.generateCompounds(includeFrontend, includeBackend, includeBot);

        const tasks = isM365
          ? TasksNext.generateM365Tasks(
              includeFrontend,
              includeBackend,
              includeBot,
              programmingLanguage
            )
          : (await useNewTasks(inputs.projectPath))
          ? TasksNext.generateTasks(
              includeFrontend,
              includeBackend,
              includeBot,
              includeFuncHostedBot,
              programmingLanguage
            )
          : Tasks.generateTasks(
              includeFrontend,
              includeBackend,
              includeBot,
              includeSimpleAuth,
              programmingLanguage
            );

        //TODO: save files via context api
        await fs.ensureDir(`${inputs.projectPath}/.vscode/`);
        await updateJson(
          `${inputs.projectPath}/.vscode/launch.json`,
          {
            version: "0.2.0",
            configurations: launchConfigurations,
            compounds: launchCompounds,
          },
          LaunchNext.mergeLaunches
        );

        await updateJson(
          `${inputs.projectPath}/.vscode/tasks.json`,
          {
            version: "2.0.0",
            tasks: tasks,
          },
          TasksNext.mergeTasks
        );
      }

      await updateJson(
        `${inputs.projectPath}/.vscode/settings.json`,
        Settings.generateSettings(includeBackend || includeFuncHostedBot, isSpfx),
        Settings.mergeSettings
      );
    }
  } catch (error: any) {
    const systemError = ScaffoldLocalDebugSettingsError(error);
    TelemetryUtils.sendErrorEvent(TelemetryEventName.scaffoldLocalDebugSettings, systemError);
    return err(systemError);
  }
  TelemetryUtils.sendSuccessEvent(
    TelemetryEventName.scaffoldLocalDebugSettings,
    telemetryProperties
  );
  return ok(undefined);
}
