// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios, { AxiosInstance } from "axios";
import { SystemError, LogProvider } from "@microsoft/teamsfx-api";
import { AppDefinition } from "./interfaces/appDefinition";
import { AppUser } from "./interfaces/appUser";
import { AppStudioError } from "./errors";
import { IPublishingAppDenition } from "./interfaces/IPublishingAppDefinition";
import { AppStudioResultFactory } from "./results";
import { Constants, ErrorMessages, APP_STUDIO_API_NAMES } from "./constants";
import { RetryHandler } from "./utils/utils";
import { TelemetryEventName, TelemetryUtils } from "./utils/telemetry";
import { getAppStudioEndpoint } from "../../../component/resource/appManifest/constants";
import { HelpLinks } from "../../../common/constants";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace AppStudioClient {
  type Icon = {
    type: "color" | "outline" | "sharePointPreviewImage";
    name: "color" | "outline" | "sharePointPreviewImage";
    base64String: string;
  };

  const baseUrl = getAppStudioEndpoint();

  /**
   * Creates a new axios instance to call app studio to prevent setting the accessToken on global instance.
   * @param {string}  appStudioToken
   * @returns {AxiosInstance}
   */
  function createRequesterWithToken(appStudioToken: string): AxiosInstance {
    const instance = axios.create({
      baseURL: baseUrl,
    });
    instance.defaults.headers.common["Authorization"] = `Bearer ${appStudioToken}`;
    instance.defaults.headers.common["Client-Source"] = "teamstoolkit";
    instance.interceptors.request.use(function (config) {
      config.params = { teamstoolkit: true, ...config.params };
      return config;
    });
    return instance;
  }

  function wrapException(e: any, apiName: string): Error {
    const correlationId = e.response?.headers[Constants.CORRELATION_ID];
    const requestPath = e.request?.path ? `${e.request.method} ${e.request.path}` : "";
    const extraData = e.response?.data ? `data: ${JSON.stringify(e.response.data)}` : "";

    const error = AppStudioResultFactory.SystemError(
      AppStudioError.DeveloperPortalAPIFailedError.name,
      AppStudioError.DeveloperPortalAPIFailedError.message(
        e,
        correlationId,
        requestPath,
        apiName,
        extraData
      )
    );

    TelemetryUtils.sendErrorEvent(TelemetryEventName.appStudioApi, error, {
      method: e.request?.method,
      "status-code": e?.response?.status,
      url: `<${apiName}-url>`,
    });
    return error;
  }

  /**
   * Import an app registration in app studio with the given archived file and returns the app definition.
   * @param {Buffer}  file - Zip file with manifest.json and two icons
   * @param {string}  appStudioToken
   * @param {boolean} overwrite
   * @param {LogProvider} logProvider
   * @returns {Promise<AppDefinition>}
   */
  export async function importApp(
    file: Buffer,
    appStudioToken: string,
    logProvider?: LogProvider,
    overwrite = false
  ): Promise<AppDefinition> {
    try {
      const requester = createRequesterWithToken(appStudioToken);

      const response = await RetryHandler.Retry(() =>
        requester.post(`/api/appdefinitions/v2/import`, file, {
          headers: { "Content-Type": "application/zip" },
          params: {
            overwriteIfAppAlreadyExists: overwrite,
          },
        })
      );

      if (response && response.data) {
        const app = <AppDefinition>response.data;
        await logProvider?.debug(`Received data from app studio ${JSON.stringify(app)}`);
        return app;
      } else {
        throw new Error(`Cannot create teams app`);
      }
    } catch (e: any) {
      if (e.response?.status === 409) {
        const error = AppStudioResultFactory.UserError(
          AppStudioError.TeamsAppCreateConflictError.name,
          AppStudioError.TeamsAppCreateConflictError.message(),
          HelpLinks.SwtichTenantOrSub
        );
        throw error;
      }
      const error = wrapException(e, APP_STUDIO_API_NAMES.CREATE_APP);
      throw error;
    }
  }

  export async function getApp(
    teamsAppId: string,
    appStudioToken: string,
    logProvider?: LogProvider
  ): Promise<AppDefinition> {
    const requester = createRequesterWithToken(appStudioToken);
    try {
      const response = await RetryHandler.Retry(() =>
        requester.get(`/api/appdefinitions/${teamsAppId}`)
      );

      if (response && response.data) {
        const app = <AppDefinition>response.data;
        if (app && app.teamsAppId && app.teamsAppId === teamsAppId) {
          return app;
        } else {
          await logProvider?.error(
            `teamsAppId mismatch. Input: ${teamsAppId}. Got: ${app.teamsAppId}`
          );
        }
      }
    } catch (e) {
      const error = wrapException(e, APP_STUDIO_API_NAMES.GET_APP);
      throw error;
    }
    throw new Error(`Cannot get the app definition with app ID ${teamsAppId}`);
  }

  /**
   * Check if app exists in the user's organization by the Teams app id
   * @param teamsAppId
   * @param appStudioToken
   * @param logProvider
   * @returns
   */
  export async function checkExistsInTenant(
    teamsAppId: string,
    appStudioToken: string,
    logProvider?: LogProvider
  ): Promise<boolean> {
    const requester = createRequesterWithToken(appStudioToken);
    try {
      const response = await RetryHandler.Retry(() =>
        requester.get(`/api/appdefinitions/manifest/${teamsAppId}`)
      );

      if (response && response.data) {
        return <boolean>response.data;
      } else {
        return false;
      }
    } catch (e) {
      wrapException(e, APP_STUDIO_API_NAMES.EXISTS_IN_TENANTS);
      return false;
    }
  }

  /**
   * Publish Teams app to Teams App Catalog
   * @param teamsAppId
   * @param file
   * @param appStudioToken
   * @returns
   */
  export async function publishTeamsApp(
    teamsAppId: string,
    file: Buffer,
    appStudioToken: string
  ): Promise<string> {
    try {
      const requester = createRequesterWithToken(appStudioToken);

      const response = await RetryHandler.Retry(() =>
        requester.post("/api/publishing", file, {
          headers: { "Content-Type": "application/zip" },
        })
      );

      if (response && response.data) {
        if (response.data.error) {
          // To avoid App Studio BadGateway error
          // The app is actually published to app catalog.
          if (response.data.error.code === "BadGateway") {
            const appDefinition = await getAppByTeamsAppId(teamsAppId, appStudioToken);
            if (appDefinition) {
              return appDefinition.teamsAppId;
            }
          }
          const error = new Error(response?.data.error.message);
          error.name = response?.data.error.code;
          (error as any).response = response;
          const exception = wrapException(error, APP_STUDIO_API_NAMES.PUBLISH_APP);
          throw exception;
        } else {
          return response.data.id;
        }
      } else {
        throw AppStudioResultFactory.SystemError(
          AppStudioError.TeamsAppPublishFailedError.name,
          AppStudioError.TeamsAppPublishFailedError.message(teamsAppId, "POST /api/publishing")
        );
      }
    } catch (e: any) {
      if (e instanceof SystemError) {
        throw e;
      } else {
        const error = wrapException(e, APP_STUDIO_API_NAMES.PUBLISH_APP);
        throw error;
      }
    }
  }

  /**
   * Update existed publish request
   * @param teamsAppId
   * @param file
   * @param appStudioToken
   * @returns
   */
  export async function publishTeamsAppUpdate(
    teamsAppId: string,
    file: Buffer,
    appStudioToken: string
  ): Promise<string> {
    try {
      // Get App Definition from Teams App Catalog
      const appDefinition = await getAppByTeamsAppId(teamsAppId, appStudioToken);

      const requester = createRequesterWithToken(appStudioToken);
      let response = null;
      if (appDefinition) {
        // update the existing app
        response = await requester.post(
          `/api/publishing/${appDefinition.teamsAppId}/appdefinitions`,
          file,
          { headers: { "Content-Type": "application/zip" } }
        );
      } else {
        throw AppStudioResultFactory.SystemError(
          AppStudioError.TeamsAppPublishFailedError.name,
          AppStudioError.TeamsAppPublishFailedError.message(
            teamsAppId,
            `GET /api/publishing/${teamsAppId}`
          )
        );
      }

      const requestPath = `${response.request?.method} ${response.request?.path}`;
      if (response && response.data) {
        if (response.data.error || response.data.errorMessage) {
          const error = new Error(response.data.error?.message || response.data.errorMessage);
          error.name = response?.data.error.code;
          (error as any).response = response;
          const exception = wrapException(error, APP_STUDIO_API_NAMES.UPDATE_PUBLISHED_APP);
          throw exception;
        } else {
          return response.data.teamsAppId;
        }
      } else {
        throw AppStudioResultFactory.SystemError(
          AppStudioError.TeamsAppPublishFailedError.name,
          AppStudioError.TeamsAppPublishFailedError.message(teamsAppId, requestPath)
        );
      }
    } catch (error: any) {
      if (error instanceof SystemError) {
        throw error;
      } else {
        const exception = wrapException(error, APP_STUDIO_API_NAMES.UPDATE_PUBLISHED_APP);
        throw exception;
      }
    }
  }

  export async function getAppByTeamsAppId(
    teamsAppId: string,
    appStudioToken: string
  ): Promise<IPublishingAppDenition | undefined> {
    const requester = createRequesterWithToken(appStudioToken);
    try {
      const response = await requester.get(`/api/publishing/${teamsAppId}`);
      if (response && response.data && response.data.value && response.data.value.length > 0) {
        const appdefinitions: IPublishingAppDenition[] = response.data.value[0].appDefinitions.map(
          (item: any) => {
            return {
              lastModifiedDateTime: item.lastModifiedDateTime
                ? new Date(item.lastModifiedDateTime)
                : null,
              publishingState: item.publishingState,
              teamsAppId: item.teamsAppId,
              displayName: item.displayName,
            };
          }
        );
        return appdefinitions[appdefinitions.length - 1];
      } else {
        return undefined;
      }
    } catch (e: any) {
      const error = wrapException(e, APP_STUDIO_API_NAMES.GET_PUBLISHED_APP);
      return undefined;
    }
  }

  export async function getUserList(
    teamsAppId: string,
    appStudioToken: string
  ): Promise<AppUser[] | undefined> {
    let app;
    try {
      app = await getApp(teamsAppId, appStudioToken);
    } catch (error) {
      throw error;
    }

    return app.userList;
  }

  export async function checkPermission(
    teamsAppId: string,
    appStudioToken: string,
    userObjectId: string
  ): Promise<string> {
    let userList;
    try {
      userList = await getUserList(teamsAppId, appStudioToken);
    } catch (error) {
      return Constants.PERMISSIONS.noPermission;
    }

    const findUser = userList?.find((user: AppUser) => user.aadId === userObjectId);
    if (!findUser) {
      return Constants.PERMISSIONS.noPermission;
    }

    if (findUser.isAdministrator) {
      return Constants.PERMISSIONS.admin;
    } else {
      return Constants.PERMISSIONS.operative;
    }
  }

  export async function grantPermission(
    teamsAppId: string,
    appStudioToken: string,
    newUser: AppUser
  ): Promise<void> {
    let app;
    try {
      app = await getApp(teamsAppId, appStudioToken);
    } catch (error) {
      throw error;
    }

    if (checkUser(app, newUser)) {
      return;
    }

    const findUser = app.userList?.findIndex((user: AppUser) => user["aadId"] === newUser.aadId);
    if (findUser && findUser >= 0) {
      return;
    }

    app.userList?.push(newUser);
    const requester = createRequesterWithToken(appStudioToken);
    try {
      const response = await requester.post(`/api/appdefinitions/${teamsAppId}/owner`, app);
      if (!response || !response.data || !checkUser(response.data as AppDefinition, newUser)) {
        throw new Error(ErrorMessages.GrantPermissionFailed);
      }
    } catch (err) {
      if (err?.message?.indexOf("Request failed with status code 400") >= 0) {
        await requester.post(`/api/appdefinitions/${teamsAppId}/owner`, app.userList);
      } else {
        throw err;
      }
    }
  }

  function checkUser(app: AppDefinition, newUser: AppUser): boolean {
    const findUser = app.userList?.findIndex((user: AppUser) => user["aadId"] === newUser.aadId);
    if (findUser != undefined && findUser >= 0) {
      return true;
    } else {
      return false;
    }
  }
}
