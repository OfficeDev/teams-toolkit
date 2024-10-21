// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yuqzho@microsoft.com
 */

import {
  ProjectType,
  SpecParser,
  SpecParserError,
  WarningResult,
} from "@microsoft/m365-spec-parser";
import {
  AppPackageFolderName,
  AuthInfo,
  Context,
  DefaultApiSpecFolderName,
  DefaultApiSpecJsonFileName,
  DefaultApiSpecYamlFileName,
  DefaultPluginManifestFileName,
  FxError,
  GeneratorResult,
  Inputs,
  ManifestTemplateFileName,
  Platform,
  ResponseTemplatesFolderName,
  Result,
  SystemError,
  UserError,
  Warning,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import { merge } from "lodash";
import path from "path";
import { FeatureFlags, featureFlagManager } from "../../../common/featureFlags";
import { isValidHttpUrl } from "../../../common/stringUtils";
import { assembleError } from "../../../error";
import {
  ApiPluginStartOptions,
  CapabilityOptions,
  CustomCopilotRagOptions,
  MeArchitectureOptions,
  ProgrammingLanguage,
  QuestionNames,
} from "../../../question/constants";
import { manifestUtils } from "../../driver/teamsApp/utils/ManifestUtils";
import { ActionContext } from "../../middleware/actionExecutionMW";
import { Generator } from "../generator";
import { DefaultTemplateGenerator } from "../templates/templateGenerator";
import { TemplateInfo } from "../templates/templateInfo";
import {
  convertSpecParserErrorToFxError,
  generateFromApiSpec,
  generateScaffoldingSummary,
  getEnvName,
  getParserOptions,
  listOperations,
  updateForCustomApi,
} from "./helper";
import { copilotGptManifestUtils } from "../../driver/teamsApp/utils/CopilotGptManifestUtils";
import { declarativeCopilotInstructionFileName } from "../constant";
import { isJsonSpecFile } from "../../../common/utils";

const defaultDeclarativeCopilotActionId = "action_1";
// const fromApiSpecComponentName = "copilot-plugin-existing-api";
// const pluginFromApiSpecComponentName = "api-copilot-plugin-existing-api";
const fromApiSpecTemplateName = "copilot-plugin-existing-api";
// const fromOpenAIPlugincomponentName = "copilot-plugin-from-oai-plugin";
const forCustomCopilotRagCustomApi = "custom-copilot-rag-custom-api";
const copilotPluginExistingApiSpecUrlTelemetryEvent = "copilot-plugin-existing-api-spec-url";

const apiPluginFromApiSpecTemplateName = "api-plugin-existing-api";

const failedToUpdateCustomApiTemplateErrorName = "failed-to-update-custom-api-template";
const defaultDeclarativeCopilotManifestFileName = "declarativeAgent.json";

const enum telemetryProperties {
  templateName = "template-name",
  generateType = "generate-type",
  isRemoteUrlTelemetryProperty = "remote-url",
  authType = "auth-type",
  isDeclarativeCopilot = "is-declarative-copilot",
}

function normalizePath(path: string): string {
  return "./" + path.replace(/\\/g, "/");
}

export interface OpenAPISpecGeneratorResult {
  warnings?: Warning[];
}

interface TemplateInfosState {
  isYaml: boolean;
  templateName: string;
  url: string;
  isPlugin: boolean;
  type: ProjectType;
}

export class SpecGenerator extends DefaultTemplateGenerator {
  componentName = "spec-generator";
  // isYaml = false;
  // templateName = "";
  // url = "";
  // isPlugin = false;
  // type = -1;

  // activation condition
  public activate(context: Context, inputs: Inputs): boolean {
    const capability = inputs.capabilities as string;
    const meArchitecture = inputs[QuestionNames.MeArchitectureType] as string;
    return (
      inputs[QuestionNames.ApiPluginType] === ApiPluginStartOptions.apiSpec().id ||
      meArchitecture === MeArchitectureOptions.apiSpec().id ||
      (capability === CapabilityOptions.customCopilotRag().id &&
        inputs[QuestionNames.CustomCopilotRag] === CustomCopilotRagOptions.customApi().id)
    );
  }

  getTemplateName(inputs: Inputs): string {
    const capability = inputs.capabilities as string;
    const meArchitecture = inputs[QuestionNames.MeArchitectureType] as string;
    let templateName = "";
    if (
      (capability === CapabilityOptions.apiPlugin().id ||
        capability === CapabilityOptions.declarativeCopilot().id) &&
      inputs[QuestionNames.ApiPluginType] === ApiPluginStartOptions.apiSpec().id
    ) {
      templateName = apiPluginFromApiSpecTemplateName;
    } else if (meArchitecture === MeArchitectureOptions.apiSpec().id) {
      templateName = fromApiSpecTemplateName;
    } else if (
      capability === CapabilityOptions.customCopilotRag().id &&
      inputs[QuestionNames.CustomCopilotRag] === CustomCopilotRagOptions.customApi().id
    ) {
      templateName = forCustomCopilotRagCustomApi;
    }
    return templateName;
  }

  public async getTemplateInfos(
    context: Context,
    inputs: Inputs,
    destinationPath: string,
    actionContext?: ActionContext
  ): Promise<Result<TemplateInfo[], FxError>> {
    const meArchitecture = inputs[QuestionNames.MeArchitectureType] as string;
    const getTemplateInfosState: TemplateInfosState = {
      isYaml: false,
      templateName: this.getTemplateName(inputs),
      url: inputs[QuestionNames.ApiSpecLocation].trim(),
      isPlugin: false,
      type: ProjectType.SME,
    };
    let authData = undefined;
    if (inputs[QuestionNames.ApiPluginType] === ApiPluginStartOptions.apiSpec().id) {
      getTemplateInfosState.isPlugin = true;
      authData = inputs.apiAuthData;
    } else if (meArchitecture === MeArchitectureOptions.apiSpec().id) {
      authData = inputs.apiAuthData;
    }
    const isDeclarativeCopilot =
      inputs[QuestionNames.Capabilities] === CapabilityOptions.declarativeCopilot().id;
    merge(actionContext?.telemetryProps, {
      [telemetryProperties.templateName]: getTemplateInfosState.templateName,
      [telemetryProperties.isDeclarativeCopilot]: isDeclarativeCopilot.toString(),
    });

    // For Kiota integration, we need to get auth info here
    if (
      featureFlagManager.getBooleanValue(FeatureFlags.KiotaIntegration) &&
      inputs[QuestionNames.ApiPluginManifestPath]
    ) {
      const operationsResult = await listOperations(
        context,
        inputs[QuestionNames.ApiSpecLocation],
        inputs
      );
      if (operationsResult.isErr()) {
        const msg = operationsResult.error.map((e) => e.content).join("\n");
        return err(new UserError("generator", "ListOperationsFailed", msg));
      }

      const operations = operationsResult.value;
      const authApi = operations.find((api) => !!api.data.authName);
      if (authApi) {
        authData = authApi.data;
      }
    }

    const appName = inputs[QuestionNames.AppName];
    let language = inputs[QuestionNames.ProgrammingLanguage] as ProgrammingLanguage;
    if (getTemplateInfosState.templateName !== forCustomCopilotRagCustomApi) {
      language =
        language === ProgrammingLanguage.CSharp
          ? ProgrammingLanguage.CSharp
          : ProgrammingLanguage.None;
    }
    const safeProjectNameFromVS =
      language === "csharp" ? inputs[QuestionNames.SafeProjectName] : undefined;
    getTemplateInfosState.type =
      getTemplateInfosState.templateName === forCustomCopilotRagCustomApi
        ? ProjectType.TeamsAi
        : getTemplateInfosState.isPlugin
        ? ProjectType.Copilot
        : ProjectType.SME;

    try {
      getTemplateInfosState.isYaml = !(await isJsonSpecFile(getTemplateInfosState.url));
    } catch (e) {}

    const openapiSpecFileName = getTemplateInfosState.isYaml
      ? DefaultApiSpecYamlFileName
      : DefaultApiSpecJsonFileName;
    const llmService: string | undefined = inputs[QuestionNames.LLMService];
    const openAIKey: string | undefined = inputs[QuestionNames.OpenAIKey];
    const azureOpenAIKey: string | undefined = inputs[QuestionNames.AzureOpenAIKey];
    const azureOpenAIEndpoint: string | undefined = inputs[QuestionNames.AzureOpenAIEndpoint];
    const azureOpenAIDeploymentName: string | undefined =
      inputs[QuestionNames.AzureOpenAIDeploymentName];
    const llmServiceData = {
      llmService,
      openAIKey,
      azureOpenAIKey,
      azureOpenAIEndpoint,
      azureOpenAIDeploymentName,
    };
    if (authData?.authName) {
      const envName = getEnvName(authData.authName, authData.authType);
      context.templateVariables = Generator.getDefaultVariables(
        appName,
        safeProjectNameFromVS,
        inputs.targetFramework,
        inputs.placeProjectFileInSolutionDir === "true",
        {
          authName: authData.authName,
          openapiSpecPath: normalizePath(
            path.join(AppPackageFolderName, DefaultApiSpecFolderName, openapiSpecFileName)
          ),
          registrationIdEnvName: envName,
          authType: authData.authType,
        },
        llmServiceData
      );
    } else {
      context.templateVariables = Generator.getDefaultVariables(
        appName,
        safeProjectNameFromVS,
        inputs.targetFramework,
        inputs.placeProjectFileInSolutionDir === "true",
        undefined,
        llmServiceData
      );
    }
    context.telemetryReporter.sendTelemetryEvent(copilotPluginExistingApiSpecUrlTelemetryEvent, {
      [telemetryProperties.isRemoteUrlTelemetryProperty]: isValidHttpUrl(
        getTemplateInfosState.url
      ).toString(),
      [telemetryProperties.generateType]: getTemplateInfosState.type.toString(),
      [telemetryProperties.authType]: authData?.authName ?? "None",
    });
    inputs.getTemplateInfosState = getTemplateInfosState;
    return ok([
      {
        templateName: getTemplateInfosState.templateName,
        language: language,
        replaceMap: {
          ...context.templateVariables,
          DeclarativeCopilot: isDeclarativeCopilot ? "true" : "",
          FileFunction: featureFlagManager.getBooleanValue(FeatureFlags.EnvFileFunc) ? "true" : "",
        },
        filterFn: (fileName: string) => {
          if (fileName.includes(`${defaultDeclarativeCopilotManifestFileName}.tpl`)) {
            return isDeclarativeCopilot;
          } else if (fileName.includes(declarativeCopilotInstructionFileName)) {
            return (
              isDeclarativeCopilot && featureFlagManager.getBooleanValue(FeatureFlags.EnvFileFunc)
            );
          }
          {
            return true;
          }
        },
      },
    ]);
  }

  public async post(
    context: Context,
    inputs: Inputs,
    destinationPath: string,
    actionContext?: ActionContext
  ): Promise<Result<GeneratorResult, FxError>> {
    try {
      const getTemplateInfosState = inputs.getTemplateInfosState as TemplateInfosState;
      const isDeclarativeCopilot =
        inputs[QuestionNames.Capabilities] === CapabilityOptions.declarativeCopilot().id;
      const manifestPath = path.join(
        destinationPath,
        AppPackageFolderName,
        ManifestTemplateFileName
      );
      const apiSpecFolderPath = path.join(
        destinationPath,
        AppPackageFolderName,
        DefaultApiSpecFolderName
      );
      const openapiSpecFileName = getTemplateInfosState.isYaml
        ? DefaultApiSpecYamlFileName
        : DefaultApiSpecJsonFileName;

      let openapiSpecPath = path.join(apiSpecFolderPath, openapiSpecFileName);

      if (getTemplateInfosState.templateName === forCustomCopilotRagCustomApi) {
        const language = inputs[QuestionNames.ProgrammingLanguage] as ProgrammingLanguage;
        if (language === ProgrammingLanguage.CSharp) {
          openapiSpecPath = path.join(
            destinationPath,
            DefaultApiSpecFolderName,
            openapiSpecFileName
          );
        }
      }

      await fs.ensureDir(apiSpecFolderPath);

      let warnings: WarningResult[];
      const pluginManifestPath =
        getTemplateInfosState.type === ProjectType.Copilot
          ? path.join(destinationPath, AppPackageFolderName, DefaultPluginManifestFileName)
          : undefined;
      const responseTemplateFolder =
        getTemplateInfosState.type === ProjectType.SME
          ? path.join(destinationPath, AppPackageFolderName, ResponseTemplatesFolderName)
          : undefined;
      const specParser = new SpecParser(
        getTemplateInfosState.url,
        getParserOptions(getTemplateInfosState.type, isDeclarativeCopilot)
      );
      const generateResult = await generateFromApiSpec(
        specParser,
        manifestPath,
        inputs,
        context,
        this.componentName,
        getTemplateInfosState.type,
        {
          destinationApiSpecFilePath: openapiSpecPath,
          pluginManifestFilePath: pluginManifestPath,
          responseTemplateFolder,
        }
      );
      if (generateResult.isErr()) {
        return err(generateResult.error);
      } else {
        warnings = generateResult.value.warnings;
      }
      if (isDeclarativeCopilot) {
        const gptManifestPath = path.join(
          path.dirname(manifestPath),
          defaultDeclarativeCopilotManifestFileName
        );
        const addAcionResult = await copilotGptManifestUtils.addAction(
          gptManifestPath,
          defaultDeclarativeCopilotActionId,
          DefaultPluginManifestFileName
        );
        if (addAcionResult.isErr()) {
          return err(addAcionResult.error);
        }
      }

      if (getTemplateInfosState.templateName === forCustomCopilotRagCustomApi) {
        const specs = await specParser.getFilteredSpecs(inputs[QuestionNames.ApiOperation]);
        const spec = specs[1];
        try {
          const language = inputs[QuestionNames.ProgrammingLanguage] as ProgrammingLanguage;
          await updateForCustomApi(spec, language, destinationPath, openapiSpecFileName);
        } catch (error: any) {
          throw new SystemError(
            this.componentName,
            failedToUpdateCustomApiTemplateErrorName,
            error.message,
            error.message
          );
        }
      }

      const manifestRes = await manifestUtils._readAppManifest(manifestPath);

      if (manifestRes.isErr()) {
        return err(manifestRes.error);
      }

      const teamsManifest = manifestRes.value;

      // log warnings
      if (inputs.platform === Platform.CLI || inputs.platform === Platform.VS) {
        const warnSummary = await generateScaffoldingSummary(
          warnings,
          teamsManifest,
          path.relative(destinationPath, openapiSpecPath),
          pluginManifestPath === undefined
            ? undefined
            : path.relative(destinationPath, pluginManifestPath),
          destinationPath
        );

        if (warnSummary) {
          context.logProvider.info(warnSummary);
        }
      }

      if (inputs.platform === Platform.VSCode) {
        return ok({
          warnings: warnings.map((warning) => {
            return {
              type: warning.type,
              content: warning.content,
              data: warning.data,
            };
          }),
        });
      } else {
        return ok({ warnings: undefined });
      }
    } catch (e) {
      let error: FxError;
      if (e instanceof SpecParserError) {
        error = convertSpecParserErrorToFxError(e);
      } else {
        error = assembleError(e);
      }
      return err(error);
    }
  }
}
