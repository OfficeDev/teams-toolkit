// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  ContextV3,
  err,
  FxError,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  Platform,
  ProvisionContextV3,
  Result,
  v3,
  VsCodeEnv,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { BotHostTypes } from "../common/local/constants";
import { LocalCertificateManager } from "../common/local/localCertificateManager";
import {
  EnvKeysBackend,
  EnvKeysBot,
  EnvKeysFrontend,
  LocalEnvProvider,
} from "../common/local/localEnvProvider";
import { ProjectSettingsHelper } from "../common/local/projectSettingsHelper";
import {
  hasAAD,
  hasAzureTab,
  hasBot,
  hasFunction,
  hasFunctionBot,
  hasSimpleAuth,
  hasTab,
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
import { createFilesEffects } from "./utils";
@Service("debug")
export class DebugComponent {
  readonly name = "debug";
  setupLocalEnvInfo(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "debug.setupLocalEnvInfo",
      type: "function",
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const ctx = context as ProvisionContextV3;
        const localEnvSetupResult = await setupLocalEnvironment(ctx, inputs, ctx.envInfo);
        if (localEnvSetupResult.isErr()) {
          return err(localEnvSetupResult.error);
        }
        return ok([]);
      },
    };
    return ok(action);
  }
  configLocalEnvInfo(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      type: "function",
      name: "debug.configLocalEnvInfo",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const ctx = context as ProvisionContextV3;
        const localConfigResult = await configLocalEnvironment(ctx, inputs, ctx.envInfo);
        if (localConfigResult.isErr()) {
          return err(localConfigResult.error);
        }
        return ok([]);
      },
    };
    return ok(action);
  }
  generateLocalDebugSettings(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      type: "function",
      name: "debug.generateLocalDebugSettings",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const files = [
          `${inputs.projectPath}/.vscode/launch.json`,
          `${inputs.projectPath}/.vscode/tasks.json`,
        ];
        return ok(createFilesEffects(files, "replace"));
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const res = await generateLocalDebugSettings(context, inputs);
        if (res.isErr()) {
          return err(res.error);
        }
        const files = [
          `${inputs.projectPath}/.vscode/launch.json`,
          `${inputs.projectPath}/.vscode/tasks.json`,
        ];
        return ok(createFilesEffects(files, "replace"));
      },
    };
    return ok(action);
  }
}

