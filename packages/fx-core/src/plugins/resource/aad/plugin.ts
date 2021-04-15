// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Dialog,
  Func,
  LogProvider,
  FxError,
  MsgLevel,
  NodeType,
  PluginContext,
  QTreeNode,
  Result,
} from "fx-api";
import { AadResult, ResultFactory } from "./results";
import {
  PostProvisionConfig,
  ProvisionConfig,
  SetApplicationInContextConfig,
  UpdatePermissionConfig,
} from "./utils/configs";
import { TelemetryUtils } from "./utils/telemetry";
import { TokenProvider } from "./utils/tokenProvider";
import { AadAppClient } from "./aadAppClient";
import {
  AppIdUriInvalidError,
  ParsePermissionError,
  UnknownPermissionName,
  UnknownPermissionRole,
  UnknownPermissionScope,
  GetSkipAppConfigError,
} from "./errors";
import { Envs } from "./interfaces/models";
import { DialogUtils } from "./utils/dialog";
import {
  ConfigKeys,
  Constants,
  Messages,
  ProgressDetail,
  ProgressTitle,
} from "./constants";
import { IPermission } from "./interfaces/IPermission";
import {
  RequiredResourceAccess,
  ResourceAccess,
} from "./interfaces/IAADDefinition";
import { validate as uuidValidate } from "uuid";
import { IPermissionList } from "./interfaces/IPermissionList";
import * as jsonPermissionList from "./permissions/permissions.json";
import { Utils } from "./utils/common";

export class AadAppForTeamsImpl {
  public async getQuestionsForUserTask(
    func: Func,
    ctx: PluginContext
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    const aad_host = new QTreeNode({
      type: NodeType.group,
    });

    if (
      func.method === "aadUpdatePermission" &&
      ctx.config.get(ConfigKeys.objectId) &&
      ctx.config.get(Utils.addLocalDebugPrefix(true, ConfigKeys.objectId))
    ) {
      const aad_env = new QTreeNode({
        type: NodeType.singleSelect,
        name: Constants.AskForEnvName,
        title: Constants.AskForEnv,
        option: [Envs.Azure, Envs.LocalDebug, Envs.Both],
      });
      aad_host.addChild(aad_env);
    }

    return ResultFactory.Success(aad_host);
  }

  public async provision(
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

    await TokenProvider.init(ctx);
    const skip: boolean = ctx.config.get(ConfigKeys.skip) as boolean;
    if (skip) {
      ctx.logProvider?.info(Messages.getLog(Messages.SkipProvision));
      if (
        ctx.config.get(
          Utils.addLocalDebugPrefix(isLocalDebug, ConfigKeys.objectId)
        ) &&
        ctx.config.get(
          Utils.addLocalDebugPrefix(isLocalDebug, ConfigKeys.clientId)
        ) &&
        ctx.config.get(
          Utils.addLocalDebugPrefix(isLocalDebug, ConfigKeys.clientSecret)
        ) &&
        ctx.config.get(
          Utils.addLocalDebugPrefix(
            isLocalDebug,
            ConfigKeys.oauth2PermissionScopeId
          )
        )
      ) {
        const config: ProvisionConfig = new ProvisionConfig(isLocalDebug);
        config.oauth2PermissionScopeId = ctx.config.get(
          Utils.addLocalDebugPrefix(
            isLocalDebug,
            ConfigKeys.oauth2PermissionScopeId
          )
        ) as string;
        config.saveConfigIntoContext(ctx, TokenProvider.tenantId as string);
        Utils.addLogAndTelemetryWithLocalDebug(
          ctx.logProvider,
          Messages.EndProvision,
          Messages.EndLocalDebug,
          isLocalDebug
        );
        return ResultFactory.Success();
      } else {
        throw ResultFactory.UserError(
          GetSkipAppConfigError.name,
          GetSkipAppConfigError.message()
        );
      }
    }

    DialogUtils.init(
      ctx.dialog as Dialog,
      ProgressTitle.Provision,
      ProgressTitle.ProvisionSteps
    );

    let config: ProvisionConfig = new ProvisionConfig(isLocalDebug);
    await config.restoreConfigFromContext(ctx);
    const permissions = AadAppForTeamsImpl.parsePermission(
      config.permissionRequest as string,
      ctx.logProvider
    );

    DialogUtils.progress?.start(ProgressDetail.Starting);
    if (config.objectId) {
      DialogUtils.progress?.next(ProgressDetail.GetAadApp);
      config = await AadAppClient.getAadApp(config.objectId, isLocalDebug, config.password);
      ctx.logProvider?.info(Messages.getLog(Messages.GetAadAppSuccess));
    } else {
      DialogUtils.progress?.next(ProgressDetail.ProvisionAadApp);
      await AadAppClient.createAadApp(config);
      config.password = undefined;
      ctx.logProvider?.info(Messages.getLog(Messages.CreateAadAppSuccess));
    }

    if (!config.password) {
      DialogUtils.progress?.next(ProgressDetail.CreateAadAppSecret);
      await AadAppClient.createAadAppSecret(config);
      ctx.logProvider?.info(
        Messages.getLog(Messages.CreateAadAppPasswordSuccess)
      );
    }

    DialogUtils.progress?.next(ProgressDetail.UpdatePermission);
    await AadAppClient.updateAadAppPermission(
      config.objectId as string,
      permissions
    );
    ctx.logProvider?.info(Messages.getLog(Messages.UpdatePermissionSuccess));

    DialogUtils.progress?.end();
    config.saveConfigIntoContext(ctx, TokenProvider.tenantId as string);
    Utils.addLogAndTelemetryWithLocalDebug(
      ctx.logProvider,
      Messages.EndProvision,
      Messages.EndLocalDebug,
      isLocalDebug
    );
    return ResultFactory.Success();
  }

