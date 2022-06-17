// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AppPackageFolderName,
  AzureSolutionSettings,
  BuildFolderName,
  FxError,
  LogProvider,
  PluginContext,
  Result,
} from "@microsoft/teamsfx-api";
import { AadResult, ResultFactory } from "./results";
import {
  CheckGrantPermissionConfig,
  ConfigUtils,
  PostProvisionConfig,
  ProvisionConfig,
  SetApplicationInContextConfig,
  UpdatePermissionConfig,
  Utils,
} from "./utils/configs";
import { TelemetryUtils } from "./utils/telemetry";
import { TokenAudience, TokenProvider } from "./utils/tokenProvider";
import { AadAppClient } from "./aadAppClient";
import {
  AppIdUriInvalidError,
  ParsePermissionError,
  UnknownPermissionName,
  UnknownPermissionRole,
  UnknownPermissionScope,
  GetConfigError,
  ConfigErrorMessages,
  AadManifestMissingObjectId,
  AadManifestMissingReplyUrlsWithType,
  AadManifestMissingIdentifierUris,
  AadManifestMissingName,
  CannotGenerateIdentifierUrisError,
  AadManifestNotProvisioned,
  AADManifestMissingScopeIdForTeamsApp,
} from "./errors";
import { Envs } from "./interfaces/models";
import { DialogUtils } from "./utils/dialog";
import {
  ConfigKeys,
  Constants,
  Messages,
  Plugins,
  ProgressDetail,
  ProgressTitle,
  Telemetry,
  TemplatePathInfo,
} from "./constants";
import { IPermission } from "./interfaces/IPermission";
import {
  IAADDefinition,
  RequiredResourceAccess,
  ResourceAccess,
} from "./interfaces/IAADDefinition";
import { validate as uuidValidate } from "uuid";
import * as path from "path";
import * as fs from "fs-extra";
import * as os from "os";
import { ArmTemplateResult } from "../../../common/armInterface";
import { Bicep, ConstantString, HelpLinks } from "../../../common/constants";
import { getTemplatesFolder } from "../../../folder";
import { AadOwner, ResourcePermission } from "../../../common/permissionInterface";
import { AppUser } from "../appstudio/interfaces/appUser";
import { isAadManifestEnabled, isConfigUnifyEnabled } from "../../../common/tools";
import { getPermissionMap } from "./permissions";
import { AadAppManifestManager } from "./aadAppManifestManager";
import { AADManifest, ReplyUrlsWithType } from "./interfaces/AADManifest";
import {
  BotOptionItem,
  MessageExtensionItem,
  TabOptionItem,
} from "../../solution/fx-solution/question";
import { format, Formats } from "./utils/format";
import { PluginNames, REMOTE_AAD_ID, SOLUTION_PROVISION_SUCCEEDED } from "../../solution";
import { generateAadManifestTemplate } from "../../../core/generateAadManifestTemplate";

