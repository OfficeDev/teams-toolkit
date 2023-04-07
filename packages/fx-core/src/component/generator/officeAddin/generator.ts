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
  ContextV3,
} from "@microsoft/teamsfx-api";
import { join } from "path";
import {
  AddinLanguageQuestion,
  OfficeHostQuestion,
  getTemplate,
  AddinProjectFolderQuestion,
  AddinProjectManifestQuestion,
} from "./question";
import { HelperMethods } from "./helperMethods";
import { OfficeAddinManifest } from "office-addin-manifest";
import projectsJsonData from "./config/projectsJsonData";
import * as childProcess from "child_process";
import { promisify } from "util";
import { CopyFileError } from "../../../core/error";
import _ from "lodash";
import { hooks } from "@feathersjs/hooks/lib";
import { ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { Generator } from "../generator";
import { CoreQuestionNames } from "../../../core/question";
import { convertProject } from "office-addin-project";

const componentName = "office-addin";
const telemetryEvent = "generate";
const templateName = "office-addin";

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
    context: ContextV3,
    inputs: Inputs,
    destinationPath: string
  ): Promise<Result<undefined, FxError>> {
    const result = await OfficeAddinGenerator.doScaffolding(context, inputs, destinationPath);
    if (result.isErr()) {
      return err(result.error);
    }

    // If lang is undefined, it means the project is created from a folder.
    const lang = inputs[AddinLanguageQuestion.name];

    const templateRes = await Generator.generateTemplate(
      context,
      destinationPath,
      templateName,
      lang ? (lang === "TypeScript" ? "ts" : "js") : undefined
    );
    if (templateRes.isErr()) return err(templateRes.error);

    return ok(undefined);
  }

  public static async childProcessExec(cmdLine: string) {
    return promisify(childProcess.exec)(cmdLine);
  }

  public static async doScaffolding(
    context: ContextV3,
    inputs: Inputs,
    destinationPath: string
  ): Promise<Result<undefined, FxError>> {
    const template = getTemplate(inputs);
    const name = inputs[CoreQuestionNames.AppName] as string;
    const addinRoot = destinationPath;
    const fromFolder = inputs[AddinProjectFolderQuestion.name];
    const language = inputs[AddinLanguageQuestion.name];
    const host = inputs[OfficeHostQuestion.name];
    const workingDir = process.cwd();

    process.chdir(addinRoot);
    try {
      if (!fromFolder) {
        // from template
        const jsonData = new projectsJsonData();
        const projectRepoBranchInfo = jsonData.getProjectRepoAndBranch(template, language, true);

        // Copy project template files from project repository
        if (projectRepoBranchInfo.repo) {
          await HelperMethods.downloadProjectTemplateZipFile(
            addinRoot,
            projectRepoBranchInfo.repo,
            projectRepoBranchInfo.branch
          );

          // Call 'convert-to-single-host' npm script in generated project, passing in host parameter
          const cmdLine = `npm run convert-to-single-host --if-present -- ${_.toLower(host)}`;
          await OfficeAddinGenerator.childProcessExec(cmdLine);

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
        // from existing project
        HelperMethods.copyAddinFiles(fromFolder, addinRoot);
        const sourceManifestFile: string = inputs[AddinProjectManifestQuestion.name];
        let manifestFile: string = sourceManifestFile.replace(fromFolder, addinRoot);
        if (manifestFile.endsWith(".xml")) {
          // Need to convert to json project first
          await convertProject(manifestFile);
          manifestFile = manifestFile.replace(/\.xml$/, ".json");
        }
        inputs[OfficeHostQuestion.name] = await getHost(manifestFile);
        HelperMethods.updateManifest(destinationPath, manifestFile);
      }
      process.chdir(workingDir);
      return ok(undefined);
    } catch (e) {
      process.chdir(workingDir);
      return err(CopyFileError(e as Error));
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
