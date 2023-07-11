// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import m365Provider from "@microsoft/teamsfx-cli/src/commonlib/m365LoginUserPassword";
import { AppStudioScopes } from "@microsoft/teamsfx-core";
import axios, { AxiosInstance } from "axios";

async function createRequester(): Promise<AxiosInstance> {
  const appStudioTokenRes = await m365Provider.getAccessToken({
    scopes: AppStudioScopes,
  });
  const appStudioToken = appStudioTokenRes.isOk()
    ? appStudioTokenRes.value
    : undefined;
  const requester = axios.create({
    baseURL: "https://dev.teams.microsoft.com",
  });
  requester.defaults.headers.common[
    "Authorization"
  ] = `Bearer ${appStudioToken}`;
  return requester;
}

export async function deleteAadAppByObjectId(objectId: string) {
  const requester = await createRequester();
  for (let retries = 3; retries > 0; --retries) {
    try {
      const response = await requester.delete(`api/aadapp/v2/${objectId}`);
      if (response.status >= 200 && response.status < 300) {
        console.log("Successfully deleted AAD app");
        return;
      }
    } catch (e) {
      console.log(`Failed to delete AAD app, error: ${e}`);
    }
  }
}

export async function getAadAppByClientId(clientId: string): Promise<any> {
  const requester = await createRequester();
  for (let retries = 3; retries > 0; --retries) {
    try {
      const response = await requester.get(`api/aadapp/${clientId}`);
      if (response.status >= 200 && response.status < 300) {
        console.log("Successfully got AAD app");
        return response.data;
      }
    } catch (e) {
      console.log(`Failed to get AAD app, error: ${e}`);
    }
  }
  return undefined;
}

export async function deleteAadAppByClientId(clientId: string) {
  const aadApp = await getAadAppByClientId(clientId);
  if (aadApp?.objectId) {
    await deleteAadAppByObjectId(aadApp.objectId);
  }
}

export async function deleteBot(botId: string) {
  const requester = await createRequester();
  for (let retries = 3; retries > 0; --retries) {
    try {
      const response = await requester.delete(`/api/botframework/${botId}`);
      if (response.status >= 200 && response.status < 300) {
        console.log("Successfully deleted bot");
        return;
      }
    } catch (e) {
      console.log(`Failed to delete bot, error: ${e}`);
    }
  }
}

export async function getBot(botId: string): Promise<any> {
  const requester = await createRequester();
  for (let retries = 3; retries > 0; --retries) {
    try {
      const response = await requester.get(`/api/botframework/${botId}`);
      if (response.status >= 200 && response.status < 300) {
        console.log("Successfully got bot");
        return response.data;
      }
    } catch (e) {
      console.log(`Failed to get bot, error: ${e}`);
    }
  }
  return undefined;
}

export async function deleteTeamsApp(teamsAppId: string) {
  const requester = await createRequester();
  for (let retries = 3; retries > 0; --retries) {
    try {
      const response = await requester.delete(
        `/api/appdefinitions/${teamsAppId}`
      );
      if (response.status >= 200 && response.status < 300) {
        console.log("Successfully deleted Teams app");
        return;
      }
    } catch (e) {
      console.log(`Failed to delete Teams app, error: ${e}`);
    }
  }
}

export async function getTeamsApp(teamsAppId: string): Promise<any> {
  const requester = await createRequester();
  for (let retries = 3; retries > 0; --retries) {
    try {
      const response = await requester.get(`/api/appdefinitions/${teamsAppId}`);
      if (response.status >= 200 && response.status < 300) {
        console.log("Successfully got Teams app");
        return response.data;
      }
    } catch (e) {
      console.log(`Failed to get Teams app, error: ${e}`);
    }
  }
  return undefined;
}
