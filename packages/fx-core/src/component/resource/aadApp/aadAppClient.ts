// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, M365TokenProvider, PluginContext, v2 } from "@microsoft/teamsfx-api";
import { AadOwner } from "../../../common/permissionInterface";
import { ConfigKeys, Constants, Messages, ProgressDetail, Telemetry, UILevels } from "./constants";
import { GraphErrorCodes } from "./errorCodes";
import {
  AppStudioErrorMessage,
  CreateSecretError,
  CreateAppError,
  UpdateAppIdUriError,
  UpdatePermissionError,
  UpdateRedirectUriError,
  GetAppError,
  GetAppConfigError,
  AadError,
  CheckPermissionError,
  GrantPermissionError,
  ListCollaboratorError,
  UpdateAadAppError,
  CreateAppForbiddenError,
  UpdateAadAppUsingManifestError,
} from "./errors";
import { IAADPassword } from "./interfaces/IAADApplication";
import { IAADDefinition, RequiredResourceAccess } from "./interfaces/IAADDefinition";
import { ResultFactory } from "./results";
import { ProvisionConfig, Utils } from "./utils/configs";
import { DialogUtils } from "./utils/dialog";
import { TelemetryUtils } from "./utils/telemetry";
import { TokenAudience, TokenProvider } from "./utils/tokenProvider";
import { getAllowedAppIds, isAadManifestEnabled } from "../../../common/tools";
import { TOOLS } from "../../../core/globalVars";
import { AADManifest } from "./interfaces/AADManifest";
import { AadAppManifestManager } from "./aadAppManifestManager";
import { v4 as uuidv4 } from "uuid";
import { GraphClient } from "./graph";
import { AppStudio } from "./appStudio";