export async function setupLocalEnvironment(
  ctx: ContextV3,
  inputs: InputsWithProjectPath,
  envInfo: v3.EnvInfoV3
): Promise<Result<undefined, FxError>> {
  const vscEnv = inputs.vscodeEnv;
  const includeTab = hasAzureTab(ctx.projectSetting);
  const includeBackend = hasFunction(ctx.projectSetting);
  const includeBot = hasBot(ctx.projectSetting);
  const includeAAD = hasAAD(ctx.projectSetting);
  const includeSimpleAuth = hasSimpleAuth(ctx.projectSetting);
  const skipNgrok = inputs.checkerInfo?.skipNgrok as boolean;
  const includeFuncHostedBot = hasFunctionBot(ctx.projectSetting);
  const botCapabilities = ProjectSettingsHelper.getBotCapabilities(ctx.projectSetting);

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
  TelemetryUtils.init(ctx.telemetryReporter);
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
        if (!envInfo.state[ComponentNames.SimpleAuth]) {
          envInfo.state[ComponentNames.SimpleAuth] = {};
        }

        if (includeSimpleAuth) {
          envInfo.state[ComponentNames.SimpleAuth].endpoint = localAuthEndpoint;
        }
      }

      if (includeTab) {
        if (!envInfo.state[ComponentNames.TeamsTab]) {
          envInfo.state[ComponentNames.TeamsTab] = {};
        }
        envInfo.state[ComponentNames.TeamsTab].endpoint = localTabEndpoint;
        envInfo.state[ComponentNames.TeamsTab].domain = localTabDomain;
      }

      if (includeBackend) {
        if (!envInfo.state[ComponentNames.Function]) {
          envInfo.state[ComponentNames.Function] = {};
        }
        envInfo.state[ComponentNames.Function].functionEndpoint = localFuncEndpoint;
      }

      if (includeBot) {
        if (!envInfo.state[ComponentNames.TeamsBot]) {
          envInfo.state[ComponentNames.TeamsBot] = {};
        }

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

          envInfo.state[ComponentNames.TeamsBot].endpoint = localBotEndpoint;
          envInfo.state[ComponentNames.TeamsBot].domain = localBotEndpoint.slice(8);
        } else {
          const ngrokHttpUrl = await getNgrokHttpUrl(3978);
          if (!ngrokHttpUrl) {
            const error = NgrokTunnelNotConnected();
            TelemetryUtils.sendErrorEvent(TelemetryEventName.setupLocalDebugSettings, error);
            return err(error);
          } else {
            envInfo.state[ComponentNames.TeamsBot].endpoint = ngrokHttpUrl;
            envInfo.state[ComponentNames.TeamsBot].domain = ngrokHttpUrl.slice(8);
          }
        }
      }
    } else if (inputs.platform === Platform.VS) {
      if (includeTab) {
        envInfo.state[ComponentNames.TeamsTab] ??= {};
        envInfo.state[ComponentNames.TeamsTab].endpoint = "https://localhost:44302";
        envInfo.state[ComponentNames.TeamsTab].domain = "localhost";
      }

      if (includeBot) {
        envInfo.state[ComponentNames.TeamsBot] ??= {};
        const ngrokHttpUrl = await getNgrokHttpUrl(5130);
        if (!ngrokHttpUrl) {
          const error = NgrokTunnelNotConnected();
          TelemetryUtils.sendErrorEvent(TelemetryEventName.setupLocalDebugSettings, error);
          return err(error);
        } else {
          envInfo.state[ComponentNames.TeamsBot].endpoint = ngrokHttpUrl;
          envInfo.state[ComponentNames.TeamsBot].domain = ngrokHttpUrl.slice(8);
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

export async function configLocalEnvironment(
  ctx: ContextV3,
  inputs: InputsWithProjectPath,
  envInfo: v3.EnvInfoV3
): Promise<Result<undefined, FxError>> {
  const includeTab = hasAzureTab(ctx.projectSetting);
  const includeBackend = hasFunction(ctx.projectSetting);
  const includeBot = hasBot(ctx.projectSetting);
  const includeAAD = hasAAD(ctx.projectSetting);
  const includeSimpleAuth = hasSimpleAuth(ctx.projectSetting);
  const includeFuncHostedBot = hasFunctionBot(ctx.projectSetting);
  const botCapabilities = ProjectSettingsHelper.getBotCapabilities(ctx.projectSetting);
  let trustDevCert = inputs.checkerInfo?.trustDevCert as boolean | undefined;

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
  TelemetryUtils.init(ctx.telemetryReporter);
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
      const clientId = envInfo.state[ComponentNames.AadApp]?.clientId;
      const clientSecret = envInfo.state[ComponentNames.AadApp]?.clientSecret;
      const applicationIdUri = envInfo.state[ComponentNames.AadApp]?.applicationIdUris;
      const teamsAppTenantId = envInfo.state[ComponentNames.AppManifest].tenantId;
      const localTabEndpoint = envInfo.state[ComponentNames.TeamsTab]?.endpoint;
      const localFuncEndpoint = envInfo.state[ComponentNames.Function]?.functionEndpoint;

      const localAuthEndpoint = envInfo.state[ComponentNames.SimpleAuth]?.endpoint as string;
      const localAuthPackagePath = envInfo.state[ComponentNames.SimpleAuth]
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
          frontendEnvs!.teamsfxLocalEnvs[EnvKeysFrontend.FuncName] = ctx.projectSetting
            .defaultFunctionName as string;

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

          const certManager = new LocalCertificateManager(ctx.userInteraction, ctx.logProvider);

          const localCert = await certManager.setupCertificate(trustDevCert);
          if (
            envInfo.config.frontend &&
            envInfo.config.frontend.sslCertFile &&
            envInfo.config.frontend.sslKeyFile
          ) {
            envInfo.state[ComponentNames.TeamsTab].sslCertFile =
              envInfo.config.frontend.sslCertFile;
            envInfo.state[ComponentNames.TeamsTab].sslKeyFile = envInfo.config.frontend.sslKeyFile;
            frontendEnvs!.teamsfxLocalEnvs[EnvKeysFrontend.SslCrtFile] =
              envInfo.config.frontend.sslCertFile;
            frontendEnvs!.teamsfxLocalEnvs[EnvKeysFrontend.SslKeyFile] =
              envInfo.config.frontend.sslKeyFile;
          } else if (localCert) {
            envInfo.state[ComponentNames.TeamsTab].sslCertFile = localCert.certPath;
            envInfo.state[ComponentNames.TeamsTab].sslKeyFile = localCert.keyPath;
            frontendEnvs!.teamsfxLocalEnvs[EnvKeysFrontend.SslCrtFile] = localCert.certPath;
            frontendEnvs!.teamsfxLocalEnvs[EnvKeysFrontend.SslKeyFile] = localCert.keyPath;
          }
        } catch (error) {
          // do not break if cert error
        }
      }

      if (includeBot) {
        const botId = envInfo.state[ComponentNames.BotService]?.botId as string;
        const botPassword = envInfo.state[ComponentNames.BotService]?.botPassword as string;

        botEnvs!.teamsfxLocalEnvs[EnvKeysBot.BotId] = botId;
        botEnvs!.teamsfxLocalEnvs[EnvKeysBot.BotPassword] = botPassword;

        if (includeAAD) {
          botEnvs!.teamsfxLocalEnvs[EnvKeysBot.ClientId] = clientId;
          botEnvs!.teamsfxLocalEnvs[EnvKeysBot.ClientSecret] = clientSecret;
          botEnvs!.teamsfxLocalEnvs[EnvKeysBot.TenantID] = teamsAppTenantId;
          botEnvs!.teamsfxLocalEnvs[EnvKeysBot.OauthAuthority] =
            "https://login.microsoftonline.com";
          botEnvs!.teamsfxLocalEnvs[EnvKeysBot.LoginEndpoint] = `${
            envInfo.state[ComponentNames.TeamsBot]?.siteEndpoint as string
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

export async function generateLocalDebugSettings(
  context: ContextV3,
  inputs: InputsWithProjectPath
): Promise<Result<undefined, FxError>> {
  const isSpfx = hasSPFxTab(context.projectSetting);
  const includeFrontend = hasTab(context.projectSetting);
  const includeBackend = hasFunction(context.projectSetting);
  const includeBot = hasBot(context.projectSetting);
  const includeAAD = hasAAD(context.projectSetting);
  const includeSimpleAuth = hasSimpleAuth(context.projectSetting);
  const includeFuncHostedBot = hasFunctionBot(context.projectSetting);
  const botCapabilities = ProjectSettingsHelper.getBotCapabilities(context.projectSetting);
  const programmingLanguage = context.projectSetting.programmingLanguage ?? "";
  const isM365 = context.projectSetting.isM365;
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
  TelemetryUtils.init(context.telemetryReporter);
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
