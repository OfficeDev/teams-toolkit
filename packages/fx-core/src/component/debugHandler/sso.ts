// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { cloneDeep } from "lodash";
import { v4 as uuidv4 } from "uuid";

import {
  assembleError,
  ConfigMap,
  EnvConfig,
  EnvInfo,
  err,
  FxError,
  LogProvider,
  M365TokenProvider,
  ok,
  PluginContext,
  ProjectSettingsV3,
  Result,
  TelemetryReporter,
  UserInteraction,
  v3,
  Void,
} from "@microsoft/teamsfx-api";

import { ProjectSettingsHelper } from "../../common/local/projectSettingsHelper";
import { hasSQL } from "../../common/projectSettingsHelperV3";
import { TelemetryEvent } from "../../common/telemetry";
import { objectToMap } from "../../common/tools";
import { LocalCrypto } from "../../core/crypto";
import { environmentManager } from "../../core/environment";
import { loadProjectSettingsByProjectPath } from "../../core/middleware/projectSettingsLoader";
import { AadAppClient } from "../../plugins/resource/aad/aadAppClient";
import { AadAppManifestManager } from "../../plugins/resource/aad/aadAppManifestManager";
import { Constants } from "../../plugins/resource/aad/constants";
import { ProvisionConfig } from "../../plugins/resource/aad/utils/configs";
import { TokenProvider } from "../../plugins/resource/aad/utils/tokenProvider";
import { ComponentNames } from "../constants";
import { convertEnvStateV3ToV2 } from "../migrate";
import { errorSource, InvalidSSODebugArgsError } from "./error";
import { LocalEnvKeys, LocalEnvProvider } from "./localEnvProvider";
import { getAllowedAppIds } from "../../common/tools";

export interface SSODebugArgs {
  objectId?: string;
  clientId?: string;
  clientSecret?: string;
  accessAsUserScopeId?: string;
}

export class SSODebugHandler {
  private readonly projectPath: string;
  private args: SSODebugArgs;
  private readonly m365TokenProvider: M365TokenProvider;
  private readonly logger?: LogProvider;
  private readonly telemetry?: TelemetryReporter;
  private readonly ui?: UserInteraction;

