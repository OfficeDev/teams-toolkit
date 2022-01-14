// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AppStudioTokenProvider,
  err,
  FxError,
  Inputs,
  ok,
  OptionItem,
  QTreeNode,
  Result,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { Container } from "typedi";
import { BuiltInScaffoldPluginNames } from "../fx-solution/v3/constants";
import { createSelectModuleQuestionNode, selectScaffoldTemplateQuestion } from "../utils/questions";

export async function getQuestionsForScaffold(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath
): Promise<Result<QTreeNode | undefined, FxError>> {
  const node = new QTreeNode({ type: "group" });
  const solutionSettings = ctx.projectSetting.solutionSettings as v3.TeamsSPFxSolutionSettings;
  if (solutionSettings.modules) {
    const moduleNode = createSelectModuleQuestionNode(solutionSettings.modules);
    node.addChild(moduleNode);
  }
  const templateNode = new QTreeNode(selectScaffoldTemplateQuestion);
  const staticOptions: OptionItem[] = [];
  const spfxPlugin: v3.ScaffoldPlugin = Container.get<v3.ScaffoldPlugin>(
    BuiltInScaffoldPluginNames.spfx
  );
  const scaffoldPlugins = [spfxPlugin];
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
    if (plugin.getQuestionsForScaffold) {
      const pluginQuestionsRes = await plugin.getQuestionsForScaffold(ctx, inputs);
      if (pluginQuestionsRes.isOk()) {
        const pluginNode = pluginQuestionsRes.value;
        if (pluginNode) {
          pluginNode.condition = {
            validFunc: async (input: OptionItem, inputs?: Inputs): Promise<string | undefined> => {
              if (input.data) {
                if ((input.data as any).pluginName === plugin.name) return undefined;
              }
              return "";
            },
          };
          templateNode.addChild(pluginNode);
        }
      }
    }
  }
  selectScaffoldTemplateQuestion.staticOptions = staticOptions;
  node.addChild(templateNode);

  return ok(node);
}

export async function publishApplication(
  ctx: v2.Context,
  inputs: Inputs,
  envInfo: v2.EnvInfoV2,
  tokenProvider: AppStudioTokenProvider
): Promise<Result<Void, FxError>> {
  return ok(Void);
}

export async function addResource(
  ctx: v2.Context,
  inputs: v3.SolutionAddResourceInputs
): Promise<Result<Void, FxError>> {
  return ok(Void);
}
