// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  err,
  FxError,
  ok,
  OptionItem,
  QTreeNode,
  Result,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { Container } from "typedi";
import { BuiltInResourcePluginNames } from "./constants";
import { InvalidInputError } from "./error";
import { createSelectModuleQuestionNode, selectScaffoldTemplateQuestion } from "./questions";

function getAllScaffoldPlugins(): v3.ScaffoldPlugin[] {
  return [];
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
  inputs: v2.InputsWithProjectPath & { module?: number; template: OptionItem }
): Promise<Result<Void, FxError>> {
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
  //call appstudio.scaffold() API
  const appstudioPlugin = Container.get<v3.ScaffoldPlugin>(BuiltInResourcePluginNames.AppStudio);
  await appstudioPlugin.scaffold(ctx, pluginInputs);
  return ok(Void);
}
