// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { cloneDeep } from "lodash";
import * as path from "path";
import * as util from "util";

import {
  assembleError,
  CryptoProvider,
  err,
  FxError,
  LogProvider,
  M365TokenProvider,
  ok,
  ProjectSettingsV3,
  Result,
  TelemetryReporter,
  UserInteraction,
  v3,
} from "@microsoft/teamsfx-api";

import { AppStudioScopes, GraphScopes } from "../../common/tools";
import { convertToAlphanumericOnly } from "../../common/utils";
import { LocalCrypto } from "../../core/crypto";
import { environmentManager } from "../../core/environment";
import { loadProjectSettingsByProjectPath } from "../../core/middleware/projectSettingsLoader";
import { AADRegistration } from "../resource/botService/aadRegistration";
import { AppStudio } from "../resource/botService/appStudio/appStudio";
import { IBotRegistration } from "../resource/botService/appStudio/interfaces/IBotRegistration";
import { MaxLengths } from "../resource/botService/constants";
import { PluginLocalDebug } from "../resource/botService/strings";
import { genUUID } from "../resource/botService/common";
import { ResourceNameFactory } from "../resource/botService/resourceNameFactory";
import { ComponentNames } from "../constants";
import { DebugAction } from "./common";
import { errorSource, DebugArgumentEmptyError, InvalidExistingBotArgsError } from "./error";
import { LocalEnvKeys, LocalEnvProvider } from "./localEnvProvider";

const botDebugMessages = {
  registeringAAD: "Registering the AAD app which is required to create the bot ...",
  registeringBot: "Registering the bot in Bot Framework Portal ...",
  updatingBotMessagingEndpoint: "Updating the bot messaging endpoint ...",
  savingStates: "Saving the states of bot ...",
  settingEnvs: "Saving the environment variables of bot ...",
  AADRegistered: "AAD app is registered (%s)",
  useExistingAAD: "Skip registering AAD app but use the existing AAD app from args: %s",
  AADAlreadyRegistered: "Skip registering AAD app (%s) as it has already been registered before",
  botRegistered: "Bot is registered (%s)",
  botAlreadyRegistered: "Skip registering bot as it has already been registered before (%s)",
  botMessagingEndpointUpdated: "Bot messaging endpoint is updated to %s",
  statesSaved: "The states of bot are saved in %s",
  envsSet: "The environment variables of bot are saved in %s",
};

const botUrl = "https://dev.botframework.com/bots?id=";

export interface BotDebugArgs {
  botId?: string;
  botPassword?: string;
  botMessagingEndpoint?: string;
}

export class BotDebugHandler {
  private readonly projectPath: string;
  private args: BotDebugArgs;
  private readonly m365TokenProvider: M365TokenProvider;
  private readonly logger?: LogProvider;
  private readonly telemetry?: TelemetryReporter;
  private readonly ui?: UserInteraction;

  private projectSettingsV3?: ProjectSettingsV3;
  private cryptoProvider?: CryptoProvider;
  private envInfoV3?: v3.EnvInfoV3;

  constructor(
    projectPath: string,
    args: BotDebugArgs,
    m365TokenProvider: M365TokenProvider,
    logger?: LogProvider,
    telemetry?: TelemetryReporter,
    ui?: UserInteraction
  ) {
    this.projectPath = projectPath;
    this.args = args;
    this.m365TokenProvider = m365TokenProvider;
    this.logger = logger;
    this.telemetry = telemetry;
    this.ui = ui;
  }

  public getActions(): DebugAction[] {
    const actions: DebugAction[] = [];
    actions.push({
      startMessage: botDebugMessages.registeringAAD,
      run: this.registerAAD.bind(this),
    });
    actions.push({
      startMessage: botDebugMessages.registeringBot,
      run: this.registerBot.bind(this),
    });
    actions.push({
      startMessage: botDebugMessages.updatingBotMessagingEndpoint,
      run: this.updateBotMessagingEndpoint.bind(this),
    });
    actions.push({
      startMessage: botDebugMessages.savingStates,
      run: this.saveStates.bind(this),
    });
    actions.push({
      startMessage: botDebugMessages.settingEnvs,
      run: this.setEnvs.bind(this),
    });
    return actions;
  }

