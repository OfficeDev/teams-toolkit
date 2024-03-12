// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author zyun@microsoft.com
 */

import { hooks } from "@feathersjs/hooks/lib";
import { FxError, Inputs, Result, ok, err, Context } from "@microsoft/teamsfx-api";
import * as childProcess from "child_process";
import _ from "lodash";
import { OfficeAddinManifest } from "office-addin-manifest";
import { join } from "path";
import { promisify } from "util";
import { Generator } from "../generator";
import { HelperMethods } from "../officeAddin/helperMethods";
import { ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { assembleError } from "../../../error";
import { ProgrammingLanguage } from "../../../question/create";
import { QuestionNames } from "../../../question/questionNames";
import {
  getOfficeXMLAddinHostProjectRepoInfo,
  getOfficeXMLAddinHostProjectTemplateName,
} from "./projectConfig";
import { getLocalizedString } from "../../../common/localizeUtils";

const COMPONENT_NAME = "office-xml-addin";
const TELEMETRY_EVENT = "generate";
const TEMPLATE_BASE = "office-xml-addin";

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
    const project = inputs[QuestionNames.Capabilities];
    const lang = inputs[QuestionNames.ProgrammingLanguage] === ProgrammingLanguage.TS ? "ts" : "js";
    const appName = inputs[QuestionNames.AppName] as string;
    const templateName = getOfficeXMLAddinHostProjectTemplateName(host, project);
    const repoInfo = getOfficeXMLAddinHostProjectRepoInfo(host, project, lang);
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

      if (!!repoInfo) {
        // [Condition]: Project have remote repo (not manifest-only proj)

        // -> Step: Download the project from GitHub
        await HelperMethods.downloadProjectTemplateZipFile(destinationPath, repoInfo);

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
          lang
        );
        if (getManifestOnlyProjectTemplateRes.isErr())
          return err(getManifestOnlyProjectTemplateRes.error);
      }

      // -> Common Step: Copy the README (or with manifest for manifest-only proj)
      const getReadmeTemplateRes = await Generator.generateTemplate(
        context,
        destinationPath,
        `${TEMPLATE_BASE}-${templateName}`,
        lang
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
