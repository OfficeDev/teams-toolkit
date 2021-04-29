// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  PluginContext,
  ConfigFolderName,
  FxError,
  Result,
  ok,
  DialogMsg,
  DialogType,
  MsgLevel,
  QuestionType,
} from "fx-api";
import * as uuid from "uuid";
import lodash from "lodash";
import * as fs from "fs-extra";
import * as path from "path";
import { SpfxConfig } from ".";
import {
  configure,
  createAxiosInstanceWithToken,
  execute,
  normalizeComponentName,
  sleep,
} from "./utils/utils";
import { Constants, DeployProgressMessage, PlaceHolders, PreDeployProgressMessage } from "./utils/constants";
import { AuthCode } from "./authCode";
import * as util from "util";
import { BuildSPPackageError, DeploySPPackageError, EmptyAccessTokenError, EnsureAppCatalogFailedError, MultiSPPackageError, NoAppCatalogError, NoSPPackageError, SPFxDeployError, UploadSPPackageError } from "./error";
import { ProgressHelper } from "./utils/progress-helper";
import { REMOTE_MANIFEST } from "../../solution/fx-solution/constants";

export class SPFxPluginImpl {
  public async scaffold(
    ctx: PluginContext,
    config: SpfxConfig
  ): Promise<Result<any, FxError>> {
    const componentName = normalizeComponentName(config.webpartName);
    const componentNameCamelCase = lodash.camelCase(componentName);
    const componentId = uuid.v4();
    const componentClassName = `${componentName}WebPart`;
    const componentStrings = componentClassName + "Strings";
    const libraryName = lodash.kebabCase(ctx.projectSettings?.appName);
    let componentAlias = componentClassName;
    if (componentClassName.length > Constants.MAX_ALIAS_LENGTH) {
      componentAlias = componentClassName.substring(
        0,
        Constants.MAX_ALIAS_LENGTH
      );
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

    const outputFolderPath = `${ctx.root}/SPFx`;
    await fs.mkdir(outputFolderPath);

    // teams folder
    const teamsDir = `${outputFolderPath}/teams`;

    const templateFolder = path.join(__dirname, "../../../../templates/plugins/resource/spfx");

    await fs.mkdir(teamsDir);
    await fs.copyFile(
      path.resolve(templateFolder, "./webpart/base/images/color.png"),
      `${teamsDir}/color.png`
    );
    await fs.copyFile(
      path.resolve(templateFolder, "./webpart/base/images/outline.png"),
      `${teamsDir}/outline.png`
    );

    // src folder
    const srcDir = `${outputFolderPath}/src`;
    await fs.mkdir(srcDir);
    await fs.copyFile(
      path.resolve(templateFolder, "./solution/src/index.ts"),
      `${srcDir}/index.ts`
    );

    switch (config.framework) {
      case Constants.FRAMEWORK_NONE:
        fs.mkdirSync(`${srcDir}/webparts/${componentNameCamelCase}`, {
          recursive: true,
        });
        await fs.copyFile(
          path.resolve(
            templateFolder,
            "./webpart/none/{componentClassName}.module.scss"
          ),
          `${srcDir}/webparts/${componentNameCamelCase}/${componentClassName}.module.scss`
        );
        await fs.copyFile(
          path.resolve(
            templateFolder,
            "./webpart/none/{componentClassName}.ts"
          ),
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
          path.resolve(
            templateFolder,
            "./webpart/react/{componentClassName}.ts"
          ),
          `${srcDir}/webparts/${componentNameCamelCase}/${componentClassName}.ts`
        );
        await fs.copyFile(
          path.resolve(
            templateFolder,
            "./webpart/react/components/{componentName}.module.scss"
          ),
          `${componentDir}/${componentName}.module.scss`
        );
        await fs.copyFile(
          path.resolve(
            templateFolder,
            "./webpart/react/components/{componentName}.tsx"
          ),
          `${componentDir}/${componentName}.tsx`
        );
        await fs.copyFile(
          path.resolve(
            templateFolder,
            "./webpart/react/components/I{componentName}Props.ts"
          ),
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
      path.resolve(
        templateFolder,
        "./webpart/base/{componentClassName}.manifest.json"
      ),
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
      path.resolve(templateFolder, "./solution/_editorconfig"),
      `${outputFolderPath}/.editorconfig`
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
    replaceMap.set(PlaceHolders.componentDescription, config.webpartDesc);
    replaceMap.set(PlaceHolders.componentNameUnescaped, config.webpartName);
    replaceMap.set(
      PlaceHolders.componentClassNameKebabCase,
      componentClassNameKebabCase
    );

    await configure(outputFolderPath, replaceMap);
    await configure(`${ctx.root}/.${ConfigFolderName}/${REMOTE_MANIFEST}`, replaceMap);
    return ok(undefined);
  }

  public async preDeploy(ctx: PluginContext): Promise<Result<any, FxError>> {
    await ctx.dialog?.communicate(
      new DialogMsg(DialogType.Show, {
        description: "[SPFx] Ensuring Tenant App Catalog.",
        level: MsgLevel.Info,
      })
    );
    if (!AuthCode.account) {
      await AuthCode.login(ctx);
    }
    const tenant = await this.getSPTenant(ctx);
    // Ensure Tenant App catalog and create one if no existing one.
    ctx.logProvider?.info("======Ensure SharePoint App Catatlog======");
    const accessToken = await AuthCode.getToken(ctx, [`${tenant}/.default`]);
    const axiosInstance = createAxiosInstanceWithToken(accessToken);
    try {
      await axiosInstance.post(
        `${tenant}/_api/web/EnsureTenantAppCatalog(callerId='${Constants.CALLED_ID}')`
      );
    } catch (error) {
      throw EnsureAppCatalogFailedError(error);
    }

    const progressHandler = await ProgressHelper.startPreDeployProgressHandler(ctx);
    try {
      const workspacePath = `${ctx.root}/SPFx`;
      await progressHandler?.next(PreDeployProgressMessage.NpmInstall);
      await execute(
        `npm install`,
        "SPFx",
        workspacePath,
        ctx.logProvider,
        true
      );
      const gulpCommand = await SPFxPluginImpl.findGulpCommand(workspacePath);
      await progressHandler?.next(PreDeployProgressMessage.GulpBundle);
      await execute(
        `${gulpCommand} bundle --ship --no-color`,
        "SPFx",
        workspacePath,
        ctx.logProvider,
        true
      );
      await progressHandler?.next(PreDeployProgressMessage.GulpPackage);
      await execute(
        `${gulpCommand} package-solution --ship --no-color`,
        "SPFx",
        workspacePath,
        ctx.logProvider,
        true
      );
      await ProgressHelper.endPreDeployProgress();
      await ctx.dialog?.communicate(
        new DialogMsg(DialogType.Show, {
          description: "[SPFx] SharePoint Package Build Success.",
          level: MsgLevel.Info,
        })
      );
      return ok(undefined);
    } catch (error) {
      await ProgressHelper.endPreDeployProgress();
      throw BuildSPPackageError(error);
    }
  }

  public async deploy(ctx: PluginContext): Promise<Result<any, FxError>> {
    try {
      const workspace = `${ctx.root}/SPFx`;
      const progressHandler = await ProgressHelper.startDeployProgressHandler(ctx);
      const tenant = await this.getSPTenant(ctx);

      const accessToken = await AuthCode.getToken(ctx, [`${tenant}/.default`]);
      const axiosInstance = createAxiosInstanceWithToken(accessToken);

      await progressHandler?.next(DeployProgressMessage.GetSPAppCatalog);
      const SHAREPOINT_APP_CATALOG = `${tenant}/_api/SP_TenantSettings_Current`;
      const response = await axiosInstance.get(SHAREPOINT_APP_CATALOG);
      let appCatalogSite = response.data.CorporateCatalogUrl;
      let refreshTime = 0;
      while (appCatalogSite == null) {
        await sleep(Constants.APP_CATALOG_REFRESH_TIME);
        const response = await axiosInstance.get(SHAREPOINT_APP_CATALOG);
        appCatalogSite = response.data.CorporateCatalogUrl;
        refreshTime += 1;
        if (refreshTime > Constants.APP_CATALOG_MAX_TIMES) {
          throw NoAppCatalogError(tenant);
        }
      }

      const distFolder = `${workspace}/sharepoint/solution`;
      const distFiles = await fs.readdir(distFolder);
      const files = distFiles.filter((x) => x.endsWith(".sppkg"));
      const solutionConfig = await fs.readJson(
        `${workspace}/config/package-solution.json`
      );
      const appID = solutionConfig["solution"]["id"];
      switch (files.length) {
        case 0:
          throw NoSPPackageError(distFolder);
        case 1:
          const file = await fs.readFile(`${distFolder}/${files[0]}`);
          try {
            // Upload SPFx Package.
            await progressHandler?.next(DeployProgressMessage.UploadAndDeploy);
            await axiosInstance.post(
              `${appCatalogSite}/_api/web/tenantappcatalog/Add(overwrite=true, url='${files[0]}')`,
              file
            );
          }
          catch (error) {
            throw UploadSPPackageError(error);
          }

          try {
            // Deploy SPFx App.
            const deploySetting = { skipFeatureDeployment: true };
            await axiosInstance.post(
              `${appCatalogSite}/_api/web/tenantappcatalog/AvailableApps/GetById('${appID}')/Deploy`,
              deploySetting
            );
          }
          catch (error) {
            throw DeploySPPackageError(error);
          }

          await ProgressHelper.endDeployProgress();
          const appCatalogButton = "Go to SharePoint App Catalog";
          ctx.dialog
            ?.communicate(
              new DialogMsg(DialogType.Show, {
                description: util.format(
                  "[SPFx] %s has been deployed to %s",
                  files[0],
                  appCatalogSite,
                ),
                level: MsgLevel.Info,
                items: [appCatalogButton],
              }),
            )
            .then(async (selected) => {
              if (selected?.content === appCatalogButton) {
                await ctx.dialog?.communicate(
                  new DialogMsg(DialogType.Ask, {
                    description: appCatalogSite,
                    type: QuestionType.OpenExternal,
                  }),
                );
              }
            });
          return ok(undefined);
        default:
          throw MultiSPPackageError(distFolder);
      }
    }
    catch (error) {
      await ProgressHelper.endDeployProgress();
      throw SPFxDeployError(error);
    }

  }

  private async getSPTenant(ctx: PluginContext): Promise<string> {
    const accessToken = await AuthCode.getToken(ctx, ["User.Read"]);
    const GRAPH_TENANT_ENDPT =
      "https://graph.microsoft.com/v1.0/sites/root?$select=webUrl";

    if (accessToken && accessToken.length > 0) {
      const axiosInstance = createAxiosInstanceWithToken(accessToken);
      ctx.logProvider?.info("======Get SharePoint Tenant======");
      const response = await axiosInstance.get(GRAPH_TENANT_ENDPT);
      return response.data.webUrl;
    } else {
      throw EmptyAccessTokenError();
    }
  }

  private static async findGulpCommand(rootPath: string): Promise<string> {
    let gulpCommand: string;
    const platform = process.platform;
    if (
      platform === "win32" &&
      (await fs.pathExists(
        path.join(rootPath, "node_modules", ".bin", "gulp.cmd")
      ))
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