  private async validateArgs(): Promise<Result<string[], FxError>> {
    if (this.args.botId !== undefined && this.args.botId.trim().length === 0) {
      return err(DebugArgumentEmptyError("botId"));
    }
    if (this.args.botPassword !== undefined && this.args.botPassword.trim().length === 0) {
      return err(DebugArgumentEmptyError("botPassword"));
    }

    const existing = this.args.botId || this.args.botPassword;
    const missing = !this.args.botId || !this.args.botPassword;
    if (existing && missing) {
      return err(InvalidExistingBotArgsError());
    }

    return ok([]);
  }

  private async registerAAD(): Promise<Result<string[], FxError>> {
    try {
      const result = await this.validateArgs();
      if (result.isErr()) {
        return err(result.error);
      }

      const projectSettingsResult = await loadProjectSettingsByProjectPath(this.projectPath, true);
      if (projectSettingsResult.isErr()) {
        return err(projectSettingsResult.error);
      }
      this.projectSettingsV3 = projectSettingsResult.value as ProjectSettingsV3;

      this.cryptoProvider = new LocalCrypto(this.projectSettingsV3.projectId);

      const envInfoResult = await environmentManager.loadEnvInfo(
        this.projectPath,
        this.cryptoProvider,
        environmentManager.getLocalEnvName(),
        true
      );
      if (envInfoResult.isErr()) {
        return err(envInfoResult.error);
      }
      this.envInfoV3 = envInfoResult.value;
      this.envInfoV3.state[ComponentNames.TeamsBot] =
        this.envInfoV3.state[ComponentNames.TeamsBot] || {};

      if (this.args.botId) {
        // use existing bot
        // set botId, botPassword from args to state
        this.envInfoV3.state[ComponentNames.TeamsBot].botId = this.args.botId;
        this.envInfoV3.state[ComponentNames.TeamsBot].botPassword = this.args.botPassword;

        return ok([util.format(botDebugMessages.useExistingAAD, this.args.botId)]);
      } else if (
        this.envInfoV3.state[ComponentNames.TeamsBot].botId &&
        this.envInfoV3.state[ComponentNames.TeamsBot].botPassword
      ) {
        // AAD already registered
        return ok([
          util.format(
            botDebugMessages.AADAlreadyRegistered,
            this.envInfoV3.state[ComponentNames.TeamsBot].botId
          ),
        ]);
      } else {
        // not using existing bot and AAD not yet registered
        const tokenResult = await this.m365TokenProvider.getAccessToken({
          scopes: GraphScopes,
        });
        if (tokenResult.isErr()) {
          return err(tokenResult.error);
        }

        const displayName = ResourceNameFactory.createCommonName(
          genUUID(),
          this.projectSettingsV3.appName,
          MaxLengths.AAD_DISPLAY_NAME
        );
        const botAuthCredential = await AADRegistration.registerAADAppAndGetSecretByGraph(
          tokenResult.value,
          displayName
        );

        // set objectId, botId, botPassword to state
        this.envInfoV3.state[ComponentNames.TeamsBot].objectId = botAuthCredential.objectId;
        this.envInfoV3.state[ComponentNames.TeamsBot].botId = botAuthCredential.clientId;
        this.envInfoV3.state[ComponentNames.TeamsBot].botPassword = botAuthCredential.clientSecret;

        return ok([util.format(botDebugMessages.AADRegistered, botAuthCredential.clientId)]);
      }
    } catch (error: unknown) {
      return err(assembleError(error, errorSource));
    }
  }

