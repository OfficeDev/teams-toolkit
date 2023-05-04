// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
  ContextV3,
  err,
  FxError,
  Inputs,
  ok,
  Platform,
  Result,
  Stage,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import fs from "fs-extra";
import { ActionExecutionMW } from "../middleware/actionExecutionMW";
import { ProgressHelper } from "../resource/spfx/utils/progress-helper";
import { SPFXQuestionNames } from "../resource/spfx/utils/questions";
import {
  LatestPackageInstallError,
  ScaffoldError,
  YoGeneratorScaffoldError,
} from "../resource/spfx/error";
import { Utils } from "../resource/spfx/utils/utils";
import { camelCase } from "lodash";
import { Constants, ScaffoldProgressMessage } from "../resource/spfx/utils/constants";
import { YoChecker } from "../resource/spfx/depsChecker/yoChecker";
import { GeneratorChecker } from "../resource/spfx/depsChecker/generatorChecker";
import { cpUtils } from "../../common/deps-checker";
import { TelemetryEvents } from "../resource/spfx/utils/telemetryEvents";
import { Generator } from "./generator";
import { CoreQuestionNames } from "../../core/question";
import { getLocalizedString } from "../../common/localizeUtils";
import {
  PackageSelectOptionsHelper,
  SPFxVersionOptionIds,
} from "../resource/spfx/utils/question-helper";
import { SPFxQuestionNames } from "../constants";

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
        args.push("--solution-name", solutionName);
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
}
