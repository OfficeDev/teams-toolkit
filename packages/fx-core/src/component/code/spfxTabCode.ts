// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
  ContextV3,
  err,
  FxError,
  IConfigurableTab,
  InputsWithProjectPath,
  IStaticTab,
  ok,
  Platform,
  PluginContext,
  ProjectSettingsV3,
  Result,
  v3,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import { camelCase, merge } from "lodash";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import * as util from "util";
import { isSPFxMultiTabEnabled } from "../../common";
import { getAppDirectory, isGeneratorCheckerEnabled, isYoCheckerEnabled } from "../../common/tools";
import { getTemplatesFolder } from "../../folder";
import { MANIFEST_TEMPLATE_CONSOLIDATE } from "../../plugins/resource/appstudio/constants";
import { GeneratorChecker } from "../../plugins/resource/spfx/depsChecker/generatorChecker";
import { YoChecker } from "../../plugins/resource/spfx/depsChecker/yoChecker";
import { DependencyInstallError, ScaffoldError } from "../../plugins/resource/spfx/error";
import {
  ManifestTemplate,
  PlaceHolders,
  ScaffoldProgressMessage,
} from "../../plugins/resource/spfx/utils/constants";
import { ProgressHelper } from "../../plugins/resource/spfx/utils/progress-helper";
import { SPFXQuestionNames } from "../../plugins/resource/spfx/utils/questions";
import { Utils } from "../../plugins/resource/spfx/utils/utils";
import { convert2Context } from "../../plugins/resource/utils4v2";
import { cpUtils } from "../../plugins/solution/fx-solution/utils/depsChecker/cpUtils";
import { ComponentNames } from "../constants";
import { ActionExecutionMW } from "../middleware/actionExecutionMW";
import { DefaultManifestProvider } from "../resource/appManifest/manifestProvider";
import { getComponent } from "../workflow";
/**
 * SPFx tab scaffold
 */
@Service(ComponentNames.SPFxTabCode)
export class SPFxTabCodeProvider {
  name = ComponentNames.SPFxTabCode;
  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: "fx-resource-spfx",
      telemetryEventName: "scaffold",
      errorSource: "SPFx",
    }),
  ])
  async generate(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    const projectSettings = context.projectSetting as ProjectSettingsV3;
    const folder = inputs.folder || "SPFx";
    const teamsTab = getComponent(projectSettings, ComponentNames.TeamsTab);
    if (!teamsTab) return ok(undefined);
    merge(teamsTab, { build: true, folder: folder });
    const workingDir = path.resolve(inputs.projectPath, folder);
    const scaffoldRes = await scaffoldSPFx(context, inputs, workingDir);
    if (scaffoldRes.isErr()) return err(scaffoldRes.error);
    return ok(undefined);
  }
}

export async function scaffoldSPFx(
  context: ContextV3 | PluginContext,
  inputs: InputsWithProjectPath,
  outputFolderPath: string
): Promise<Result<any, FxError>> {
  const ui = (context as ContextV3).userInteraction || (context as PluginContext).ui;
  const progressHandler = await ProgressHelper.startScaffoldProgressHandler(ui);
  try {
    const webpartName = inputs[SPFXQuestionNames.webpart_name] as string;
    let framework,
      solutionName: string | undefined = undefined;
    const isAddSpfx =
      inputs[SPFXQuestionNames.framework_type] === undefined && isSPFxMultiTabEnabled();
    if (!isAddSpfx) {
      framework = inputs[SPFXQuestionNames.framework_type] as string;
      solutionName =
        ((context as ContextV3).projectSetting?.appName as string) ||
        ((context as PluginContext).projectSettings?.appName as string);
    }

    const componentName = Utils.normalizeComponentName(webpartName);
    const componentNameCamelCase = camelCase(componentName);
    const templateFolder = path.join(getTemplatesFolder(), "plugins", "resource", "spfx");
    const replaceMap: Map<string, string> = new Map();

    await progressHandler?.next(ScaffoldProgressMessage.DependencyCheck);

    const yoChecker = new YoChecker(context.logProvider!);
    const spGeneratorChecker = new GeneratorChecker(context.logProvider!);

    const yoInstalled = await yoChecker.isInstalled();
    const generatorInstalled = await spGeneratorChecker.isInstalled();

    if (!yoInstalled || !generatorInstalled) {
      await progressHandler?.next(ScaffoldProgressMessage.DependencyInstall);

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

    await progressHandler?.next(ScaffoldProgressMessage.ScaffoldProject);
    if (inputs.platform === Platform.VSCode) {
      (context.logProvider as any).outputChannel.show();
    }

    const yoEnv: NodeJS.ProcessEnv = process.env;
    yoEnv.PATH = isYoCheckerEnabled()
      ? `${await (await yoChecker.getBinFolders()).join(path.delimiter)}${path.delimiter}${
          process.env.PATH ?? ""
        }`
      : process.env.PATH;

    const args = [
      isGeneratorCheckerEnabled()
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
      isAddSpfx ? path.join(inputs.projectPath, "SPFx") : inputs.projectPath,
      context.logProvider,
      {
        timeout: 2 * 60 * 1000,
        env: yoEnv,
      },
      "yo",
      ...args
    );

    const newPath = path.join(inputs.projectPath, "SPFx");
    if (!isAddSpfx) {
      const currentPath = path.join(inputs.projectPath, solutionName!);
      await fs.rename(currentPath, newPath);
    }

    await progressHandler?.next(ScaffoldProgressMessage.UpdateManifest);
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
    replaceMap.set(PlaceHolders.componentId, componentId);
    replaceMap.set(PlaceHolders.componentNameUnescaped, webpartName);

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

    // update readme
    if (!(await fs.pathExists(`${outputFolderPath}/README.md`))) {
      await fs.copyFile(
        path.resolve(templateFolder, "./solution/README.md"),
        `${outputFolderPath}/README.md`
      );
    }

    if (!isAddSpfx) {
      const appDirectory = await getAppDirectory(inputs.projectPath);
      await Utils.configure(path.join(appDirectory, MANIFEST_TEMPLATE_CONSOLIDATE), replaceMap);

      const capabilitiesToAddManifest: v3.ManifestCapability[] = [];
      const remoteStaticSnippet: IStaticTab = {
        entityId: componentId,
        name: webpartName,
        contentUrl: util.format(ManifestTemplate.REMOTE_CONTENT_URL, componentId, componentId),
        websiteUrl: ManifestTemplate.WEBSITE_URL,
        scopes: ["personal"],
      };
      const remoteConfigurableSnippet: IConfigurableTab = {
        configurationUrl: util.format(
          ManifestTemplate.REMOTE_CONFIGURATION_URL,
          componentId,
          componentId
        ),
        canUpdateConfiguration: true,
        scopes: ["team"],
      };
      capabilitiesToAddManifest.push(
        {
          name: "staticTab",
          snippet: remoteStaticSnippet,
        },
        {
          name: "configurableTab",
          snippet: remoteConfigurableSnippet,
        }
      );
      const manifestProvider =
        (context as ContextV3).manifestProvider || new DefaultManifestProvider();
      for (const capability of capabilitiesToAddManifest) {
        const addCapRes = await manifestProvider.updateCapability(
          (context as ContextV3).manifestProvider
            ? (context as ContextV3)
            : convert2Context(context as PluginContext, true).context,
          inputs,
          capability
        );
        if (addCapRes.isErr()) return err(addCapRes.error);
      }
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
