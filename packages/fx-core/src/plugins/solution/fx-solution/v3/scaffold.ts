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
import Container from "typedi";
import { InvalidInputError } from "../error";
import { scaffoldTemplatesQuestion } from "./questions";

function getAllScaffoldPlugins(): v3.ScaffoldPlugin[] {
  return [];
}

export async function getQuestionsForScaffold(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath
): Promise<Result<QTreeNode | undefined, FxError>> {
  const scaffoldPlugins = getAllScaffoldPlugins();
  const node = new QTreeNode(scaffoldTemplatesQuestion);
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
  scaffoldTemplatesQuestion.staticOptions = staticOptions;
  return ok(node);
}
export async function scaffold(
  ctx: v2.Context,
  inputs: v3.PluginScaffoldInputs & { module?: number; template: OptionItem }
): Promise<Result<Void, FxError>> {
  const template = inputs.template;
  if (!template.data) {
    return err(new InvalidInputError(inputs));
  }
  const data = template.data as { pluginName: string; templateName: string };
  const pluginName = data.pluginName;
  const templateName = data.templateName;
  (inputs as any).template = templateName;
  const plugin = Container.get<v3.ScaffoldPlugin>(pluginName);
  const res = await plugin.scaffold(ctx, inputs);
  if (res.isErr()) {
    return err(res.error);
  }
  const manifest = [];
  if (res.value) {
    manifest.push(res.value);
  }
  inputs.manifest = manifest;
  //call appstudio.scaffold() API
  const appstudioPlugin = Container.get<v3.ScaffoldPlugin>("fx-resource-appstudio");
  appstudioPlugin.scaffold(ctx, inputs);
  return ok(Void);
}
