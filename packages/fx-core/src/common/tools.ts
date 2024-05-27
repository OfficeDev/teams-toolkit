// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Tunnel } from "@microsoft/dev-tunnels-contracts";
import {
  ManagementApiVersions,
  TunnelManagementHttpClient,
} from "@microsoft/dev-tunnels-management";
import { FxError, M365TokenProvider, Result, SystemError, err, ok } from "@microsoft/teamsfx-api";
import axios from "axios";
import * as fs from "fs-extra";
import { parse } from "yaml";
import { AppStudioClient } from "../component/driver/teamsApp/clients/appStudioClient";
import { AuthSvcClient } from "../component/driver/teamsApp/clients/authSvcClient";
import { getAppStudioEndpoint } from "../component/driver/teamsApp/constants";
import { AppStudioClient as BotAppStudioClient } from "../component/resource/botService/appStudio/appStudioClient";
import { getProjectSettingsPath } from "../core/middleware/projectSettingsLoader";
import { GraphReadUserScopes, SPFxScopes } from "./constants";
import { PackageService } from "../component/m365/packageService";

export function getCopilotStatus(
  token: string,
  ensureUpToDate = false
): Promise<boolean | undefined> {
  return PackageService.GetSharedInstance().getCopilotStatus(token, ensureUpToDate);
}

export async function getSideloadingStatus(token: string): Promise<boolean | undefined> {
  return AppStudioClient.getSideloadingStatus(token);
}

export async function getSPFxTenant(graphToken: string): Promise<string> {
  const GRAPH_TENANT_ENDPT = "https://graph.microsoft.com/v1.0/sites/root?$select=webUrl";
  if (graphToken.length > 0) {
    const response = await axios.get(GRAPH_TENANT_ENDPT, {
      headers: { Authorization: `Bearer ${graphToken}` },
    });
    return response.data.webUrl;
  }
  return "";
}

export async function getSPFxToken(
  m365TokenProvider: M365TokenProvider
): Promise<string | undefined> {
  const graphTokenRes = await m365TokenProvider.getAccessToken({
    scopes: GraphReadUserScopes,
  });
  let spoToken = undefined;
  if (graphTokenRes && graphTokenRes.isOk()) {
    const tenant = await getSPFxTenant(graphTokenRes.value);
    const spfxTokenRes = await m365TokenProvider.getAccessToken({
      scopes: SPFxScopes(tenant),
    });
    spoToken = spfxTokenRes.isOk() ? spfxTokenRes.value : undefined;
  }
  return spoToken;
}

/**
 * Get and set regin for App Studio client
 * @param m365TokenProvider
 */
export async function setRegion(authSvcToken: string) {
  const region = await AuthSvcClient.getRegion(authSvcToken);
  if (region) {
    // Do not set region for INT env
    const appStudioEndpoint = getAppStudioEndpoint();
    if (appStudioEndpoint.includes("dev-int")) {
      return;
    }
    AppStudioClient.setRegion(region);
    BotAppStudioClient.setRegion(region);
  }
}

export function ConvertTokenToJson(token: string): Record<string, unknown> {
  const array = token.split(".");
  const buff = Buffer.from(array[1], "base64");
  return JSON.parse(buff.toString("utf8"));
}

export function getFixedCommonProjectSettings(rootPath: string | undefined) {
  if (!rootPath) {
    return undefined;
  }
  try {
    const settingsPath = getProjectSettingsPath(rootPath);

    if (!settingsPath || !fs.pathExistsSync(settingsPath)) {
      return undefined;
    }

    const settingsContent = fs.readFileSync(settingsPath, "utf-8");
    const settings = parse(settingsContent);
    return {
      projectId: settings?.projectId ?? undefined,
    };
  } catch {
    return undefined;
  }
}

// this function will be deleted after VS has added get dev tunnel and list dev tunnels API
const TunnelManagementUserAgent = { name: "Teams-Toolkit" };
export async function listDevTunnels(token: string): Promise<Result<Tunnel[], FxError>> {
  try {
    const tunnelManagementClientImpl = new TunnelManagementHttpClient(
      TunnelManagementUserAgent,
      ManagementApiVersions.Version20230927preview,
      () => {
        const res = `Bearer ${token}`;
        return Promise.resolve(res);
      }
    );

    const options = {
      includeAccessControl: true,
    };
    const tunnels = await tunnelManagementClientImpl.listTunnels(undefined, undefined, options);
    return ok(tunnels);
  } catch (error) {
    return err(new SystemError("DevTunnels", "ListDevTunnelsFailed", error.message));
  }
}
