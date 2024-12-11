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
  ApiOperation,
  AppPackageFolderName,
  Context,
  DefaultApiSpecFolderName,
  DefaultApiSpecJsonFileName,
  DefaultApiSpecYamlFileName,
  DefaultPluginManifestFileName,
  FxError,
  GeneratorResult,
  IQTreeNode,
  Inputs,
  ManifestTemplateFileName,
  MultiSelectQuestion,
  Platform,
  ResponseTemplatesFolderName,
  Result,
  SingleFileOrInputQuestion,
  SystemError,
  UserError,
  Warning,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import { merge } from "lodash";
import path from "path";
import { Correlator } from "../../../common/correlator";
import { FeatureFlags, featureFlagManager } from "../../../common/featureFlags";
import { createContext } from "../../../common/globalVars";
import { getLocalizedString } from "../../../common/localizeUtils";
import { isValidHttpUrl } from "../../../common/stringUtils";
import { isJsonSpecFile } from "../../../common/utils";
import { EmptyOptionError, assembleError } from "../../../error";
import {
  ApiPluginStartOptions,
  CapabilityOptions,
  MeArchitectureOptions,
  ProgrammingLanguage,
  ProjectTypeOptions,
  QuestionNames,
} from "../../../question/constants";
import { TemplateNames } from "../../../question/templates";
import { copilotGptManifestUtils } from "../../driver/teamsApp/utils/CopilotGptManifestUtils";
import { manifestUtils } from "../../driver/teamsApp/utils/ManifestUtils";
import { ActionContext } from "../../middleware/actionExecutionMW";
import { declarativeCopilotInstructionFileName } from "../constant";
import { Generator } from "../generator";
import { DefaultTemplateGenerator } from "../templates/templateGenerator";
import { TemplateInfo } from "../templates/templateInfo";
import {
  convertSpecParserErrorToFxError,
  copyKiotaFolder,
  generateFromApiSpec,
  generateScaffoldingSummary,
  getEnvName,
  getParserOptions,
  listOperations,
  updateForCustomApi,
} from "./helper";

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
  private apiSpecLocationQuestion(): SingleFileOrInputQuestion {
    const maximumLengthOfDetailsErrorMessageInInputBox = 90;
    const correlationId = Correlator.getId(); // This is a workaround for VSCode which will lose correlation id when user accepts the value.
    const validationOnAccept = async (
      input: string,
      inputs?: Inputs
    ): Promise<string | undefined> => {
      try {
        if (!inputs) {
          throw new Error("inputs is undefined"); // should never happen
        }
        const context = createContext();
        const res = await listOperations(context, input.trim(), inputs, true, false, correlationId);
        if (res.isOk()) {
          inputs.supportedApisFromApiSpec = res.value;
        } else {
          const errors = res.error;
          if (
            errors.length === 1 &&
            errors[0].content.length <= maximumLengthOfDetailsErrorMessageInInputBox
          ) {
            return errors[0].content;
          } else {
            return getLocalizedString(
              "core.createProjectQuestion.apiSpec.multipleValidationErrors.vscode.message"
            );
          }
        }
      } catch (e) {
        const error = assembleError(e);
        throw error;
      }
    };
    return {
      type: "singleFileOrText",
      name: QuestionNames.ApiSpecLocation,
      cliShortName: "a",
      cliDescription: "OpenAPI description document location.",
      title: getLocalizedString("core.createProjectQuestion.apiSpec.title"),
      forgetLastValue: true,
      inputBoxConfig: {
        type: "innerText",
        title: getLocalizedString("core.createProjectQuestion.apiSpec.title"),
        placeholder: getLocalizedString("core.createProjectQuestion.apiSpec.placeholder"),
        name: "input-api-spec-url",
        step: 2, // Add "back" button
        validation: {
          validFunc: (input: string, inputs?: Inputs): Promise<string | undefined> => {
            const result = isValidHttpUrl(input.trim())
              ? undefined
              : getLocalizedString("core.createProjectQuestion.invalidUrl.message");
            return Promise.resolve(result);
          },
        },
      },
      inputOptionItem: {
        id: "input",
        label: `$(cloud) ` + getLocalizedString("core.createProjectQuestion.apiSpecInputUrl.label"),
      },
      filters: {
        files: ["json", "yml", "yaml"],
      },
      validation: {
        validFunc: async (input: string, inputs?: Inputs): Promise<string | undefined> => {
          if (!isValidHttpUrl(input.trim()) && !(await fs.pathExists(input.trim()))) {
            return "Please enter a valid HTTP URL without authentication to access your OpenAPI description document or enter a file path of your local OpenAPI description document.";
          }

          return await validationOnAccept(input, inputs);
        },
      },
    };
  }

  private apiOperationQuestion(): MultiSelectQuestion {
    let placeholder = "";

    const isPlugin = (inputs?: Inputs): boolean => {
      return !!inputs && inputs[QuestionNames.ApiPluginType] === ApiPluginStartOptions.apiSpec().id;
    };

    return {
      type: "multiSelect",
      name: QuestionNames.ApiOperation,
      title: (inputs: Inputs) => {
        return isPlugin(inputs)
          ? getLocalizedString("core.createProjectQuestion.apiSpec.copilotOperation.title")
          : getLocalizedString("core.createProjectQuestion.apiSpec.operation.title");
      },
      placeholder: (inputs: Inputs) => {
        const isPlugin = inputs[QuestionNames.ApiPluginType] === ApiPluginStartOptions.apiSpec().id;
        if (isPlugin) {
          placeholder = getLocalizedString(
            "core.createProjectQuestion.apiSpec.operation.plugin.placeholder"
          );
        } else {
          placeholder = getLocalizedString(
            "core.createProjectQuestion.apiSpec.operation.apikey.placeholder"
          );
        }
        return placeholder;
      },
      forgetLastValue: true,
      staticOptions: [],
      validation: {
        validFunc: (input: string[], inputs?: Inputs): string | undefined => {
          if (!inputs) {
            throw new Error("inputs is undefined"); // should never happen
          }
          if (
            input.length < 1 ||
            (input.length > 10 &&
              inputs[QuestionNames.ProjectType] !== ProjectTypeOptions.Agent().id)
          ) {
            return getLocalizedString(
              "core.createProjectQuestion.apiSpec.operation.invalidMessage",
              input.length,
              10
            );
          }
          const operations: ApiOperation[] = inputs.supportedApisFromApiSpec as ApiOperation[];

          const authNames: Set<string> = new Set();
          const serverUrls: Set<string> = new Set();
          for (const inputItem of input) {
            const operation = operations.find((op) => op.id === inputItem);
            if (operation) {
              if (operation.data.authName) {
                authNames.add(operation.data.authName);
                serverUrls.add(operation.data.serverUrl);
              }
            }
          }

          if (authNames.size > 1) {
            return getLocalizedString(
              "core.createProjectQuestion.apiSpec.operation.multipleAuth",
              Array.from(authNames).join(", ")
            );
          }

          if (serverUrls.size > 1) {
            return getLocalizedString(
              "core.createProjectQuestion.apiSpec.operation.multipleServer",
              Array.from(serverUrls).join(", ")
            );
          }

          const authApi = operations.find((api) => !!api.data.authName && input.includes(api.id));
          if (authApi) {
            inputs.apiAuthData = authApi.data;
          }
        },
      },
      dynamicOptions: (inputs: Inputs) => {
        if (!inputs.supportedApisFromApiSpec) {
          throw new EmptyOptionError(QuestionNames.ApiOperation, "question");
        }

        const operations = inputs.supportedApisFromApiSpec as ApiOperation[];

        return operations;
      },
    };
  }

  public getQuestionTreeNode(): IQTreeNode {
    return {
      condition: { equals: ApiPluginStartOptions.apiSpec().id },
      // data: specGenerator.getQuestions(),
      data: { type: "group", name: QuestionNames.FromExistingApi },
      children: [
        {
          data: this.apiSpecLocationQuestion(),
        },
        {
          data: this.apiOperationQuestion(),
          condition: (inputs: Inputs) => {
            return !inputs[QuestionNames.ApiPluginManifestPath];
          },
        },
      ],
    };
  }
  // activation condition
  public activate(context: Context, inputs: Inputs): boolean {
    // const capability = inputs.capabilities as string;
    // const meArchitecture = inputs[QuestionNames.MeArchitectureType] as string;
    // return (
    //   inputs[QuestionNames.ApiPluginType] === ApiPluginStartOptions.apiSpec().id ||
    //   meArchitecture === MeArchitectureOptions.apiSpec().id ||
    //   (capability === CapabilityOptions.customCopilotRag().id &&
    //     inputs[QuestionNames.CustomCopilotRag] === CustomCopilotRagOptions.customApi().id)
    // );
    return inputs[QuestionNames.TemplateName] === TemplateNames.DeclarativeAgentWithApiSpec;
  }

  getTemplateName(inputs: Inputs): string {
    // const capability = inputs.capabilities as string;
    // const meArchitecture = inputs[QuestionNames.MeArchitectureType] as string;
    // let templateName = "";
    // if (
    //   (capability === CapabilityOptions.apiPlugin().id ||
    //     capability === CapabilityOptions.declarativeAgent().id) &&
    //   inputs[QuestionNames.ApiPluginType] === ApiPluginStartOptions.apiSpec().id
    // ) {
    //   templateName = apiPluginFromApiSpecTemplateName;
    // } else if (meArchitecture === MeArchitectureOptions.apiSpec().id) {
    //   templateName = fromApiSpecTemplateName;
    // } else if (
    //   capability === CapabilityOptions.customCopilotRag().id &&
    //   inputs[QuestionNames.CustomCopilotRag] === CustomCopilotRagOptions.customApi().id
    // ) {
    //   templateName = forCustomCopilotRagCustomApi;
    // }
    // return templateName;
    return apiPluginFromApiSpecTemplateName;
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
      inputs[QuestionNames.Capabilities] === CapabilityOptions.declarativeAgent().id;
    merge(actionContext?.telemetryProps, {
      [telemetryProperties.templateName]: getTemplateInfosState.templateName,
      [telemetryProperties.isDeclarativeCopilot]: isDeclarativeCopilot.toString(),
    });

    // For Kiota integration, we need to get auth info here
    const isKiotaIntegration =
      featureFlagManager.getBooleanValue(FeatureFlags.KiotaIntegration) &&
      inputs[QuestionNames.ApiPluginManifestPath];
    if (isKiotaIntegration) {
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
      const envName = getEnvName(authData.authName);
      context.templateVariables = Generator.getDefaultVariables(
        appName,
        safeProjectNameFromVS,
        inputs.targetFramework,
        inputs.placeProjectFileInSolutionDir === "true",
        {
          authName: authData.authName,
          openapiSpecPath: isKiotaIntegration
            ? normalizePath(
                path.join(
                  AppPackageFolderName,
                  path.basename(inputs[QuestionNames.ApiSpecLocation])
                )
              )
            : normalizePath(
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
        inputs[QuestionNames.Capabilities] === CapabilityOptions.declarativeAgent().id;
      const isKiotaIntegration =
        featureFlagManager.getBooleanValue(FeatureFlags.KiotaIntegration) &&
        !!inputs[QuestionNames.ApiPluginManifestPath];
      const manifestPath = path.join(
        destinationPath,
        AppPackageFolderName,
        ManifestTemplateFileName
      );
      const apiSpecFolderPath = path.join(
        destinationPath,
        AppPackageFolderName,
        isKiotaIntegration ? "" : DefaultApiSpecFolderName
      );
      const openapiSpecFileName = isKiotaIntegration
        ? path.basename(inputs[QuestionNames.ApiSpecLocation])
        : getTemplateInfosState.isYaml
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
          ? path.join(
              destinationPath,
              AppPackageFolderName,
              isKiotaIntegration
                ? path.basename(inputs[QuestionNames.ApiPluginManifestPath])
                : DefaultPluginManifestFileName
            )
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
          path.basename(pluginManifestPath!)
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
          const updateWarnings = await updateForCustomApi(
            spec,
            language,
            destinationPath,
            openapiSpecFileName
          );
          warnings.push(...updateWarnings);
        } catch (error: any) {
          throw new SystemError(
            this.componentName,
            failedToUpdateCustomApiTemplateErrorName,
            error.message,
            error.message
          );
        }
      }

      if (isKiotaIntegration) {
        await copyKiotaFolder(inputs[QuestionNames.ApiPluginManifestPath], destinationPath);
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
