import { MANIFEST_LOCAL, MANIFEST_TEMPLATE } from "../../appstudio/constants";
import {
  BuildSPPackageError,
  CreateAppCatalogFailedError,
  GetGraphTokenFailedError,
  GetSPOTokenFailedError,
  GetTenantFailedError,
  InsufficientPermissionError,
  NoSPPackageError,
  ScaffoldError,
  UploadAppPackageFailedError,
} from "../error";
import {
  Constants,
  DeployProgressMessage,
  PlaceHolders,
  PreDeployProgressMessage,
} from "../utils/constants";
import lodash from "lodash";
import { SPFXQuestionNames } from "../utils/questions";
import { sleep, Utils } from "../utils/utils";
import path from "path";
import fs from "fs-extra";
import {
  Colors,
  err,
  FxError,
  ok,
  Platform,
  Result,
  TokenProvider,
  UserCancelError,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import { ProgressHelper } from "../utils/progress-helper";
import { SPOClient } from "../spoClient";
import axios from "axios";
import { getTemplatesFolder } from "../../../../folder";
import {
  getAppDirectory,
  getSPFxTenant,
  getSPFxToken,
  GraphReadUserScopes,
  GraphScopes,
  SPFxScopes,
} from "../../../../common/tools";
import { getLocalizedString } from "../../../../common/localizeUtils";

export class SPFxPluginImpl {
  async scaffold(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath,
    componentId: string
  ): Promise<Result<any, FxError>> {
    try {
      const webpartName = inputs[SPFXQuestionNames.webpart_name] as string;
      const componentName = Utils.normalizeComponentName(webpartName);
      const componentNameCamelCase = lodash.camelCase(componentName);
      const componentClassName = `${componentName}WebPart`;
      const componentStrings = componentClassName + "Strings";
      const libraryName = lodash.kebabCase(ctx.projectSetting?.appName);
      let componentAlias = componentClassName;
      if (componentClassName.length > Constants.MAX_ALIAS_LENGTH) {
        componentAlias = componentClassName.substring(0, Constants.MAX_ALIAS_LENGTH);
      }
      let componentClassNameKebabCase = lodash.kebabCase(componentClassName);
      if (componentClassNameKebabCase.length > Constants.MAX_BUNDLE_NAME_LENGTH) {
        componentClassNameKebabCase = componentClassNameKebabCase.substring(
          0,
          Constants.MAX_BUNDLE_NAME_LENGTH
        );
        const lastCharacterIndex = componentClassNameKebabCase.length - 1;
        if (componentClassNameKebabCase[lastCharacterIndex] === "-") {
          componentClassNameKebabCase = componentClassNameKebabCase.substring(
            0,
            lastCharacterIndex
          );
        }
      }

      const outputFolderPath = `${inputs.projectPath}/SPFx`;
      await fs.mkdir(outputFolderPath);

      // teams folder
      const teamsDir = `${outputFolderPath}/teams`;

      const templateFolder = path.join(getTemplatesFolder(), "plugins", "resource", "spfx");

      await fs.mkdir(teamsDir);
      await fs.copyFile(
        path.resolve(templateFolder, "./webpart/base/images/color.png"),
        `${teamsDir}/${componentId}_color.png`
      );
      await fs.copyFile(
        path.resolve(templateFolder, "./webpart/base/images/outline.png"),
        `${teamsDir}/${componentId}_outline.png`
      );

      // src folder
      const srcDir = `${outputFolderPath}/src`;
      await fs.mkdir(srcDir);
      await fs.copyFile(
        path.resolve(templateFolder, "./solution/src/index.ts"),
        `${srcDir}/index.ts`
      );

      switch (inputs[SPFXQuestionNames.framework_type] as string) {
        case Constants.FRAMEWORK_NONE:
          fs.mkdirSync(`${srcDir}/webparts/${componentNameCamelCase}`, {
            recursive: true,
          });
          await fs.copyFile(
            path.resolve(templateFolder, "./webpart/none/{componentClassName}.module.scss"),
            `${srcDir}/webparts/${componentNameCamelCase}/${componentClassName}.module.scss`
          );
          await fs.copyFile(
            path.resolve(templateFolder, "./webpart/none/{componentClassName}.ts"),
            `${srcDir}/webparts/${componentNameCamelCase}/${componentClassName}.ts`
          );
          await fs.copyFile(
            path.resolve(templateFolder, "./webpart/none/package.json"),
            `${outputFolderPath}/package.json`
          );
          break;
        case Constants.FRAMEWORK_REACT:
          const componentDir = `${srcDir}/webparts/${componentNameCamelCase}/components`;
          fs.mkdirSync(componentDir, { recursive: true });
          await fs.copyFile(
            path.resolve(templateFolder, "./webpart/react/{componentClassName}.ts"),
            `${srcDir}/webparts/${componentNameCamelCase}/${componentClassName}.ts`
          );
          await fs.copyFile(
            path.resolve(templateFolder, "./webpart/react/components/{componentName}.module.scss"),
            `${componentDir}/${componentName}.module.scss`
          );
          await fs.copyFile(
            path.resolve(templateFolder, "./webpart/react/components/{componentName}.tsx"),
            `${componentDir}/${componentName}.tsx`
          );
          await fs.copyFile(
            path.resolve(templateFolder, "./webpart/react/components/I{componentName}Props.ts"),
            `${componentDir}/I${componentName}Props.ts`
          );
          await fs.copyFile(
            path.resolve(templateFolder, "./webpart/react/package.json"),
            `${outputFolderPath}/package.json`
          );
          break;
      }

      await fs.copy(
        path.resolve(templateFolder, "./webpart/base/loc"),
        `${srcDir}/webparts/${componentNameCamelCase}/loc`
      );
      await fs.copy(
        path.resolve(templateFolder, "./webpart/base/{componentClassName}.manifest.json"),
        `${srcDir}/webparts/${componentNameCamelCase}/${componentClassName}.manifest.json`
      );

      // config folder
      await fs.copy(
        path.resolve(templateFolder, "./solution/config"),
        `${outputFolderPath}/config`
      );

      // Other files
      await fs.copyFile(
        path.resolve(templateFolder, "./solution/README.md"),
        `${outputFolderPath}/README.md`
      );
      await fs.copyFile(
        path.resolve(templateFolder, "./solution/_gitignore"),
        `${outputFolderPath}/.gitignore`
      );
      await fs.copyFile(
        path.resolve(templateFolder, "./solution/gulpfile.js"),
        `${outputFolderPath}/gulpfile.js`
      );
      await fs.copyFile(
        path.resolve(templateFolder, "./solution/tsconfig.json"),
        `${outputFolderPath}/tsconfig.json`
      );
      await fs.copyFile(
        path.resolve(templateFolder, "./solution/tslint.json"),
        `${outputFolderPath}/tslint.json`
      );

      // Configure placeholders
      const replaceMap: Map<string, string> = new Map();
      replaceMap.set(PlaceHolders.componentName, componentName);
      replaceMap.set(PlaceHolders.componentNameCamelCase, componentNameCamelCase);
      replaceMap.set(PlaceHolders.componentClassName, componentClassName);
      replaceMap.set(PlaceHolders.componentStrings, componentStrings);
      replaceMap.set(PlaceHolders.libraryName, libraryName);
      replaceMap.set(PlaceHolders.componentId, componentId);
      replaceMap.set(PlaceHolders.componentAlias, componentAlias);
      replaceMap.set(
        PlaceHolders.componentDescription,
        inputs[SPFXQuestionNames.webpart_desp] as string
      );
      replaceMap.set(PlaceHolders.componentNameUnescaped, webpartName);
      replaceMap.set(PlaceHolders.componentClassNameKebabCase, componentClassNameKebabCase);

      const appDirectory = await getAppDirectory(inputs.projectPath);
      await Utils.configure(outputFolderPath, replaceMap);
      await Utils.configure(path.join(appDirectory, MANIFEST_TEMPLATE), replaceMap);
      await Utils.configure(path.join(appDirectory, MANIFEST_LOCAL), replaceMap);
      return ok(undefined);
    } catch (error) {
      return err(ScaffoldError(error as Error));
    }
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

  async deploy(
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
