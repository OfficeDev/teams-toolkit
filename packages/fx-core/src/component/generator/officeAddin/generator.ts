// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yefuwang@microsoft.com
 */

import { hooks } from "@feathersjs/hooks/lib";
import {
  Context,
  FxError,
  GeneratorResult,
  Inputs,
  ManifestUtil,
  Result,
  devPreview,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import * as childProcess from "child_process";
import { toLower } from "lodash";
import { OfficeAddinManifest } from "office-addin-manifest";
import { convertProject } from "office-addin-project";
import { join } from "path";
import { promisify } from "util";
import { getLocalizedString } from "../../../common/localizeUtils";
import { assembleError, InputValidationError } from "../../../error";
import {
  CapabilityOptions,
  ProgrammingLanguage,
  ProjectTypeOptions,
  QuestionNames,
} from "../../../question/constants";
import { getOfficeAddinFramework, getOfficeAddinTemplateConfig } from "../../../question/create";
import { ActionContext, ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { Generator } from "../generator";
import { DefaultTemplateGenerator } from "../templates/templateGenerator";
import { TemplateInfo } from "../templates/templateInfo";
import { convertToLangKey } from "../utils";
import { HelperMethods } from "./helperMethods";
import { envUtil } from "../../utils/envUtil";

const componentName = "office-addin";
const telemetryEvent = "generate";
const templateName = "office-addin";
const templateNameForWXPO = "office-json-addin";

/**
 * case 1: project-type=office-xml-addin-type AND addin-host=outlook
 * case 2: project-type=office-addin-type (addin-host=undefined)
 * case 3: project-type=outlook-addin-type (addin-host=undefined)
 */
export class OfficeAddinGenerator {
  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: componentName,
      telemetryEventName: telemetryEvent,
      errorSource: componentName,
    }),
  ])
  static async generate(
    context: Context,
    inputs: Inputs,
    destinationPath: string
  ): Promise<Result<undefined, FxError>> {
    const result = await OfficeAddinGenerator.doScaffolding(context, inputs, destinationPath);
    if (result.isErr()) {
      return err(result.error);
    }

    // If lang is undefined, it means the project is created from a folder.
    const lang = toLower(inputs[QuestionNames.ProgrammingLanguage]) as "javascript" | "typescript";
    const langKey =
      inputs[QuestionNames.Capabilities] === CapabilityOptions.outlookAddinImport().id ||
      inputs[QuestionNames.Capabilities] === CapabilityOptions.officeAddinImport().id
        ? "ts"
        : convertToLangKey(lang);
    const templateRes = await Generator.generateTemplate(
      context,
      destinationPath,
      inputs[QuestionNames.ProjectType] === ProjectTypeOptions.officeAddin().id
        ? templateNameForWXPO
        : templateName,
      langKey
    );
    if (templateRes.isErr()) return err(templateRes.error);

    return ok(undefined);
  }

  public static async childProcessExec(cmdLine: string) {
    return promisify(childProcess.exec)(cmdLine);
  }

  public static async doScaffolding(
    context: Context,
    inputs: Inputs,
    destinationPath: string
  ): Promise<Result<undefined, FxError>> {
    const name = inputs[QuestionNames.AppName] as string;
    const addinRoot = destinationPath;
    const fromFolder = inputs[QuestionNames.OfficeAddinFolder];
    const language = toLower(inputs[QuestionNames.ProgrammingLanguage]) as
      | "javascript"
      | "typescript";
    const projectType = inputs[QuestionNames.ProjectType];
    const capability = inputs[QuestionNames.Capabilities];
    const inputHost = inputs[QuestionNames.OfficeAddinHost];
    const workingDir = process.cwd();
    const importProgressStr =
      projectType === ProjectTypeOptions.officeAddin().id
        ? getLocalizedString("core.generator.officeAddin.importOfficeProject.title")
        : getLocalizedString("core.generator.officeAddin.importProject.title");
    const importProgress = context.userInteraction.createProgressBar(importProgressStr, 3);

    process.chdir(addinRoot);
    try {
      if (!fromFolder) {
        let host: string = inputHost;
        if (projectType === ProjectTypeOptions.outlookAddin().id) {
          host = "outlook";
        } else if (
          projectType === ProjectTypeOptions.officeMetaOS().id ||
          projectType === ProjectTypeOptions.officeAddin().id
        ) {
          if (capability === "json-taskpane") {
            host = "wxpo"; // wxpo - support word, excel, powerpoint, outlook
          } else if (capability === CapabilityOptions.officeContentAddin().id) {
            host = "xp"; // content add-in support excel, powerpoint
          }
        }
        if (!["outlook", "wxpo", "xp"].includes(host)) {
          return err(
            new InputValidationError(
              QuestionNames.OfficeAddinHost,
              `Invalid host: ${host}`,
              "office-addin-generator"
            )
          );
        }
        // from template
        const framework = getOfficeAddinFramework(inputs);
        const templateConfig = getOfficeAddinTemplateConfig();
        const projectLink =
          projectType === ProjectTypeOptions.officeMetaOS().id
            ? "https://github.com/OfficeDev/Office-Addin-TaskPane/archive/json-wxpo-preview.zip"
            : "https://github.com/OfficeDev/Office-Addin-TaskPane/archive/yo-office.zip";

        // Copy project template files from project repository
        if (projectLink) {
          const fetchRes = await HelperMethods.fetchAndUnzip(
            "office-addin-generator",
            projectLink,
            addinRoot
          );
          if (fetchRes.isErr()) {
            return err(fetchRes.error);
          }
          const cmdLine = `npm run convert-to-single-host --if-present -- ${host} json`; // Call 'convert-to-single-host' npm script in generated project, passing in host parameter
          await OfficeAddinGenerator.childProcessExec(cmdLine);
          const manifestPath = templateConfig[capability].manifestPath as string;
          // modify manifest guid and DisplayName
          await OfficeAddinManifest.modifyManifestFile(
            `${join(addinRoot, manifestPath)}`,
            "random",
            `${name}`
          );
          await HelperMethods.moveManifestLocation(addinRoot, manifestPath);
        }
      } else {
        await importProgress.start();
        // from existing project
        await importProgress.next(
          getLocalizedString("core.generator.officeAddin.importProject.copyFiles")
        );
        HelperMethods.copyAddinFiles(fromFolder, addinRoot);
        const sourceManifestFile: string = inputs[QuestionNames.OfficeAddinManifest];
        let manifestFile: string = sourceManifestFile.replace(fromFolder, addinRoot);
        await importProgress.next(
          getLocalizedString("core.generator.officeAddin.importProject.convertProject")
        );
        if (manifestFile.endsWith(".xml")) {
          // Need to convert to json project first
          await convertProject(manifestFile);
          manifestFile = manifestFile.replace(/\.xml$/, ".json");
        }
        inputs[QuestionNames.OfficeAddinHost] = await getHost(manifestFile);
        await importProgress.next(
          getLocalizedString("core.generator.officeAddin.importProject.updateManifest")
        );
        await HelperMethods.updateManifest(destinationPath, manifestFile);
      }
      process.chdir(workingDir);
      await importProgress.end(true, true);
      return ok(undefined);
    } catch (e) {
      process.chdir(workingDir);
      await importProgress.end(false, true);
      return err(assembleError(e as Error));
    }
  }
}

