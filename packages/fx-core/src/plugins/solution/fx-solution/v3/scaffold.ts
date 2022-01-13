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
import { AppStudioPluginV3 } from "../../../resource/appstudio/v3";
import { InvalidInputError } from "../../utils/error";
import {
  createSelectModuleQuestionNode,
  selectScaffoldTemplateQuestion,
} from "../../utils/questions";
import { scaffoldLocalDebugSettings } from "../debug/scaffolding";
import { BuiltInResourcePluginNames, BuiltInScaffoldPluginNames } from "./constants";
import { getModule } from "./utils";

@Service(BuiltInScaffoldPluginNames.bot)
export class BotScaffoldPlugin implements v3.ScaffoldPlugin {
  type: "scaffold" = "scaffold";
  async getTemplates(
    ctx: v2.Context,
    inputs: Inputs
  ): Promise<Result<v3.ScaffoldTemplate[], FxError>> {
    return ok([
      {
        name: "NodejsBot_JS",
        language: "javascript",
        description: "NodejsBot JS",
      },
      {
        name: "NodejsBot_TS",
        language: "typescript",
        description: "NodejsBot TS",
      },
    ]);
  }

  async scaffold(
    ctx: v3.ContextWithManifest,
    inputs: v3.PluginScaffoldInputs
  ): Promise<Result<Json | undefined, FxError>> {
    ctx.logProvider.info("fx-scaffold-bot:scaffold");
    if (!inputs.test) await fs.ensureDir(path.join(inputs.projectPath, "bot"));
    const solutionSettings = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
    const module = getModule(solutionSettings, inputs.module);
    if (module) {
      module.dir = "bot";
      module.deployType = "zip";
    }
    return ok(undefined);
  }
  name = BuiltInScaffoldPluginNames.bot;
}

@Service(BuiltInScaffoldPluginNames.blazor)
export class BlazorScaffoldPlugin implements v3.ScaffoldPlugin {
  type: "scaffold" = "scaffold";
  async getTemplates(
    ctx: v2.Context,
    inputs: Inputs
  ): Promise<Result<v3.ScaffoldTemplate[], FxError>> {
    return ok([
      {
        name: "BlazorTab",
        language: "csharp",
        description: "Blazor Tab",
      },
      {
        name: "BlazorBot",
        language: "csharp",
        description: "Blazor Tab",
      },
      {
        name: "BlazorTabBot",
        language: "csharp",
        description: "Blazor Tab+Bot",
      },
    ]);
  }

  async scaffold(
    ctx: v3.ContextWithManifest,
    inputs: v3.PluginScaffoldInputs
  ): Promise<Result<Json | undefined, FxError>> {
    ctx.logProvider.info("fx-scaffold-blazor:scaffold");
    if (!inputs.test) await fs.ensureDir(path.join(inputs.projectPath, "blazor"));
    const solutionSettings = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
    const module = getModule(solutionSettings, inputs.module);
    if (module) {
      module.dir = "blazor";
      module.deployType = "zip";
    }
    return ok(undefined);
  }
  name = BuiltInScaffoldPluginNames.blazor;
}

function getAllScaffoldPlugins(): v3.ScaffoldPlugin[] {
  return [
    Container.get<v3.ScaffoldPlugin>(BuiltInScaffoldPluginNames.blazor),
    Container.get<v3.ScaffoldPlugin>(BuiltInScaffoldPluginNames.tab),
    Container.get<v3.ScaffoldPlugin>(BuiltInScaffoldPluginNames.bot),
  ];
}

export async function getQuestionsForScaffold(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath
): Promise<Result<QTreeNode | undefined, FxError>> {
  const solutionSettings = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
  const scaffoldPlugins = getAllScaffoldPlugins();
  const node = new QTreeNode({ type: "group" });
  if (solutionSettings.modules) {
    const moduleNode = createSelectModuleQuestionNode(solutionSettings.modules);
    node.addChild(moduleNode);
  }
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
export async function scaffold(
  ctx: v2.Context,
  inputs: v3.SolutionScaffoldInputs,
  localSettings?: Json
): Promise<Result<Void, FxError>> {
  if (!inputs.template) {
    return err(new InvalidInputError(inputs));
  }
  const template = inputs.template;
  if (!template.data) {
    return err(new InvalidInputError(inputs, "template.data is undefined"));
  }
  const data = template.data as { pluginName: string; templateName: string };
  const pluginName = data.pluginName;
  const templateName = data.templateName;
  const plugin = Container.get<v3.ScaffoldPlugin>(pluginName);
  const pluginInputs: v3.PluginScaffoldInputs = {
    ...inputs,
    template: templateName,
  };

  // read manifest
  const appStudio = Container.get<AppStudioPluginV3>(BuiltInResourcePluginNames.appStudio);
  const manifestRes = await appStudio.loadManifest(ctx, inputs);
  if (manifestRes.isErr()) {
    return err(manifestRes.error);
  }

  // scaffold
  const manifest = manifestRes.value;
  const contextWithManifest: v3.ContextWithManifest = {
    ...ctx,
    appManifest: manifest,
  };

  const scaffoldRes = await plugin.scaffold(contextWithManifest, pluginInputs);
  if (scaffoldRes.isErr()) {
    return err(scaffoldRes.error);
  }

  // write manifest
  const writeRes = await appStudio.saveManifest(ctx, inputs, manifest);
  if (writeRes.isErr()) {
    return err(writeRes.error);
  }

  const scaffoldLocalDebugSettingsResult = await scaffoldLocalDebugSettings(
    ctx,
    inputs,
    localSettings
  );
  if (scaffoldLocalDebugSettingsResult.isErr()) {
    return scaffoldLocalDebugSettingsResult;
  }
  return ok(Void);
}