  constructor(
    projectPath: string,
    args: SSODebugArgs,
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
      envInfoV3.state[ComponentNames.AadApp] = envInfoV3.state[ComponentNames.AadApp] || {};

      // set objectId, clientId, clientSecret, oauth2PermissionScopeId from args to state
      if (checkArgsResult.value) {
        envInfoV3.state[ComponentNames.AadApp].objectId = this.args.objectId;
        envInfoV3.state[ComponentNames.AadApp].clientId = this.args.clientId;
        envInfoV3.state[ComponentNames.AadApp].clientSecret = this.args.clientSecret;
        envInfoV3.state[ComponentNames.AadApp].oauth2PermissionScopeId =
          this.args.accessAsUserScopeId || uuidv4();
      }

      await TokenProvider.init({
        m365: this.m365TokenProvider,
      });

      // set oauth2PermissionScopeId to state
      envInfoV3.state[ComponentNames.AadApp].oauth2PermissionScopeId =
        envInfoV3.state[ComponentNames.AadApp].oauth2PermissionScopeId || uuidv4();

      // not using exsting AAD app and not yet created
      if (!envInfoV3.state[ComponentNames.AadApp].objectId) {
        const context = this.constructPluginContext(envInfoV3, cryptoProvider);
        const manifest = await AadAppManifestManager.loadAadManifest(context);

        const config = new ProvisionConfig(true, false);
        await AadAppClient.createAadAppUsingManifest(
          TelemetryEvent.DebugSetUpSSO,
          manifest,
          config
        );
        await AadAppClient.createAadAppSecret(TelemetryEvent.DebugSetUpSSO, config);

        // set objectId, clientId, clientSecret to state
        envInfoV3.state[ComponentNames.AadApp].objectId = config.objectId;
        envInfoV3.state[ComponentNames.AadApp].clientId = config.clientId;
        envInfoV3.state[ComponentNames.AadApp].clientSecret = config.password;
      }

      // set applicationIdUris to state
      let applicationIdUri = "api://";
      if (ProjectSettingsHelper.includeFrontend(projectSettingsV3)) {
        applicationIdUri += "localhost/";
        if (!ProjectSettingsHelper.includeBot(projectSettingsV3)) {
          applicationIdUri += envInfoV3.state[ComponentNames.AadApp].clientId;
        }
      }
      if (ProjectSettingsHelper.includeBot(projectSettingsV3)) {
        applicationIdUri += `botid-${envInfoV3.state[ComponentNames.TeamsBot].botId}`;
      }
      envInfoV3.state[ComponentNames.AadApp].applicationIdUris = applicationIdUri;

      // set frontendEndpoint to state
      if (ProjectSettingsHelper.includeFrontend(projectSettingsV3)) {
        envInfoV3.state[ComponentNames.AadApp].frontendEndpoint = "https://localhost";
      }

      // set botId, botEndpoint to state
      if (ProjectSettingsHelper.includeBot(projectSettingsV3)) {
        envInfoV3.state[ComponentNames.AadApp].botId =
          envInfoV3.state[ComponentNames.TeamsBot].botId;
        envInfoV3.state[ComponentNames.AadApp].botEndpoint =
          envInfoV3.state[ComponentNames.TeamsBot].siteEndpoint;
      }

      // set tenantId, oauthHost, oauthAuthority to state
      envInfoV3.state[ComponentNames.AadApp].tenantId = TokenProvider.tenantId;
      envInfoV3.state[ComponentNames.AadApp].oauthHost = Constants.oauthAuthorityPrefix;
      envInfoV3.state[
        ComponentNames.AadApp
      ].oauthAuthority = `${Constants.oauthAuthorityPrefix}/${TokenProvider.tenantId}`;

      const context = this.constructPluginContext(envInfoV3, cryptoProvider);
      const manifest = await AadAppManifestManager.loadAadManifest(context);
      await AadAppClient.updateAadAppUsingManifest(TelemetryEvent.DebugSetUpSSO, manifest, false);

      await environmentManager.writeEnvState(
        cloneDeep(envInfoV3.state),
        this.projectPath,
        cryptoProvider,
        environmentManager.getLocalEnvName(),
        true
      );

      await AadAppManifestManager.writeManifestFileToBuildFolder(manifest, context);

      await this.setEnvs(projectSettingsV3, envInfoV3);

      return ok(Void);
    } catch (error: any) {
      return err(assembleError(error, errorSource));
    }
  }

  private async setEnvs(
    projectSettingsV3: ProjectSettingsV3,
    envInfoV3: v3.EnvInfoV3
  ): Promise<void> {
    const localEnvProvider = new LocalEnvProvider(this.projectPath);
    if (ProjectSettingsHelper.includeFrontend(projectSettingsV3)) {
      const frontendEnvs = await localEnvProvider.loadFrontendLocalEnvs();

      frontendEnvs.teamsfx[LocalEnvKeys.frontend.teamsfx.ClientId] =
        envInfoV3.state[ComponentNames.AadApp].clientId;
      frontendEnvs.teamsfx[LocalEnvKeys.frontend.teamsfx.LoginUrl] = `${
        envInfoV3.state[ComponentNames.TeamsTab].endpoint
      }/auth-start.html`;

      if (ProjectSettingsHelper.includeBackend(projectSettingsV3)) {
        frontendEnvs.teamsfx[LocalEnvKeys.frontend.teamsfx.FuncEndpoint] =
          frontendEnvs.teamsfx[LocalEnvKeys.frontend.teamsfx.FuncEndpoint] ||
          "http://localhost:7071";
        frontendEnvs.teamsfx[LocalEnvKeys.frontend.teamsfx.FuncName] =
          projectSettingsV3.defaultFunctionName as string;
      }

      await localEnvProvider.saveFrontendLocalEnvs(frontendEnvs);
    }
    if (ProjectSettingsHelper.includeBackend(projectSettingsV3)) {
      const backendEnvs = await localEnvProvider.loadBackendLocalEnvs();

      backendEnvs.teamsfx[LocalEnvKeys.backend.teamsfx.ClientId] =
        envInfoV3.state[ComponentNames.AadApp].clientId;
      backendEnvs.teamsfx[LocalEnvKeys.backend.teamsfx.ClientSecret] =
        envInfoV3.state[ComponentNames.AadApp].clientSecret;
      backendEnvs.teamsfx[LocalEnvKeys.backend.teamsfx.TenantId] =
        envInfoV3.state[ComponentNames.AadApp].tenantId;
      backendEnvs.teamsfx[LocalEnvKeys.backend.teamsfx.AuthorityHost] =
        envInfoV3.state[ComponentNames.AadApp].oauthHost;
      backendEnvs.teamsfx[LocalEnvKeys.backend.teamsfx.AllowedAppIds] =
        getAllowedAppIds().join(";");

      if (hasSQL(projectSettingsV3)) {
        backendEnvs.teamsfx[LocalEnvKeys.backend.teamsfx.SqlEndpoint] =
          backendEnvs.teamsfx[LocalEnvKeys.backend.teamsfx.SqlEndpoint] || "";
        backendEnvs.teamsfx[LocalEnvKeys.backend.teamsfx.SqlUserName] =
          backendEnvs.teamsfx[LocalEnvKeys.backend.teamsfx.SqlUserName] || "";
        backendEnvs.teamsfx[LocalEnvKeys.backend.teamsfx.SqlPassword] =
          backendEnvs.teamsfx[LocalEnvKeys.backend.teamsfx.SqlPassword] || "";
        backendEnvs.teamsfx[LocalEnvKeys.backend.teamsfx.SqlDbName] =
          backendEnvs.teamsfx[LocalEnvKeys.backend.teamsfx.SqlDbName] || "";
        backendEnvs.teamsfx[LocalEnvKeys.backend.teamsfx.SqlIdentityId] =
          backendEnvs.teamsfx[LocalEnvKeys.backend.teamsfx.SqlIdentityId] || "";
      }

      await localEnvProvider.saveBackendLocalEnvs(backendEnvs);
    }
    if (ProjectSettingsHelper.includeBot(projectSettingsV3)) {
      const botEnvs = await localEnvProvider.loadBotLocalEnvs();

      botEnvs.teamsfx[LocalEnvKeys.bot.teamsfx.ClientId] =
        envInfoV3.state[ComponentNames.AadApp].clientId;
      botEnvs.teamsfx[LocalEnvKeys.bot.teamsfx.ClientSecret] =
        envInfoV3.state[ComponentNames.AadApp].clientSecret;
      botEnvs.teamsfx[LocalEnvKeys.bot.teamsfx.TenantId] =
        envInfoV3.state[ComponentNames.AadApp].tenantId;
      botEnvs.teamsfx[LocalEnvKeys.bot.teamsfx.AuthorityHost] =
        envInfoV3.state[ComponentNames.AadApp].oauthHost;
      botEnvs.teamsfx[LocalEnvKeys.bot.teamsfx.LoginEndpoint] = `${
        envInfoV3.state[ComponentNames.AadApp].botEndpoint
      }/auth-start.html`;
      botEnvs.teamsfx[LocalEnvKeys.bot.teamsfx.ApplicationIdUri] =
        envInfoV3.state[ComponentNames.AadApp].applicationIdUris;

      if (ProjectSettingsHelper.includeBackend(projectSettingsV3)) {
        botEnvs.teamsfx[LocalEnvKeys.bot.teamsfx.ApiEndpoint] =
          botEnvs.teamsfx[LocalEnvKeys.bot.teamsfx.ApiEndpoint] || "http://localhost:7071";
      }

      if (hasSQL(projectSettingsV3)) {
        botEnvs.teamsfx[LocalEnvKeys.bot.teamsfx.SqlEndpoint] =
          botEnvs.teamsfx[LocalEnvKeys.bot.teamsfx.SqlEndpoint] || "";
        botEnvs.teamsfx[LocalEnvKeys.bot.teamsfx.SqlUserName] =
          botEnvs.teamsfx[LocalEnvKeys.bot.teamsfx.SqlUserName] || "";
        botEnvs.teamsfx[LocalEnvKeys.bot.teamsfx.SqlPassword] =
          botEnvs.teamsfx[LocalEnvKeys.bot.teamsfx.SqlPassword] || "";
        botEnvs.teamsfx[LocalEnvKeys.bot.teamsfx.SqlDbName] =
          botEnvs.teamsfx[LocalEnvKeys.bot.teamsfx.SqlDbName] || "";
        botEnvs.teamsfx[LocalEnvKeys.bot.teamsfx.SqlIdentityId] =
          botEnvs.teamsfx[LocalEnvKeys.bot.teamsfx.SqlIdentityId] || "";
      }

      await localEnvProvider.saveBotLocalEnvs(botEnvs);
    }
  }

  // return true if using existing AAD app
  private async checkArgs(): Promise<Result<boolean, FxError>> {
    // TODO: allow clientSecret to be set in other places (like env) instead of tasks.json
    if (this.args.objectId && this.args.clientId && this.args.clientSecret) {
      return ok(true);
    } else if (this.args.objectId || this.args.clientId || this.args.clientSecret) {
      return err(InvalidSSODebugArgsError());
    } else {
      return ok(false);
    }
  }

  private constructPluginContext(
    envInfoV3: v3.EnvInfoV3,
    cryptoProvider: LocalCrypto
  ): PluginContext {
    const envInfo: EnvInfo = {
      envName: envInfoV3.envName,
      config: envInfoV3.config as EnvConfig,
      state: objectToMap(convertEnvStateV3ToV2(envInfoV3.state)),
    };
    const context: PluginContext = {
      root: this.projectPath,
      logProvider: this.logger,
      telemetryReporter: this.telemetry,
      ui: this.ui,
      cryptoProvider,
      envInfo: envInfo,
      config: new ConfigMap(),
    };

    return context;
  }
}
