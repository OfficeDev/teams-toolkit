// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yefuwang@microsoft.com
 */

import {
  FxError,
  Inputs,
  Result,
  ok,
  err,
  ManifestUtil,
  devPreview,
  Context,
} from "@microsoft/teamsfx-api";
import { join } from "path";
import { HelperMethods } from "./helperMethods";
import { OfficeAddinManifest } from "office-addin-manifest";
import projectsJsonData from "./config/projectsJsonData";
import * as childProcess from "child_process";
import { promisify } from "util";
import _ from "lodash";
import { hooks } from "@feathersjs/hooks/lib";
import { ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { Generator } from "../generator";
import { convertProject } from "office-addin-project";
import { QuestionNames } from "../../../question/questionNames";
import { ProjectTypeOptions, getTemplate } from "../../../question/create";
import { getLocalizedString } from "../../../common/localizeUtils";
import { assembleError } from "../../../error";
import { isOfficeXMLAddinEnabled } from "../../../common/featureFlags";

const componentName = "office-addin";
const telemetryEvent = "generate";
const templateName = "office-addin";
const templateNameForWXPO = "office-json-addin";

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
    const lang = inputs[QuestionNames.ProgrammingLanguage];
    const langKey =
      lang != "No Options" ? (lang?.toLowerCase() === "typescript" ? "ts" : "js") : undefined;
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
    const template = getTemplate(inputs);
    const name = inputs[QuestionNames.AppName] as string;
    const addinRoot = destinationPath;
    const fromFolder = inputs[QuestionNames.OfficeAddinFolder];
    const language = inputs[QuestionNames.ProgrammingLanguage];
    const host = isOfficeXMLAddinEnabled()
      ? inputs[QuestionNames.OfficeAddinCapability] === ProjectTypeOptions.outlookAddin().id
        ? "Outlook"
        : inputs[QuestionNames.OfficeAddinCapability]
      : inputs[QuestionNames.OfficeAddinHost];
    const workingDir = process.cwd();
    const importProgress = context.userInteraction.createProgressBar(
      getLocalizedString("core.generator.officeAddin.importProject.title"),
      3
    );

    process.chdir(addinRoot);
    try {
      if (!fromFolder) {
        // from template
        const jsonData = new projectsJsonData();
        const isOfficeAddin =
          inputs[QuestionNames.ProjectType] === ProjectTypeOptions.officeAddin().id;
        const framework = isOfficeAddin ? inputs[QuestionNames.OfficeAddinFramework] : undefined;
        const projectLink = isOfficeAddin
          ? jsonData.getProjectDownloadLinkNew(template, language, framework)
          : jsonData.getProjectDownloadLink(template, language);

        // Copy project template files from project repository
        if (projectLink) {
          await HelperMethods.downloadProjectTemplateZipFile(addinRoot, projectLink);

          if (inputs[QuestionNames.ProjectType] === ProjectTypeOptions.officeAddin().id) {
            // Call 'convert-to-single-host' npm script in generated project, passing in host parameter
            const cmdLine = `npm run convert-to-single-host --if-present -- ${_.toLower(
              "wxpo" // support word, excel, powerpoint, outlook
            )} ${"json"}`;
            await OfficeAddinGenerator.childProcessExec(cmdLine);
          } else {
            // Call 'convert-to-single-host' npm script in generated project, passing in host parameter
            const cmdLine = `npm run convert-to-single-host --if-present -- ${_.toLower(host)}`;
            await OfficeAddinGenerator.childProcessExec(cmdLine);
          }

          const manifestPath = jsonData.getManifestPath(template) as string;
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
type OfficeHost = "Outlook"; // | "Word" | "OneNote" | "PowerPoint" | "Project" | "Excel"
async function getHost(addinManifestPath: string): Promise<OfficeHost> {
  // Read add-in manifest file
  const addinManifest: devPreview.DevPreviewSchema = await ManifestUtil.loadFromPath(
    addinManifestPath
  );
  let host: OfficeHost = "Outlook";
  switch (addinManifest.extensions?.[0].requirements?.scopes?.[0]) {
    // case "document":
    //   host = "Word";
    case "mail":
      host = "Outlook";
    // case "notebook":
    //   host = "OneNote";
    // case "presentation":
    //   host = "PowerPoint";
    // case "project":
    //   host = "Project";
    // case "workbook":
    //   host = "Excel";
  }
  return host;
}
