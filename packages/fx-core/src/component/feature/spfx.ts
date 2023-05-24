// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Platform, QTreeNode, Result } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import "reflect-metadata";
import {
  frameworkQuestion,
  loadPackageVersions,
  spfxPackageSelectQuestion,
  versionCheckQuestion,
  webpartNameQuestion,
} from "../../component/resource/spfx/utils/questions";
import { TabSPFxNewUIItem } from "../constants";

export function getSPFxScaffoldQuestion(platform: Platform): QTreeNode {
  const spfx_frontend_host = new QTreeNode({
    type: "group",
  });

  const spfx_select_package_question = new QTreeNode(spfxPackageSelectQuestion);
  const spfx_framework_type = new QTreeNode(frameworkQuestion);
  const spfx_webpart_name = new QTreeNode(webpartNameQuestion);

  if (platform !== Platform.CLI_HELP) {
    const spfx_load_package_versions = new QTreeNode(loadPackageVersions);
    spfx_load_package_versions.addChild(spfx_select_package_question);
    spfx_select_package_question.addChild(spfx_framework_type);
    spfx_select_package_question.addChild(spfx_webpart_name);

    spfx_frontend_host.addChild(spfx_load_package_versions);
  } else {
    spfx_frontend_host.addChild(spfx_select_package_question);
    spfx_frontend_host.addChild(spfx_framework_type);
    spfx_frontend_host.addChild(spfx_webpart_name);
  }

  return spfx_frontend_host;
}

export async function getAddSPFxQuestionNode(
  projectPath: string | undefined
): Promise<Result<QTreeNode | undefined, FxError>> {
  const spfx_add_feature = new QTreeNode({
    type: "group",
  });
  spfx_add_feature.condition = { equals: TabSPFxNewUIItem().id };

  const spfx_version_check = new QTreeNode(versionCheckQuestion);
  spfx_add_feature.addChild(spfx_version_check);

  if (projectPath) {
    const yorcPath = path.join(projectPath, "SPFx", ".yo-rc.json");
    if (await fs.pathExists(yorcPath)) {
      const yorc = await fs.readJson(yorcPath);
      const template = yorc["@microsoft/generator-sharepoint"]?.template;
      if (template === undefined || template === "") {
        const spfx_framework_type = new QTreeNode(frameworkQuestion);
        spfx_version_check.addChild(spfx_framework_type);
      }
    } else {
      const spfx_framework_type = new QTreeNode(frameworkQuestion);
      spfx_version_check.addChild(spfx_framework_type);
    }
  }

  const spfx_webpart_name = new QTreeNode(webpartNameQuestion);
  spfx_version_check.addChild(spfx_webpart_name);
  return ok(spfx_add_feature);
}