export class AadAppForTeamsImpl {
  public async provision(ctx: PluginContext, isLocalDebug = false): Promise<AadResult> {
    if (isAadManifestEnabled() && isConfigUnifyEnabled()) {
      return await this.provisionUsingManifest(ctx, isLocalDebug);
    }

    TelemetryUtils.init(ctx);
    Utils.addLogAndTelemetryWithLocalDebug(
      ctx.logProvider,
      Messages.StartProvision,
      Messages.StartLocalDebug,
      isLocalDebug
    );

    const telemetryMessage = isLocalDebug
      ? Messages.EndLocalDebug.telemetry
      : Messages.EndProvision.telemetry;

    await TokenProvider.init({ m365: ctx.m365TokenProvider });

    // Move objectId etc. from input to output.
    const skip = Utils.skipAADProvision(
      ctx,
      isLocalDebug ? (isConfigUnifyEnabled() ? false : true) : false
    );
    DialogUtils.init(ctx.ui, ProgressTitle.Provision, ProgressTitle.ProvisionSteps);

    let config: ProvisionConfig = new ProvisionConfig(
      isLocalDebug ? (isConfigUnifyEnabled() ? false : true) : false
    );
    await config.restoreConfigFromContext(ctx);
    const permissions = AadAppForTeamsImpl.parsePermission(
      config.permissionRequest as string,
      ctx.logProvider
    );

    await DialogUtils.progress?.start(ProgressDetail.Starting);
    if (config.objectId) {
      if (!skip) {
        await DialogUtils.progress?.next(ProgressDetail.GetAadApp);
        config = await AadAppClient.getAadApp(
          telemetryMessage,
          config.objectId,
          config.password,
          ctx.m365TokenProvider,
          isLocalDebug
            ? isConfigUnifyEnabled()
              ? ctx.envInfo.envName
              : undefined
            : ctx.envInfo.envName
        );
        ctx.logProvider?.info(Messages.getLog(Messages.GetAadAppSuccess));
      }
    } else {
      await DialogUtils.progress?.next(ProgressDetail.ProvisionAadApp);
      await AadAppClient.createAadApp(telemetryMessage, config);
      config.password = undefined;
      ctx.logProvider?.info(Messages.getLog(Messages.CreateAadAppSuccess));
    }

    if (!config.password) {
      await DialogUtils.progress?.next(ProgressDetail.CreateAadAppSecret);
      await AadAppClient.createAadAppSecret(telemetryMessage, config);
      ctx.logProvider?.info(Messages.getLog(Messages.CreateAadAppPasswordSuccess));
    }

    await DialogUtils.progress?.next(ProgressDetail.UpdatePermission);
    await AadAppClient.updateAadAppPermission(
      telemetryMessage,
      config.objectId as string,
      permissions,
      skip
    );
    ctx.logProvider?.info(Messages.getLog(Messages.UpdatePermissionSuccess));

    await DialogUtils.progress?.end(true);
    config.saveConfigIntoContext(ctx, TokenProvider.tenantId as string);
    Utils.addLogAndTelemetryWithLocalDebug(
      ctx.logProvider,
      Messages.EndProvision,
      Messages.EndLocalDebug,
      isLocalDebug,
      skip ? { [Telemetry.skip]: Telemetry.yes } : {}
    );
    return ResultFactory.Success();
  }

  public async provisionUsingManifest(
    ctx: PluginContext,
    isLocalDebug = false
  ): Promise<AadResult> {
    TelemetryUtils.init(ctx);
    Utils.addLogAndTelemetryWithLocalDebug(
      ctx.logProvider,
      Messages.StartProvision,
      Messages.StartLocalDebug,
      isLocalDebug
    );

    const telemetryMessage = isLocalDebug
      ? Messages.EndLocalDebug.telemetry
      : Messages.EndProvision.telemetry;

    await TokenProvider.init({ m365: ctx.m365TokenProvider });

    // Move objectId etc. from input to output.
    const skip = Utils.skipAADProvision(ctx, false);
    DialogUtils.init(ctx.ui, ProgressTitle.Provision, ProgressTitle.ProvisionSteps);

    let config: ProvisionConfig = new ProvisionConfig(false);
    await config.restoreConfigFromContext(ctx);

    const manifest = await AadAppManifestManager.loadAadManifest(ctx);

    await DialogUtils.progress?.start(ProgressDetail.Starting);
    if (manifest.id) {
      const existingOauth2PermissionScopeId = ctx.envInfo.config.auth?.accessAsUserScopeId;

      if (!skip || !existingOauth2PermissionScopeId) {
        await DialogUtils.progress?.next(ProgressDetail.GetAadApp);
        config = await AadAppClient.getAadAppUsingManifest(
          telemetryMessage,
          manifest.id,
          config.password,
          await this.getScopeIdForTeams(manifest),
          ctx.m365TokenProvider,
          ctx.envInfo.envName
        );
        ctx.logProvider?.info(Messages.getLog(Messages.GetAadAppSuccess));
      }
    } else {
      await DialogUtils.progress?.next(ProgressDetail.ProvisionAadApp);
      if (!manifest.name) {
        throw ResultFactory.UserError(
          AadManifestMissingName.name,
          AadManifestMissingName.message()
        );
      }
      config.oauth2PermissionScopeId = await this.getScopeIdForTeams(manifest);
      await AadAppClient.createAadAppUsingManifest(telemetryMessage, manifest, config);
      config.password = undefined;
      ctx.logProvider?.info(Messages.getLog(Messages.CreateAadAppSuccess));
    }

    if (!config.password) {
      await DialogUtils.progress?.next(ProgressDetail.CreateAadAppSecret);
      await AadAppClient.createAadAppSecret(telemetryMessage, config);
      ctx.logProvider?.info(Messages.getLog(Messages.CreateAadAppPasswordSuccess));
    }

    await DialogUtils.progress?.end(true);
    config.saveConfigIntoContext(ctx, TokenProvider.tenantId as string);

    Utils.addLogAndTelemetryWithLocalDebug(
      ctx.logProvider,
      Messages.EndProvision,
      Messages.EndLocalDebug,
      isLocalDebug,
      skip ? { [Telemetry.skip]: Telemetry.yes } : {}
    );
    return ResultFactory.Success();
  }

