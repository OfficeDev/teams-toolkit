// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yuqzho@microsoft.com
 */

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

const enum telemetryProperties {
  templateName = "template-name",
  isDeclarativeCopilot = "is-declarative-copilot",
}

export class CopilotExtensionFromScratchGenerator extends DefaultTemplateGenerator {
  componentName = "copilot-extension-from-scratch-generator";
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
      if (fileName.includes("repairDeclarativeCopilot.json")) {
        return isDeclarativeCopilot;
      } else {
        return true;
      }
    };

    const templateName =
      auth === ApiAuthOptions.apiKey().id
        ? TemplateNames.ApiPluginFromScratchBearer
        : auth === ApiAuthOptions.oauth().id
        ? TemplateNames.ApiPluginFromScratchOAuth
        : TemplateNames.ApiPluginFromScratch;

    merge(actionContext?.telemetryProps, {
      [telemetryProperties.templateName]: templateName,
      [telemetryProperties.isDeclarativeCopilot]: isDeclarativeCopilot.toString(),
    });

    return Promise.resolve(
      ok([
        {
          templateName,
          language: language,
          replaceMap,
          filterFn,
        },
      ])
    );
  }
}
