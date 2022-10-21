// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  Inputs,
  ProjectSettings,
  Result,
  ok,
  v2,
  Void,
  err,
  QTreeNode,
  AzureSolutionSettings,
} from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { isOfficeAddinEnabled } from "../../../common";
import { ResourcePluginsV2 } from "../../solution/fx-solution/ResourcePluginContainer";
import { UndefinedProjectPathError } from "./errors";
import { mkdir } from "fs-extra";
import { join, resolve } from "path";
import {
  AddinTemplateSelectQuestion,
  AddinNameQuestion,
  AddinLanguageQuestion,
  OfficeHostQuestion,
} from "./questions";
import { helperMethods } from "./helperMethods";
import { OfficeAddinManifest } from "office-addin-manifest";
import projectsJsonData from "./config/projectsJsonData";
import * as childProcess from "child_process";
import { promisify } from "util";
import { CopyFileError } from "../../../core/error";
import _ from "lodash";
import { HostTypeOptionOfficeAddin } from "../../solution";

const childProcessExec = promisify(childProcess.exec);

@Service(ResourcePluginsV2.OfficeAddinPlugin)
export class OfficeAddinPlugin implements v2.ResourcePlugin {
  name = "fx-resource-office-addin";
  displayName = "Office Addin";

  activate(projectSettings: ProjectSettings): boolean {
    const solutionSettings = projectSettings.solutionSettings as AzureSolutionSettings;
    return isOfficeAddinEnabled() && solutionSettings.hostType === HostTypeOptionOfficeAddin.id;
  }

  async scaffoldSourceCode(ctx: v2.Context, inputs: Inputs): Promise<Result<Void, FxError>> {
    const projectRoot = inputs.projectPath;
    if (!projectRoot) {
      return err(UndefinedProjectPathError());
    }

    // You can access the answers(id of options selected) to the questions defined in getQuestionsForScaffolding();
    const template = inputs[AddinTemplateSelectQuestion.name] as string;
    const name = inputs[AddinNameQuestion.name];
    const addinRoot = resolve(projectRoot, name);
    const language = inputs[AddinLanguageQuestion.name];
    const host = inputs[OfficeHostQuestion.name];
    const workingDir = process.cwd();

    await mkdir(addinRoot);
    process.chdir(addinRoot);
    try {
      const jsonData = new projectsJsonData();
      const projectRepoBranchInfo = jsonData.getProjectRepoAndBranch(template, language, true);

      // Copy project template files from project repository
      if (projectRepoBranchInfo.repo) {
        await helperMethods.downloadProjectTemplateZipFile(
          addinRoot,
          projectRepoBranchInfo.repo,
          projectRepoBranchInfo.branch
        );

        // Call 'convert-to-single-host' npm script in generated project, passing in host parameter
        const cmdLine = `npm run convert-to-single-host --if-present -- ${_.toLower(host)}`;
        await childProcessExec(cmdLine);

        // modify manifest guid and DisplayName
        const manifestPath = join(addinRoot, jsonData.getManifestPath(template) as string);
        await OfficeAddinManifest.modifyManifestFile(manifestPath, "random", name);
      }
      process.chdir(workingDir);
      return ok(Void);
    } catch (e) {
      process.chdir(workingDir);
      return err(CopyFileError(e as Error));
    }
  }

  async getQuestionsForScaffolding(
    ctx: v2.Context,
    inputs: Inputs
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    const root = new QTreeNode({ type: "group" });
    const templateNode = new QTreeNode(AddinTemplateSelectQuestion);

    root.addChild(templateNode);
    root.addChild(new QTreeNode(AddinNameQuestion));

    templateNode.addChild(new QTreeNode(AddinLanguageQuestion));
    templateNode.addChild(new QTreeNode(OfficeHostQuestion));

    return ok(root);
  }
}
