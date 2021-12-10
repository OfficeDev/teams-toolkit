// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  err,
  FxError,
  Inputs,
  Json,
  ok,
  OptionItem,
  QTreeNode,
  Result,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import { Container, Service } from "typedi";
import { InvalidInputError } from "./error";
import { createSelectModuleQuestionNode, selectScaffoldTemplateQuestion } from "./questions";
@Service("fx-scaffold-react-tab")
export class ReactTabScaffoldPlugin implements v3.ScaffoldPlugin {
  async getTemplates(
    ctx: v2.Context,
    inputs: Inputs
  ): Promise<Result<v3.ScaffoldTemplate[], FxError>> {
    return ok([
      {
        name: "ReactTab",
        language: "javascript",
        description: "ReactTab",
      },
    ]);
  }

  async scaffold(
    ctx: v2.Context,
    inputs: v3.PluginScaffoldInputs
  ): Promise<Result<Json | undefined, FxError>> {
    ctx.logProvider.info("fx-scaffold-react-tab:scaffold");
    await fs.ensureDir(path.join(inputs.projectPath, "react-tab"));
    const solutionSettings = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
    if (inputs.module !== undefined) {
      solutionSettings.modules[Number(inputs.module)].dir = "react-tab";
      solutionSettings.modules[Number(inputs.module)].deployType = "folder";
    }
    return ok(undefined);
  }
  name = "fx-scaffold-react-tab";
}

@Service("fx-scaffold-blazor-tab")
export class BlazorTabScaffoldPlugin implements v3.ScaffoldPlugin {
  async getTemplates(
    ctx: v2.Context,
    inputs: Inputs
  ): Promise<Result<v3.ScaffoldTemplate[], FxError>> {
    return ok([
      {
        name: "BlazorTab",
        language: "csharp",
        description: "BlazorTab",
      },
    ]);
  }

  async scaffold(
    ctx: v2.Context,
    inputs: v3.PluginScaffoldInputs
  ): Promise<Result<Json | undefined, FxError>> {
    ctx.logProvider.info("fx-scaffold-blazor-tab:scaffold");
    await fs.ensureDir(path.join(inputs.projectPath, "aspdnet"));
    const solutionSettings = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
    if (inputs.module !== undefined) {
      solutionSettings.modules[Number(inputs.module)].dir = "aspdnet";
      solutionSettings.modules[Number(inputs.module)].deployType = "zip";
    }
    return ok(undefined);
  }
  name = "fx-scaffold-blazor-tab";
}

function getAllScaffoldPlugins(): v3.ScaffoldPlugin[] {
  return [
    Container.get<v3.ScaffoldPlugin>("fx-scaffold-blazor-tab"),
    Container.get<v3.ScaffoldPlugin>("fx-scaffold-react-tab"),
  ];
}

export async function getQuestionsForScaffold(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath
): Promise<Result<QTreeNode | undefined, FxError>> {
  const solutionSettings = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
  const scaffoldPlugins = getAllScaffoldPlugins();
  const node = new QTreeNode({ type: "group" });
  const moduleNode = createSelectModuleQuestionNode(solutionSettings.modules);
  node.addChild(moduleNode);
  const templateNode = new QTreeNode(selectScaffoldTemplateQuestion);
  const staticOptions: OptionItem[] = [];
  for (const plugin of scaffoldPlugins) {
    const getTemplatesRes = await plugin.getTemplates(ctx, inputs);
    if (getTemplatesRes.isErr()) {
      return err(getTemplatesRes.error);
    }
    for (const template of getTemplatesRes.value) {
      staticOptions.push({
        id: `${plugin.name}/${template.name}`,
        label: `${template.name}(${template.language})`,
        detail: template.description,
        data: {
          pluginName: plugin.name,
          templateName: template.name,
        },
      });
    }
  }
  selectScaffoldTemplateQuestion.staticOptions = staticOptions;
  node.addChild(templateNode);
  return ok(node);
}
export async function scaffold(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath & { module?: number; template?: OptionItem }
): Promise<Result<Void, FxError>> {
  if (!inputs.template) {
    return err(new InvalidInputError(inputs));
  }
  const template = inputs.template;
  if (!template.data) {
    return err(new InvalidInputError(inputs));
  }
  const data = template.data as { pluginName: string; templateName: string };
  const pluginName = data.pluginName;
  const templateName = data.templateName;
  const plugin = Container.get<v3.ScaffoldPlugin>(pluginName);
  const pluginInputs: v3.PluginScaffoldInputs = {
    ...inputs,
    template: templateName,
  };
  const res = await plugin.scaffold(ctx, pluginInputs);
  if (res.isErr()) {
    return err(res.error);
  }
  const manifest = [];
  if (res.value) {
    manifest.push(res.value);
  }
  inputs.manifest = manifest;
  //TODO
  // //call appstudio.scaffold() API
  // const appstudioPlugin = Container.get<v3.ScaffoldPlugin>(BuiltInResourcePluginNames.AppStudio);
  // await appstudioPlugin.scaffold(ctx, pluginInputs);
  return ok(Void);
}
