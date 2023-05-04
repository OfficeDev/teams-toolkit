// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import fs from "fs-extra";
import * as path from "path";
import {
  ContextV3,
  err,
  FxError,
  InputsWithProjectPath,
  ok,
  Platform,
  ProjectSettingsV3,
  QTreeNode,
  Result,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Container, Service } from "typedi";
import { globalVars } from "../../core/globalVars";
import { CoreQuestionNames } from "../../core/question";
import {
  frameworkQuestion,
  loadPackageVersions,
  spfxPackageSelectQuestion,
  versionCheckQuestion,
  webpartNameQuestion,
} from "../../component/resource/spfx/utils/questions";
import { SPFxTabCodeProvider } from "../code/spfxTabCode";
import { ComponentNames } from "../constants";
import { generateLocalDebugSettings } from "../debug";
import { addFeatureNotify, scaffoldRootReadme } from "../utils";
import { isSPFxMultiTabEnabled } from "../../common/featureFlags";
import { TabSPFxNewUIItem } from "../constants";
import { getComponent } from "../workflow";

@Service(ComponentNames.SPFxTab)
export class SPFxTab {
  name = ComponentNames.SPFxTab;
  async add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    const projectSettings = context.projectSetting as ProjectSettingsV3;
    const spfxTabConfig = getComponent(projectSettings, ComponentNames.SPFx);
    if (!spfxTabConfig) {
      // add teams-tab
      projectSettings.components.push({
        name: "teams-tab",
        hosting: ComponentNames.SPFx,
        deploy: true,
        folder: inputs.folder || "SPFx",
        build: true,
      });
      // add hosting component
      projectSettings.components.push({
        name: ComponentNames.SPFx,
        provision: true,
      });
    }

    projectSettings.programmingLanguage =
      projectSettings.programmingLanguage || inputs[CoreQuestionNames.ProgrammingLanguage];
    globalVars.isVS = inputs[CoreQuestionNames.ProgrammingLanguage] === "csharp";
    const effects = ["config 'teams-tab' in projectSettings"];
    {
      const spfxCode = Container.get<SPFxTabCodeProvider>(ComponentNames.SPFxTabCode);
      const res = await spfxCode.generate(context, inputs);
      if (res.isErr()) return err(res.error);
      effects.push("scaffold spfx code");
    }
    {
      const res = await generateLocalDebugSettings(context, inputs);
      if (res.isErr()) return err(res.error);
      effects.push("generate debug settings");
    }
    if (isSPFxMultiTabEnabled()) {
      await scaffoldRootReadme(context.projectSetting, inputs.projectPath);
    }
    addFeatureNotify(inputs, context.userInteraction, "Capability", [inputs.features]);
    return ok(undefined);
  }
}

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
