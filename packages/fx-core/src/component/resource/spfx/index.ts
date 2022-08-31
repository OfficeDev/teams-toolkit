// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
  CloudResource,
  Colors,
  err,
  FxError,
  InputsWithProjectPath,
  ok,
  Platform,
  ResourceContextV3,
  Result,
  TokenProvider,
  UserCancelError,
  v2,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import {
  BuildSPPackageError,
  CreateAppCatalogFailedError,
  GetGraphTokenFailedError,
  GetSPOTokenFailedError,
  GetTenantFailedError,
  InsufficientPermissionError,
  NoSPPackageError,
  UploadAppPackageFailedError,
} from "../../../plugins/resource/spfx/error";
import {
  Constants,
  DeployProgressMessage,
  PreDeployProgressMessage,
} from "../../../plugins/resource/spfx/utils/constants";
import { ProgressHelper } from "../../../plugins/resource/spfx/utils/progress-helper";
import { sleep, Utils } from "../../../plugins/resource/spfx/utils/utils";
import { ComponentNames } from "../../constants";
import { ActionExecutionMW } from "../../middleware/actionExecutionMW";
import path from "path";
import fs from "fs-extra";
import { SPOClient } from "../../../plugins/resource/spfx/spoClient";
import { getSPFxToken, GraphScopes } from "../../../common";
import { getLocalizedString } from "../../../common/localizeUtils";
import axios from "axios";

