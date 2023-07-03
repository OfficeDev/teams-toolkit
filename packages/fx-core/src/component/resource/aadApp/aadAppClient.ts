// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Context } from "@microsoft/teamsfx-api";
import { AadOwner } from "../../../common/permissionInterface";
import { Constants, Messages, Telemetry } from "./constants";
import { GraphErrorCodes } from "./errorCodes";
import {
  AppStudioErrorMessage,
  AadError,
  CheckPermissionError,
  GrantPermissionError,
  ListCollaboratorError,
} from "./errors";
import { ResultFactory } from "./results";
import { TelemetryUtils } from "./utils/telemetry";
import { TokenProvider } from "./utils/tokenProvider";
import { GraphClient } from "./graph";

function delay(ms: number) {
  // tslint:disable-next-line no-string-based-set-timeout
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class AadAppClient {
  public static async checkPermission(
    stage: string,
    objectId: string,
    userObjectId: string
  ): Promise<boolean> {
    try {
      return (await this.retryHanlder(stage, () =>
        GraphClient.checkPermission(TokenProvider.token as string, objectId, userObjectId)
      )) as boolean;
    } catch (error) {
      // TODO: Give out detailed help message for different errors.
      throw AadAppClient.handleError(error, CheckPermissionError);
    }
  }

  public static async grantPermission(
    ctx: Context,
    objectId: string,
    userObjectId: string
  ): Promise<void> {
    try {
      await GraphClient.grantPermission(TokenProvider.token as string, objectId, userObjectId);
    } catch (error: any) {
      if (error?.response?.data?.error.message == Constants.createOwnerDuplicatedMessage) {
        ctx.logProvider?.info(Messages.OwnerAlreadyAdded(userObjectId, objectId));
        return;
      }

      // TODO: Give out detailed help message for different errors.
      throw AadAppClient.handleError(
        error,
        GrantPermissionError,
        Constants.permissions.name,
        objectId
      );
    }
  }

  public static async listCollaborator(
    stage: string,
    objectId: string
  ): Promise<AadOwner[] | undefined> {
    try {
      return await this.retryHanlder(stage, () =>
        GraphClient.getAadOwners(TokenProvider.token as string, objectId)
      );
    } catch (error) {
      // TODO: Give out detailed help message for different errors.
      throw AadAppClient.handleError(error, ListCollaboratorError);
    }
  }

  public static async retryHanlder(stage: string, fn: () => Promise<any>): Promise<any> {
    let retries = Constants.maxRetryTimes;
    let response;
    while (retries > 0) {
      retries = retries - 1;

      try {
        response = await fn();
        TelemetryUtils.sendEvent(stage, {
          [Telemetry.methodName]: fn.toString(),
          [Telemetry.retryTimes]: (Constants.maxRetryTimes - retries - 1).toString(),
        });
        return response;
      } catch (error) {
        if (retries === 0) {
          throw error;
        } else {
          await delay(5000);
        }
      }
    }

    throw new Error(AppStudioErrorMessage.ReachRetryLimit[0]);
  }

  private static handleError(error: any, errorDetail: AadError, ...args: string[]): FxError {
    if (
      error?.response?.status >= Constants.statusCodeUserError &&
      error?.response?.status < Constants.statusCodeServerError
    ) {
      // User Error
      // If known error code, will update help link.
      const errorCode = error?.response?.data?.error?.code;
      const helpLink = GraphErrorCodes.get(errorCode);
      return ResultFactory.UserError(
        errorDetail.name,
        errorDetail.message(...args),
        error,
        undefined,
        helpLink ?? errorDetail.helpLink
      );
    } else {
      // System Error
      return ResultFactory.SystemError(errorDetail.name, errorDetail.message(...args), error);
    }
  }
}
