// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks";
import { SystemError } from "@microsoft/teamsfx-api";
import { AxiosInstance } from "axios";
import { HelpLinks } from "../common/constants";
import { ErrorContextMW, TOOLS, setErrorContext } from "../common/globalVars";
import { getLocalizedString } from "../common/localizeUtils";
import { WrappedAxiosClient } from "../common/wrappedAxiosClient";
import { HttpStatusCode } from "../component/constant/commonConstant";
import { APP_STUDIO_API_NAMES, Constants } from "../component/driver/teamsApp/constants";
import { AppStudioError } from "../component/driver/teamsApp/errors";
import { IPublishingAppDenition } from "../component/driver/teamsApp/interfaces/appdefinitions/IPublishingAppDefinition";
import { AppDefinition } from "../component/driver/teamsApp/interfaces/appdefinitions/appDefinition";
import { AppUser } from "../component/driver/teamsApp/interfaces/appdefinitions/appUser";
import { AppStudioResultFactory } from "../component/driver/teamsApp/results";
import { manifestUtils } from "../component/driver/teamsApp/utils/ManifestUtils";
import { DeveloperPortalAPIFailedError } from "../error/teamsApp";

class RetryHandler {
  public static RETRIES = 6;
  public static async Retry<T>(fn: () => Promise<T>): Promise<T | undefined> {
    let retries = this.RETRIES;
    let response;
    while (retries > 0) {
      retries = retries - 1;
      try {
        response = await fn();
        return response;
      } catch (e: any) {
        // Directly throw 404 error, keep trying for other status code e.g. 503 400
        if (retries <= 0 || e.response?.status == 404 || e.response?.status == 409) {
          throw e;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    }
  }
}

class TeamsDevPortalClient {
  endpoint: string;
  region?: string;
  constructor() {
    if (process.env.APP_STUDIO_ENV && process.env.APP_STUDIO_ENV === "int") {
      this.endpoint = "https://dev-int.teams.microsoft.com";
    } else {
      this.endpoint = "https://dev.teams.microsoft.com";
    }
  }

  async setRegion(regionToken: string) {
    const requester = this.createRequesterWithToken(regionToken);
    const response = await RetryHandler.Retry(() => requester.post(`/v1.0/users/region`));
    this.region = response?.data?.regionGtms?.teamsDevPortal as string;
  }

  getEndpoint() {
    return this.region || this.endpoint;
  }

  /**
   * Creates a new axios instance to call app studio to prevent setting the accessToken on global instance.
   * @param {string}  token
   * @returns {AxiosInstance}
   */
  createRequesterWithToken(token: string): AxiosInstance {
    const instance = WrappedAxiosClient.create({
      baseURL: this.getEndpoint(),
    });
    instance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    instance.defaults.headers.common["Client-Source"] = "teamstoolkit";
    return instance;
  }

  /**
   * Import an app registration in app studio with the given archived file and returns the app definition.
   * @param {string}  token - access token
   * @param {Buffer}  file - Zip file with manifest.json and two icons
   * @param {boolean} overwrite - whether to overrite the app if it already exists
   * @returns {Promise<AppDefinition>}
   */
  @hooks([ErrorContextMW({ source: "Teams" })])
  async importApp(token: string, file: Buffer, overwrite = false): Promise<AppDefinition> {
    try {
      const requester = this.createRequesterWithToken(token);
      TOOLS.logProvider.debug(
        `Sent API Request: ${this.getEndpoint()}/api/appdefinitions/v2/import`
      );
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
        TOOLS.logProvider.debug(
          `Received data from Teams Developer Portal: ${JSON.stringify(app)}`
        );
        return app;
      } else {
        throw new Error(`Cannot create teams app`);
      }
    } catch (e: any) {
      if (e.response?.status === 409) {
        const error = AppStudioResultFactory.UserError(
          AppStudioError.TeamsAppCreateConflictError.name,
          AppStudioError.TeamsAppCreateConflictError.message(),
          HelpLinks.SwitchTenant
        );
        throw error;
      }
      // Corner case: The provided app ID conflict with an existing published app
      // See Developer Portal PR: 507264
      if (
        e.response?.status == 422 &&
        e.response?.data.includes("App already exists and published")
      ) {
        const error = AppStudioResultFactory.UserError(
          AppStudioError.TeamsAppCreateConflictWithPublishedAppError.name,
          AppStudioError.TeamsAppCreateConflictWithPublishedAppError.message()
        );
        throw error;
      }
      // Corner case: App Id must be a GUID
      if (
        e.response?.status === HttpStatusCode.BAD_REQUEST &&
        e.response?.data.includes("App Id must be a GUID")
      ) {
        const manifest = manifestUtils.extractManifestFromArchivedFile(file);
        if (manifest.isErr()) {
          throw manifest.error;
        } else {
          const teamsAppId = manifest.value.id;
          const error = AppStudioResultFactory.UserError(
            AppStudioError.InvalidTeamsAppIdError.name,
            AppStudioError.InvalidTeamsAppIdError.message(teamsAppId)
          );
          throw error;
        }
      }
      const error = this.wrapException(e, APP_STUDIO_API_NAMES.CREATE_APP);
      throw error;
    }
  }

  @hooks([ErrorContextMW({ source: "Teams" })])
  async listApps(token: string): Promise<AppDefinition[]> {
    if (!this.region) throw new Error("Failed to get region");
    let requester: AxiosInstance;
    try {
      requester = this.createRequesterWithToken(token);
      TOOLS.logProvider.debug(`Sent API Request: GET ${this.region}/api/appdefinitions`);
      const response = await RetryHandler.Retry(() => requester.get(`/api/appdefinitions`));
      if (response && response.data) {
        const apps = <AppDefinition[]>response.data;
        if (apps) {
          return apps;
        } else {
          TOOLS.logProvider.error("Cannot get the app definitions");
        }
      }
    } catch (e) {
      const error = this.wrapException(e, APP_STUDIO_API_NAMES.LIST_APPS);
      throw error;
    }
    throw new Error("Cannot get the app definitions");
  }

  @hooks([ErrorContextMW({ source: "Teams" })])
  async getApp(token: string, teamsAppId: string): Promise<AppDefinition> {
    let requester: AxiosInstance;
    try {
      requester = this.createRequesterWithToken(token);
      TOOLS.logProvider.debug(
        `Sent API Request: GET ${this.getEndpoint()}/api/appdefinitions/${teamsAppId}`
      );
      const response = await RetryHandler.Retry(() =>
        requester.get(`/api/appdefinitions/${teamsAppId}`)
      );
      if (response && response.data) {
        const app = <AppDefinition>response.data;
        if (app && app.teamsAppId && app.teamsAppId === teamsAppId) {
          return app;
        } else {
          TOOLS.logProvider?.error(
            `teamsAppId mismatch. Input: ${teamsAppId}. Got: ${app.teamsAppId as string}`
          );
        }
      }
    } catch (e) {
      const error = this.wrapException(e, APP_STUDIO_API_NAMES.GET_APP);
      throw error;
    }
    throw new Error(`Cannot get the app definition with app ID ${teamsAppId}`);
  }

  @hooks([ErrorContextMW({ source: "Teams" })])
  async getAppPackage(token: string, teamsAppId: string): Promise<any> {
    TOOLS.logProvider?.info("Downloading app package for app " + teamsAppId);
    const requester = this.createRequesterWithToken(token);
    try {
      const response = await RetryHandler.Retry(() =>
        requester.get(`/api/appdefinitions/${teamsAppId}/manifest`)
      );

      if (response && response.data) {
        TOOLS.logProvider?.info("Download app package successfully");
        return response.data;
      } else {
        throw new Error(getLocalizedString("plugins.appstudio.emptyAppPackage", teamsAppId));
      }
    } catch (e) {
      const error = this.wrapException(e, APP_STUDIO_API_NAMES.GET_APP_PACKAGE);
      throw error;
    }
  }

  /**
   * Check if app exists in the user's organization by the Teams app id
   * @param teamsAppId
   * @param token
   * @param logProvider
   * @returns
   */
  @hooks([ErrorContextMW({ source: "Teams" })])
  async checkExistsInTenant(token: string, teamsAppId: string): Promise<boolean> {
    const requester = this.createRequesterWithToken(token);
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
      return false;
    }
  }