function delay(ms: number) {
  // tslint:disable-next-line no-string-based-set-timeout
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class AadAppClient {
  public static async createAadAppUsingManifest(
    stage: string,
    manifest: AADManifest,
    config: ProvisionConfig
  ): Promise<void> {
    try {
      manifest = (await this.retryHanlder(stage, () =>
        AadAppManifestManager.createAadApp(TokenProvider.token as string, manifest)
      )) as AADManifest;

      config.clientId = manifest.appId!;
      config.objectId = manifest.id!;
    } catch (error: any) {
      if (error?.response?.status == Constants.statusCodeForbidden) {
        throw ResultFactory.UserError(
          CreateAppForbiddenError.name,
          CreateAppForbiddenError.message(),
          error,
          undefined,
          CreateAppForbiddenError.helpLink
        );
      } else {
        throw AadAppClient.handleError(error, CreateAppError);
      }
    }
  }

  public static async createAadApp(stage: string, config: ProvisionConfig): Promise<void> {
    try {
      const provisionObject = AadAppClient.getAadAppProvisionObject(
        config.displayName as string,
        config.oauth2PermissionScopeId as string
      );
      let provisionAadResponse: IAADDefinition;
      if (TokenProvider.audience === TokenAudience.AppStudio) {
        provisionAadResponse = (await this.retryHanlder(stage, () =>
          AppStudio.createAADAppV2(TokenProvider.token as string, provisionObject)
        )) as IAADDefinition;
      } else {
        provisionAadResponse = (await this.retryHanlder(stage, () =>
          GraphClient.createAADApp(TokenProvider.token as string, provisionObject)
        )) as IAADDefinition;
      }

      config.clientId = provisionAadResponse.appId;
      config.objectId = provisionAadResponse.id;
    } catch (error) {
      throw AadAppClient.handleError(error, CreateAppError);
    }
  }

  public static async createAadAppSecret(stage: string, config: ProvisionConfig): Promise<void> {
    try {
      let createSecretObject: IAADPassword;
      if (TokenProvider.audience === TokenAudience.AppStudio) {
        createSecretObject = (await AadAppClient.retryHanlder(stage, () =>
          AppStudio.createAADAppPassword(TokenProvider.token as string, config.objectId as string)
        )) as IAADPassword;
      } else {
        createSecretObject = (await AadAppClient.retryHanlder(stage, () =>
          GraphClient.createAadAppSecret(TokenProvider.token as string, config.objectId as string)
        )) as IAADPassword;
      }
      config.password = createSecretObject.value;
    } catch (error) {
      throw AadAppClient.handleError(error, CreateSecretError);
    }
  }

  public static async updateAadAppUsingManifest(
    stage: string,
    manifest: AADManifest,
    skip = false
  ): Promise<void> {
    try {
      await AadAppClient.retryHanlder(stage, async () => {
        const preAuthorizedApplications = manifest.preAuthorizedApplications;
        manifest.preAuthorizedApplications = [];
        await AadAppManifestManager.updateAadApp(TokenProvider.token as string, manifest);
        manifest.preAuthorizedApplications = preAuthorizedApplications;
        await AadAppManifestManager.updateAadApp(TokenProvider.token as string, manifest);
      });
    } catch (error) {
      if (skip) {
        const message = Messages.StepFailedAndSkipped(
          ProgressDetail.UpdateAadApp,
          Messages.UpdateAadHelpMessage()
        );
        TOOLS.logProvider?.warning(Messages.getLog(message));
        DialogUtils.show(message, UILevels.Warn);
      } else {
        throw AadAppClient.handleError(
          error,
          isAadManifestEnabled() ? UpdateAadAppUsingManifestError : UpdateAadAppError,
          error.message
        );
      }
    }
  }

  public static async updateAadAppRedirectUri(
    stage: string,
    objectId: string,
    redirectUris: IAADDefinition,
    skip = false
  ): Promise<void> {
    try {
      if (TokenProvider.audience === TokenAudience.AppStudio) {
        await AadAppClient.retryHanlder(stage, () =>
          AppStudio.updateAADApp(TokenProvider.token as string, objectId as string, redirectUris)
        );
      } else {
        await AadAppClient.retryHanlder(stage, () =>
          GraphClient.updateAADApp(TokenProvider.token as string, objectId as string, redirectUris)
        );
      }
    } catch (error) {
      if (skip) {
        const message = Messages.StepFailedAndSkipped(
          ProgressDetail.UpdateRedirectUri,
          Messages.UpdateRedirectUriHelpMessage(Utils.parseRedirectUriMessage(redirectUris))
        );
        TOOLS.logProvider?.warning(Messages.getLog(message));
        DialogUtils.show(message, UILevels.Warn);
      } else {
        throw AadAppClient.handleError(error, UpdateRedirectUriError);
      }
    }
  }

  public static async updateAadAppIdUri(
    stage: string,
    objectId: string,
    applicationIdUri: string,
    skip = false
  ): Promise<void> {
    try {
      const updateAppIdObject = AadAppClient.getAadApplicationIdObject(applicationIdUri);
      if (TokenProvider.audience === TokenAudience.AppStudio) {
        await AadAppClient.retryHanlder(stage, () =>
          AppStudio.updateAADApp(
            TokenProvider.token as string,
            objectId as string,
            updateAppIdObject
          )
        );
      } else {
        await AadAppClient.retryHanlder(stage, () =>
          GraphClient.updateAADApp(
            TokenProvider.token as string,
            objectId as string,
            updateAppIdObject
          )
        );
      }
    } catch (error) {
      if (skip) {
        const message = Messages.StepFailedAndSkipped(
          ProgressDetail.UpdateAppIdUri,
          Messages.UpdateAppIdUriHelpMessage(applicationIdUri)
        );
        TOOLS.logProvider?.warning(Messages.getLog(message));
        DialogUtils.show(message, UILevels.Warn);
      } else {
        throw AadAppClient.handleError(error, UpdateAppIdUriError);
      }
    }
  }
  public static async updateAadAppPermission(
    stage: string,
    objectId: string,
    permissions: RequiredResourceAccess[],
    skip = false
  ): Promise<void> {
    try {
      const updatePermissionObject = AadAppClient.getAadPermissionObject(permissions);
      if (TokenProvider.audience === TokenAudience.AppStudio) {
        await AadAppClient.retryHanlder(stage, () =>
          AppStudio.updateAADApp(
            TokenProvider.token as string,
            objectId as string,
            updatePermissionObject
          )
        );
      } else {
        await AadAppClient.retryHanlder(stage, () =>
          GraphClient.updateAADApp(
            TokenProvider.token as string,
            objectId as string,
            updatePermissionObject
          )
        );
      }
    } catch (error) {
      if (skip) {
        const message = Messages.StepFailedAndSkipped(
          ProgressDetail.UpdatePermission,
          Messages.UpdatePermissionHelpMessage
        );
        TOOLS.logProvider?.warning(Messages.getLog(message));
        DialogUtils.show(message, UILevels.Warn);
      } else {
        throw AadAppClient.handleError(error, UpdatePermissionError);
      }
    }
  }

  public static async getAadAppUsingManifest(
    stage: string,
    objectId: string,
    clientSecret: string | undefined,
    oauth2PermissionScopeId: string | undefined,
    m365TokenProvider?: M365TokenProvider,
    envName?: string
  ): Promise<ProvisionConfig> {
    let manifest: AADManifest;
    try {
      manifest = (await this.retryHanlder(stage, () =>
        AadAppManifestManager.getAadAppManifest(TokenProvider.token as string, objectId)
      )) as AADManifest;
    } catch (error) {
      const tenantId = await Utils.getCurrentTenantId(m365TokenProvider);
      const fileName = Utils.getConfigFileName(envName);
      throw AadAppClient.handleError(error, GetAppError, objectId, tenantId, fileName);
    }

    const config = new ProvisionConfig(!envName, false);

    // Check whether remote aad app contains scope id
    manifest.oauth2Permissions?.forEach((oauth2Permission) => {
      if (oauth2Permission.value === "access_as_user") {
        config.oauth2PermissionScopeId = oauth2Permission.id;
      }
    });

    // If remote aad app doesn't contain scope id, use scope id in state file or create a new one
    if (!config.oauth2PermissionScopeId) {
      config.oauth2PermissionScopeId = oauth2PermissionScopeId ? oauth2PermissionScopeId : uuidv4();
    }

    config.objectId = objectId;
    config.clientId = manifest.appId!;
    config.password = clientSecret;
    return config;
  }

  public static async getAadApp(
    stage: string,
    objectId: string,
    clientSecret: string | undefined,
    m365TokenProvider?: M365TokenProvider,
    envName?: string,
    skip = false
  ): Promise<ProvisionConfig> {
    let getAppObject: IAADDefinition;
    try {
      if (TokenProvider.audience === TokenAudience.AppStudio) {
        getAppObject = (await this.retryHanlder(stage, () =>
          AppStudio.getAadApp(TokenProvider.token as string, objectId)
        )) as IAADDefinition;
      } else {
        getAppObject = (await this.retryHanlder(stage, () =>
          GraphClient.getAadApp(TokenProvider.token as string, objectId)
        )) as IAADDefinition;
      }
    } catch (error) {
      const tenantId = await Utils.getCurrentTenantId(m365TokenProvider);
      const fileName = Utils.getConfigFileName(envName);
      throw AadAppClient.handleError(error, GetAppError, objectId, tenantId, fileName);
    }

    const config = new ProvisionConfig(!envName);
    if (
      getAppObject.api?.oauth2PermissionScopes &&
      getAppObject.api?.oauth2PermissionScopes[0] &&
      getAppObject.api?.oauth2PermissionScopes[0].id
    ) {
      config.oauth2PermissionScopeId = getAppObject.api?.oauth2PermissionScopes[0].id;
    } else {
      const fileName = Utils.getConfigFileName(envName);
      throw ResultFactory.UserError(
        GetAppConfigError.name,
        GetAppConfigError.message(ConfigKeys.oauth2PermissionScopeId, fileName)
      );
    }
    config.objectId = objectId;
    config.clientId = getAppObject.appId;
    config.password = clientSecret;
    return config;
  }

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
    ctx: PluginContext | v2.Context,
    objectId: string,
    userObjectId: string
  ): Promise<void> {
    try {
      await GraphClient.grantPermission(TokenProvider.token as string, objectId, userObjectId);
    } catch (error) {
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
  private static getAadAppProvisionObject(
    displayName: string,
    oauth2PermissionScopeId: string
  ): IAADDefinition {
    return {
      displayName: displayName,
      signInAudience: "AzureADMyOrg",
      api: {
        requestedAccessTokenVersion: 2,
        oauth2PermissionScopes: [
          {
            adminConsentDescription: "Allows Teams to call the app’s web APIs as the current user.",
            adminConsentDisplayName: "Teams can access app’s web APIs",
            id: oauth2PermissionScopeId,
            isEnabled: true,
            type: "User",
            userConsentDescription:
              "Enable Teams to call this app’s web APIs with the same rights that you have",
            userConsentDisplayName:
              "Teams can access app’s web APIs and make requests on your behalf",
            value: "access_as_user",
          },
        ],
        preAuthorizedApplications: getAllowedAppIds().map((appId) => {
          return {
            appId,
            delegatedPermissionIds: [oauth2PermissionScopeId],
          };
        }),
      },
      optionalClaims: {
        accessToken: [
          {
            name: "idtyp",
            essential: false,
            additionalProperties: [],
          },
        ],
      },
    };
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

  private static getAadUrlObject(redirectUris: string[]): IAADDefinition {
    return {
      web: {
        redirectUris: redirectUris,
      },
    };
  }

  private static getAadApplicationIdObject(applicationIdUri: string): IAADDefinition {
    return {
      identifierUris: [applicationIdUri],
    };
  }

  private static getAadPermissionObject(permissions: RequiredResourceAccess[]): IAADDefinition {
    return {
      requiredResourceAccess: permissions,
    };
  }
}