  private getScopeIdForTeams(manifest: AADManifest) {
    let scopeId;
    let findAccessAsUser;
    manifest.oauth2Permissions?.forEach((oauth2Permission) => {
      if (oauth2Permission.value === "access_as_user") {
        scopeId = oauth2Permission.id;
        findAccessAsUser = true;
      }
    });

    if (!findAccessAsUser) {
      throw ResultFactory.UserError(
        AADManifestMissingScopeIdForTeamsApp.name,
        AADManifestMissingScopeIdForTeamsApp.message()
      );
    }

    return scopeId;
  }

  public setApplicationInContext(ctx: PluginContext, isLocalDebug = false): AadResult {
    const config: SetApplicationInContextConfig = new SetApplicationInContextConfig(isLocalDebug);
    config.restoreConfigFromContext(ctx);

    const userSetFrontendDomain = format(
      ctx.envInfo.config.auth?.frontendDomain as string,
      Formats.Domain
    );
    const userSetBotId = format(ctx.envInfo.config.auth?.botId as string, Formats.UUID);
    const userSetBotEndpoint = format(
      ctx.envInfo.config.auth?.botEndpoint as string,
      Formats.Endpoint
    );

    if (!config.frontendDomain && !config.botId) {
      const azureSolutionSettings = ctx.projectSettings?.solutionSettings as AzureSolutionSettings;
      if (
        azureSolutionSettings?.capabilities.includes("Tab") ||
        azureSolutionSettings?.capabilities.includes("Bot")
      ) {
        throw ResultFactory.UserError(AppIdUriInvalidError.name, AppIdUriInvalidError.message());
      }
    }

    config.frontendDomain = userSetFrontendDomain ?? config.frontendDomain;
    config.botId = userSetBotId ?? config.botId;
    config.botEndpoint = userSetBotEndpoint ?? config.botEndpoint;

    if (config.frontendDomain || config.botId) {
      let applicationIdUri = "api://";
      applicationIdUri += config.frontendDomain ? `${config.frontendDomain}/` : "";
      applicationIdUri += config.botId ? "botid-" + config.botId : config.clientId;
      config.applicationIdUri = applicationIdUri;
      ctx.logProvider?.info(Messages.getLog(Messages.SetAppIdUriSuccess));
    } else {
      throw ResultFactory.UserError(
        CannotGenerateIdentifierUrisError.name,
        CannotGenerateIdentifierUrisError.message()
      );
    }
    config.saveConfigIntoContext(ctx, config.frontendDomain, config.botId, config.botEndpoint);
    return ResultFactory.Success();
  }

