// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import m365Provider from "../../../src/commonlib/m365LoginUserPassword";
import { AppStudioScopes } from "@microsoft/teamsfx-core/build/common/tools";
import axios, { AxiosInstance } from "axios";

async function createRequester(): Promise<AxiosInstance> {
  const appStudioTokenRes = await m365Provider.getAccessToken({ scopes: AppStudioScopes });
  const appStudioToken = appStudioTokenRes.isOk() ? appStudioTokenRes.value : undefined;
  const requester = axios.create({
    baseURL: "https://dev.teams.microsoft.com",
  });
  requester.defaults.headers.common["Authorization"] = `Bearer ${appStudioToken}`;
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

export async function deleteAadAppByClientId(clientId: string) {
  const requester = await createRequester();
  let objectId: string | undefined = undefined;
  for (let retries = 3; retries > 0; --retries) {
    try {
      const response = await requester.get(`api/aadapp/${clientId}`);
      if (response.status >= 200 && response.status < 300) {
        console.log("Successfully got AAD app");
        objectId = response.data.id;
        break;
      }
    } catch (e) {
      console.log(`Failed to get AAD app, error: ${e}`);
    }
  }
  if (objectId) {
    await deleteAadAppByObjectId(objectId);
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

export async function deleteTeamsApp(teamsAppId: string) {
  const requester = await createRequester();
  for (let retries = 3; retries > 0; --retries) {
    try {
      const response = await requester.delete(`/api/appdefinitions/${teamsAppId}`);
      if (response.status >= 200 && response.status < 300) {
        console.log("Successfully deleted Teams app");
        return;
      }
    } catch (e) {
      console.log(`Failed to delete Teams app, error: ${e}`);
    }
  }
}