  private async registerBot(): Promise<Result<string[], FxError>> {
    try {
      const tokenResult = await this.m365TokenProvider.getAccessToken({
        scopes: AppStudioScopes,
      });
      if (tokenResult.isErr()) {
        return err(tokenResult.error);
      }

      const result = await AppStudio.getBotRegistration(
        tokenResult.value,
        this.envInfoV3!.state[ComponentNames.TeamsBot].botId
      );
      if (result) {
        return ok([
          util.format(
            botDebugMessages.botAlreadyRegistered,
            `${botUrl}${this.envInfoV3!.state[ComponentNames.TeamsBot].botId}`
          ),
        ]);
      }

      const botReg: IBotRegistration = {
        botId: this.envInfoV3!.state[ComponentNames.TeamsBot].botId,
        name:
          convertToAlphanumericOnly(this.projectSettingsV3!.appName) +
          PluginLocalDebug.LOCAL_DEBUG_SUFFIX,
        description: "",
        iconUrl: "",
        messagingEndpoint: "",
        callingEndpoint: "",
      };

      await AppStudio.createBotRegistration(tokenResult.value, botReg);

      return ok([
        util.format(
          botDebugMessages.botRegistered,
          `${botUrl}${this.envInfoV3!.state[ComponentNames.TeamsBot].botId}`
        ),
      ]);
    } catch (error: unknown) {
      return err(assembleError(error, errorSource));
    }
  }

  private async updateBotMessagingEndpoint(): Promise<Result<string[], FxError>> {
    try {
      // set validDomain, domain, siteEndpoint from args to state
      const url = new URL(this.args.botMessagingEndpoint!);
      this.envInfoV3!.state[ComponentNames.TeamsBot].validDomain = url.hostname;
      this.envInfoV3!.state[ComponentNames.TeamsBot].domain = url.hostname;
      this.envInfoV3!.state[ComponentNames.TeamsBot].siteEndpoint = url.origin;

      const tokenResult = await this.m365TokenProvider.getAccessToken({
        scopes: AppStudioScopes,
      });
      if (tokenResult.isErr()) {
        return err(tokenResult.error);
      }

      await AppStudio.updateMessageEndpoint(
        tokenResult.value,
        this.envInfoV3!.state[ComponentNames.TeamsBot].botId,
        this.args.botMessagingEndpoint!
      );

      return ok([
        util.format(botDebugMessages.botMessagingEndpointUpdated, this.args.botMessagingEndpoint),
      ]);
    } catch (error: unknown) {
      return err(assembleError(error, errorSource));
    }
  }

  private async saveStates(): Promise<Result<string[], FxError>> {
    try {
      const statePath = await environmentManager.writeEnvState(
        cloneDeep(this.envInfoV3!.state),
        this.projectPath,
        this.cryptoProvider!,
        environmentManager.getLocalEnvName(),
        true
      );
      if (statePath.isErr()) {
        return err(statePath.error);
      }

      return ok([util.format(botDebugMessages.statesSaved, path.normalize(statePath.value))]);
    } catch (error: unknown) {
      return err(assembleError(error, errorSource));
    }
  }

  private async setEnvs(): Promise<Result<string[], FxError>> {
    try {
      const localEnvProvider = new LocalEnvProvider(this.projectPath);
      const botEnvs = await localEnvProvider.loadBotLocalEnvs();

      botEnvs.template[LocalEnvKeys.bot.template.BotId] =
        this.envInfoV3!.state[ComponentNames.TeamsBot].botId;
      botEnvs.template[LocalEnvKeys.bot.template.BotPassword] =
        this.envInfoV3!.state[ComponentNames.TeamsBot].botPassword;

      const envPath = await localEnvProvider.saveBotLocalEnvs(botEnvs);

      return ok([util.format(botDebugMessages.envsSet, path.normalize(envPath))]);
    } catch (error: unknown) {
      return err(assembleError(error, errorSource));
    }
  }
}