  public async postProvision(ctx: PluginContext, isLocalDebug = false): Promise<AadResult> {
    if (isAadManifestEnabled() && isConfigUnifyEnabled()) {
      return await this.postProvisionUsingManifest(ctx, isLocalDebug);
    }
    TelemetryUtils.init(ctx);
    Utils.addLogAndTelemetryWithLocalDebug(
      ctx.logProvider,
      Messages.StartPostProvision,
      Messages.StartPostLocalDebug,
      isLocalDebug
    );

    const skip = Utils.skipAADProvision(
      ctx,
      isLocalDebug ? (isConfigUnifyEnabled() ? false : true) : false
    );
    DialogUtils.init(ctx.ui, ProgressTitle.PostProvision, ProgressTitle.PostProvisionSteps);

    await TokenProvider.init({ m365: ctx.m365TokenProvider });
    const config: PostProvisionConfig = new PostProvisionConfig(
      isLocalDebug ? (isConfigUnifyEnabled() ? false : true) : false
    );
    config.restoreConfigFromContext(ctx);

    await DialogUtils.progress?.start(ProgressDetail.Starting);
    await DialogUtils.progress?.next(ProgressDetail.UpdateRedirectUri);

    const redirectUris: IAADDefinition = AadAppForTeamsImpl.getRedirectUris(
      config.frontendEndpoint,
      config.botEndpoint,
      config.clientId!
    );
    await AadAppClient.updateAadAppRedirectUri(
      isLocalDebug ? Messages.EndPostLocalDebug.telemetry : Messages.EndPostProvision.telemetry,
      config.objectId as string,
      redirectUris,
      skip
    );
    ctx.logProvider?.info(Messages.getLog(Messages.UpdateRedirectUriSuccess));

    await DialogUtils.progress?.next(ProgressDetail.UpdateAppIdUri);
    await AadAppClient.updateAadAppIdUri(
      isLocalDebug ? Messages.EndPostLocalDebug.telemetry : Messages.EndPostProvision.telemetry,
      config.objectId as string,
      config.applicationIdUri as string,
      skip
    );
    ctx.logProvider?.info(Messages.getLog(Messages.UpdateAppIdUriSuccess));

    await DialogUtils.progress?.end(true);
    Utils.addLogAndTelemetryWithLocalDebug(
      ctx.logProvider,
      Messages.EndPostProvision,
      Messages.EndPostLocalDebug,
      isLocalDebug,
      skip ? { [Telemetry.skip]: Telemetry.yes } : {}
    );
    return ResultFactory.Success();
  }

  public async postProvisionUsingManifest(
    ctx: PluginContext,
    isLocalDebug = false
  ): Promise<AadResult> {
    TelemetryUtils.init(ctx);
    Utils.addLogAndTelemetryWithLocalDebug(
      ctx.logProvider,
      Messages.StartPostProvision,
      Messages.StartPostLocalDebug,
      isLocalDebug
    );

    const skip = Utils.skipAADProvision(ctx, false);
    DialogUtils.init(
      ctx.ui,
      ProgressTitle.PostProvisionUsingManifest,
      ProgressTitle.PostProvisionUsingManifestSteps
    );

    await TokenProvider.init({ m365: ctx.m365TokenProvider });

    await DialogUtils.progress?.start(ProgressDetail.Starting);

    const manifest = await AadAppManifestManager.loadAadManifest(ctx);

    await AadAppClient.updateAadAppUsingManifest(
      isLocalDebug ? Messages.EndPostLocalDebug.telemetry : Messages.EndPostProvision.telemetry,
      manifest,
      skip
    );

    await this.writeManifestFileToBuildFolder(manifest, ctx);

    await DialogUtils.progress?.end(true);

    Utils.addLogAndTelemetryWithLocalDebug(
      ctx.logProvider,
      Messages.EndPostProvision,
      Messages.EndPostLocalDebug,
      isLocalDebug,
      skip ? { [Telemetry.skip]: Telemetry.yes } : {}
    );

    return ResultFactory.Success();
  }

