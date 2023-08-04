// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { Result, FxError, Platform, M365TokenProvider } from "@microsoft/teamsfx-api";
import axios from "axios";
import fs from "fs-extra";
import path from "path";
import { Service } from "typedi";

import { getLocalizedString } from "../../../../common/localizeUtils";
import { getSPFxToken, GraphScopes } from "../../../../common/tools";
import { FileNotFoundError } from "../../../../error/common";
import { asBoolean, asFactory, asString, wrapRun } from "../../../utils/common";
import { DriverContext } from "../../interface/commonArgs";
import { ExecutionResult, StepDriver } from "../../interface/stepDriver";
import { addStartAndEndTelemetry } from "../../middleware/addStartAndEndTelemetry";
import { updateProgress } from "../../middleware/updateProgress";
import { WrapDriverContext } from "../../util/wrapUtil";
import { CreateAppCatalogFailedError } from "./error/createAppCatalogFailedError";
import { GetGraphTokenFailedError } from "./error/getGraphTokenFailedError";
import { GetSPOTokenFailedError } from "./error/getSPOTokenFailedError";
import { GetTenantFailedError } from "./error/getTenantFailedError";
import { InsufficientPermissionError } from "./error/insufficientPermissionError";
import { NoSPPackageError } from "./error/noSPPackageError";
import { NoValidAppCatelog } from "./error/noValidAppCatelogError";
import { UploadAppPackageFailedError } from "./error/uploadAppPackageFailedError";
import { DeploySPFxArgs } from "./interface/deployArgs";
import { Constants, DeployProgressMessage } from "./utility/constants";
import { sleep } from "./utility/sleep";
import { SPOClient } from "./utility/spoClient";

@Service(Constants.DeployDriverName)
export class SPFxDeployDriver implements StepDriver {
  public readonly description = getLocalizedString("driver.spfx.deploy.description");

  private readonly EmptyMap = new Map<string, string>();

  private asDeployArgs = asFactory<DeploySPFxArgs>({
    createAppCatalogIfNotExist: asBoolean,
    packageSolutionPath: asString,
  });

  @hooks([
    addStartAndEndTelemetry(Constants.TelemetryDeployEventName, Constants.TelemetryComponentName),
    updateProgress(getLocalizedString("driver.spfx.deploy.progressbar.stepMessage")),
  ])
  public async run(
    args: DeploySPFxArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    const wrapContext = new WrapDriverContext(
      context,
      Constants.TelemetryDeployEventName,
      Constants.TelemetryComponentName
    );
    return wrapRun(() => this.deploy(args, wrapContext), Constants.DeployDriverName);
  }

  public async execute(args: DeploySPFxArgs, ctx: DriverContext): Promise<ExecutionResult> {
    const wrapContext = new WrapDriverContext(
      ctx,
      Constants.TelemetryDeployEventName,
      Constants.TelemetryComponentName
    );
    const result = await this.run(args, wrapContext);
    return {
      result,
      summaries: wrapContext.summaries,
    };
  }

  public async deploy(
    args: DeploySPFxArgs,
    context: WrapDriverContext
  ): Promise<Map<string, string>> {
    const deployArgs = this.asDeployArgs(args);

    const tenant = await this.getTenant(context.m365TokenProvider);
    SPOClient.setBaseUrl(tenant);

    const spoToken = await getSPFxToken(context.m365TokenProvider);
    if (!spoToken) {
      throw new GetSPOTokenFailedError();
    }

    let appCatalogSite = await SPOClient.getAppCatalogSite(spoToken);
    if (appCatalogSite) {
      SPOClient.setBaseUrl(appCatalogSite);
      context.addSummary(DeployProgressMessage.SkipCreateSPAppCatalog());
    } else {
      if (deployArgs.createAppCatalogIfNotExist) {
        try {
          await SPOClient.createAppCatalog(spoToken);
          context.addSummary(DeployProgressMessage.CreateSPAppCatalog());
        } catch (e) {
          throw new CreateAppCatalogFailedError(e as Error);
        }
      } else {
        throw new NoValidAppCatelog();
      }
      let retry = 0;
      appCatalogSite = await SPOClient.getAppCatalogSite(spoToken);
      while (appCatalogSite == null && retry < Constants.APP_CATALOG_MAX_TIMES) {
        void context.logProvider.warning(
          getLocalizedString("driver.spfx.warn.noTenantAppCatalogFound", retry)
        );
        await sleep(Constants.APP_CATALOG_REFRESH_TIME);
        appCatalogSite = await SPOClient.getAppCatalogSite(spoToken);
        retry += 1;
      }
      if (appCatalogSite) {
        SPOClient.setBaseUrl(appCatalogSite);
        void context.logProvider.info(
          getLocalizedString("driver.spfx.info.tenantAppCatalogCreated", appCatalogSite)
        );
        await sleep(Constants.APP_CATALOG_ACTIVE_TIME);
      } else {
        throw new CreateAppCatalogFailedError(
          new Error(getLocalizedString("driver.spfx.error.failedToGetAppCatalog"))
        );
      }
    }

    const packageSolutionPath = path.isAbsolute(deployArgs.packageSolutionPath)
      ? deployArgs.packageSolutionPath
      : path.join(context.projectPath, deployArgs.packageSolutionPath);
    const appPackage = await this.getPackagePath(packageSolutionPath);
    if (!(await fs.pathExists(appPackage))) {
      throw new NoSPPackageError(appPackage);
    }

    const fileName = path.parse(appPackage).base;
    const bytes = await fs.readFile(appPackage);
    try {
      await SPOClient.uploadAppPackage(spoToken, fileName, bytes);
      context.addSummary(DeployProgressMessage.Upload());
    } catch (e: any) {
      if (e.response?.status === 403) {
        throw new InsufficientPermissionError(appCatalogSite);
      } else {
        throw new UploadAppPackageFailedError(e);
      }
    }

    const appID = await this.getAppID(packageSolutionPath);
    await SPOClient.deployAppPackage(spoToken, appID);
    context.addSummary(DeployProgressMessage.Deploy());
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
      throw new FileNotFoundError(Constants.DeployDriverName, solutionConfigPath);
    }
    const solutionConfig = await fs.readJson(solutionConfigPath);
    const sharepointFolder = path.dirname(solutionConfigPath).replace("config", "sharepoint");
    return path.resolve(sharepointFolder, solutionConfig.paths.zippedPackage);
  }

  public async getAppID(solutionConfigPath: string): Promise<string> {
    if (!(await fs.pathExists(solutionConfigPath))) {
      throw new FileNotFoundError(Constants.DeployDriverName, solutionConfigPath);
    }
    const solutionConfig = await fs.readJson(solutionConfigPath);
    const appID = solutionConfig["solution"]["id"];
    return appID;
  }
}
