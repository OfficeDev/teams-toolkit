// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  Colors,
  err,
  FxError,
  InputsWithProjectPath,
  ok,
  Platform,
  PluginContext,
  Result,
  UserCancelError,
} from "@microsoft/teamsfx-api";
import axios from "axios";
import * as fs from "fs-extra";
import * as path from "path";
import { getLocalizedString } from "../../../common/localizeUtils";
import { getSPFxToken, GraphScopes } from "../../../common/tools";
import { scaffoldSPFx } from "../../../component/code/spfxTabCode";
import {
  BuildSPPackageError,
  CreateAppCatalogFailedError,
  GetGraphTokenFailedError,
  GetSPOTokenFailedError,
  GetTenantFailedError,
  InsufficientPermissionError,
  NoSPPackageError,
  UploadAppPackageFailedError,
} from "./error";
import { SPOClient } from "./spoClient";
import { Constants, DeployProgressMessage, PreDeployProgressMessage } from "./utils/constants";
import { ProgressHelper } from "./utils/progress-helper";
import { sleep, Utils } from "./utils/utils";

export class SPFxPluginImpl {
  public async postScaffold(ctx: PluginContext): Promise<Result<any, FxError>> {
    ctx.answers!.projectPath = ctx.root;
    const workingDir = path.resolve(ctx.root, "SPFx");
    return await scaffoldSPFx(ctx, ctx.answers! as InputsWithProjectPath, workingDir);
  }

  private async buildSPPackage(ctx: PluginContext): Promise<Result<any, FxError>> {
    const progressHandler = await ProgressHelper.startPreDeployProgressHandler(ctx.ui);
    if (ctx.answers?.platform === Platform.VSCode) {
      (ctx.logProvider as any).outputChannel.show();
    }
    try {
      const workspacePath = `${ctx.root}/SPFx`;
      await progressHandler?.next(PreDeployProgressMessage.NpmInstall);
      await Utils.execute(`npm install`, "SPFx", workspacePath, ctx.logProvider, true);
      const gulpCommand = await SPFxPluginImpl.findGulpCommand(workspacePath);
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

      const sharepointPackage = await this.getPackage(ctx.root);
      if (!(await fs.pathExists(sharepointPackage))) {
        throw NoSPPackageError(sharepointPackage);
      }

      const dir = path.normalize(path.parse(sharepointPackage).dir);

      if (ctx.answers?.platform === Platform.CLI) {
        const guidance = [
          {
            content: "Success: SharePoint package successfully built at ",
            color: Colors.BRIGHT_GREEN,
          },
          { content: dir, color: Colors.BRIGHT_MAGENTA },
        ];
        ctx.ui?.showMessage("info", guidance, false);
      } else {
        const guidance = getLocalizedString("plugins.spfx.buildNotice", dir);
        ctx.ui?.showMessage("info", guidance, false, "OK");
      }
      return ok(undefined);
    } catch (error) {
      await ProgressHelper.endPreDeployProgress(false);
      return err(BuildSPPackageError(error));
    }
  }

  public async preDeploy(ctx: PluginContext): Promise<Result<any, FxError>> {
    return this.buildSPPackage(ctx);
  }

  public async deploy(ctx: PluginContext): Promise<Result<any, FxError>> {
    const progressHandler = await ProgressHelper.startDeployProgressHandler(ctx.ui);
    let success = false;
    try {
      const tenant = await this.getTenant(ctx);
      if (tenant.isErr()) {
        return tenant;
      }
      SPOClient.setBaseUrl(tenant.value);

      const spoToken = await getSPFxToken(ctx.m365TokenProvider!);
      if (!spoToken) {
        return err(GetSPOTokenFailedError());
      }

      let appCatalogSite = await SPOClient.getAppCatalogSite(spoToken);
      if (appCatalogSite) {
        SPOClient.setBaseUrl(appCatalogSite);
      } else {
        const res = await ctx.ui?.showMessage(
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
                  new Error(getLocalizedString("plugins.spfx,cannotGetAppcatalog"))
                )
              );
            }
            break;
          case Constants.READ_MORE:
            ctx.ui?.openUrl(Constants.CREATE_APP_CATALOG_GUIDE);
            return ok(UserCancelError);
          default:
            return ok(undefined);
        }
      }

      const appPackage = await this.getPackage(ctx.root);
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
          ctx.ui?.showMessage(
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

      const appID = await this.getAppID(ctx.root);
      await SPOClient.deployAppPackage(spoToken, appID);

      const guidance = getLocalizedString(
        "plugins.spfx.deployNotice",
        appPackage,
        appCatalogSite,
        appCatalogSite
      );
      if (ctx.answers?.platform === Platform.CLI) {
        ctx.ui?.showMessage("info", guidance, false);
      } else {
        ctx.ui?.showMessage("info", guidance, false, "OK");
      }
      success = true;
      return ok(undefined);
    } finally {
      await ProgressHelper.endDeployProgress(success);
    }
  }

  private async getTenant(ctx: PluginContext): Promise<Result<string, FxError>> {
    const graphTokenRes = await ctx.m365TokenProvider?.getAccessToken({ scopes: GraphScopes });
    const graphToken = graphTokenRes?.isOk() ? graphTokenRes.value : undefined;
    if (!graphToken) {
      return err(GetGraphTokenFailedError());
    }

    const graphTokenJsonRes = await ctx.m365TokenProvider?.getJsonObject({ scopes: GraphScopes });
    const tokenJson = graphTokenJsonRes?.isOk() ? graphTokenJsonRes.value : undefined;
    const username = (tokenJson as any).unique_name;

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

  private async getPackage(root: string): Promise<string> {
    const solutionConfig = await fs.readJson(`${root}/SPFx/config/package-solution.json`);
    const sharepointPackage = `${root}/SPFx/sharepoint/${solutionConfig.paths.zippedPackage}`;
    return sharepointPackage;
  }

  private async getAppID(root: string): Promise<string> {
    const solutionConfig = await fs.readJson(`${root}/SPFx/config/package-solution.json`);
    const appID = solutionConfig["solution"]["id"];
    return appID;
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
}
