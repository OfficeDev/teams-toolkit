// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  PluginContext,
  ConfigFolderName,
  FxError,
  Result,
  ok,
  Platform,
  Colors,
} from "@microsoft/teamsfx-api";
import * as uuid from "uuid";
import lodash from "lodash";
import * as fs from "fs-extra";
import * as path from "path";
import { SPFXQuestionNames } from ".";
import { Utils } from "./utils/utils";
import { Constants, PlaceHolders, PreDeployProgressMessage } from "./utils/constants";
import { BuildSPPackageError, NoSPPackageError } from "./error";
import * as util from "util";
import { ProgressHelper } from "./utils/progress-helper";
import { getStrings } from "../../../common/tools";
import { getTemplatesFolder } from "../../..";
import { REMOTE_MANIFEST } from "../appstudio/constants";

export class SPFxPluginImpl {
  public async postScaffold(ctx: PluginContext): Promise<Result<any, FxError>> {
    const webpartName = ctx.answers![SPFXQuestionNames.webpart_name] as string;
    const componentName = Utils.normalizeComponentName(webpartName);
    const componentNameCamelCase = lodash.camelCase(componentName);
    const componentId = uuid.v4();
    const componentClassName = `${componentName}WebPart`;
    const componentStrings = componentClassName + "Strings";
    const libraryName = lodash.kebabCase(ctx.projectSettings?.appName);
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
        componentClassNameKebabCase = componentClassNameKebabCase.substring(0, lastCharacterIndex);
      }
    }

    const outputFolderPath = `${ctx.root}/SPFx`;
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

    switch (ctx.answers![SPFXQuestionNames.framework_type] as string) {
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
    await fs.copy(path.resolve(templateFolder, "./solution/config"), `${outputFolderPath}/config`);

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
      ctx.answers![SPFXQuestionNames.webpart_desp] as string
    );
    replaceMap.set(PlaceHolders.componentNameUnescaped, webpartName);
    replaceMap.set(PlaceHolders.componentClassNameKebabCase, componentClassNameKebabCase);

    await Utils.configure(outputFolderPath, replaceMap);
    await Utils.configure(`${ctx.root}/.${ConfigFolderName}/${REMOTE_MANIFEST}`, replaceMap);
    return ok(undefined);
  }

  private async buildSPPackge(ctx: PluginContext): Promise<Result<any, FxError>> {
    const progressHandler = await ProgressHelper.startPreDeployProgressHandler(ctx);
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
      await ProgressHelper.endPreDeployProgress();

      const solutionConfig = await fs.readJson(`${ctx.root}/SPFx/config/package-solution.json`);
      const sharepointPackage = `${ctx.root}/SPFx/sharepoint/${solutionConfig.paths.zippedPackage}`;
      const fileExists = await this.checkFileExist(sharepointPackage);
      if (!fileExists) {
        throw NoSPPackageError(sharepointPackage);
      }

      const dir = path.normalize(path.parse(sharepointPackage).dir);
      const fileName = path.parse(sharepointPackage).name + path.parse(sharepointPackage).ext;

      if (ctx.answers?.platform === Platform.CLI) {
        const guidance = [
          {
            content: "[Teams Toolkit] SharePoint package successfully built at ",
            color: Colors.BRIGHT_GREEN,
          },
          { content: dir, color: Colors.BRIGHT_MAGENTA },
          { content: " Visit Microsoft Admin Center: ", color: Colors.BRIGHT_GREEN },
          { content: "https://admin.microsoft.com", color: Colors.BRIGHT_CYAN },
          {
            content: " and go to your tenant's SharePoint App Catalog site to upload the ",
            color: Colors.BRIGHT_GREEN,
          },
          { content: fileName, color: Colors.BRIGHT_MAGENTA },
          {
            content: " Follow instructions to learn more about deploy to SharePoint: ",
            color: Colors.BRIGHT_GREEN,
          },
          { content: Constants.DEPLOY_GUIDE, color: Colors.BRIGHT_CYAN },
        ];
        ctx.ui?.showMessage("info", guidance, false);
      } else {
        const guidance = util.format(getStrings().plugins.SPFx.deployNotice, dir, fileName);
        ctx.ui?.showMessage("info", guidance, false, "OK", Constants.READ_MORE).then((answer) => {
          if (answer.isOk() && answer.value === Constants.READ_MORE) {
            ctx.ui?.openUrl(Constants.DEPLOY_GUIDE);
          }
        });
      }
      return ok(undefined);
    } catch (error) {
      await ProgressHelper.endPreDeployProgress();
      throw BuildSPPackageError(error);
    }
  }

  public async preDeploy(ctx: PluginContext): Promise<Result<any, FxError>> {
    const confirmRes = await ctx.ui?.showMessage(
      "warn",
      getStrings().plugins.SPFx.buildNotice,
      true,
      Constants.BUILD_SHAREPOINT_PACKAGE,
      Constants.READ_MORE
    );
    const confirm = confirmRes?.isOk() ? confirmRes.value : undefined;
    switch (confirm) {
      case Constants.BUILD_SHAREPOINT_PACKAGE:
        return this.buildSPPackge(ctx);
      case Constants.READ_MORE:
        ctx.ui?.openUrl(Constants.DEPLOY_GUIDE);
      default:
        return ok(undefined);
    }
  }

  public async deploy(ctx: PluginContext): Promise<Result<any, FxError>> {
    return ok(undefined);
  }

  private async checkFileExist(filePath: string): Promise<boolean> {
    try {
      await fs.stat(filePath);
      return true;
    } catch (error) {
      return false;
    }
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
