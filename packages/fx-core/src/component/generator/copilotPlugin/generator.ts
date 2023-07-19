// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yuqzho@microsoft.com
 */

import { hooks } from "@feathersjs/hooks/lib";
import { Context, err, FxError, Inputs, ok, Result } from "@microsoft/teamsfx-api";
import { Generator } from "../generator";
import path from "path";
import { ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { TelemetryEvents } from "../spfx/utils/telemetryEvents";
import { SpecParser } from "../../../common/spec-parser/specParser";
import { QuestionNames } from "../../../question/questionNames";
import { OpenAIPluginManifestHelper } from "./helper";

const componentName = "copilot-plugin-existing-api";
const templateName = "copilot-plugin-existing-api";
const appPackageName = "appPackage";
const manifestFileName = "manifest.json";
const adaptiveFolderName = "adaptiveCards";
const apiSpecFolderName = "apiSpecFiles";
const apiSpecFileName = "openapi.yaml";

export class CopilotPluginGenerator {
  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: componentName,
      telemetryEventName: TelemetryEvents.Generate,
      errorSource: componentName,
    }),
  ])
  public static async generate(
    context: Context,
    inputs: Inputs,
    destinationPath: string
  ): Promise<Result<undefined, FxError>> {
    // download template
    const templateRes = await Generator.generateTemplate(
      context,
      destinationPath,
      templateName,
      undefined,
      undefined
    );
    if (templateRes.isErr()) return err(templateRes.error);

    const url = inputs[QuestionNames.ApiSpecLocation] ?? inputs.openAIPluginManifest?.api.url;
    const specParser = new SpecParser(url);
    const manifestPath = path.join(destinationPath, appPackageName, manifestFileName);
    const filters = inputs[QuestionNames.ApiOperation] as string[];
    const openapiSpecPath = path.join(
      destinationPath,
      appPackageName,
      apiSpecFolderName,
      apiSpecFileName
    );
    await specParser.generate(manifestPath, filters, openapiSpecPath, adaptiveFolderName);

    // update manifest based on openAI plugin manifest
    if (inputs.openAIPluginManifest) {
      const updateManifestRes = await OpenAIPluginManifestHelper.updateManifest(
        inputs.openAIPluginManifest,
        path.join(destinationPath, appPackageName)
      );
      if (updateManifestRes.isErr()) return err(updateManifestRes.error);
    }

    // TODO: log warnings
    return ok(undefined);
  }
}
