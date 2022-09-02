// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { cloneDeep } from "lodash";

import {
  assembleError,
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
  Void,
} from "@microsoft/teamsfx-api";

import { AppStudioScopes, GraphScopes } from "../../common/tools";
import { convertToAlphanumericOnly } from "../../common/utils";
import { LocalCrypto } from "../../core/crypto";
import { environmentManager } from "../../core/environment";
import { loadProjectSettingsByProjectPath } from "../../core/middleware/projectSettingsLoader";
import { AADRegistration } from "../../plugins/resource/bot/aadRegistration";
import { AppStudio } from "../../plugins/resource/bot/appStudio/appStudio";
import { IBotRegistration } from "../../plugins/resource/bot/appStudio/interfaces/IBotRegistration";
import { MaxLengths } from "../../plugins/resource/bot/constants";
import { PluginLocalDebug } from "../../plugins/resource/bot/resources/strings";
import { genUUID } from "../../plugins/resource/bot/utils/common";
import { ResourceNameFactory } from "../../plugins/resource/bot/utils/resourceNameFactory";
import { ComponentNames } from "../constants";
import { botTunnelEndpointPlaceholder } from "./constants";
import {
  BotMessagingEndpointMissingError,
  errorSource,
  InvalidExistingBotArgsError,
} from "./error";
import { LocalEnvKeys, LocalEnvProvider } from "./localEnvProvider";

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

  // TODO: output message
  public async setUp(): Promise<Result<Void, FxError>> {
    try {
      const checkArgsResult = await this.checkArgs();
      if (checkArgsResult.isErr()) {
        return err(checkArgsResult.error);
      }

      const projectSettingsResult = await loadProjectSettingsByProjectPath(this.projectPath, true);
      if (projectSettingsResult.isErr()) {
        return err(projectSettingsResult.error);
      }
      const projectSettingsV3: ProjectSettingsV3 = projectSettingsResult.value as ProjectSettingsV3;

      const cryptoProvider = new LocalCrypto(projectSettingsV3.projectId);

      const envInfoResult = await environmentManager.loadEnvInfo(
        this.projectPath,
        cryptoProvider,
        environmentManager.getLocalEnvName(),
        true
      );
      if (envInfoResult.isErr()) {
        return err(envInfoResult.error);
      }
      const envInfoV3: v3.EnvInfoV3 = envInfoResult.value;
      envInfoV3.state[ComponentNames.TeamsBot] = envInfoV3.state[ComponentNames.TeamsBot] || {};

      // set botId, botPassword from args to state
      if (checkArgsResult.value) {
        envInfoV3.state[ComponentNames.TeamsBot].botId = this.args.botId;
        envInfoV3.state[ComponentNames.TeamsBot].botPassword = this.args.botPassword;
      }

      // set validDomain, domain, siteEndpoint from args to state
      const url = new URL(this.args.botMessagingEndpoint!);
      envInfoV3.state[ComponentNames.TeamsBot].validDomain = url.hostname;
      envInfoV3.state[ComponentNames.TeamsBot].domain = url.hostname;
      envInfoV3.state[ComponentNames.TeamsBot].siteEndpoint = url.origin;

      // not using existing bot and not yet created
      if (!envInfoV3.state[ComponentNames.TeamsBot].botId) {
        const tokenResult = await this.m365TokenProvider.getAccessToken({
          scopes: GraphScopes,
        });
        if (tokenResult.isErr()) {
          return err(tokenResult.error);
        }

        const displayName = ResourceNameFactory.createCommonName(
          genUUID(),
          projectSettingsV3.appName,
          MaxLengths.AAD_DISPLAY_NAME
        );
        const botAuthCredential = await AADRegistration.registerAADAppAndGetSecretByGraph(
          tokenResult.value,
          displayName
        );

        // set objectId, botId, botPassword to state
        envInfoV3.state[ComponentNames.TeamsBot].objectId = botAuthCredential.objectId;
        envInfoV3.state[ComponentNames.TeamsBot].botId = botAuthCredential.clientId;
        envInfoV3.state[ComponentNames.TeamsBot].botPassword = botAuthCredential.clientSecret;
      }

      const tokenResult = await this.m365TokenProvider.getAccessToken({
        scopes: AppStudioScopes,
      });
      if (tokenResult.isErr()) {
        return err(tokenResult.error);
      }

      const botReg: IBotRegistration = {
        botId: envInfoV3.state[ComponentNames.TeamsBot].botId,
        name:
          convertToAlphanumericOnly(projectSettingsV3.appName) +
          PluginLocalDebug.LOCAL_DEBUG_SUFFIX,
        description: "",
        iconUrl: "",
        messagingEndpoint: this.args.botMessagingEndpoint!,
        callingEndpoint: "",
      };

      await AppStudio.createBotRegistration(tokenResult.value, botReg);

      await AppStudio.updateMessageEndpoint(
        tokenResult.value,
        envInfoV3.state[ComponentNames.TeamsBot].botId,
        this.args.botMessagingEndpoint!
      );

      await environmentManager.writeEnvState(
        cloneDeep(envInfoV3.state),
        this.projectPath,
        cryptoProvider,
        environmentManager.getLocalEnvName(),
        true
      );

      await this.setEnvs(envInfoV3);

      return ok(Void);
    } catch (error: any) {
      return err(assembleError(error, errorSource));
    }
  }

  private async setEnvs(envInfoV3: v3.EnvInfoV3): Promise<void> {
    const localEnvProvider = new LocalEnvProvider(this.projectPath);
    const botEnvs = await localEnvProvider.loadBotLocalEnvs();

    botEnvs.template[LocalEnvKeys.bot.template.BotId] =
      envInfoV3.state[ComponentNames.TeamsBot].botId;
    botEnvs.template[LocalEnvKeys.bot.template.BotPassword] =
      envInfoV3.state[ComponentNames.TeamsBot].botPassword;

    localEnvProvider.saveBotLocalEnvs(botEnvs);
  }

  // return true if using existing bot
  private async checkArgs(): Promise<Result<boolean, FxError>> {
    // TODO: allow botPassword to be set in other places (like env) instead of tasks.json
    let flag = false;
    if (this.args.botId && this.args.botPassword) {
      flag = true;
    } else if (this.args.botId || this.args.botPassword) {
      return err(InvalidExistingBotArgsError());
    }

    if (!this.args.botMessagingEndpoint || this.args.botMessagingEndpoint.trim().length === 0) {
      return err(BotMessagingEndpointMissingError());
    }

    if (this.args.botMessagingEndpoint.includes(botTunnelEndpointPlaceholder)) {
      // TODO: get bot endpoint from tunnel manager
      const botEndpoint = "";
      this.args.botMessagingEndpoint = this.args.botMessagingEndpoint.replace(
        botTunnelEndpointPlaceholder,
        botEndpoint
      );
    }

    return ok(flag);
  }
}
