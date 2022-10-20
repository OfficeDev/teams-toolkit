// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Result,
  FxError,
  Platform,
  M365TokenProvider,
  PathNotExistError,
} from "@microsoft/teamsfx-api";
import axios from "axios";
import fs from "fs-extra";
import path from "path";
import { Service } from "typedi";

import { getLocalizedString } from "../../../../common/localizeUtils";
import { getSPFxToken, GraphScopes } from "../../../../common/tools";
import { asBoolean, asFactory, asString, wrapRun } from "../../../utils/common";
import { DriverContext } from "../../interface/commonArgs";
import { StepDriver } from "../../interface/stepDriver";
import { CreateAppCatalogFailedError } from "./error/createAppCatalogFailedError";
import { GetGraphTokenFailedError } from "./error/getGraphTokenFailedError";
import { GetSPOTokenFailedError } from "./error/getSPOTokenFailedError";
import { GetTenantFailedError } from "./error/getTenantFailedError";
import { InsufficientPermissionError } from "./error/insufficientPermissionError";
import { NoSPPackageError } from "./error/noSPPackageError";
import { UploadAppPackageFailedError } from "./error/uploadAppPackageFailedError";
import { DeploySPFxArgs } from "./interface/deployArgs";
import { Constants } from "./utility/constants";
import { sleep } from "./utility/sleep";
import { SPOClient } from "./utility/spoClient";
import { NoValidAppCatelog } from "./error/noValidAppCatelogError";

@Service(Constants.DeployDriverName)
export class SPFxDeployDriver implements StepDriver {
  private readonly EmptyMap = new Map<string, string>();

  private asDeployArgs = asFactory<DeploySPFxArgs>({
    createAppCatalogIfNotExist: asBoolean,
    packageSolutionPath: asString,
  });

  public async run(
    args: DeploySPFxArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    return wrapRun(() => this.deploy(args, context));
  }

  public async deploy(args: DeploySPFxArgs, context: DriverContext): Promise<Map<string, string>> {
    const deployArgs = this.asDeployArgs(args);
    // const progressHandler = await ProgressHelper.startDeployProgressHandler(context.ui);
    let success = false;
    try {
      const tenant = await this.getTenant(context.m365TokenProvider);
      SPOClient.setBaseUrl(tenant);

      const spoToken = await getSPFxToken(context.m365TokenProvider);
      if (!spoToken) {
        throw new GetSPOTokenFailedError();
      }

      let appCatalogSite = await SPOClient.getAppCatalogSite(spoToken);
      if (appCatalogSite) {
        SPOClient.setBaseUrl(appCatalogSite);
      } else {
        // await progressHandler?.next(DeployProgressMessage.CreateSPAppCatalog);
        if (deployArgs.createAppCatalogIfNotExist) {
          try {
            await SPOClient.createAppCatalog(spoToken);
          } catch (e) {
            throw new CreateAppCatalogFailedError(e as Error);
          }
        } else {
          throw new NoValidAppCatelog();
        }
        let retry = 0;
        appCatalogSite = await SPOClient.getAppCatalogSite(spoToken);
        while (appCatalogSite == null && retry < Constants.APP_CATALOG_MAX_TIMES) {
          context.logProvider.warning(`No tenant app catalog found, retry: ${retry}`);
          await sleep(Constants.APP_CATALOG_REFRESH_TIME);
          appCatalogSite = await SPOClient.getAppCatalogSite(spoToken);
          retry += 1;
        }
        if (appCatalogSite) {
          SPOClient.setBaseUrl(appCatalogSite);
          context.logProvider.info(
            `Sharepoint tenant app catalog ${appCatalogSite} created, wait for a few minutes to be active.`
          );
          await sleep(Constants.APP_CATALOG_ACTIVE_TIME);
        } else {
          // TODO: move strings to the localization file
          throw new CreateAppCatalogFailedError(
            new Error(
              "Cannot get app catalog site url after creation. You may need wait a few minutes and retry."
            )
          );
        }
      }

      const appPackage = await this.getPackagePath(deployArgs.packageSolutionPath);
      if (!(await fs.pathExists(appPackage))) {
        throw new NoSPPackageError(appPackage);
      }

      const fileName = path.parse(appPackage).base;
      const bytes = await fs.readFile(appPackage);
      try {
        // await progressHandler?.next(DeployProgressMessage.UploadAndDeploy);
        await SPOClient.uploadAppPackage(spoToken, fileName, bytes);
      } catch (e: any) {
        if (e.response?.status === 403) {
          context.ui?.showMessage(
            "error",
            getLocalizedString("plugins.spfx.deployFailedNotice", appCatalogSite!),
            false,
            "OK"
          );
          throw new InsufficientPermissionError(appCatalogSite!);
        } else {
          throw new UploadAppPackageFailedError(e);
        }
      }

      const appID = await this.getAppID(deployArgs.packageSolutionPath);
      await SPOClient.deployAppPackage(spoToken, appID);
      const guidance = getLocalizedString(
        "plugins.spfx.deployNotice",
        appPackage,
        appCatalogSite,
        appCatalogSite
      );
      if (context.platform === Platform.CLI) {
        context.ui?.showMessage("info", guidance, false);
      } else {
        context.ui?.showMessage("info", guidance, false, "OK");
      }
      success = true;
    } finally {
      // await progressHandler?.end(success);
    }
    return this.EmptyMap;
  }

  public async getTenant(tokenProvider: M365TokenProvider): Promise<string> {
    const graphTokenRes = await tokenProvider.getAccessToken({
      scopes: GraphScopes,
    });
    const graphToken = graphTokenRes.isOk() ? graphTokenRes.value : undefined;
    if (!graphToken) {
      throw new GetGraphTokenFailedError();
    }

    const tokenJsonRes = await tokenProvider.getJsonObject({
      scopes: GraphScopes,
    });
    const username = (tokenJsonRes as any).value.unique_name;

    const instance = axios.create({
      baseURL: "https://graph.microsoft.com/v1.0",
    });
    instance.defaults.headers.common["Authorization"] = `Bearer ${graphToken}`;

    let tenant = "";
    try {
      const res = await instance.get("/sites/root?$select=webUrl");
      if (res && res.data && res.data.webUrl) {
        tenant = res.data.webUrl;
      } else {
        throw new GetTenantFailedError(username);
      }
    } catch (e) {
      throw new GetTenantFailedError(username, e as Error);
    }
    return tenant;
  }

  public async getPackagePath(solutionConfigPath: string): Promise<string> {
    if (!(await fs.pathExists(solutionConfigPath))) {
      throw new PathNotExistError(Constants.DeployDriverName, solutionConfigPath);
    }
    const solutionConfig = await fs.readJson(solutionConfigPath);
    const sharepointFolder = path.dirname(solutionConfigPath).replace("config", "sharepoint");
    return path.resolve(sharepointFolder, solutionConfig.paths.zippedPackage);
  }

  public async getAppID(solutionConfigPath: string): Promise<string> {
    if (!(await fs.pathExists(solutionConfigPath))) {
      throw new PathNotExistError(Constants.DeployDriverName, solutionConfigPath);
    }
    const solutionConfig = await fs.readJson(solutionConfigPath);
    const appID = solutionConfig["solution"]["id"];
    return appID;
  }
}