// TODO: update to handle different hosts when support for them is implemented
// TODO: handle multiple scopes
type OfficeHost = "Outlook" | "Word" | "Excel" | "PowerPoint"; // | "OneNote" | "Project"
export async function getHost(addinManifestPath: string): Promise<OfficeHost> {
  // Read add-in manifest file
  const addinManifest: devPreview.DevPreviewSchema = await ManifestUtil.loadFromPath(
    addinManifestPath
  );
  let host: OfficeHost = "Outlook";
  switch (addinManifest.extensions?.[0].requirements?.scopes?.[0]) {
    case "document":
      host = "Word";
      break;
    case "mail":
      host = "Outlook";
      break;
    // case "notebook":
    //   host = "OneNote";
    case "presentation":
      host = "PowerPoint";
      break;
    // case "project":
    //   host = "Project";
    case "workbook":
      host = "Excel";
      break;
  }
  return host;
}

export class OfficeAddinGeneratorNew extends DefaultTemplateGenerator {
  componentName = "office-addin-generator";

  // activation condition
  public activate(context: Context, inputs: Inputs): boolean {
    const projectType = inputs[QuestionNames.ProjectType];
    return ProjectTypeOptions.officeAddinAllIds().includes(projectType);
  }

  public async getTemplateInfos(
    context: Context,
    inputs: Inputs,
    destinationPath: string,
    actionContext?: ActionContext
  ): Promise<Result<TemplateInfo[], FxError>> {
    const projectType = inputs[QuestionNames.ProjectType];
    const tplName =
      projectType === ProjectTypeOptions.officeMetaOS().id ||
      projectType === ProjectTypeOptions.officeAddin().id
        ? templateNameForWXPO
        : templateName;
    let lang = toLower(inputs[QuestionNames.ProgrammingLanguage]) as ProgrammingLanguage;
    lang =
      inputs[QuestionNames.Capabilities] === CapabilityOptions.outlookAddinImport().id ||
      inputs[QuestionNames.Capabilities] === CapabilityOptions.officeAddinImport().id
        ? ProgrammingLanguage.TS
        : lang;
    const res = await OfficeAddinGenerator.doScaffolding(context, inputs, destinationPath);
    if (res.isErr()) return err(res.error);
    return Promise.resolve(ok([{ templateName: tplName, language: lang }]));
  }

  async post(
    context: Context,
    inputs: Inputs,
    destinationPath: string,
    actionContext?: ActionContext
  ): Promise<Result<GeneratorResult, FxError>> {
    const fromFolder = inputs[QuestionNames.OfficeAddinFolder];
    if (fromFolder) {
      // reset all env files
      const envRes = await envUtil.listEnv(destinationPath);
      if (envRes.isOk()) {
        const envs = envRes.value;
        for (const env of envs) {
          await envUtil.resetEnv(destinationPath, env, ["TEAMSFX_ENV", "APP_NAME_SUFFIX"]);
        }
      }
    }
    return ok({});
  }
}
