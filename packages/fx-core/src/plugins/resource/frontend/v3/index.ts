// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Inputs, Json, ok, Result, v2, v3 } from "@microsoft/teamsfx-api";
import * as path from "path";
import { Service } from "typedi";
import {
  genTemplateRenderReplaceFn,
  removeTemplateExtReplaceFn,
  ScaffoldAction,
  ScaffoldActionName,
  ScaffoldContext,
  scaffoldFromTemplates,
} from "../../../../common/templatesActions";
import { BuiltInScaffoldPluginNames } from "../../../solution/fx-solution/v3/constants";
import { getModule } from "../../../solution/fx-solution/v3/utils";
import { Constants, FrontendPathInfo } from "../constants";
import {
  TemplateZipFallbackError,
  UnknownScaffoldError,
  UnzipTemplateError,
} from "../resources/errors";
import { Messages } from "../resources/messages";
import { Scenario, TemplateInfo } from "../resources/templateInfo";
import { ScaffoldSteps } from "../utils/progress-helper";

@Service(BuiltInScaffoldPluginNames.tab)
export class ReactTabScaffoldPlugin implements v3.ScaffoldPlugin {
  async getTemplates(
    ctx: v2.Context,
    inputs: Inputs
  ): Promise<Result<v3.ScaffoldTemplate[], FxError>> {
    return ok([
      {
        name: "ReactTab_JS",
        language: "javascript",
        description: "Tab frontend with React Framework using Javascript",
      },
      {
        name: "ReactTab_TS",
        language: "typescript",
        description: "Tab frontend with React Framework using Typescript",
      },
    ]);
  }
  async scaffold(
    ctx: v3.ContextWithManifest,
    inputs: v3.PluginScaffoldInputs
  ): Promise<Result<Json | undefined, FxError>> {
    ctx.logProvider.info(Messages.StartScaffold(this.name));
    const progress = ctx.userInteraction.createProgressBar(
      Messages.ScaffoldProgressTitle,
      Object.entries(ScaffoldSteps).length
    );
    await progress.start(Messages.ProgressStart);
    await progress.next(ScaffoldSteps.Scaffold);
    const template = inputs.template;
    const language = template === "ReactTab_TS" ? "ts" : "js";
    const componentPath = path.join(inputs.projectPath, FrontendPathInfo.WorkingDir);
    const variables = { showFunction: "false" };
    await scaffoldFromTemplates({
      group: TemplateInfo.TemplateGroupName,
      lang: language,
      scenario: Scenario.Default,
      templatesFolderName: FrontendPathInfo.TemplateFolderName,
      dst: componentPath,
      fileNameReplaceFn: removeTemplateExtReplaceFn,
      fileDataReplaceFn: genTemplateRenderReplaceFn(variables),
      onActionEnd: async (action: ScaffoldAction, context: ScaffoldContext) => {
        if (action.name === ScaffoldActionName.FetchTemplatesUrlWithTag) {
          ctx.logProvider.info(Messages.getTemplateFrom(context.zipUrl ?? Constants.EmptyString));
        }
      },
      onActionError: async (action: ScaffoldAction, context: ScaffoldContext, error: Error) => {
        ctx.logProvider.info(error.toString());
        switch (action.name) {
          case ScaffoldActionName.FetchTemplatesUrlWithTag:
          case ScaffoldActionName.FetchTemplatesZipFromUrl:
            // TelemetryHelper.sendScaffoldFallbackEvent(new TemplateManifestError(error.message));//TODO
            ctx.logProvider.info(Messages.FailedFetchTemplate);
            break;
          case ScaffoldActionName.FetchTemplateZipFromLocal:
            throw new TemplateZipFallbackError();
          case ScaffoldActionName.Unzip:
            throw new UnzipTemplateError();
          default:
            throw new UnknownScaffoldError();
        }
      },
    });
    await progress.end(true);
    ctx.logProvider.info(Messages.EndScaffold(this.name));
    const solutionSettings = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
    const module = getModule(solutionSettings, inputs.module);
    if (module) {
      module.dir = FrontendPathInfo.WorkingDir;
      module.deployType = "folder";
    }
    return ok(undefined);
  }
  name = BuiltInScaffoldPluginNames.tab;
}
