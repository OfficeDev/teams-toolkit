// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Platform, QTreeNode } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import {
  frameworkQuestion,
  loadPackageVersions,
  spfxPackageSelectQuestion,
  webpartNameQuestion,
} from "../../component/resource/spfx/utils/questions";

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
