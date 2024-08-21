// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yuqzho@microsoft.com
 */

import { Context, FxError, GeneratorResult, Inputs, ok, Result } from "@microsoft/teamsfx-api";
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
import { featureFlagManager, FeatureFlags } from "../../../common/featureFlags";
import { declarativeCopilotInstructionFileName } from "../constant";

const enum telemetryProperties {
  templateName = "template-name",
  isDeclarativeCopilot = "is-declarative-copilot",
}

/**
 * Generator for copilot extensions including declarative copilot with no plugin,
 * declarative copilot with API plugin from scratch, declarative copilot with existing plugin (to be add later),
 * and API plugin from scratch.
 */
export class CopilotExtensionGenerator extends DefaultTemplateGenerator {
  componentName = "copilot-extension-from-scratch-generator";
  public activate(context: Context, inputs: Inputs): boolean {
    return (
      (inputs[QuestionNames.Capabilities] === CapabilityOptions.declarativeCopilot().id &&
        inputs[QuestionNames.ApiPluginType] !== ApiPluginStartOptions.apiSpec().id) ||
      (inputs[QuestionNames.Capabilities] === CapabilityOptions.apiPlugin().id &&
        inputs[QuestionNames.ApiPluginType] === ApiPluginStartOptions.newApi().id)
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
    const isDeclarativeCopilot = checkDeclarativeCopilot(inputs);

    const replaceMap = {
      ...Generator.getDefaultVariables(
        appName,
        safeProjectNameFromVS,
        inputs.targetFramework,
        inputs.placeProjectFileInSolutionDir === "true"
      ),
      DeclarativeCopilot: isDeclarativeCopilot ? "true" : "",
      FileFunction: featureFlagManager.getBooleanValue(FeatureFlags.EnvFileFunc) ? "true" : "",
    };

    const filterFn = (fileName: string) => {
      if (fileName.toLowerCase().includes("declarativecopilot.json")) {
        return isDeclarativeCopilot;
      } else if (fileName.includes(declarativeCopilotInstructionFileName)) {
        return isDeclarativeCopilot && featureFlagManager.getBooleanValue(FeatureFlags.EnvFileFunc);
      } else {
        return true;
      }
    };

    let templateName;
    if (inputs[QuestionNames.ApiPluginType] === ApiPluginStartOptions.newApi().id) {
      templateName =
        auth === ApiAuthOptions.apiKey().id
          ? TemplateNames.ApiPluginFromScratchBearer
          : auth === ApiAuthOptions.oauth().id
          ? TemplateNames.ApiPluginFromScratchOAuth
          : TemplateNames.ApiPluginFromScratch;
    } else {
      templateName = TemplateNames.BasicGpt;
    }

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

  public post(
    context: Context,
    inputs: Inputs,
    destinationPath: string,
    actionContext?: ActionContext
  ): Promise<Result<GeneratorResult, FxError>> {
    return Promise.resolve(ok({}));
  }
}

function checkDeclarativeCopilot(inputs: Inputs) {
  return inputs[QuestionNames.Capabilities] === CapabilityOptions.declarativeCopilot().id;
}
