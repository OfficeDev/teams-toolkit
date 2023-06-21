// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Context, FxError, Result } from "@microsoft/teamsfx-api";
import { AadOwner, ResourcePermission } from "../../../common/permissionInterface";
import { AadAppClient } from "./aadAppClient";
import { ConfigKeys, Constants, Messages, Plugins } from "./constants";
import { ConfigErrorMessages, GetConfigError } from "./errors";
import { ResultFactory } from "./results";
import { getPermissionErrorMessage } from "./utils/configs";
import { TokenAudience, TokenProvider } from "./utils/tokenProvider";
import { AppUser } from "../../driver/teamsApp/interfaces/appdefinitions/appUser";

export class AadAppForTeamsImpl {
  public async checkPermission(
    ctx: Context,
    userInfo: AppUser,
    aadObjectIdV3?: string
  ): Promise<Result<ResourcePermission[], FxError>> {
    ctx.logProvider.info(Messages.StartCheckPermission.log);
    await TokenProvider.init({ m365: ctx.tokenProvider?.m365TokenProvider }, TokenAudience.Graph);
    const objectId = aadObjectIdV3;
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
    ctx: Context,
    aadObjectIdV3?: string
  ): Promise<Result<AadOwner[], FxError>> {
    ctx.logProvider.info(Messages.StartListCollaborator.log);
    await TokenProvider.init({ m365: ctx.tokenProvider?.m365TokenProvider }, TokenAudience.Graph);
    const objectId = aadObjectIdV3;
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
    ctx: Context,
    userInfo: AppUser,
    aadObjectIdV3?: string
  ): Promise<Result<ResourcePermission[], FxError>> {
    ctx.logProvider.info(Messages.StartGrantPermission.log);
    await TokenProvider.init({ m365: ctx.tokenProvider?.m365TokenProvider }, TokenAudience.Graph);
    const objectId = aadObjectIdV3;
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