  public setApplicationInContext(
    ctx: PluginContext,
    isLocalDebug = false
  ): AadResult {
    const config: SetApplicationInContextConfig = new SetApplicationInContextConfig(
      isLocalDebug
    );
    config.restoreConfigFromContext(ctx);

    if (!config.frontendDomain && !config.botId) {
      throw ResultFactory.UserError(
        AppIdUriInvalidError.name,
        AppIdUriInvalidError.message()
      );
    }

    let applicationIdUri = "api://";
    applicationIdUri += config.frontendDomain
      ? `${config.frontendDomain}/`
      : "";
    applicationIdUri += config.botId
      ? "botid-" + config.botId
      : config.clientId;
    config.applicationIdUri = applicationIdUri;

    ctx.logProvider?.info(Messages.getLog(Messages.SetAppIdUriSuccess));
    config.saveConfigIntoContext(ctx);
    return ResultFactory.Success();
  }

  public async postProvision(
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

    const skip: boolean = ctx.config.get(ConfigKeys.skip) as boolean;
    if (skip) {
      ctx.logProvider?.info(Messages.SkipProvision);
      Utils.addLogAndTelemetryWithLocalDebug(
        ctx.logProvider,
        Messages.EndPostProvision,
        Messages.EndPostLocalDebug,
        isLocalDebug
      );
      return ResultFactory.Success();
    }

    DialogUtils.init(
      ctx.dialog as Dialog,
      ProgressTitle.PostProvision,
      ProgressTitle.PostProvisionSteps
    );

    await TokenProvider.init(ctx);
    const config: PostProvisionConfig = new PostProvisionConfig(isLocalDebug);
    config.restoreConfigFromContext(ctx);

    DialogUtils.progress?.start(ProgressDetail.Starting);
    DialogUtils.progress?.next(ProgressDetail.UpdateRedirectUri);

    const redirectUris: string[] = AadAppForTeamsImpl.getRedirectUris(
      config.frontendEndpoint,
      config.botEndpoint
    );
    await AadAppClient.updateAadAppRedirectUri(
      config.objectId as string,
      redirectUris
    );
    ctx.logProvider?.info(Messages.getLog(Messages.UpdateRedirectUriSuccess));

    DialogUtils.progress?.next(ProgressDetail.UpdateAppIdUri);
    await AadAppClient.updateAadAppIdUri(
      config.objectId as string,
      config.applicationIdUri as string
    );
    ctx.logProvider?.info(Messages.getLog(Messages.UpdateAppIdUriSuccess));

    DialogUtils.progress.end();
    Utils.addLogAndTelemetryWithLocalDebug(
      ctx.logProvider,
      Messages.EndPostProvision,
      Messages.EndPostLocalDebug,
      isLocalDebug
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

    DialogUtils.init(
      ctx.dialog as Dialog,
      ProgressTitle.UpdatePermission,
      ProgressTitle.UpdatePermissionSteps
    );

    const configs = await AadAppForTeamsImpl.getUpdatePermissionConfigs(ctx);
    if (!configs) {
      return ResultFactory.Success();
    }

    await TokenProvider.init(ctx);

    const permissions = AadAppForTeamsImpl.parsePermission(
      configs[0].permissionRequest as string,
      ctx.logProvider
    );

    DialogUtils.progress?.start(ProgressDetail.Starting);
    DialogUtils.progress?.next(ProgressDetail.UpdatePermission);
    for (const config of configs) {
      await AadAppClient.updateAadAppPermission(
        config.objectId as string,
        permissions
      );
    }
    ctx.logProvider?.info(Messages.getLog(Messages.UpdatePermissionSuccess));

    DialogUtils.progress.end();
    DialogUtils.show(Messages.UpdatePermissionSuccessMessage);
    return ResultFactory.Success();
  }

  private static getRedirectUris(
    frontendEndpoint: string | undefined,
    botEndpoint: string | undefined
  ) {
    const redirectUris: string[] = [];
    if (frontendEndpoint) {
      redirectUris.push(`${frontendEndpoint}/auth-end.html`);
    }

    if (botEndpoint) {
      redirectUris.push(`${botEndpoint}/auth-end.html`);
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
      const ans = ctx.answers?.get(Constants.AskForEnvName);
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
      await DialogUtils.show(Messages.NoSelection, MsgLevel.Info);
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

  private static parsePermission(
    permissionRequest: string,
    logProvider?: LogProvider
  ): RequiredResourceAccess[] {
    let permissionRequestParsed: IPermission[];
    try {
      permissionRequestParsed = <IPermission[]>(
        JSON.parse(permissionRequest as string)
      );
    } catch (error) {
      throw ResultFactory.UserError(
        ParsePermissionError.name,
        ParsePermissionError.message(),
        error
      );
    }

    const permissions = AadAppForTeamsImpl.generateRequiredResourceAccess(
      permissionRequestParsed
    );
    if (!permissions) {
      throw ResultFactory.UserError(
        ParsePermissionError.name,
        ParsePermissionError.message()
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

    const map = AadAppForTeamsImpl.getPermissionMap();

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
            UnknownPermissionName.message(resourceIdOrName)
          );
        }

        const id = res.id;
        if (!id) {
          throw ResultFactory.UserError(
            UnknownPermissionName.name,
            UnknownPermissionName.message(resourceIdOrName)
          );
        }
        resourceId = id;
      }

      requiredResourceAccess.resourceAppId = resourceId;
      requiredResourceAccess.resourceAccess = [];

      permission.roles?.forEach((roleName) => {
        const resourceAccess: ResourceAccess = {
          id: roleName,
          type: "Role",
        };

        if (!uuidValidate(roleName)) {
          const roleId = map[resourceId].roles[roleName];
          if (!roleId) {
            throw ResultFactory.UserError(
              UnknownPermissionRole.name,
              UnknownPermissionRole.message(roleName, permission.resource)
            );
          }
          resourceAccess.id = roleId;
        }

        requiredResourceAccess.resourceAccess!.push(resourceAccess);
      });

      permission.scopes?.forEach((scopeName) => {
        const resourceAccess: ResourceAccess = {
          id: scopeName,
          type: "Scope",
        };

        if (!uuidValidate(scopeName)) {
          const scopeId = map[resourceId].scopes[scopeName];
          if (!scopeId) {
            throw ResultFactory.UserError(
              UnknownPermissionScope.name,
              UnknownPermissionScope.message(scopeName, permission.resource)
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

  private static getPermissionMap(): any {
    const permissionList = jsonPermissionList as IPermissionList;
    const map: any = {};
    permissionList.value.forEach((permission) => {
      const resourceId = permission.appId;
      map[resourceId] = {};
      map[resourceId].scopes = {};
      map[resourceId].roles = {};

      map[permission.displayName] = {};
      map[permission.displayName].id = resourceId;

      permission.oauth2PermissionScopes.forEach((scope) => {
        map[resourceId].scopes[scope.value] = scope.id;
      });

      permission.appRoles.forEach((appRole) => {
        map[resourceId].roles[appRole.value] = appRole.id;
      });
    });

    return map;
  }
}