  /**
   * Publish Teams app to Teams App Catalog
   */
  @hooks([ErrorContextMW({ source: "Teams" })])
  async publishTeamsApp(token: string, teamsAppId: string, file: Buffer): Promise<string> {
    try {
      const requester = this.createRequesterWithToken(token);
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
            const appDefinition = await this.getStaggedApp(token, teamsAppId);
            if (appDefinition) {
              return appDefinition.teamsAppId;
            }
          }

          // Corner case
          // Fail if an app with the same external.id exists in the staged app entitlements
          // App with same id already exists in the staged apps, Invoke UpdateAPI instead.
          if (
            response.data.error.code == "Conflict" &&
            response.data.error.innerError?.code == "AppDefinitionAlreadyExists"
          ) {
            try {
              return await this.publishTeamsAppUpdate(token, teamsAppId, file);
            } catch (e: any) {
              // Update Published app failed as well
              const error = AppStudioResultFactory.SystemError(
                AppStudioError.TeamsAppPublishConflictError.name,
                AppStudioError.TeamsAppPublishConflictError.message(teamsAppId),
                e
              );
              throw error;
            }
          }

          const error = new Error(response?.data.error.message);
          (error as any).response = response;
          (error as any).request = response.request;
          const exception = this.wrapException(error, APP_STUDIO_API_NAMES.PUBLISH_APP);
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
        const error = this.wrapException(e, APP_STUDIO_API_NAMES.PUBLISH_APP);
        throw error;
      }
    }
  }
  /**
   * Update existed publish request
   * @param teamsAppId
   * @param file
   * @param token
   * @returns
   */
  async publishTeamsAppUpdate(token: string, teamsAppId: string, file: Buffer): Promise<string> {
    setErrorContext({ source: "Teams" });
    try {
      // Get App Definition from Teams App Catalog
      const appDefinition = await this.getStaggedApp(token, teamsAppId);

      const requester = this.createRequesterWithToken(token);
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

      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      const requestPath = `${response.request?.method} ${response.request?.path}`;
      if (response && response.data) {
        if (response.data.error || response.data.errorMessage) {
          const error = new Error(response.data.error?.message || response.data.errorMessage);
          (error as any).response = response;
          (error as any).request = response.request;
          const exception = this.wrapException(error, APP_STUDIO_API_NAMES.UPDATE_PUBLISHED_APP);
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
        const exception = this.wrapException(error, APP_STUDIO_API_NAMES.UPDATE_PUBLISHED_APP);
        throw exception;
      }
    }
  }
  /**
   * Get Stagged Teams app from tenant app catalog
   * @param teamsAppId manifest.id, which is externalId in app catalog.
   * @param token
   * @returns
   */
  @hooks([ErrorContextMW({ source: "Teams" })])
  async getStaggedApp(
    token: string,
    teamsAppId: string
  ): Promise<IPublishingAppDenition | undefined> {
    const requester = this.createRequesterWithToken(token);
    try {
      const response = await RetryHandler.Retry(() =>
        requester.get(`/api/publishing/${teamsAppId}`)
      );
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
      return undefined;
    }
  }
  async getUserList(token: string, teamsAppId: string): Promise<AppUser[] | undefined> {
    let app;
    try {
      app = await this.getApp(token, teamsAppId);
    } catch (error) {
      throw error;
    }
    return app.userList;
  }
  wrapException(e: any, apiName: string): Error {
    const correlationId = e.response?.headers[Constants.CORRELATION_ID];
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const extraData = e.response?.data ? `data: ${JSON.stringify(e.response.data)}` : "";
    const error = new DeveloperPortalAPIFailedError(e, correlationId, apiName, extraData);
    return error;
  }
}

export const teamsDevPortalClient = new TeamsDevPortalClient();
