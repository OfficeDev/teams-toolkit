// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yuqzho@microsoft.com
 */

import { hooks } from "@feathersjs/hooks/lib";
import {
  ProjectType,
  SpecParser,
  SpecParserError,
  ValidationStatus,
  WarningType,
} from "@microsoft/m365-spec-parser";
import {
  AppPackageFolderName,
  AuthInfo,
  Context,
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
import * as util from "util";
import { FeatureFlags, featureFlagManager } from "../../../common/featureFlags";
import { getLocalizedString } from "../../../common/localizeUtils";
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
import { ActionContext, ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { Generator } from "../generator";
import { TelemetryEvents } from "../spfx/utils/telemetryEvents";
import { DefaultTemplateGenerator } from "../templates/templateGenerator";
import { TemplateInfo } from "../templates/templateInfo";
import {
  convertSpecParserErrorToFxError,
  copilotPluginParserOptions,
  defaultApiSpecFolderName,
  defaultApiSpecJsonFileName,
  defaultApiSpecYamlFileName,
  defaultPluginManifestFileName,
  generateScaffoldingSummary,
  getEnvName,
  invalidApiSpecErrorName,
  isYamlSpecFile,
  logValidationResults,
  specParserGenerateResultAllSuccessTelemetryProperty,
  specParserGenerateResultTelemetryEvent,
  specParserGenerateResultWarningsTelemetryProperty,
  updateForCustomApi,
} from "./helper";
import { copilotGptManifestUtils } from "../../driver/teamsApp/utils/CopilotGptManifestUtils";

const defaultDeclarativeCopilotActionId = "action_1";
// const fromApiSpecComponentName = "copilot-plugin-existing-api";
// const pluginFromApiSpecComponentName = "api-copilot-plugin-existing-api";
const fromApiSpecTemplateName = "copilot-plugin-existing-api";
// const fromOpenAIPlugincomponentName = "copilot-plugin-from-oai-plugin";
const forCustomCopilotRagCustomApi = "custom-copilot-rag-custom-api";
const copilotPluginExistingApiSpecUrlTelemetryEvent = "copilot-plugin-existing-api-spec-url";

const apiPluginFromApiSpecTemplateName = "api-plugin-existing-api";

const failedToUpdateCustomApiTemplateErrorName = "failed-to-update-custom-api-template";
const defaultDeclarativeCopilotManifestFileName = "declarativeCopilot.json";

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

// TODO: delete class for old generator
// export class OpenAPISpecGenerator {
//   @hooks([
//     ActionExecutionMW({
//       enableTelemetry: true,
//       telemetryComponentName: fromApiSpecComponentName,
//       telemetryEventName: TelemetryEvents.Generate,
//       errorSource: fromApiSpecComponentName,
//     }),
//   ])
//   public static async generateMe(
//     context: Context,
//     inputs: Inputs,
//     destinationPath: string,
//     actionContext?: ActionContext
//   ): Promise<Result<OpenAPISpecGeneratorResult, FxError>> {
//     const templateName = fromApiSpecTemplateName;
//     const componentName = fromApiSpecComponentName;

//     merge(actionContext?.telemetryProps, { [telemetryProperties.templateName]: templateName });

//     return await this.generate(
//       context,
//       inputs,
//       destinationPath,
//       templateName,
//       componentName,
//       false,
//       inputs.apiAuthData
//     );
//   }

//   @hooks([
//     ActionExecutionMW({
//       enableTelemetry: true,
//       telemetryComponentName: pluginFromApiSpecComponentName,
//       telemetryEventName: TelemetryEvents.Generate,
//       errorSource: pluginFromApiSpecComponentName,
//     }),
//   ])
//   public static async generateCopilotPlugin(
//     context: Context,
//     inputs: Inputs,
//     destinationPath: string,
//     actionContext?: ActionContext
//   ): Promise<Result<OpenAPISpecGeneratorResult, FxError>> {
//     const templateName = apiPluginFromApiSpecTemplateName;
//     const componentName = fromApiSpecComponentName;

//     merge(actionContext?.telemetryProps, { [telemetryProperties.templateName]: templateName });

//     return await this.generate(
//       context,
//       inputs,
//       destinationPath,
//       templateName,
//       componentName,
//       true,
//       inputs.apiAuthData
//     );
//   }

//   @hooks([
//     ActionExecutionMW({
//       enableTelemetry: true,
//       telemetryComponentName: fromOpenAIPlugincomponentName,
//       telemetryEventName: TelemetryEvents.Generate,
//       errorSource: fromOpenAIPlugincomponentName,
//     }),
//   ])
//   public static async generateCustomCopilot(
//     context: Context,
//     inputs: Inputs,
//     destinationPath: string
//   ): Promise<Result<OpenAPISpecGeneratorResult, FxError>> {
//     return await this.generate(
//       context,
//       inputs,
//       destinationPath,
//       forCustomCopilotRagCustomApi,
//       forCustomCopilotRagCustomApi,
//       false
//     );
//   }

//   private static async generate(
//     context: Context,
//     inputs: Inputs,
//     destinationPath: string,
//     templateName: string,
//     componentName: string,
//     isPlugin: boolean,
//     authData?: AuthInfo
//   ): Promise<Result<OpenAPISpecGeneratorResult, FxError>> {
//     try {
//       const appName = inputs[QuestionNames.AppName];
//       const language = inputs[QuestionNames.ProgrammingLanguage];
//       const safeProjectNameFromVS =
//         language === "csharp" ? inputs[QuestionNames.SafeProjectName] : undefined;
//       const type =
//         templateName === forCustomCopilotRagCustomApi
//           ? ProjectType.TeamsAi
//           : isPlugin
//           ? ProjectType.Copilot
//           : ProjectType.SME;
//       let url = inputs[QuestionNames.ApiSpecLocation];
//       url = url.trim();
//       let isYaml: boolean;
//       try {
//         isYaml = await isYamlSpecFile(url);
//       } catch (e) {
//         isYaml = false;
//       }
//       const openapiSpecFileName = isYaml ? defaultApiSpecYamlFileName : defaultApiSpecJsonFileName;
//       if (authData?.authName) {
//         const envName = getEnvName(authData.authName, authData.authType);
//         context.templateVariables = Generator.getDefaultVariables(
//           appName,
//           safeProjectNameFromVS,
//           inputs.targetFramework,
//           inputs.placeProjectFileInSolutionDir === "true",
//           {
//             authName: authData.authName,
//             openapiSpecPath: normalizePath(
//               path.join(AppPackageFolderName, defaultApiSpecFolderName, openapiSpecFileName)
//             ),
//             registrationIdEnvName: envName,
//             authType: authData.authType,
//             withPlugin: inputs[QuestionNames.WithPlugin],
//           }
//         );
//       } else {
//         context.templateVariables = Generator.getDefaultVariables(
//           appName,
//           safeProjectNameFromVS,
//           inputs.targetFramework,
//           inputs.placeProjectFileInSolutionDir === "true",
//           withPlugin: inputs[QuestionNames.WithPlugin],
//         );
//       }

//       if (templateName != forCustomCopilotRagCustomApi) {
//         // download template
//         const templateRes = await Generator.generateTemplate(
//           context,
//           destinationPath,
//           templateName,
//           language === ProgrammingLanguage.CSharp ? ProgrammingLanguage.CSharp : undefined
//         );
//         if (templateRes.isErr()) return err(templateRes.error);
//       }

//       context.telemetryReporter.sendTelemetryEvent(copilotPluginExistingApiSpecUrlTelemetryEvent, {
//         [telemetryProperties.isRemoteUrlTelemetryProperty]: isValidHttpUrl(url).toString(),
//         [telemetryProperties.generateType]: type.toString(),
//         [telemetryProperties.authType]: authData?.authType ?? "None",
//       });

//       const newGenerator = new SpecGenerator();
//       const getTemplateInfosState: any = {};
//       inputs.getTemplateInfosState = getTemplateInfosState;
//       getTemplateInfosState.isYaml = isYaml;
//       getTemplateInfosState.isPlugin = isPlugin;
//       getTemplateInfosState.templateName = templateName;
//       getTemplateInfosState.url = url;
//       getTemplateInfosState.type = type;
//       const res = await newGenerator.post(context, inputs, destinationPath);
//       return res;
//     } catch (e) {
//       let error: FxError;
//       if (e instanceof SpecParserError) {
//         error = convertSpecParserErrorToFxError(e);
//       } else {
//         error = assembleError(e);
//       }
//       return err(error);
//     }
//   }
// }

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
      getTemplateInfosState.isYaml = await isYamlSpecFile(getTemplateInfosState.url);
    } catch (e) {}

    const openapiSpecFileName = getTemplateInfosState.isYaml
      ? defaultApiSpecYamlFileName
      : defaultApiSpecJsonFileName;
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
            path.join(AppPackageFolderName, defaultApiSpecFolderName, openapiSpecFileName)
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
        },
        filterFn: (fileName: string) => {
          if (fileName.includes(`${defaultDeclarativeCopilotManifestFileName}.tpl`)) {
            return isDeclarativeCopilot;
          } else {
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
      // validate API spec
      const specParser = new SpecParser(
        getTemplateInfosState.url,
        getTemplateInfosState.isPlugin
          ? {
              ...copilotPluginParserOptions,
              isGptPlugin: isDeclarativeCopilot,
            }
          : {
              allowBearerTokenAuth: true, // Currently, API key auth support is actually bearer token auth
              allowMultipleParameters: true,
              projectType: getTemplateInfosState.type,
              allowOauth2: featureFlagManager.getBooleanValue(FeatureFlags.SMEOAuth),
            }
      );
      const validationRes = await specParser.validate();
      const warnings = validationRes.warnings;
      const operationIdWarning = warnings.find((w) => w.type === WarningType.OperationIdMissing);
      const filters = inputs[QuestionNames.ApiOperation] as string[];
      if (operationIdWarning && operationIdWarning.data) {
        const apisMissingOperationId = (operationIdWarning.data as string[]).filter((api) =>
          filters.includes(api)
        );
        if (apisMissingOperationId.length > 0) {
          operationIdWarning.content = util.format(
            getLocalizedString("core.common.MissingOperationId"),
            apisMissingOperationId.join(", ")
          );
          delete operationIdWarning.data;
        } else {
          warnings.splice(warnings.indexOf(operationIdWarning), 1);
        }
      }

      const specVersionWarning = warnings.find(
        (w) => w.type === WarningType.ConvertSwaggerToOpenAPI
      );
      if (specVersionWarning) {
        specVersionWarning.content = ""; // We don't care content of this warning
      }

      if (validationRes.status === ValidationStatus.Error) {
        logValidationResults(validationRes.errors, warnings, context, false, true);
        const errorMessage =
          inputs.platform === Platform.VSCode
            ? getLocalizedString(
                "core.createProjectQuestion.apiSpec.multipleValidationErrors.vscode.message"
              )
            : getLocalizedString(
                "core.createProjectQuestion.apiSpec.multipleValidationErrors.message"
              );
        return err(
          new UserError(this.componentName, invalidApiSpecErrorName, errorMessage, errorMessage)
        );
      }
      const manifestPath = path.join(
        destinationPath,
        AppPackageFolderName,
        ManifestTemplateFileName
      );
      const apiSpecFolderPath = path.join(
        destinationPath,
        AppPackageFolderName,
        defaultApiSpecFolderName
      );
      const openapiSpecFileName = getTemplateInfosState.isYaml
        ? defaultApiSpecYamlFileName
        : defaultApiSpecJsonFileName;
      const openapiSpecPath = path.join(apiSpecFolderPath, openapiSpecFileName);
      // generate files
      await fs.ensureDir(apiSpecFolderPath);

      let generateResult;
      let pluginManifestPath: string | undefined;

      if (getTemplateInfosState.isPlugin) {
        pluginManifestPath = path.join(
          destinationPath,
          AppPackageFolderName,
          defaultPluginManifestFileName
        );
        generateResult = await specParser.generateForCopilot(
          manifestPath,
          filters,
          openapiSpecPath,
          pluginManifestPath
        );
      } else {
        const responseTemplateFolder = path.join(
          destinationPath,
          AppPackageFolderName,
          ResponseTemplatesFolderName
        );
        generateResult = await specParser.generate(
          manifestPath,
          filters,
          openapiSpecPath,
          getTemplateInfosState.type === ProjectType.TeamsAi ? undefined : responseTemplateFolder
        );
      }

      context.telemetryReporter.sendTelemetryEvent(specParserGenerateResultTelemetryEvent, {
        [telemetryProperties.generateType]: getTemplateInfosState.type.toString(),
        [specParserGenerateResultAllSuccessTelemetryProperty]: generateResult.allSuccess.toString(),
        [specParserGenerateResultWarningsTelemetryProperty]: generateResult.warnings
          .map((w) => w.type.toString() + ": " + w.content)
          .join(";"),
      });

      if (generateResult.warnings.length > 0) {
        generateResult.warnings.find((o) => {
          if (o.type === WarningType.OperationOnlyContainsOptionalParam) {
            o.content = ""; // We don't care content of this warning
          }
        });
        warnings.push(...generateResult.warnings);
      }

      const manifestRes = await manifestUtils._readAppManifest(manifestPath);

      if (manifestRes.isErr()) {
        return err(manifestRes.error);
      }

      const teamsManifest = manifestRes.value;

      if (getTemplateInfosState.templateName === forCustomCopilotRagCustomApi) {
        const specs = await specParser.getFilteredSpecs(filters);
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

      if (isDeclarativeCopilot) {
        const gptManifestPath = path.join(
          path.dirname(manifestPath),
          defaultDeclarativeCopilotManifestFileName
        );
        const addAcionResult = await copilotGptManifestUtils.addAction(
          gptManifestPath,
          defaultDeclarativeCopilotActionId,
          defaultPluginManifestFileName
        );
        if (addAcionResult.isErr()) {
          return err(addAcionResult.error);
        }
      }

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