@Service(ComponentNames.SPFx)
export class SpfxResource implements CloudResource {
  readonly name = ComponentNames.SPFx;
  outputs = {};
  finalOutputKeys = [];
  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: "fx-resource-spfx",
      telemetryEventName: "deploy",
      errorSource: "SPFx",
    }),
  ])
  async deploy(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    const buildRes = await this.buildSPPackage(context, inputs);
    if (buildRes.isErr()) {
      return err(buildRes.error);
    }
    const deployRes = await this._deploy(context, inputs, context.tokenProvider!);
    if (deployRes.isErr()) {
      return err(deployRes.error);
    }
    return ok(undefined);
  }

  async buildSPPackage(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<any, FxError>> {
    const progressHandler = await ProgressHelper.startPreDeployProgressHandler(ctx.userInteraction);
    if (inputs.platform === Platform.VSCode) {
      (ctx.logProvider as any).outputChannel.show();
    }
    try {
      const workspacePath = `${inputs.projectPath}/SPFx`;
      await progressHandler?.next(PreDeployProgressMessage.NpmInstall);
      await Utils.execute(`npm install`, "SPFx", workspacePath, ctx.logProvider, true);
      const gulpCommand = await SpfxResource.findGulpCommand(workspacePath);
      await progressHandler?.next(PreDeployProgressMessage.GulpBundle);
      await Utils.execute(
        `${gulpCommand} bundle --ship --no-color`,
        "SPFx",
        workspacePath,
        ctx.logProvider,
        true
      );
      await progressHandler?.next(PreDeployProgressMessage.GulpPackage);
      await Utils.execute(
        `${gulpCommand} package-solution --ship --no-color`,
        "SPFx",
        workspacePath,
        ctx.logProvider,
        true
      );
      await ProgressHelper.endPreDeployProgress(true);

      const sharepointPackage = await this.getPackage(inputs.projectPath);
      if (!(await fs.pathExists(sharepointPackage))) {
        throw NoSPPackageError(sharepointPackage);
      }

      const dir = path.normalize(path.parse(sharepointPackage).dir);

      if (inputs.platform === Platform.CLI) {
        const guidance = [
          {
            content: "Success: SharePoint package successfully built at ",
            color: Colors.BRIGHT_GREEN,
          },
          { content: dir, color: Colors.BRIGHT_MAGENTA },
        ];
        ctx.userInteraction.showMessage("info", guidance, false);
      } else {
        const guidance = getLocalizedString("plugins.spfx.buildNotice", dir);
        ctx.userInteraction?.showMessage("info", guidance, false, "OK");
      }
      return ok(undefined);
    } catch (error) {
      await ProgressHelper.endPreDeployProgress(false);
      return err(BuildSPPackageError(error as Error));
    }
  }

  async _deploy(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    tokenProvider: TokenProvider
  ): Promise<Result<any, FxError>> {
    const progressHandler = await ProgressHelper.startDeployProgressHandler(ctx.userInteraction);
    let success = false;
    try {
      const tenant = await this.getTenant(tokenProvider);
      if (tenant.isErr()) {
        return tenant;
      }
      SPOClient.setBaseUrl(tenant.value);

      const spoToken = await getSPFxToken(tokenProvider.m365TokenProvider);
      if (!spoToken) {
        return err(GetSPOTokenFailedError());
      }

      let appCatalogSite = await SPOClient.getAppCatalogSite(spoToken);
      if (appCatalogSite) {
        SPOClient.setBaseUrl(appCatalogSite);
      } else {
        const res = await ctx.userInteraction?.showMessage(
          "warn",
          getLocalizedString("plugins.spfx.createAppCatalogNotice", tenant.value),
          true,
          "OK",
          Constants.READ_MORE
        );
        const confirm = res?.isOk() ? res.value : undefined;
        switch (confirm) {
          case "OK":
            try {
              await progressHandler?.next(DeployProgressMessage.CreateSPAppCatalog);
              await SPOClient.createAppCatalog(spoToken);
            } catch (e: any) {
              return err(CreateAppCatalogFailedError(e));
            }
            let retry = 0;
            appCatalogSite = await SPOClient.getAppCatalogSite(spoToken);
            while (appCatalogSite == null && retry < Constants.APP_CATALOG_MAX_TIMES) {
              ctx.logProvider?.warning(`No tenant app catalog found, retry: ${retry}`);
              await sleep(Constants.APP_CATALOG_REFRESH_TIME);
              appCatalogSite = await SPOClient.getAppCatalogSite(spoToken);
              retry += 1;
            }
            if (appCatalogSite) {
              SPOClient.setBaseUrl(appCatalogSite);
              ctx.logProvider?.info(
                `Sharepoint tenant app catalog ${appCatalogSite} created, wait for a few minutes to be active.`
              );
              await sleep(Constants.APP_CATALOG_ACTIVE_TIME);
            } else {
              return err(
                CreateAppCatalogFailedError(
                  new Error(
                    "Cannot get app catalog site url after creation. You may need wait a few minutes and retry."
                  )
                )
              );
            }
            break;
          case Constants.READ_MORE:
            ctx.userInteraction?.openUrl(Constants.CREATE_APP_CATALOG_GUIDE);
            return ok(UserCancelError);
          default:
            return ok(undefined);
        }
      }

      const appPackage = await this.getPackage(inputs.projectPath);
      if (!(await fs.pathExists(appPackage))) {
        return err(NoSPPackageError(appPackage));
      }

      const fileName = path.parse(appPackage).base;
      const bytes = await fs.readFile(appPackage);
      try {
        await progressHandler?.next(DeployProgressMessage.UploadAndDeploy);
        await SPOClient.uploadAppPackage(spoToken, fileName, bytes);
      } catch (e: any) {
        if (e.response?.status === 403) {
          ctx.userInteraction?.showMessage(
            "error",
            getLocalizedString("plugins.spfx.deployFailedNotice", appCatalogSite!),
            false,
            "OK"
          );
          return err(InsufficientPermissionError(appCatalogSite!));
        } else {
          return err(UploadAppPackageFailedError(e));
        }
      }

      const appID = await this.getAppID(inputs.projectPath);
      await SPOClient.deployAppPackage(spoToken, appID);
      const guidance = getLocalizedString(
        "plugins.spfx.deployNotice",
        appPackage,
        appCatalogSite,
        appCatalogSite
      );
      if (inputs.platform === Platform.CLI) {
        ctx.userInteraction?.showMessage("info", guidance, false);
      } else {
        ctx.userInteraction?.showMessage("info", guidance, false, "OK");
      }
      success = true;
      return ok(undefined);
    } finally {
      await ProgressHelper.endDeployProgress(success);
    }
  }

  private async getAppID(root: string): Promise<string> {
    const solutionConfig = await fs.readJson(`${root}/SPFx/config/package-solution.json`);
    const appID = solutionConfig["solution"]["id"];
    return appID;
  }

  private async getTenant(tokenProvider: TokenProvider): Promise<Result<string, FxError>> {
    const graphTokenRes = await tokenProvider.m365TokenProvider?.getAccessToken({
      scopes: GraphScopes,
    });
    const graphToken = graphTokenRes.isOk() ? graphTokenRes.value : undefined;
    if (!graphToken) {
      return err(GetGraphTokenFailedError());
    }

    const tokenJsonRes = await tokenProvider.m365TokenProvider?.getJsonObject({
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
        return err(GetTenantFailedError(username));
      }
    } catch (e) {
      return err(GetTenantFailedError(username, e));
    }
    return ok(tenant);
  }

  private static async findGulpCommand(rootPath: string): Promise<string> {
    let gulpCommand: string;
    const platform = process.platform;
    if (
      platform === "win32" &&
      (await fs.pathExists(path.join(rootPath, "node_modules", ".bin", "gulp.cmd")))
    ) {
      gulpCommand = path.join(".", "node_modules", ".bin", "gulp.cmd");
    } else if (
      (platform === "linux" || platform === "darwin") &&
      (await fs.pathExists(path.join(rootPath, "node_modules", ".bin", "gulp")))
    ) {
      gulpCommand = path.join(".", "node_modules", ".bin", "gulp");
    } else {
      gulpCommand = "gulp";
    }
    return gulpCommand;
  }

  private async getPackage(root: string): Promise<string> {
    const solutionConfig = await fs.readJson(`${root}/SPFx/config/package-solution.json`);
    const sharepointPackage = `${root}/SPFx/sharepoint/${solutionConfig.paths.zippedPackage}`;
    return sharepointPackage;
  }
}
