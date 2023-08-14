// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, FxError, LogProvider, M365TokenProvider, ok, Result } from "@microsoft/teamsfx-api";

import { CoreSource } from "../../core/error";
import { AppStudioScopes } from "../tools";
import { NotExtendedToM365Error } from "./errors";
import { PackageService } from "./packageService";
import { serviceEndpoint, serviceScope } from "./serviceConstant";
import { assembleError } from "../../error/common";
import { HubTypes } from "../../question/other";
import { ErrorContextMW } from "../../core/globalVars";
import { hooks } from "@feathersjs/hooks";

export class LaunchHelper {
  private readonly m365TokenProvider: M365TokenProvider;
  private readonly logger?: LogProvider;

  public constructor(m365TokenProvider: M365TokenProvider, logger?: LogProvider) {
    this.m365TokenProvider = m365TokenProvider;
    this.logger = logger;
  }
  @hooks([ErrorContextMW({ component: "LaunchHelper" })])
  public async getLaunchUrl(
    hub: HubTypes,
    teamsAppId: string,
    capabilities: string[],
    withLoginHint = true
  ): Promise<Result<string, FxError>> {
    const loginHint = withLoginHint
      ? (await this.getUpnFromToken()) ?? "login_your_m365_account" // a workaround that user has the chance to login
      : undefined;
    let url: URL;
    switch (hub) {
      case HubTypes.teams: {
        const baseUrl = `https://teams.microsoft.com/l/app/${teamsAppId}?installAppPackage=true&webjoin=true`;
        url = new URL(baseUrl);
        const tid = await this.getTidFromToken();
        if (tid) {
          url.searchParams.append("appTenantId", tid);
        }
        break;
      }
      case HubTypes.outlook: {
        const result = await this.getM365AppId(teamsAppId);
        if (result.isErr()) {
          return err(result.error);
        }
        const baseUrl = capabilities.includes("staticTab")
          ? `https://outlook.office.com/host/${result.value}`
          : "https://outlook.office.com/mail";
        url = new URL(baseUrl);
        break;
      }
      case HubTypes.office:
        {
          const result = await this.getM365AppId(teamsAppId);
          if (result.isErr()) {
            return err(result.error);
          }
          const baseUrl = `https://www.office.com/m365apps/${result.value}?auth=2`;
          url = new URL(baseUrl);
        }
        break;
    }
    if (loginHint) {
      url.searchParams.append("login_hint", loginHint);
    }
    return ok(url.toString());
  }

  public async getM365AppId(teamsAppId: string): Promise<Result<string, FxError>> {
    const sideloadingServiceEndpoint = process.env.SIDELOADING_SERVICE_ENDPOINT ?? serviceEndpoint;
    const sideloadingServiceScope = process.env.SIDELOADING_SERVICE_SCOPE ?? serviceScope;
    const packageService = new PackageService(sideloadingServiceEndpoint, this.logger);

    const sideloadingTokenRes = await this.m365TokenProvider.getAccessToken({
      scopes: [sideloadingServiceScope],
    });
    if (sideloadingTokenRes.isErr()) {
      return err(sideloadingTokenRes.error);
    }
    const sideloadingToken = sideloadingTokenRes.value;

    try {
      const m365AppId = await packageService.retrieveAppId(sideloadingToken, teamsAppId);
      if (!m365AppId) {
        return err(new NotExtendedToM365Error(CoreSource));
      }
      return ok(m365AppId);
    } catch (error) {
      return err(assembleError(error));
    }
  }

  private async getTidFromToken(): Promise<string | undefined> {
    try {
      const statusRes = await this.m365TokenProvider.getStatus({ scopes: AppStudioScopes });
      const tokenObject = statusRes.isOk() ? statusRes.value.accountInfo : undefined;
      return tokenObject?.tid as string;
    } catch {
      return undefined;
    }
  }

  private async getUpnFromToken(): Promise<string | undefined> {
    try {
      const statusRes = await this.m365TokenProvider.getStatus({ scopes: AppStudioScopes });
      const tokenObject = statusRes.isOk() ? statusRes.value.accountInfo : undefined;
      return tokenObject?.upn as string;
    } catch {
      return undefined;
    }
  }
}
