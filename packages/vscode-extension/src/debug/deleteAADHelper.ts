// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { dotenvUtil } from "@microsoft/teamsfx-core/build/component/utils/envUtil";
import M365TokenInstance from "../commonlib/m365Login";
import * as globalVariables from "../globalVariables";
import * as fs from "fs-extra";
import * as path from "path";
import { GraphScopes } from "@microsoft/teamsfx-core";
import axios from "axios";
import { ConvertTokenToJson } from "../commonlib/codeFlowLogin";
import VsCodeLogInstance from "../commonlib/log";

export async function deleteAAD() {
  try {
    const accountInfo = M365TokenInstance.getCachedAccountInfo();
    if (accountInfo !== undefined) {
      const tokenRes = await M365TokenInstance.getAccessToken({ scopes: GraphScopes });
      if (tokenRes.isErr()) {
        return;
      }
      const accountJson = ConvertTokenToJson(tokenRes.value);
      const uniqueName = (accountJson as Record<string, string>)["unique_name"];
      if (!uniqueName || !uniqueName.includes("@microsoft.com")) {
        return;
      }
      VsCodeLogInstance.info("Start deleting AAD secret.");

      const aadClient = axios.create({
        baseURL: "https://graph.microsoft.com/v1.0",
      });
      aadClient.interceptors.request.use((config) => {
        config.headers["Authorization"] = `Bearer ${tokenRes.value}`;
        return config;
      });
      const projectPath = globalVariables.workspaceUri!.fsPath;
      const envFile = path.resolve(projectPath, "env", ".env.local");
      const userFile = path.resolve(projectPath, "env", ".env.local.user");
      if (!fs.existsSync(envFile) || !fs.existsSync(userFile)) {
        return;
      }
      const envData = dotenvUtil.deserialize(fs.readFileSync(envFile, "utf-8"));
      const userEnvData = dotenvUtil.deserialize(fs.readFileSync(userFile, "utf-8"));
      const deleteMap: Record<string, string> = {};
      if (envData.obj["BOT_ID"] != undefined) {
        try {
          const res = await aadClient.get(
            `applications(appId='${envData.obj["BOT_ID"]}')/passwordCredentials`
          );
          if (res.data.value.length > 1) {
            VsCodeLogInstance.warning(
              'There are more than 1 secrets for the AAD ${envData.obj["BOT_ID"]}, you need to delete them manually.'
            );
          } else {
            deleteMap[envData.obj["BOT_ID"]] = res.data.value[0].keyId;
            userEnvData.obj["SECRET_BOT_PASSWORD"] = "";
          }
        } catch (error) {
          VsCodeLogInstance.warning(
            "Failed to lists secrets for AAD app: " +
              envData.obj["BOT_ID"] +
              " " +
              (error as Error).toString()
          );
        }
      }

      if (envData.obj["AAD_APP_CLIENT_ID"] != undefined) {
        try {
          const res = await aadClient.get(
            `applications(appId='${envData.obj["AAD_APP_CLIENT_ID"]}')/passwordCredentials`
          );
          if (res.data.value.length > 1) {
            VsCodeLogInstance.warning(
              `There are more than 1 secrets for the AAD ${envData.obj["AAD_APP_CLIENT_ID"]}, you need to delete them manually.`
            );
          } else {
            deleteMap[envData.obj["AAD_APP_CLIENT_ID"]] = res.data.value[0].keyId;
            userEnvData.obj["SECRET_AAD_APP_CLIENT_SECRET"] = "";
          }
        } catch (error) {
          VsCodeLogInstance.warning(
            "Failed to lists secrets for AAD app: " +
              envData.obj["AAD_APP_CLIENT_ID"] +
              " " +
              (error as Error).toString()
          );
        }
      }

      if (Object.keys(deleteMap).length == 0) {
        return;
      }
      VsCodeLogInstance.info("Updating local user file.");
      fs.writeFileSync(userFile, dotenvUtil.serialize(userEnvData));
      VsCodeLogInstance.info("Successfully updated local user file.");
      for (const key in deleteMap) {
        try {
          const requestBody = {
            keyId: deleteMap[key],
          };
          const res = await aadClient.post(
            `applications(appId='${key}')/removePassword`,
            requestBody
          );
          VsCodeLogInstance.info("Try to delete secret for AAD app: " + key);
          if (res.status != 204) {
            VsCodeLogInstance.warning(
              "Failed to delete secret for AAD app: " +
                key +
                ", status code: " +
                res.status.toString() +
                ", error message: " +
                res.statusText
            );
          } else {
            VsCodeLogInstance.info("Successfully deleted secret for AAD app: " + key);
          }
        } catch (error) {
          VsCodeLogInstance.warning(
            "Failed to delete secret for AAD app: " + key + (error as Error).toString()
          );
        }
      }
      VsCodeLogInstance.info("Successfully deleted AAD secret.");
    }
  } catch (error) {
    VsCodeLogInstance.warning("Failed to delete AAD secret: " + (error as Error).toString());
  }
}