  public async updatePermission(ctx: PluginContext): Promise<AadResult> {
    TelemetryUtils.init(ctx);
    Utils.addLogAndTelemetry(ctx.logProvider, Messages.StartUpdatePermission);
    const skip: boolean = ctx.config.get(ConfigKeys.skip) as boolean;
    if (skip) {
      ctx.logProvider?.info(Messages.SkipProvision);
      Utils.addLogAndTelemetry(ctx.logProvider, Messages.EndUpdatePermission);
      return ResultFactory.Success();
    }

    DialogUtils.init(ctx.ui, ProgressTitle.UpdatePermission, ProgressTitle.UpdatePermissionSteps);

    const configs = await AadAppForTeamsImpl.getUpdatePermissionConfigs(ctx);
    if (!configs) {
      return ResultFactory.Success();
    }

    await TokenProvider.init({ m365: ctx.m365TokenProvider });

    const permissions = AadAppForTeamsImpl.parsePermission(
      configs[0].permissionRequest as string,
      ctx.logProvider
    );

    await DialogUtils.progress?.start(ProgressDetail.Starting);
    await DialogUtils.progress?.next(ProgressDetail.UpdatePermission);
    for (const config of configs) {
      await AadAppClient.updateAadAppPermission(
        Messages.EndUpdatePermission.telemetry,
        config.objectId as string,
        permissions
      );
    }
    ctx.logProvider?.info(Messages.getLog(Messages.UpdatePermissionSuccess));

    await DialogUtils.progress?.end(true);
    DialogUtils.show(Messages.UpdatePermissionSuccessMessage);
    return ResultFactory.Success();
  }

  public async generateArmTemplates(ctx: PluginContext): Promise<AadResult> {
    TelemetryUtils.init(ctx);
    Utils.addLogAndTelemetry(ctx.logProvider, Messages.StartGenerateArmTemplates);

    const solutionSettings = ctx.projectSettings?.solutionSettings as AzureSolutionSettings;
    const capabilities = solutionSettings.capabilities;
    let result: ArmTemplateResult | undefined = undefined;

    if (
      capabilities.includes(TabOptionItem.id) ||
      capabilities.includes(BotOptionItem.id) ||
      capabilities.includes(MessageExtensionItem.id)
    ) {
      result = {
        Parameters: JSON.parse(
          await fs.readFile(
            path.join(
              getTemplatesFolder(),
              TemplatePathInfo.BicepTemplateRelativeDir,
              Bicep.ParameterFileName
            ),
            ConstantString.UTF8Encoding
          )
        ),
      };
    }

    Utils.addLogAndTelemetry(ctx.logProvider, Messages.EndGenerateArmTemplates);
    return ResultFactory.Success(result);
  }

  public async checkPermission(
    ctx: PluginContext,
    userInfo: AppUser
  ): Promise<Result<ResourcePermission[], FxError>> {
    TelemetryUtils.init(ctx);
    Utils.addLogAndTelemetry(ctx.logProvider, Messages.StartCheckPermission);

    await TokenProvider.init({ m365: ctx.m365TokenProvider }, TokenAudience.Graph);
    const config = new CheckGrantPermissionConfig();
    await config.restoreConfigFromContext(ctx);

    const userObjectId = userInfo.aadId;
    const isAadOwner = await AadAppClient.checkPermission(
      Messages.EndCheckPermission.telemetry,
      config.objectId!,
      userObjectId
    );

    const result = [
      {
        name: Constants.permissions.name,
        type: Constants.permissions.type,
        roles: isAadOwner ? [Constants.permissions.owner] : [Constants.permissions.noPermission],
        resourceId: config.objectId!,
      },
    ];
    Utils.addLogAndTelemetry(ctx.logProvider, Messages.EndCheckPermission);
    return ResultFactory.Success(result);
  }

