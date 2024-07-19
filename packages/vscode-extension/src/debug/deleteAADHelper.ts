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
import * as util from "util";
import { localize } from "../utils/localizeUtils";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent } from "../telemetry/extTelemetryEvents";
import { FxError } from "@microsoft/teamsfx-api";

export async function deleteAAD() {
  try {
    if (globalVariables.deleteAADInProgress) {
      return;
    }
    globalVariables.setDeleteAADInProgress(true);
    const projectPath = globalVariables.workspaceUri!.fsPath;
    const envFile = path.resolve(projectPath, "env", ".env.local");
    const userFile = path.resolve(projectPath, "env", ".env.local.user");
    if (!fs.existsSync(envFile) || !fs.existsSync(userFile)) {
      return;
    }
    const envData = dotenvUtil.deserialize(fs.readFileSync(envFile, "utf-8"));
    const userEnvData = dotenvUtil.deserialize(fs.readFileSync(userFile, "utf-8"));
    if (!envData.obj["BOT_ID"] && !envData.obj["AAD_APP_CLIENT_ID"]) {
      return;
    }
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
      VsCodeLogInstance.info(localize("teamstoolkit.localDebug.startDeletingAADProcess"));
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.StartDeleteAADAfterDebug);

      const aadClient = axios.create({
        baseURL: "https://graph.microsoft.com/v1.0",
      });
      aadClient.interceptors.request.use((config) => {
        config.headers["Authorization"] = `Bearer ${tokenRes.value}`;
        return config;
      });
      const list: string[] = [];
      if (envData.obj["BOT_ID"] != undefined) {
        list.push(envData.obj["BOT_ID"]);
        envData.obj["BOT_ID"] = "";
        userEnvData.obj["SECRET_BOT_PWORD"] = "";
      }
      if (envData.obj["AAD_APP_CLIENT_ID"] != undefined) {
        list.push(envData.obj["AAD_APP_CLIENT_ID"]);
        envData.obj["AAD_APP_CLIENT_ID"] = "";
        envData.obj["AAD_APP_OBJECT_ID"] = "";
        envData.obj["AAD_APP_TENANT_ID"] = "";
        envData.obj["AAD_APP_OAUTH_AUTHORITY"] = "";
        envData.obj["AAD_APP_OAUTH_AUTHORITY_HOST"] = "";
        envData.obj["AAD_APP_ACCESS_AS_USER_PERMISSION_ID"] = "";
        userEnvData.obj["SECRET_AAD_APP_CLIENT_SECRET"] = "";
      }
      VsCodeLogInstance.info(localize("teamstoolkit.localDebug.updatingLocalEnvFile"));
      fs.writeFileSync(envFile, dotenvUtil.serialize(envData));
      fs.writeFileSync(userFile, dotenvUtil.serialize(userEnvData));
      VsCodeLogInstance.info(localize("teamstoolkit.localDebug.successUpdateLocalEnvFile"));
      for (const id of list) {
        try {
          VsCodeLogInstance.info(
            util.format(localize("teamstoolkit.localDebug.startDeletingAADApp"), id)
          );
          await aadClient.delete(`applications(appId='${id}')`);
          VsCodeLogInstance.info(
            util.format(localize("teamstoolkit.localDebug.successDeleteAADApp"), id)
          );
        } catch (error) {
          VsCodeLogInstance.warning(
            util.format(
              localize("teamstoolkit.localDebug.failDeleteAADApp"),
              id,
              (error as Error).toString()
            )
          );
        }
      }
      VsCodeLogInstance.info(localize("teamstoolkit.localDebug.successDeleteAADProcess"));
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.SuccessDeleteAADAfterDebug);
    }
  } catch (error) {
    VsCodeLogInstance.warning("Failed to delete AAD: " + (error as Error).toString());
    VsCodeLogInstance.warning(
      util.format(
        localize("teamstoolkit.localDebug.failDeleteAADProcess"),
        (error as Error).toString()
      )
    );
    ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.FailDeleteAADAfterDebug, error as FxError);
  } finally {
    globalVariables.setDeleteAADInProgress(false);
  }
}
