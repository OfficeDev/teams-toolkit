// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { ContextV3, err, FxError, Inputs, ok, Platform, Result } from "@microsoft/teamsfx-api";
import * as path from "path";
import fs from "fs-extra";
import { ActionExecutionMW } from "../middleware/actionExecutionMW";
import { ProgressHelper } from "../resource/spfx/utils/progress-helper";
import { SPFXQuestionNames } from "../resource/spfx/utils/questions";
import { DependencyInstallError, ScaffoldError } from "../resource/spfx/error";
import { Utils } from "../resource/spfx/utils/utils";
import { camelCase } from "lodash";
import { Constants, ScaffoldProgressMessage } from "../resource/spfx/utils/constants";
import { YoChecker } from "../resource/spfx/depsChecker/yoChecker";
import { GeneratorChecker } from "../resource/spfx/depsChecker/generatorChecker";
import { isGeneratorCheckerEnabled, isYoCheckerEnabled } from "../../common/tools";
import { cpUtils } from "../../common/deps-checker";
import { TelemetryEvents } from "../resource/spfx/utils/telemetryEvents";
import { Generator } from "./generator";
import { CoreQuestionNames } from "../../core/question";
import { getLocalizedString } from "../../common/localizeUtils";
import { isSpfxDecoupleEnabled } from "../../common/featureFlags";
import { SPFxVersionOptionIds } from "../resource/spfx/utils/question-helper";

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

  private static async doYeomanScaffold(
    context: ContextV3,
    inputs: Inputs,
    destinationPath: string
  ): Promise<Result<undefined, FxError>> {
    const ui = context.userInteraction;
    const progressHandler = await ProgressHelper.startScaffoldProgressHandler(ui);
    const shouldInstallLocally =
      inputs[SPFXQuestionNames.use_global_package_or_install_local] ===
      SPFxVersionOptionIds.installLocally;
    try {
      const webpartName = inputs[SPFXQuestionNames.webpart_name] as string;
      const framework = inputs[SPFXQuestionNames.framework_type] as string;
      const solutionName = inputs[CoreQuestionNames.AppName] as string;

      const componentName = Utils.normalizeComponentName(webpartName);
      const componentNameCamelCase = camelCase(componentName);

      await progressHandler?.next(getLocalizedString("plugins.spfx.scaffold.dependencyCheck"));

      const yoChecker = new YoChecker(context.logProvider!);
      const spGeneratorChecker = new GeneratorChecker(context.logProvider!);

      if (!isSpfxDecoupleEnabled()) {
        const yoInstalled = await yoChecker.isInstalled();
        const generatorInstalled = await spGeneratorChecker.isInstalled();

        if (!yoInstalled || !generatorInstalled) {
          await progressHandler?.next(
            getLocalizedString("plugins.spfx.scaffold.dependencyInstall")
          );

          if (isYoCheckerEnabled()) {
            const yoRes = await yoChecker.ensureDependency(context);
            if (yoRes.isErr()) {
              throw DependencyInstallError("yo");
            }
          }

          if (isGeneratorCheckerEnabled()) {
            const spGeneratorRes = await spGeneratorChecker.ensureDependency(context);
            if (spGeneratorRes.isErr()) {
              throw DependencyInstallError("sharepoint generator");
            }
          }
        }
      } else if (shouldInstallLocally) {
        const latestYoInstalled = await yoChecker.isLatestInstalled();
        const latestGeneratorInstalled = await spGeneratorChecker.isLatestInstalled();

        if (!latestYoInstalled || !latestGeneratorInstalled) {
          await progressHandler?.next(
            getLocalizedString("plugins.spfx.scaffold.dependencyInstall")
          );

          const yoRes = await yoChecker.ensureDependency(context);
          if (yoRes.isErr()) {
            throw DependencyInstallError("yo");
          }

          const spGeneratorRes = await spGeneratorChecker.ensureDependency(context);
          if (spGeneratorRes.isErr()) {
            throw DependencyInstallError("sharepoint generator");
          }
        }
      }

      await progressHandler?.next(getLocalizedString("plugins.spfx.scaffold.scaffoldProject"));
      if (inputs.platform === Platform.VSCode) {
        (context.logProvider as any).outputChannel.show();
      }

      const yoEnv: NodeJS.ProcessEnv = process.env;
      if (yoEnv.PATH) {
        yoEnv.PATH =
          isYoCheckerEnabled() || shouldInstallLocally
            ? `${await (await yoChecker.getBinFolders()).join(path.delimiter)}${path.delimiter}${
                process.env.PATH ?? ""
              }`
            : process.env.PATH;
      } else {
        yoEnv.Path =
          isYoCheckerEnabled() || shouldInstallLocally
            ? `${await (await yoChecker.getBinFolders()).join(path.delimiter)}${path.delimiter}${
                process.env.Path ?? ""
              }`
            : process.env.Path;
      }

      const args = [
        isGeneratorCheckerEnabled() || shouldInstallLocally
          ? spGeneratorChecker.getSpGeneratorPath()
          : "@microsoft/sharepoint",
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
        args.push("--solution-name", solutionName);
      }
      await cpUtils.executeCommand(
        destinationPath,
        context.logProvider,
        {
          timeout: 2 * 60 * 1000,
          env: yoEnv,
        },
        "yo",
        ...args
      );

      const newPath = path.join(destinationPath, "src");
      const currentPath = path.join(destinationPath, solutionName!);
      await fs.rename(currentPath, newPath);

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
      if (!context.templateVariables) {
        context.templateVariables = Generator.getDefaultVariables(solutionName);
      }
      context.templateVariables["componentId"] = componentId;
      context.templateVariables["webpartName"] = webpartName;

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
      return ok(undefined);
    } catch (error) {
      if ((error as any).name === "DependencyInstallFailed") {
        const globalYoVersion = Utils.getPackageVersion("yo");
        const globalGenVersion = Utils.getPackageVersion("@microsoft/generator-sharepoint");
        const yoInfo = YoChecker.getDependencyInfo();
        const genInfo = GeneratorChecker.getDependencyInfo();
        const yoMessage =
          globalYoVersion === undefined
            ? "    yo not installed"
            : `    globally installed yo@${globalYoVersion}`;
        const generatorMessage =
          globalGenVersion === undefined
            ? "    @microsoft/generator-sharepoint not installed"
            : `    globally installed @microsoft/generator-sharepoint@${globalYoVersion}`;
        context.logProvider?.error(
          `We've encountered some issues when trying to install prerequisites under HOME/.fx folder.  Learn how to remediate by going to this link(aka.ms/teamsfx-spfx-help) and following the steps applicable to your system: \n ${yoMessage} \n ${generatorMessage}`
        );
        context.logProvider?.error(
          `Teams Toolkit recommends using ${yoInfo.displayName} ${genInfo.displayName}`
        );
      }
      if (
        (error as any).message &&
        (error as any).message.includes("'yo' is not recognized as an internal or external command")
      ) {
        context.logProvider?.error(
          "NPM v6.x with Node.js v12.13.0+ (Erbium) or Node.js v14.15.0+ (Fermium) is recommended for spfx scaffolding and later development. You can use correct version and try again."
        );
      }
      await progressHandler?.end(false);
      return err(ScaffoldError(error));
    }
  }
}
