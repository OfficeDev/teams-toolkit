// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author zyun@microsoft.com
 */

import { hooks } from "@feathersjs/hooks/lib";
import { Context, FxError, Inputs, Result, err, ok } from "@microsoft/teamsfx-api";
import * as childProcess from "child_process";
import _ from "lodash";
import { OfficeAddinManifest } from "office-addin-manifest";
import { join } from "path";
import { promisify } from "util";
import { getLocalizedString } from "../../../common/localizeUtils";
import { assembleError } from "../../../error";
import { QuestionNames } from "../../../question/questionNames";
import { ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { Generator } from "../generator";
import { HelperMethods } from "../officeAddin/helperMethods";
import { getOfficeAddinTemplateConfig } from "./projectConfig";
import { convertToLangKey } from "../utils";

const COMPONENT_NAME = "office-xml-addin";
const TELEMETRY_EVENT = "generate";
const TEMPLATE_BASE = "office-xml-addin";

/**
 * project-type=office-xml-addin-type addin-host!==outlook
 */
export class OfficeXMLAddinGenerator {
  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: COMPONENT_NAME,
      telemetryEventName: TELEMETRY_EVENT,
      errorSource: COMPONENT_NAME,
    }),
  ])
  static async generate(
    context: Context,
    inputs: Inputs,
    destinationPath: string
  ): Promise<Result<undefined, FxError>> {
    const host = inputs[QuestionNames.OfficeAddinHost] as string;
    const capability = inputs[QuestionNames.Capabilities];
    const language = _.toLower(inputs[QuestionNames.ProgrammingLanguage]) as
      | "javascript"
      | "typescript";
    const languageShort = convertToLangKey(language);
    const appName = inputs[QuestionNames.AppName] as string;
    const projectType = inputs[QuestionNames.ProjectType];
    const templteConfig = getOfficeAddinTemplateConfig(projectType, host);
    const templateName = templteConfig[capability].localTemplate;
    const projectLink = templteConfig[capability].framework["default"][language];
    const workingDir = process.cwd();
    const progressBar = context.userInteraction.createProgressBar(
      getLocalizedString("core.createProjectQuestion.officeXMLAddin.bar.title"),
      1
    );

    try {
      process.chdir(destinationPath);
      await progressBar.start();
      await progressBar.next(
        getLocalizedString("core.createProjectQuestion.officeXMLAddin.bar.detail")
      );

      if (!!projectLink) {
        // [Condition]: Project have remote repo (not manifest-only proj)

        // -> Step: Download the project from GitHub
        await HelperMethods.downloadProjectTemplateZipFile(destinationPath, projectLink);

        // -> Step: Convert to single Host
        await OfficeXMLAddinGenerator.childProcessExec(
          `npm run convert-to-single-host --if-present -- ${_.toLower(host)}`
        );
      } else {
        // [Condition]: Manifest Only

        // -> Step: Copy proj files for manifest-only project
        const getManifestOnlyProjectTemplateRes = await Generator.generateTemplate(
          context,
          destinationPath,
          `${TEMPLATE_BASE}-manifest-only`,
          languageShort
        );
        if (getManifestOnlyProjectTemplateRes.isErr())
          return err(getManifestOnlyProjectTemplateRes.error);
      }

      // -> Common Step: Copy the README (or with manifest for manifest-only proj)
      const getReadmeTemplateRes = await Generator.generateTemplate(
        context,
        destinationPath,
        `${TEMPLATE_BASE}-${templateName}`,
        languageShort
      );
      if (getReadmeTemplateRes.isErr()) return err(getReadmeTemplateRes.error);

      // -> Common Step: Modify the Manifest
      await OfficeAddinManifest.modifyManifestFile(
        `${join(destinationPath, "manifest.xml")}`,
        "random",
        `${appName}`
      );

      process.chdir(workingDir);
      await progressBar.end(true, true);
      return ok(undefined);
    } catch (e) {
      process.chdir(workingDir);
      await progressBar.end(false, true);
      return err(assembleError(e as Error));
    }
  }

  public static async childProcessExec(cmdLine: string): Promise<{
    stdout: string;
    stderr: string;
  }> {
    return promisify(childProcess.exec)(cmdLine);
  }
}
