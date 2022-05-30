// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios, { AxiosInstance } from "axios";
import { SystemError, LogProvider } from "@microsoft/teamsfx-api";
import { IAppDefinition, IUserList } from "./interfaces/IAppDefinition";
import { AppStudioError } from "./errors";
import { IPublishingAppDenition } from "./interfaces/IPublishingAppDefinition";
import { AppStudioResultFactory } from "./results";
import { getLocalizedString } from "../../../common/localizeUtils";
import { Constants, ErrorMessages } from "./constants";

export function getAppStudioEndpoint(): string {
  if (process.env.APP_STUDIO_ENV && process.env.APP_STUDIO_ENV === "int") {
    return "https://dev-int.teams.microsoft.com";
  } else {
    return "https://dev.teams.microsoft.com";
  }
}

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

  /**
   * Creates an app registration in app studio with the given archived file and returns the app definition.
   * @param {Buffer}  file - Zip file with manifest.json and two icons
   * @param {string}  appStudioToken
   * @param {LogProvider} logProvider
   * @returns {Promise<IAppDefinition>}
   */
  export async function createApp(
    file: Buffer,
    appStudioToken: string,
    logProvider?: LogProvider
  ): Promise<IAppDefinition> {
    try {
      const requester = createRequesterWithToken(appStudioToken);
      const response = await requester.post(`/api/appdefinitions/v2/import`, file, {
        headers: { "Content-Type": "application/zip" },
      });
      if (response && response.data) {
        const app = <IAppDefinition>response.data;
        await logProvider?.debug(`recieved data from app studio ${JSON.stringify(app)}`);
        return app;
      } else {
        throw new Error(`Cannot create teams app`);
      }
    } catch (e: any) {
      const correlationId = e.response?.headers[Constants.CORRELATION_ID];
      const message =
        (e.response?.data ? `data: ${JSON.stringify(e.response.data)}` : "") +
        (correlationId ? `X-Correlation-ID: ${correlationId}` : "");
      const error = new Error(
        getLocalizedString("error.appstudio.teamsAppCreateFailed", e.name, e.message, message)
      );
      if (e.response?.status) {
        error.name = e.response?.status;
      }
      throw error;
    }
  }

  async function uploadIcon(
    teamsAppId: string,
    appStudioToken: string,
    colorIconContent: string,
    outlineIconContent: string,
    logProvider?: LogProvider
  ): Promise<{ colorIconUrl: string; outlineIconUrl: string }> {
    await logProvider?.info(`Uploading icon for teams ${teamsAppId}`);
    const requester = createRequesterWithToken(appStudioToken);
    try {
      const colorIcon: Icon = {
        name: "color",
        type: "color",
        base64String: colorIconContent,
      };
      const outlineIcon: Icon = {
        name: "outline",
        type: "outline",
        base64String: outlineIconContent,
      };
      const colorIconResult = requester.post(`/api/appdefinitions/${teamsAppId}/image`, colorIcon);
      const outlineIconResult = requester.post(
        `/api/appdefinitions/${teamsAppId}/image`,
        outlineIcon
      );
      const results = await Promise.all([colorIconResult, outlineIconResult]);
      await logProvider?.info(`successfully uploaded two icons`);
      return { colorIconUrl: results[0].data, outlineIconUrl: results[1].data };
    } catch (e: any) {
      const correlationId = e.response?.headers[Constants.CORRELATION_ID];
      const message =
        `Failed to upload icon for app ${teamsAppId}, due to ${e.name}: ${e.message}` +
        (correlationId ? `X-Correlation-ID: ${correlationId}` : "");
      await logProvider?.warning(message);
      const error = new Error(message);
      if (e.response?.status) {
        error.name = e.response?.status;
      }
      throw error;
    }
  }

  export async function getApp(
    teamsAppId: string,
    appStudioToken: string,
    logProvider?: LogProvider
  ): Promise<IAppDefinition> {
    const requester = createRequesterWithToken(appStudioToken);
    try {
      const response = await requester.get(`/api/appdefinitions/${teamsAppId}`);
      if (response && response.data) {
        const app = <IAppDefinition>response.data;
        if (app && app.teamsAppId && app.teamsAppId === teamsAppId) {
          return app;
        } else {
          await logProvider?.error(
            `teamsAppId mismatch. Input: ${teamsAppId}. Got: ${app.teamsAppId}`
          );
        }
      }
    } catch (e) {
      const correlationId = e.response?.headers[Constants.CORRELATION_ID];
      const message =
        `Cannot get the app definition with app ID ${teamsAppId}, due to ${e.name}: ${e.message}` +
        (correlationId ? `X-Correlation-ID: ${correlationId}` : "");
      await logProvider?.warning(message);
      const err = new Error(message);
      if (e.response?.status) {
        err.name = e.response?.status;
      }
      throw err;
    }
    throw new Error(`Cannot get the app definition with app ID ${teamsAppId}`);
  }

  /**
   * Updates an existing app if it exists with the configuration given.  Returns whether or not it was successful.
   * @param {string}  teamsAppId
   * @param {IAppDefinition} appDefinition
   * @param {string}  appStudioToken
   * @param {LogProvider} logProvider
   * @param {string} colorIconContent - base64 encoded
   * @param {string} outlineIconContent - base64 encoded
   * @returns {Promise<IAppDefinition>}
   */
  export async function updateApp(
    teamsAppId: string,
    appDefinition: IAppDefinition,
    appStudioToken: string,
    logProvider?: LogProvider,
    colorIconContent?: string,
    outlineIconContent?: string
  ): Promise<IAppDefinition> {
    // Get userlist from existing app
    const existingAppDefinition = await getApp(teamsAppId, appStudioToken, logProvider);
    const userlist = existingAppDefinition.userList;
    appDefinition.userList = userlist;

    let result: { colorIconUrl: string; outlineIconUrl: string } | undefined;
    if (colorIconContent && outlineIconContent) {
      result = await uploadIcon(
        teamsAppId,
        appStudioToken,
        colorIconContent,
        outlineIconContent,
        logProvider
      );
      if (!result) {
        await logProvider?.error(`failed to upload color icon for: ${teamsAppId}`);
        throw new Error(`failed to upload icons for ${teamsAppId}`);
      }
      appDefinition.colorIcon = result.colorIconUrl;
      appDefinition.outlineIcon = result.outlineIconUrl;
    }
    const requester = createRequesterWithToken(appStudioToken);
    try {
      const response = await requester.post(
        `/api/appdefinitions/${teamsAppId}/override`,
        appDefinition
      );
      if (response && response.data) {
        const app = <IAppDefinition>response.data;
        return app;
      } else {
        throw new Error(
          `Cannot update teams app ${teamsAppId}, response: ${JSON.stringify(response)}`
        );
      }
    } catch (e: any) {
      const correlationId = e.response?.headers[Constants.CORRELATION_ID];
      const message =
        `Cannot create teams app due to ${e.name}: ${e.message}` +
        (correlationId ? `X-Correlation-ID: ${correlationId}` : "");
      const error = new Error(message);
      if (e.response?.status) {
        error.name = e.response?.status;
      }
      throw error;
    }
  }

  /**
   * @deprecated Please DO NOT use this method any more, it will be removed in near future.
   */
  export async function validateManifest(
    manifestString: string,
    appStudioToken: string
  ): Promise<string[]> {
    try {
      const requester = createRequesterWithToken(appStudioToken);
      const buffer = Buffer.from(manifestString, "utf8");
      const response = await requester.post("/api/appdefinitions/prevalidation", buffer, {
        headers: { "Content-Type": "application/json" },
      });
      if (response && response.data) {
        let validationResult: string[] = [];
        validationResult = validationResult.concat(response.data.errors);
        validationResult = validationResult.concat(response.data.warnings);
        validationResult = validationResult.concat(response.data.info);
        return validationResult;
      } else {
        throw AppStudioResultFactory.SystemError(
          AppStudioError.ValidationFailedError.name,
          AppStudioError.ValidationFailedError.message([
            `Validation failed, response: ${JSON.stringify(response)}`,
          ])
        );
      }
    } catch (e: any) {
      const correlationId = e.response?.headers[Constants.CORRELATION_ID];
      const message =
        `Cannot create teams app due to ${e.name}: ${e.message}` +
        (correlationId ? `X-Correlation-ID: ${correlationId}` : "");
      throw AppStudioResultFactory.SystemError(
        AppStudioError.ValidationFailedError.name,
        AppStudioError.ValidationFailedError.message([message]),
        e
      );
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
      const response = await requester.post("/api/publishing", file, {
        headers: { "Content-Type": "application/zip" },
      });

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
          throw AppStudioResultFactory.SystemError(
            AppStudioError.TeamsAppPublishFailedError.name,
            AppStudioError.TeamsAppPublishFailedError.message(teamsAppId),
            `code: ${response.data.error.code}, message: ${response.data.error.message}`
          );
        } else {
          return response.data.id;
        }
      } else {
        throw AppStudioResultFactory.SystemError(
          AppStudioError.TeamsAppPublishFailedError.name,
          AppStudioError.TeamsAppPublishFailedError.message(teamsAppId)
        );
      }
    } catch (e: any) {
      if (e instanceof SystemError) {
        throw e;
      } else {
        const correlationId = e.response?.headers[Constants.CORRELATION_ID];
        throw AppStudioResultFactory.SystemError(
          AppStudioError.TeamsAppPublishFailedError.name,
          AppStudioError.TeamsAppPublishFailedError.message(teamsAppId, correlationId),
          e
        );
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
          AppStudioError.TeamsAppPublishFailedError.message(teamsAppId)
        );
      }

      if (response && response.data) {
        if (response.data.error || response.data.errorMessage) {
          throw AppStudioResultFactory.SystemError(
            AppStudioError.TeamsAppPublishFailedError.name,
            AppStudioError.TeamsAppPublishFailedError.message(teamsAppId),
            response.data.error?.message || response.data.errorMessage
          );
        } else {
          return response.data.teamsAppId;
        }
      } else {
        throw AppStudioResultFactory.SystemError(
          AppStudioError.TeamsAppPublishFailedError.name,
          AppStudioError.TeamsAppPublishFailedError.message(teamsAppId)
        );
      }
    } catch (error: any) {
      if (error instanceof SystemError) {
        throw error;
      } else {
        const correlationId = error.response?.headers[Constants.CORRELATION_ID];
        throw AppStudioResultFactory.SystemError(
          AppStudioError.TeamsAppPublishFailedError.name,
          AppStudioError.TeamsAppPublishFailedError.message(teamsAppId, correlationId),
          error
        );
      }
    }
  }

  export async function getAppByTeamsAppId(
    teamsAppId: string,
    appStudioToken: string
  ): Promise<IPublishingAppDenition | undefined> {
    const requester = createRequesterWithToken(appStudioToken);
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
  }

  export async function getUserList(
    teamsAppId: string,
    appStudioToken: string
  ): Promise<IUserList[] | undefined> {
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

    const findUser = userList?.find((user: IUserList) => user.aadId === userObjectId);
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
    newUser: IUserList
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

    const findUser = app.userList?.findIndex((user: IUserList) => user["aadId"] === newUser.aadId);
    if (findUser && findUser >= 0) {
      return;
    }

    app.userList?.push(newUser);
    const requester = createRequesterWithToken(appStudioToken);
    const response = await requester.post(`/api/appdefinitions/${teamsAppId}/owner`, app);
    if (!response || !response.data || !checkUser(response.data as IAppDefinition, newUser)) {
      throw new Error(ErrorMessages.GrantPermissionFailed);
    }
  }

  function checkUser(app: IAppDefinition, newUser: IUserList): boolean {
    const findUser = app.userList?.findIndex((user: IUserList) => user["aadId"] === newUser.aadId);
    if (findUser != undefined && findUser >= 0) {
      return true;
    } else {
      return false;
    }
  }
}
