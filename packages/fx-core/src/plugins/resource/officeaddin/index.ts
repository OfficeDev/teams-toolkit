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
  DevPreviewManifest,
  ManifestUtil,
} from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { isOfficeAddinEnabled } from "../../../common";
import { ResourcePluginsV2 } from "../../solution/fx-solution/ResourcePluginContainer";
import { UndefinedProjectPathError } from "./errors";
import { mkdir } from "fs-extra";
import { join, resolve } from "path";
import {
  AddinNameQuestion,
  AddinLanguageQuestion,
  OfficeHostQuestion,
  getTemplate,
  AddinProjectFolderQuestion,
  AddinProjectManifestQuestion,
} from "./questions";
import { helperMethods } from "./helperMethods";
import { OfficeAddinManifest } from "office-addin-manifest";
import projectsJsonData from "./config/projectsJsonData";
import * as childProcess from "child_process";
import { promisify } from "util";
import { CopyFileError } from "../../../core/error";
import _ from "lodash";
import {
  AzureSolutionQuestionNames,
  HostTypeOptionOfficeAddin,
  ImportAddinProjectItem,
  OfficeAddinItems,
} from "../../solution";

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
    const template = getTemplate(inputs);
    const name = inputs[AddinNameQuestion.name];
    const addinRoot = resolve(projectRoot, name);
    const fromFolder = inputs[AddinProjectFolderQuestion.name];
    const language = inputs[AddinLanguageQuestion.name];
    const host = inputs[OfficeHostQuestion.name];
    const workingDir = process.cwd();

    await mkdir(addinRoot);
    process.chdir(addinRoot);
    try {
      if (!fromFolder) {
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
          await OfficeAddinManifest.modifyManifestFile(
            `${join(addinRoot, jsonData.getManifestPath(template) as string)}`,
            "random",
            `${name}`
          );
        }
      } else {
        helperMethods.copyAddinFiles(fromFolder, addinRoot);
        const manifestFile: string = inputs[AddinProjectManifestQuestion.name];
        inputs[OfficeHostQuestion.name] = await getHost(manifestFile);
        helperMethods.updateManifest(projectRoot, manifestFile);
        // TODO: After able to sideload using shared manifest we can then delete manifest file in subfolder
        // => join(addinRoot, "manifest.json"); but figure out the actual path in the new location
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
    const nameNode = new QTreeNode(AddinNameQuestion);

    const importNode = new QTreeNode({ type: "group" });
    importNode.condition = {
      validFunc: (input: unknown, inputs?: Inputs) => {
        if (!inputs) {
          return "Invalid inputs";
        }
        const cap = inputs[AzureSolutionQuestionNames.Capabilities] as string;
        if (cap === ImportAddinProjectItem.id) {
          return undefined;
        }
        return "Office Addin is not selected";
      },
    };
    importNode.addChild(new QTreeNode(AddinProjectFolderQuestion));
    importNode.addChild(new QTreeNode(AddinProjectManifestQuestion));

    const templateNode = new QTreeNode({ type: "group" });
    templateNode.condition = {
      validFunc: (input: unknown, inputs?: Inputs) => {
        if (!inputs) {
          return "Invalid inputs";
        }
        const cap = inputs[AzureSolutionQuestionNames.Capabilities] as string;
        const addinOptionIds: string[] = [
          ...OfficeAddinItems.map((item) => {
            return item.id;
          }),
        ];
        if (addinOptionIds.includes(cap)) {
          return undefined;
        }
        return "Office Addin is not selected";
      },
    };
    templateNode.addChild(new QTreeNode(AddinLanguageQuestion));
    templateNode.addChild(new QTreeNode(OfficeHostQuestion));

    const root = new QTreeNode({ type: "group" });
    root.addChild(importNode);
    root.addChild(templateNode);
    root.addChild(nameNode);

    return ok(root);
  }
}

// TODO: update to handle different hosts when support for them is implemented
// TODO: handle multiple scopes
type OfficeHost = "Outlook"; // | "Word" | "OneNote" | "PowerPoint" | "Project" | "Excel"
async function getHost(addinManifestPath: string): Promise<OfficeHost> {
  // Read add-in manifest file
  const addinManifest: DevPreviewManifest = await ManifestUtil.loadFromPath(addinManifestPath);
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
