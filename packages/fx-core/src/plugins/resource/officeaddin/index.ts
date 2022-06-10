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
} from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { isOfficeAddinEnabled } from "../../../common";
import { ResourcePluginsV2 } from "../../solution/fx-solution/ResourcePluginContainer";
import { UndefinedProjectPathError } from "./errors";
import { writeJSON, mkdir } from "fs-extra";
import { resolve } from "path";
import { ExampleMultiSelectQuestion, ExampleSingleSelectQuestion } from "./questions";

@Service(ResourcePluginsV2.OfficeAddinPlugin)
export class OfficeAddinPlugin implements v2.ResourcePlugin {
  name = "fx-resource-office-addin";
  displayName = "Office Addin";

  activate(_projectSettings: ProjectSettings): boolean {
    return isOfficeAddinEnabled();
  }

  async scaffoldSourceCode(ctx: v2.Context, inputs: Inputs): Promise<Result<Void, FxError>> {
    const projectRoot = inputs.projectPath;
    if (!projectRoot) {
      return err(UndefinedProjectPathError());
    }
    const folderName = "office-addin";
    // TODO: add logic for generating office addin templates
    await mkdir(resolve(projectRoot, folderName));
    await writeJSON(resolve(projectRoot, folderName, "someFile.json"), { key: "value" });

    return ok(Void);
  }

  async getQuestionsForScaffolding(
    ctx: v2.Context,
    inputs: Inputs
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    const root = new QTreeNode({ type: "group" });

    root.addChild(new QTreeNode(ExampleSingleSelectQuestion));
    root.addChild(new QTreeNode(ExampleMultiSelectQuestion));

    return ok(root);
  }
}
