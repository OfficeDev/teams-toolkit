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
import { BotHostTypes } from "../../common/local/constants";
import { LocalCertificateManager } from "../../common/local/localCertificateManager";
import {
  EnvKeysBackend,
  EnvKeysBot,
  EnvKeysFrontend,
  LocalEnvProvider,
} from "../../common/local/localEnvProvider";
import {
  hasAAD,
  hasAzureTab,
  hasBot,
  hasApi,
  hasFunctionBot,
  hasSimpleAuth,
  hasSPFxTab,
} from "../../common/projectSettingsHelperV3";
import { getAllowedAppIds } from "../../common/tools";
import {
  ConfigLocalDebugSettingsError,
  InvalidLocalBotEndpointFormat,
  LocalBotEndpointNotConfigured,
  NgrokTunnelNotConnected,
  ScaffoldLocalDebugSettingsError,
  SetupLocalDebugSettingsError,
} from "./error";
import { getCodespaceName, getCodespaceUrl } from "./util/codespace";
import { prepareLocalAuthService } from "./util/localService";
import { getNgrokHttpUrl } from "./util/ngrok";
import { TelemetryEventName, TelemetryUtils } from "./util/telemetry";
import { ComponentNames } from "../constants";
import * as Launch from "./util/launch";
import * as LaunchNext from "./util/launchNext";
import * as LaunchTransparency from "./util/launchTransparency";
import * as Tasks from "./util/tasks";
import * as TasksNext from "./util/tasksNext";
import * as TasksTransparency from "./util/tasksTransparency";
import * as Settings from "./util/settings";
import fs from "fs-extra";
import { TOOLS } from "../../core/globalVars";
import { getComponent } from "../workflow";
import { CoreQuestionNames } from "../../core/question";
import { QuestionKey } from "../code/api/enums";
import { DefaultValues } from "../feature/api/constants";
import { CommentObject } from "comment-json";
import * as commentJson from "comment-json";
import * as os from "os";
import { TaskCommand } from "../../common/local/constants";

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
  const api = getComponent(settings, ComponentNames.TeamsApi);
  let defaultFuncName;
  if (api) {
    if (api.functionNames && api.functionNames.length > 0) {
      defaultFuncName = api.functionNames[0];
    }
    defaultFuncName =
      defaultFuncName ||
      settings.defaultFunctionName ||
      inputs[QuestionKey.functionName] ||
      DefaultValues.functionName;
  }
  const config: LocalEnvConfig = {
    hasAzureTab: hasAzureTab(settings),
    hasSPFxTab: hasSPFxTab(settings),
    hasApi: hasApi(settings),
    hasBot: hasBot(settings),
    hasAAD: hasAAD(settings),
    hasSimpleAuth: hasSimpleAuth(settings),
    hasFunctionBot: hasFunctionBot(settings),
    botCapabilities: botCapabilities,
    defaultFunctionName: defaultFuncName,
    programmingLanguage:
      settings.programmingLanguage || inputs[CoreQuestionNames.ProgrammingLanguage] || "javascript",
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
  const API_STATE_KEY = ComponentNames.TeamsApi;
  const TAB_STATE_KEY = ComponentNames.TeamsTab;
  const BOT_STATE_KEY = ComponentNames.TeamsBot;
  const SIMPLE_AUTH_STATE_KEY = ComponentNames.SimpleAuth;

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

          // validDomain is old style state key for backward compatibility
          envInfo.state[BOT_STATE_KEY].siteEndpoint = localBotEndpoint;
          envInfo.state[BOT_STATE_KEY].validDomain = localBotEndpoint.slice(8);
          envInfo.state[BOT_STATE_KEY].domain = localBotEndpoint.slice(8);
        } else {
          const ngrokHttpUrl = await getNgrokHttpUrl(3978);
          if (!ngrokHttpUrl) {
            const error = NgrokTunnelNotConnected();
            TelemetryUtils.sendErrorEvent(TelemetryEventName.setupLocalDebugSettings, error);
            return err(error);
          } else {
            envInfo.state[BOT_STATE_KEY].siteEndpoint = ngrokHttpUrl;
            envInfo.state[BOT_STATE_KEY].validDomain = ngrokHttpUrl.slice(8);
            envInfo.state[BOT_STATE_KEY].domain = ngrokHttpUrl.slice(8);
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
          envInfo.state[BOT_STATE_KEY].domain = ngrokHttpUrl.slice(8);
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
  const API_STATE_KEY = ComponentNames.TeamsApi;
  const AAD_STATE_KEY = ComponentNames.AadApp;
  const TAB_STATE_KEY = ComponentNames.TeamsTab;
  const BOT_STATE_KEY = ComponentNames.TeamsBot;
  const SIMPLE_AUTH_STATE_KEY = ComponentNames.SimpleAuth;
  const APP_MANIFEST_KEY = ComponentNames.AppManifest;

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
      const teamsAppTenantId =
        envInfo.state[APP_MANIFEST_KEY]?.tenantId || envInfo.state.solution.teamsAppTenantId;
      const localTabEndpoint = envInfo.state[TAB_STATE_KEY]?.endpoint;
      const localFuncEndpoint = envInfo.state[API_STATE_KEY]?.functionEndpoint;

      const localAuthEndpoint = envInfo.state[SIMPLE_AUTH_STATE_KEY]?.endpoint as string;
      const localAuthPackagePath = envInfo.state[SIMPLE_AUTH_STATE_KEY]
        ?.simpleAuthFilePath as string;

      if (includeTab) {
        frontendEnvs!.teamsfxLocalEnvs[EnvKeysFrontend.Port] = "53000";
        frontendEnvs!.teamsfxLocalEnvs[EnvKeysFrontend.Browser] = "none";
        frontendEnvs!.teamsfxLocalEnvs[EnvKeysFrontend.Https] = "true";

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
        const isTransparent = await useTransparentTasks(inputs.projectPath);
        // Only generate launch.json and tasks.json for SPFX
        const launchConfigurations = isTransparent
          ? LaunchTransparency.generateSpfxConfigurations()
          : Launch.generateSpfxConfigurations();
        const launchCompounds = isTransparent
          ? LaunchTransparency.generateSpfxCompounds()
          : Launch.generateSpfxCompounds();
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
        if (isTransparent) {
          const transparentTasksJson = TasksTransparency.generateSpfxTasksJson();
          await updateCommentJson(
            `${inputs.projectPath}/.vscode/tasks.json`,
            transparentTasksJson as CommentObject,
            TasksTransparency.mergeTasksJson
          );
        } else {
          const tasks = Tasks.generateSpfxTasks();
          const tasksInputs = Tasks.generateInputs();
          await updateJson(
            `${inputs.projectPath}/.vscode/tasks.json`,
            {
              version: "2.0.0",
              tasks: tasks,
              inputs: tasksInputs,
            },
            TasksNext.mergeTasks
          );
        }
      } else {
        await fs.ensureDir(`${inputs.projectPath}/.vscode/`);
        if (await useTransparentTasks(inputs.projectPath)) {
          const launchConfigurations = isM365
            ? LaunchTransparency.generateM365Configurations(
                includeFrontend,
                includeBackend,
                includeBot
              )
            : LaunchTransparency.generateConfigurations(
                includeFrontend,
                includeBackend,
                includeBot
              );
          const launchCompounds = isM365
            ? LaunchTransparency.generateM365Compounds(includeFrontend, includeBackend, includeBot)
            : LaunchTransparency.generateCompounds(includeFrontend, includeBackend, includeBot);
          await updateJson(
            `${inputs.projectPath}/.vscode/launch.json`,
            {
              version: "0.2.0",
              configurations: launchConfigurations,
              compounds: launchCompounds,
            },
            LaunchNext.mergeLaunches
          );

          const tasksJson = isM365
            ? TasksTransparency.generateM365TasksJson(
                includeFrontend,
                includeBackend,
                includeBot,
                includeFuncHostedBot,
                includeAAD,
                programmingLanguage
              )
            : TasksTransparency.generateTasksJson(
                includeFrontend,
                includeBackend,
                includeBot,
                includeFuncHostedBot,
                includeAAD,
                programmingLanguage
              );
          await updateCommentJson(
            `${inputs.projectPath}/.vscode/tasks.json`,
            tasksJson as CommentObject,
            TasksTransparency.mergeTasksJson
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

export async function useNewTasks(projectPath?: string): Promise<boolean> {
  // for new project or project with "validate-local-prerequisites", use new tasks content
  const tasksJsonPath = `${projectPath}/.vscode/tasks.json`;
  if (await fs.pathExists(tasksJsonPath)) {
    try {
      const tasksContent = await fs.readFile(tasksJsonPath, "utf-8");
      return tasksContent.includes("fx-extension.validate-local-prerequisites");
    } catch (error) {
      return false;
    }
  }

  return true;
}

export async function useTransparentTasks(projectPath?: string): Promise<boolean> {
  // for new project or project with "debug-check-prerequisites", use transparent tasks content
  const tasksJsonPath = `${projectPath}/.vscode/tasks.json`;
  if (await fs.pathExists(tasksJsonPath)) {
    try {
      const tasksContent = await fs.readFile(tasksJsonPath, "utf-8");
      for (const command of Object.values(TaskCommand)) {
        if (tasksContent.includes(command)) {
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  return true;
}

export async function updateJson(
  path: string,
  newData: Record<string, unknown>,
  mergeFunc: (
    existingData: Record<string, unknown>,
    newData: Record<string, unknown>
  ) => Record<string, unknown>
): Promise<void> {
  let finalData: Record<string, unknown>;
  if (await fs.pathExists(path)) {
    try {
      const existingData = await fs.readJSON(path);
      finalData = mergeFunc(existingData, newData);
    } catch (error) {
      // If failed to parse or edit the existing file, just overwrite completely
      finalData = newData;
    }
  } else {
    finalData = newData;
  }

  await fs.writeJSON(path, finalData, {
    spaces: 4,
    EOL: os.EOL,
  });
}

export async function updateCommentJson(
  path: string,
  newData: CommentObject,
  mergeFunc: (existingData: CommentObject, newData: CommentObject) => CommentObject
): Promise<void> {
  let finalData: Record<string, unknown>;
  if (await fs.pathExists(path)) {
    try {
      const content = await fs.readFile(path);
      const existingData = commentJson.parse(content.toString()) as CommentObject;
      finalData = mergeFunc(existingData, newData);
    } catch (error) {
      // If failed to parse or edit the existing file, just overwrite completely
      finalData = newData;
    }
  } else {
    finalData = newData;
  }

  await fs.writeFile(path, commentJson.stringify(finalData, null, 4));
}
