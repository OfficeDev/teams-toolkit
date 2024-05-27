// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  DefaultTemplateGenerator,
  CoreQuestionNames,
  HelperMethods,
  ActionContext,
  ProgrammingLanguage,
  TemplateInfo,
} from "@microsoft/teamsfx-core";
import { Context, FxError, GeneratorResult, Inputs, Result, err, ok } from "@microsoft/teamsfx-api";
import { merge, toLower } from "lodash";
import { promisify } from "util";
import { getOfficeAddinTemplateConfig } from "./projectConfig";
import { OfficeAddinManifest } from "office-addin-manifest";
import { join } from "path";
import * as childProcess from "child_process";

const TEMPLATE_BASE = "office-xml-addin";
const TEMPLATE_COMMON_NAME = "office-xml-addin-common";

const enum OfficeXMLAddinTelemetryProperties {
  host = "office-xml-addin-host",
  project = "office-xml-addin-project",
  lang = "office-xml-addin-lang",
}

export class OfficeXMLAddinGenerator extends DefaultTemplateGenerator {
  componentName = "office-xml-addin-generator";

  public activate(context: Context, inputs: Inputs): boolean {
    const projectType = inputs[CoreQuestionNames.ProjectType];
    const addinHost = inputs[CoreQuestionNames.OfficeAddinHost];
    return (
      projectType === "office-xml-addin-type" &&
      addinHost &&
      addinHost !== "outlook" &&
      inputs.agent === "office" // Triggered by Office agent
    );
  }

  public async getTemplateInfos(
    context: Context,
    inputs: Inputs,
    destinationPath: string,
    actionContext?: ActionContext
  ): Promise<Result<TemplateInfo[], FxError>> {
    const host = inputs[CoreQuestionNames.OfficeAddinHost] as string;
    const capability = inputs[CoreQuestionNames.Capabilities];
    const lang = toLower(inputs[CoreQuestionNames.ProgrammingLanguage]) as
      | "javascript"
      | "typescript";
    const templateConfig = getOfficeAddinTemplateConfig(host);
    const templateName = templateConfig[capability].localTemplate;
    const projectLink = templateConfig[capability].framework["default"][lang];
    merge(actionContext?.telemetryProps, {
      [OfficeXMLAddinTelemetryProperties.host]: host,
      [OfficeXMLAddinTelemetryProperties.project]: capability,
      [OfficeXMLAddinTelemetryProperties.lang]: lang,
    });

    process.chdir(destinationPath);
    const templates: TemplateInfo[] = [];
    if (!!projectLink) {
      // [Condition]: Project have remote repo (not manifest-only proj)

      // -> Step: Download the project from GitHub
      const fetchRes = await HelperMethods.fetchAndUnzip(
        this.componentName,
        projectLink,
        destinationPath
      );
      if (fetchRes.isErr()) {
        return err(fetchRes.error);
      }
      // -> Step: Convert to single Host
      await OfficeXMLAddinGenerator.childProcessExec(
        `npm run convert-to-single-host --if-present -- ${toLower(host)}`
      );
    } else {
      templates.push({
        templateName: `${TEMPLATE_BASE}-manifest-only`,
        language: lang as ProgrammingLanguage,
      });
    }
    // -> Common Step: Copy the README (or with manifest for manifest-only proj)
    templates.push({
      templateName: `${TEMPLATE_BASE}-${templateName}`,
      language: lang as ProgrammingLanguage,
    });
    templates.push({
      templateName: TEMPLATE_COMMON_NAME,
      language: ProgrammingLanguage.Common,
    });
    return ok(templates);
  }

  public async post(
    context: Context,
    inputs: Inputs,
    destinationPath: string,
    actionContext?: ActionContext
  ): Promise<Result<GeneratorResult, FxError>> {
    const appName = inputs[CoreQuestionNames.AppName] as string;
    // -> Common Step: Modify the Manifest
    await OfficeAddinManifest.modifyManifestFile(
      `${join(destinationPath, "manifest.xml")}`,
      "random",
      `${appName}`
    );
    return ok({});
  }

  public static async childProcessExec(cmdLine: string): Promise<{
    stdout: string;
    stderr: string;
  }> {
    return promisify(childProcess.exec)(cmdLine);
  }
}