  public async listCollaborator(ctx: PluginContext): Promise<Result<AadOwner[], FxError>> {
    TelemetryUtils.init(ctx);
    Utils.addLogAndTelemetry(ctx.logProvider, Messages.StartListCollaborator);

    await TokenProvider.init({ m365: ctx.m365TokenProvider }, TokenAudience.Graph);

    const objectId = ConfigUtils.getAadConfig(ctx, ConfigKeys.objectId, false);
    if (!objectId) {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        ConfigErrorMessages.GetConfigError(ConfigKeys.objectId, Plugins.pluginName)
      );
    }

    const owners = await AadAppClient.listCollaborator(
      Messages.EndListCollaborator.telemetry,
      objectId
    );
    Utils.addLogAndTelemetry(ctx.logProvider, Messages.EndListCollaborator);
    return ResultFactory.Success(owners);
  }

  public async grantPermission(
    ctx: PluginContext,
    userInfo: AppUser
  ): Promise<Result<ResourcePermission[], FxError>> {
    TelemetryUtils.init(ctx);
    Utils.addLogAndTelemetry(ctx.logProvider, Messages.StartGrantPermission);

    await TokenProvider.init({ m365: ctx.m365TokenProvider }, TokenAudience.Graph);
    const config = new CheckGrantPermissionConfig(true);
    await config.restoreConfigFromContext(ctx);

    const userObjectId = userInfo.aadId;
    await AadAppClient.grantPermission(ctx, config.objectId!, userObjectId);

    const result = [
      {
        name: Constants.permissions.name,
        type: Constants.permissions.type,
        roles: [Constants.permissions.owner],
        resourceId: config.objectId!,
      },
    ];
    Utils.addLogAndTelemetry(ctx.logProvider, Messages.EndGrantPermission);
    return ResultFactory.Success(result);
  }

  public static getRedirectUris(
    frontendEndpoint: string | undefined,
    botEndpoint: string | undefined,
    clientId: string
  ) {
    const redirectUris: IAADDefinition = {
      web: {
        redirectUris: [],
      },
      spa: {
        redirectUris: [],
      },
    };
    if (frontendEndpoint) {
      redirectUris.web?.redirectUris?.push(`${frontendEndpoint}/auth-end.html`);
      redirectUris.spa?.redirectUris?.push(`${frontendEndpoint}/blank-auth-end.html`);
      redirectUris.spa?.redirectUris?.push(
        `${frontendEndpoint}/auth-end.html?clientId=${clientId}`
      );
    }

    if (botEndpoint) {
      redirectUris.web?.redirectUris?.push(`${botEndpoint}/auth-end.html`);
    }

    return redirectUris;
  }

  private static async getUpdatePermissionConfigs(
    ctx: PluginContext
  ): Promise<UpdatePermissionConfig[] | undefined> {
    let azureAad = false;
    let localAad = false;
    if (ctx.config.get(ConfigKeys.objectId)) {
      azureAad = true;
    }
    if (ctx.config.get(Utils.addLocalDebugPrefix(true, ConfigKeys.objectId))) {
      localAad = true;
    }

    if (azureAad && localAad) {
      const ans = ctx.answers![Constants.AskForEnvName];
      if (!ans) {
        ctx.logProvider?.info(Messages.UserCancelled);
        return undefined;
      }
      if (ans === Envs.Azure) {
        localAad = false;
      } else if (ans === Envs.LocalDebug) {
        azureAad = false;
      }
    }

    if (!azureAad && !localAad) {
      await DialogUtils.show(Messages.NoSelection, "info");
      return undefined;
    }

    const configs: UpdatePermissionConfig[] = [];
    if (azureAad) {
      const config: UpdatePermissionConfig = new UpdatePermissionConfig();
      await config.restoreConfigFromContext(ctx);
      configs.push(config);
    }

    if (localAad) {
      const config: UpdatePermissionConfig = new UpdatePermissionConfig(true);
      await config.restoreConfigFromContext(ctx);
      configs.push(config);
    }

    return configs;
  }

  public static parsePermission(
    permissionRequest: string,
    logProvider?: LogProvider
  ): RequiredResourceAccess[] {
    let permissionRequestParsed: IPermission[];
    try {
      permissionRequestParsed = <IPermission[]>JSON.parse(permissionRequest as string);
    } catch (error) {
      throw ResultFactory.UserError(
        ParsePermissionError.name,
        ParsePermissionError.message(),
        error,
        undefined,
        ParsePermissionError.helpLink
      );
    }

    const permissions = AadAppForTeamsImpl.generateRequiredResourceAccess(permissionRequestParsed);
    if (!permissions) {
      throw ResultFactory.UserError(
        ParsePermissionError.name,
        ParsePermissionError.message(),
        undefined,
        undefined,
        ParsePermissionError.helpLink
      );
    }

    logProvider?.info(Messages.getLog(Messages.ParsePermissionSuccess));
    return permissions;
  }

  private static generateRequiredResourceAccess(
    permissions?: IPermission[]
  ): RequiredResourceAccess[] | undefined {
    if (!permissions) {
      return undefined;
    }

    const map = getPermissionMap();

    const requiredResourceAccessList: RequiredResourceAccess[] = [];

    permissions.forEach((permission) => {
      const requiredResourceAccess: RequiredResourceAccess = {};
      const resourceIdOrName = permission.resource;
      let resourceId = resourceIdOrName;
      if (!uuidValidate(resourceIdOrName)) {
        const res = map[resourceIdOrName];
        if (!res) {
          throw ResultFactory.UserError(
            UnknownPermissionName.name,
            UnknownPermissionName.message(resourceIdOrName),
            undefined,
            undefined,
            UnknownPermissionName.helpLink
          );
        }

        const id = res.id;
        if (!id) {
          throw ResultFactory.UserError(
            UnknownPermissionName.name,
            UnknownPermissionName.message(resourceIdOrName),
            undefined,
            undefined,
            UnknownPermissionName.helpLink
          );
        }
        resourceId = id;
      }

      requiredResourceAccess.resourceAppId = resourceId;
      requiredResourceAccess.resourceAccess = [];

      if (!permission.delegated) {
        permission.delegated = [];
      }

      if (!permission.application) {
        permission.application = [];
      }

      permission.delegated = permission.delegated?.concat(permission.scopes);
      permission.delegated = permission.delegated?.filter(
        (scopeName, i) => i === permission.delegated?.indexOf(scopeName)
      );

      permission.application = permission.application?.concat(permission.roles);
      permission.application = permission.application?.filter(
        (roleName, i) => i === permission.application?.indexOf(roleName)
      );

      permission.application?.forEach((roleName) => {
        if (!roleName) {
          return;
        }

        const resourceAccess: ResourceAccess = {
          id: roleName,
          type: "Role",
        };

        if (!uuidValidate(roleName)) {
          const roleId = map[resourceId].roles[roleName];
          if (!roleId) {
            throw ResultFactory.UserError(
              UnknownPermissionRole.name,
              UnknownPermissionRole.message(roleName, permission.resource),
              undefined,
              undefined,
              UnknownPermissionRole.helpLink
            );
          }
          resourceAccess.id = roleId;
        }

        requiredResourceAccess.resourceAccess!.push(resourceAccess);
      });

      permission.delegated?.forEach((scopeName) => {
        if (!scopeName) {
          return;
        }

        const resourceAccess: ResourceAccess = {
          id: scopeName,
          type: "Scope",
        };

        if (!uuidValidate(scopeName)) {
          const scopeId = map[resourceId].scopes[scopeName];
          if (!scopeId) {
            throw ResultFactory.UserError(
              UnknownPermissionScope.name,
              UnknownPermissionScope.message(scopeName, permission.resource),
              undefined,
              undefined,
              UnknownPermissionScope.helpLink
            );
          }
          resourceAccess.id = map[resourceId].scopes[scopeName];
        }

        requiredResourceAccess.resourceAccess!.push(resourceAccess);
      });

      requiredResourceAccessList.push(requiredResourceAccess);
    });

    return requiredResourceAccessList;
  }

  public async scaffold(ctx: PluginContext): Promise<AadResult> {
    if (isAadManifestEnabled() && isConfigUnifyEnabled()) {
      TelemetryUtils.init(ctx);
      Utils.addLogAndTelemetry(ctx.logProvider, Messages.StartScaffold);
      await generateAadManifestTemplate(ctx.root, ctx.projectSettings);
      Utils.addLogAndTelemetry(ctx.logProvider, Messages.EndScaffold);
    }
    return ResultFactory.Success();
  }

  public async deploy(ctx: PluginContext): Promise<Result<any, FxError>> {
    if (isAadManifestEnabled() && isConfigUnifyEnabled()) {
      TelemetryUtils.init(ctx);
      Utils.addLogAndTelemetry(ctx.logProvider, Messages.StartDeploy);

      try {
        DialogUtils.init(ctx.ui, ProgressTitle.Deploy, ProgressTitle.DeploySteps);
        await TokenProvider.init({ m365: ctx.m365TokenProvider });

        await DialogUtils.progress?.start(ProgressDetail.Starting);

        const skip = Utils.skipAADProvision(ctx, false);

        const manifest = await this.loadAndBuildManifest(ctx);

        this.validateDeployManifest(manifest);

        await AadAppClient.updateAadAppUsingManifest(Messages.EndDeploy.telemetry, manifest, skip);

        Utils.addLogAndTelemetry(
          ctx.logProvider,
          Messages.EndDeploy,
          skip ? { [Telemetry.skip]: Telemetry.yes } : {}
        );
      } catch (err) {
        throw err;
      } finally {
        await DialogUtils.progress?.end(true);
      }
    }
    return ResultFactory.Success();
  }

  public async loadAndBuildManifest(ctx: PluginContext): Promise<AADManifest> {
    let isProvisionSucceeded;
    if (ctx.envInfo.envName === "local") {
      isProvisionSucceeded = !!ctx.envInfo.state.get(PluginNames.AAD)?.get(REMOTE_AAD_ID);
    } else {
      isProvisionSucceeded = !!(ctx.envInfo.state
        .get("solution")
        ?.get(SOLUTION_PROVISION_SUCCEEDED) as boolean);
    }

    if (!isProvisionSucceeded) {
      throw ResultFactory.UserError(
        AadManifestNotProvisioned.name,
        AadManifestNotProvisioned.message(),
        undefined,
        undefined,
        HelpLinks.WhyNeedProvision
      );
    }

    const manifest = await AadAppManifestManager.loadAadManifest(ctx);

    if (!manifest.id) {
      throw ResultFactory.UserError(
        AadManifestMissingObjectId.name,
        AadManifestMissingObjectId.message()
      );
    }
    await this.writeManifestFileToBuildFolder(manifest, ctx);
    return manifest;
  }

  private async writeManifestFileToBuildFolder(
    manifest: AADManifest,
    ctx: PluginContext
  ): Promise<void> {
    const aadManifestPath = `${ctx.root}/${BuildFolderName}/${AppPackageFolderName}/aad.${ctx.envInfo.envName}.json`;
    const manifestString = JSON.stringify(manifest, null, 4);
    await fs.ensureDir(path.dirname(aadManifestPath));
    await fs.writeFile(aadManifestPath, manifestString, "utf8");
  }

  private validateDeployManifest(manifest: AADManifest): void {
    if (manifest.name === "") {
      throw ResultFactory.UserError(AadManifestMissingName.name, AadManifestMissingName.message());
    }

    if (!manifest.id) {
      throw ResultFactory.UserError(
        AadManifestMissingObjectId.name,
        AadManifestMissingObjectId.message()
      );
    }

    if (!manifest.identifierUris || manifest.identifierUris.length === 0) {
      throw ResultFactory.UserError(
        AadManifestMissingIdentifierUris.name,
        AadManifestMissingIdentifierUris.message()
      );
    }
  }
}
