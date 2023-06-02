// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ContextV3,
  err,
  FxError,
  PluginContext,
  Result,
  SystemError,
  UserError,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { ComponentNames } from "../../constants";
import { AadAppForTeamsImpl } from "./aadAppForTeamsImpl";
import { Messages, Telemetry } from "./constants";
import { AadResult, ResultFactory } from "./results";
import { TelemetryUtils } from "./utils/telemetry";
import { DialogUtils } from "./utils/dialog";
import { UnhandledError } from "./errors";
import { AadOwner, ResourcePermission } from "../../../common/permissionInterface";
import { AppUser } from "../appManifest/interfaces/appUser";
import { hooks } from "@feathersjs/hooks/lib";
import { addStartAndEndTelemetry } from "../../driver/middleware/addStartAndEndTelemetry";

@Service(ComponentNames.AadApp)
export class AadApp {
  @hooks([addStartAndEndTelemetry("list-collaborator", "fx-resource-aad-app-for-teams")])
  async listCollaborator(
    ctx: ContextV3,
    aadObjectIdV3?: string
  ): Promise<Result<AadOwner[], FxError>> {
    const aadAppImplement = new AadAppForTeamsImpl();
    const res = await this.runWithExceptionCatchingAsync(
      async () => aadAppImplement.listCollaborator(ctx, aadObjectIdV3),
      ctx,
      Messages.EndListCollaborator.telemetry
    );
    return res;
  }
  @hooks([addStartAndEndTelemetry("grant-permission", "fx-resource-aad-app-for-teams")])
  async grantPermission(
    ctx: ContextV3,
    userInfo: AppUser,
    aadObjectIdV3?: string
  ): Promise<Result<ResourcePermission[], FxError>> {
    const aadAppImplement = new AadAppForTeamsImpl();
    const res = await this.runWithExceptionCatchingAsync(
      async () => aadAppImplement.grantPermission(ctx, userInfo, aadObjectIdV3),
      ctx,
      Messages.EndGrantPermission.telemetry
    );
    return res;
  }
  @hooks([addStartAndEndTelemetry("check-permission", "fx-resource-aad-app-for-teams")])
  async checkPermission(
    ctx: ContextV3,
    userInfo: AppUser,
    aadObjectIdV3?: string
  ): Promise<Result<ResourcePermission[], FxError>> {
    const aadAppImplement = new AadAppForTeamsImpl();
    const res = await this.runWithExceptionCatchingAsync(
      async () => aadAppImplement.checkPermission(ctx, userInfo, aadObjectIdV3),
      ctx,
      Messages.EndCheckPermission.telemetry
    );
    return res;
  }

  private async runWithExceptionCatchingAsync(
    fn: () => Promise<AadResult>,
    ctx: PluginContext | ContextV3,
    stage: string
  ): Promise<AadResult> {
    try {
      return await fn();
    } catch (e) {
      return this.returnError(e, ctx, stage);
    }
  }

  private returnError(e: any, ctx: PluginContext | ContextV3, stage: string): AadResult {
    if (e instanceof SystemError || e instanceof UserError) {
      let errorMessage = e.message;
      // For errors contains innerError, e.g. failures when calling Graph API
      if (e.innerError) {
        errorMessage += ` Detailed error: ${e.innerError.message}.`;
        if (e.innerError.response?.data?.errorMessage) {
          // For errors return from App Studio API
          errorMessage += ` Reason: ${e.innerError.response?.data?.errorMessage}`;
        } else if (e.innerError.response?.data?.error?.message) {
          // For errors return from Graph API
          errorMessage += ` Reason: ${e.innerError.response?.data?.error?.message}`;
        }
        e.message = errorMessage;
      }
      ctx.logProvider?.error(errorMessage);
      TelemetryUtils.sendErrorEvent(
        stage,
        e.name,
        e instanceof UserError ? Telemetry.userError : Telemetry.systemError,
        errorMessage
      );
      DialogUtils.progress?.end(false);
      return err(e);
    } else {
      if (!(e instanceof Error)) {
        e = new Error(e.toString());
      }

      ctx.logProvider?.error(e.message);
      TelemetryUtils.sendErrorEvent(
        stage,
        UnhandledError.name,
        Telemetry.systemError,
        UnhandledError.message() + " " + e.message
      );
      return err(
        ResultFactory.SystemError(
          UnhandledError.name,
          UnhandledError.message(),
          e,
          undefined,
          undefined
        )
      );
    }
  }
}
