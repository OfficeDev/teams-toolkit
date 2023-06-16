// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ContextV3, FxError, Result, v3 } from "@microsoft/teamsfx-api";
import { ResultFactory } from "./results";
import { getPermissionErrorMessage } from "./utils/configs";
import { TokenAudience, TokenProvider } from "./utils/tokenProvider";
import { AadAppClient } from "./aadAppClient";
import { GetConfigError, ConfigErrorMessages } from "./errors";
import { ConfigKeys, Constants, Messages, Plugins } from "./constants";
import { AadOwner, ResourcePermission } from "../../../common/permissionInterface";
import { AppUser } from "../../driver/teamsApp/interfaces/appdefinitions/appUser";
import { isV3Enabled } from "../../../common/tools";
import { ComponentNames } from "../../constants";

export class AadAppForTeamsImpl {
  public async checkPermission(
    ctx: ContextV3,
    userInfo: AppUser,
    aadObjectIdV3?: string
  ): Promise<Result<ResourcePermission[], FxError>> {
    ctx.logProvider.info(Messages.StartCheckPermission.log);
    await TokenProvider.init({ m365: ctx.tokenProvider?.m365TokenProvider }, TokenAudience.Graph);
    const objectId = isV3Enabled()
      ? aadObjectIdV3
      : (ctx.envInfo?.state[ComponentNames.AadApp] as v3.AADApp).objectId;
    if (!objectId) {
      const params = ConfigErrorMessages.GetConfigError(ConfigKeys.objectId, Plugins.pluginName);
      const msgs0 = getPermissionErrorMessage(params[0], false);
      const msgs1 = getPermissionErrorMessage(params[1], false);
      throw ResultFactory.SystemError(GetConfigError.name, [msgs0, msgs1]);
    }

    const userObjectId = userInfo.aadId;
    const isAadOwner = await AadAppClient.checkPermission(
      Messages.EndCheckPermission.telemetry,
      objectId,
      userObjectId
    );

    const result = [
      {
        name: Constants.permissions.name,
        type: Constants.permissions.type,
        roles: isAadOwner ? [Constants.permissions.owner] : [Constants.permissions.noPermission],
        resourceId: objectId,
      },
    ];
    ctx.logProvider.info(Messages.EndCheckPermission.log);
    return ResultFactory.Success(result);
  }

  public async listCollaborator(
    ctx: ContextV3,
    aadObjectIdV3?: string
  ): Promise<Result<AadOwner[], FxError>> {
    ctx.logProvider.info(Messages.StartListCollaborator.log);
    await TokenProvider.init({ m365: ctx.tokenProvider?.m365TokenProvider }, TokenAudience.Graph);
    const objectId = isV3Enabled()
      ? aadObjectIdV3
      : (ctx.envInfo?.state[ComponentNames.AadApp] as v3.AADApp).objectId;
    if (!objectId) {
      const msgs = ConfigErrorMessages.GetConfigError(ConfigKeys.objectId, Plugins.pluginName);
      throw ResultFactory.SystemError(GetConfigError.name, msgs);
    }

    const owners = await AadAppClient.listCollaborator(
      Messages.EndListCollaborator.telemetry,
      objectId
    );
    ctx.logProvider.info(Messages.EndListCollaborator.log);
    return ResultFactory.Success(owners || []);
  }

  public async grantPermission(
    ctx: ContextV3,
    userInfo: AppUser,
    aadObjectIdV3?: string
  ): Promise<Result<ResourcePermission[], FxError>> {
    ctx.logProvider.info(Messages.StartGrantPermission.log);
    await TokenProvider.init({ m365: ctx.tokenProvider?.m365TokenProvider }, TokenAudience.Graph);
    const objectId = isV3Enabled()
      ? aadObjectIdV3
      : (ctx.envInfo?.state[ComponentNames.AadApp] as v3.AADApp).objectId;
    if (!objectId) {
      const params = ConfigErrorMessages.GetConfigError(ConfigKeys.objectId, Plugins.pluginName);
      const msg0 = getPermissionErrorMessage(params[0], true);
      const msg1 = getPermissionErrorMessage(params[1], true);
      throw ResultFactory.SystemError(GetConfigError.name, [msg0, msg1]);
    }

    const userObjectId = userInfo.aadId;
    await AadAppClient.grantPermission(ctx, objectId, userObjectId);

    const result = [
      {
        name: Constants.permissions.name,
        type: Constants.permissions.type,
        roles: [Constants.permissions.owner],
        resourceId: objectId,
      },
    ];
    ctx.logProvider.info(Messages.EndGrantPermission.log);
    return ResultFactory.Success(result);
  }
}
