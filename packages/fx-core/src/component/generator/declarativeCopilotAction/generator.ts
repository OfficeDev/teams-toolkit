// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Context, FxError, Inputs, ok, Result } from "@microsoft/teamsfx-api";
import { DefaultTemplateGenerator } from "../templates/templateGenerator";
import {
  ApiAuthOptions,
  ApiPluginStartOptions,
  CapabilityOptions,
  ProgrammingLanguage,
  QuestionNames,
} from "../../../question";
import { ActionContext } from "../../middleware/actionExecutionMW";
import { Generator } from "../generator";
import { merge } from "lodash";
import { TemplateNames } from "../templates/templateNames";
import { TemplateInfo } from "../templates/templateInfo";

/**
 * @author yuqzho@microsoft.com
 */

export class DeclarativeCopilotActionGenerator extends DefaultTemplateGenerator {
  public activate(context: Context, inputs: Inputs): boolean {
    return (
      (inputs[QuestionNames.Capabilities] === CapabilityOptions.declarativeCopilot().id ||
        inputs[QuestionNames.Capabilities] === CapabilityOptions.apiPlugin().id) &&
      inputs[QuestionNames.ApiPluginType] === ApiPluginStartOptions.newApi().id
    );
  }

  public getTemplateInfos(
    context: Context,
    inputs: Inputs,
    destinationPath: string,
    actionContext?: ActionContext
  ): Promise<Result<TemplateInfo[], FxError>> {
    const auth = inputs[QuestionNames.ApiAuth];
    const appName = inputs[QuestionNames.AppName];
    const language = inputs[QuestionNames.ProgrammingLanguage] as ProgrammingLanguage;
    const safeProjectNameFromVS =
      language === "csharp" ? inputs[QuestionNames.SafeProjectName] : undefined;
    const isDeclarativeCopilot =
      inputs[QuestionNames.Capabilities] === CapabilityOptions.declarativeCopilot().id;

    const replaceMap = {
      ...Generator.getDefaultVariables(
        appName,
        safeProjectNameFromVS,
        inputs.targetFramework,
        inputs.placeProjectFileInSolutionDir === "true"
      ),
      DeclarativeCopilot: isDeclarativeCopilot ? "true" : "",
    };

    const filterFn = (fileName: string) => {
      if (fileName.startsWith("repairDeclarativeCopilot.json")) {
        return isDeclarativeCopilot;
      } else {
        return true;
      }
    };

    if (auth === ApiAuthOptions.none()) {
      return ok([
        {
          templateName: TemplateNames.ApiPluginFromScratch,
          language: language,
          replaceMap,
          filterFn,
        },
      ]);
    } else if (auth === ApiAuthOptions.apiKey()) {
      return ok([
        {
          templateName: TemplateNames.ApiPluginFromScratchBearer,
          language: language,
          replaceMap,
          filterFn,
        },
      ]);
    } else if (auth === ApiAuthOptions.oauth()) {
      return ok([
        {
          templateName: TemplateNames.ApiPluginFromScratchOAuth,
          language: language,
          replaceMap,
          filterFn,
        },
      ]);
    } else {
      return ok([]);
    }
  }
}