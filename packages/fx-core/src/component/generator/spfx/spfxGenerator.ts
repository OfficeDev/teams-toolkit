// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
  AppPackageFolderName,
  ContextV3,
  err,
  FxError,
  Inputs,
  IStaticTab,
  ok,
  Platform,
  Result,
  Stage,
  SystemError,
  TeamsAppManifest,
  UserError,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import fs from "fs-extra";
import { ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { ProgressHelper } from "./utils/progress-helper";
import { SPFXQuestionNames } from "./utils/questions";
import {
  ImportSPFxSolutionError,
  LatestPackageInstallError,
  RetrieveSPFxInfoError,
  ScaffoldError,
  YoGeneratorScaffoldError,
} from "./error";
import { Utils } from "./utils/utils";
import { camelCase } from "lodash";
import { Constants, ManifestTemplate } from "./utils/constants";
import { YoChecker } from "./depsChecker/yoChecker";
import { GeneratorChecker } from "./depsChecker/generatorChecker";
import { cpUtils } from "../../../common/deps-checker";
import { TelemetryEvents } from "./utils/telemetryEvents";
import { Generator } from "../generator";
import { CoreQuestionNames } from "../../../core/question";
import { getLocalizedString } from "../../../common/localizeUtils";
import { PackageSelectOptionsHelper, SPFxVersionOptionIds } from "./utils/question-helper";
import { SPFxQuestionNames } from "../../constants";
import * as util from "util";
import { envUtil } from "../../utils/envUtil";

export class SPFxGenerator {
  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: Constants.PLUGIN_DEV_NAME,
      telemetryEventName: TelemetryEvents.Generate,
      errorSource: Constants.PLUGIN_DEV_NAME,
    }),
  ])
  public static async generate(
    context: ContextV3,
    inputs: Inputs,
    destinationPath: string
  ): Promise<Result<undefined, FxError>> {
    if (inputs[SPFXQuestionNames.spfx_solution] === "new") {
      return await this.newSPFxProject(context, inputs, destinationPath);
    } else {
      return await this.importSPFxProject(context, inputs, destinationPath);
    }
  }

  private static async newSPFxProject(
    context: ContextV3,
    inputs: Inputs,
    destinationPath: string
  ): Promise<Result<undefined, FxError>> {
    const yeomanRes = await this.doYeomanScaffold(context, inputs, destinationPath);
    if (yeomanRes.isErr()) return err(yeomanRes.error);

    const templateRes = await Generator.generateTemplate(
      context,
      destinationPath,
      Constants.TEMPLATE_NAME,
      "ts"
    );
    if (templateRes.isErr()) return err(templateRes.error);

    return ok(undefined);
  }

  private static async importSPFxProject(
    context: ContextV3,
    inputs: Inputs,
    destinationPath: string
  ): Promise<Result<undefined, FxError>> {
    const importProgress = context.userInteraction.createProgressBar(
      getLocalizedString("plugins.spfx.import.title"),
      3
    );
    try {
      // Copy & paste existing SPFx solution
      await importProgress.start(
        getLocalizedString("plugins.spfx.import.copyExistingSPFxSolution")
      );
      const spfxFolder = inputs[SPFXQuestionNames.spfx_import_folder] as string;
      const destSpfxFolder = path.join(destinationPath, "src");
      await fs.ensureDir(destSpfxFolder);
      await fs.copy(spfxFolder, destSpfxFolder, {
        overwrite: true,
        recursive: true,
        filter: (file) => {
          return file.indexOf("node_modules") < 0;
        },
      });

      // Retrieve solution info to generate template
      await importProgress.next(getLocalizedString("plugins.spfx.import.generateSPFxTemplates"));
      const webpartManifest = await this.getWebpartManifest(spfxFolder);
      if (
        !webpartManifest ||
        !webpartManifest["id"] ||
        !webpartManifest["preconfiguredEntries"][0].title.default
      ) {
        throw RetrieveSPFxInfoError();
      }
      if (!context.templateVariables) {
        context.templateVariables = Generator.getDefaultVariables(
          inputs[CoreQuestionNames.AppName]
        );
      }
      context.templateVariables["componentId"] = webpartManifest["id"];
      context.templateVariables["webpartName"] =
        webpartManifest["preconfiguredEntries"][0].title.default;

      const templateRes = await Generator.generateTemplate(
        context,
        destinationPath,
        Constants.TEMPLATE_NAME,
        "ts"
      );
      if (templateRes.isErr()) throw templateRes.error;

      // Update manifest and related files
      await importProgress.next(getLocalizedString("plugins.spfx.import.updateTemplates"));
      const localManifest = (await fs.readJson(
        path.join(destinationPath, AppPackageFolderName, "manifest.local.json")
      )) as TeamsAppManifest;
      let remoteManifest = (await fs.readJson(
        path.join(destinationPath, AppPackageFolderName, "manifest.json")
      )) as TeamsAppManifest;

      const webpartsDir = path.join(spfxFolder, "src", "webparts");
      const webparts = (await fs.readdir(webpartsDir)).filter(async (file) =>
        (await fs.stat(file)).isDirectory()
      );
      if (webparts.length > 1) {
        for (let i = 1; i < webparts.length - 1; i++) {
          const webpart = webparts[i];
          const webpartManifestPath = path.join(
            webpartsDir,
            webpart,
            `${webpart.split(path.sep).pop()}WebPart.manifest.json`
          );
          if (!(await fs.pathExists(webpartManifestPath))) {
            continue;
          }

          const webpartManifest = await fs.readJson(webpartManifestPath);
          const componentId = webpartManifest["id"];
          const webpartName = webpartManifest["preconfiguredEntries"][0].title.default;
          const remoteStaticSnippet: IStaticTab = {
            entityId: componentId,
            name: webpartName,
            contentUrl: util.format(ManifestTemplate.REMOTE_CONTENT_URL, componentId),
            websiteUrl: ManifestTemplate.WEBSITE_URL,
            scopes: ["personal"],
          };
          const localStaticSnippet: IStaticTab = {
            entityId: componentId,
            name: webpartName,
            contentUrl: util.format(ManifestTemplate.LOCAL_CONTENT_URL, componentId),
            websiteUrl: ManifestTemplate.WEBSITE_URL,
            scopes: ["personal"],
          };
          localManifest.staticTabs?.push(localStaticSnippet);
          remoteManifest.staticTabs?.push(remoteStaticSnippet);
        }
      }

      if (await fs.pathExists(path.join(spfxFolder, "teams", "manifest.json"))) {
        const existingManifest = await fs.readJson(path.join(spfxFolder, "teams", "manifest.json"));

        envUtil.writeEnv(destinationPath, "dev", { TEAMS_APP_ID: existingManifest.id });

        existingManifest.schema = remoteManifest.$schema;
        existingManifest.manifestVersion = remoteManifest.manifestVersion;
        existingManifest.id = remoteManifest.id;
        existingManifest.icons = remoteManifest.icons;
        existingManifest.staticTabs = remoteManifest.staticTabs;
        existingManifest.configurableTabs = remoteManifest.configurableTabs;

        remoteManifest = existingManifest;
      }
      await fs.writeJson(
        path.join(destinationPath, AppPackageFolderName, "manifest.local.json"),
        localManifest
      );
      await fs.writeJson(
        path.join(destinationPath, AppPackageFolderName, "manifest.json"),
        remoteManifest
      );

      let colorUpdated = false,
        outlineUpdated = false;
      if (await fs.pathExists(path.join(spfxFolder, "teams"))) {
        for (const file of await fs.readdir(path.join(spfxFolder, "teams"))) {
          if (file.endsWith("color.png") && !colorUpdated) {
            await fs.copyFile(
              path.join(spfxFolder, "teams", file),
              path.join(destinationPath, AppPackageFolderName, "color.png")
            );
            colorUpdated = true;
          }
          if (file.endsWith("outline.png") && !outlineUpdated) {
            await fs.copyFile(
              path.join(spfxFolder, "teams", file),
              path.join(destinationPath, AppPackageFolderName, "outline.png")
            );
            outlineUpdated = true;
          }
        }
      }
    } catch (error) {
      await importProgress.end(false);

      if (error instanceof UserError || error instanceof SystemError) {
        return err(error);
      }
      return err(ImportSPFxSolutionError(error as any));
    }

    await importProgress.end(true);
    return ok(undefined);
  }

  public static async doYeomanScaffold(
    context: ContextV3,
    inputs: Inputs,
    destinationPath: string
  ): Promise<Result<string, FxError>> {
    const ui = context.userInteraction;
    const progressHandler = await ProgressHelper.startScaffoldProgressHandler(
      ui,
      inputs.stage == Stage.addWebpart
    );
    const shouldInstallLocally =
      inputs[SPFXQuestionNames.use_global_package_or_install_local] ===
      SPFxVersionOptionIds.installLocally;
    try {
      const webpartName = inputs[SPFXQuestionNames.webpart_name] as string;
      const framework = inputs[SPFXQuestionNames.framework_type] as string;
      const solutionName = inputs[CoreQuestionNames.AppName] as string;
      const isAddSPFx = inputs.stage == Stage.addWebpart;

      const componentName = Utils.normalizeComponentName(webpartName);
      const componentNameCamelCase = camelCase(componentName);

      await progressHandler?.next(getLocalizedString("plugins.spfx.scaffold.dependencyCheck"));

      const yoChecker = new YoChecker(context.logProvider!);
      const spGeneratorChecker = new GeneratorChecker(context.logProvider!);

      if (shouldInstallLocally) {
        const latestYoInstalled = await yoChecker.isLatestInstalled();
        const latestGeneratorInstalled = await spGeneratorChecker.isLatestInstalled();

        if (!latestYoInstalled || !latestGeneratorInstalled) {
          await progressHandler?.next(
            getLocalizedString("plugins.spfx.scaffold.dependencyInstall")
          );

          if (!latestYoInstalled) {
            const yoRes = await yoChecker.ensureLatestDependency(context);
            if (yoRes.isErr()) {
              throw LatestPackageInstallError();
            }
          }

          if (!latestGeneratorInstalled) {
            const spGeneratorRes = await spGeneratorChecker.ensureLatestDependency(context);
            if (spGeneratorRes.isErr()) {
              throw LatestPackageInstallError();
            }
          }
        }
      } else {
        const isLowerVersion = PackageSelectOptionsHelper.isLowerThanRecommendedVersion();
        if (isLowerVersion) {
          context.telemetryReporter.sendTelemetryEvent(TelemetryEvents.UseNotRecommendedVersion);
        }
      }

      await progressHandler?.next(
        getLocalizedString(
          isAddSPFx
            ? "driver.spfx.add.progress.scaffoldWebpart"
            : "plugins.spfx.scaffold.scaffoldProject"
        )
      );
      if (inputs.platform === Platform.VSCode) {
        (context.logProvider as any).outputChannel.show();
      }

      const yoEnv: NodeJS.ProcessEnv = process.env;
      if (yoEnv.PATH) {
        yoEnv.PATH = shouldInstallLocally
          ? `${await (await yoChecker.getBinFolders()).join(path.delimiter)}${path.delimiter}${
              process.env.PATH ?? ""
            }`
          : process.env.PATH;
      } else {
        yoEnv.Path = shouldInstallLocally
          ? `${await (await yoChecker.getBinFolders()).join(path.delimiter)}${path.delimiter}${
              process.env.Path ?? ""
            }`
          : process.env.Path;
      }

      const args = [
        shouldInstallLocally ? spGeneratorChecker.getSpGeneratorPath() : "@microsoft/sharepoint",
        "--skip-install",
        "true",
        "--component-type",
        "webpart",
        "--component-name",
        webpartName,
        "--environment",
        "spo",
        "--skip-feature-deployment",
        "true",
        "--is-domain-isolated",
        "false",
      ];
      if (framework) {
        args.push("--framework", framework);
      }
      if (solutionName) {
        args.push("--solution-name", `"${solutionName}"`);
      }

      try {
        await cpUtils.executeCommand(
          isAddSPFx ? inputs[SPFxQuestionNames.SPFxFolder] : destinationPath,
          context.logProvider,
          {
            timeout: 2 * 60 * 1000,
            env: yoEnv,
          },
          "yo",
          ...args
        );
      } catch (yoError) {
        if ((yoError as any).message) {
          context.logProvider.error((yoError as any).message);
        }
        throw YoGeneratorScaffoldError();
      }

      const newPath = path.join(destinationPath, "src");
      if (!isAddSPFx) {
        const currentPath = path.join(destinationPath, solutionName!);
        await fs.rename(currentPath, newPath);
      }

      await progressHandler?.next(getLocalizedString("plugins.spfx.scaffold.updateManifest"));
      const manifestPath = `${newPath}/src/webparts/${componentNameCamelCase}/${componentName}WebPart.manifest.json`;
      const manifest = await fs.readFile(manifestPath, "utf8");
      let manifestString = manifest.toString();
      manifestString = manifestString.replace(
        `"supportedHosts": ["SharePointWebPart"]`,
        `"supportedHosts": ["SharePointWebPart", "TeamsPersonalApp", "TeamsTab"]`
      );
      await fs.writeFile(manifestPath, manifestString);

      const matchHashComment = new RegExp(/(\/\/ .*)/, "gi");
      const manifestJson = JSON.parse(manifestString.replace(matchHashComment, "").trim());
      const componentId = manifestJson.id;

      if (!isAddSPFx) {
        if (!context.templateVariables) {
          context.templateVariables = Generator.getDefaultVariables(solutionName);
        }
        context.templateVariables["componentId"] = componentId;
        context.templateVariables["webpartName"] = webpartName;
      }

      // remove dataVersion() function, related issue: https://github.com/SharePoint/sp-dev-docs/issues/6469
      const webpartFile = `${newPath}/src/webparts/${componentNameCamelCase}/${componentName}WebPart.ts`;
      const codeFile = await fs.readFile(webpartFile, "utf8");
      let codeString = codeFile.toString();
      codeString = codeString.replace(
        `  protected get dataVersion(): Version {\r\n    return Version.parse('1.0');\r\n  }\r\n\r\n`,
        ``
      );
      codeString = codeString.replace(
        `import { Version } from '@microsoft/sp-core-library';\r\n`,
        ``
      );
      await fs.writeFile(webpartFile, codeString);

      // remove .vscode
      const debugPath = `${newPath}/.vscode`;
      if (await fs.pathExists(debugPath)) {
        await fs.remove(debugPath);
      }

      await progressHandler?.end(true);
      return ok(componentId);
    } catch (error) {
      await progressHandler?.end(false);
      return err(ScaffoldError(error));
    }
  }

  public static async getSolutionName(spfxFolder: string): Promise<string | undefined> {
    const yoInfoPath = path.join(spfxFolder, ".yo-rc.json");
    if (await fs.pathExists(yoInfoPath)) {
      const yoInfo = await fs.readJson(yoInfoPath);
      if (yoInfo["@microsoft/generator-sharepoint"]) {
        return yoInfo["@microsoft/generator-sharepoint"][Constants.YO_RC_SOLUTION_NAME];
      }
    }
    return undefined;
  }

  private static async getWebpartManifest(spfxFolder: string): Promise<any | undefined> {
    const webpartsDir = path.join(spfxFolder, "src", "webparts");
    if (await fs.pathExists(webpartsDir)) {
      const webparts = (await fs.readdir(webpartsDir)).filter(async (file) =>
        (await fs.stat(file)).isDirectory()
      );
      if (webparts.length < 1) {
        return undefined;
      }

      const webpartName = webparts[0].split(path.sep).pop();
      const webpartManifestPath = path.join(webparts[0], `${webpartName}WebPart.manifest.json`);
      if (!(await fs.pathExists(path.join(webpartsDir, webpartManifestPath)))) {
        return undefined;
      }

      const matchHashComment = new RegExp(/(\/\/ .*)/, "gi");
      const manifest = JSON.parse(
        (await fs.readFile(path.join(webpartsDir, webpartManifestPath), "utf8"))
          .toString()
          .replace(matchHashComment, "")
          .trim()
      );
      return manifest;
    }
  }
}
