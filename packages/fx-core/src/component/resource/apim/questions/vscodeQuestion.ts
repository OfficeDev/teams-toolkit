// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  EnvInfo,
  FuncQuestion,
  Inputs,
  Json,
  LogProvider,
  OptionItem,
  PluginConfig,
  SingleSelectQuestion,
  TelemetryReporter,
  TextInputQuestion,
  v3,
  ValidationSchema,
} from "@microsoft/teamsfx-api";
import { getResourceGroupNameFromResourceId } from "../../../../common/tools";
import { APIM_STATE_KEY } from "../../../../component/migrate";
import { BuiltInFeaturePluginNames } from "../../../../plugins/solution/fx-solution/v3/constants";
import { buildAnswer } from "../answer";
import { ApimPluginConfig, SolutionConfig } from "../config";
import { ApimDefaultValues, ApimPluginConfigKeys, QuestionConstants } from "../constants";
import { BuildError, NoValidOpenApiDocument } from "../error";
import { ApimService } from "../services/apimService";
import { getApimServiceNameFromResourceId, Lazy } from "../utils/commonUtils";
import { NamingRules } from "../utils/namingRules";
import { OpenApiProcessor } from "../utils/openApiProcessor";
import { BaseQuestionService, IQuestionService } from "./question";

export class OpenApiDocumentQuestion extends BaseQuestionService {
  private readonly openApiProcessor: OpenApiProcessor;

  constructor(
    openApiProcessor: OpenApiProcessor,
    telemetryReporter?: TelemetryReporter,
    logger?: LogProvider
  ) {
    super(telemetryReporter, logger);
    this.openApiProcessor = openApiProcessor;
  }

  public getQuestion(projectPath: string): SingleSelectQuestion {
    return {
      type: "singleSelect",
      name: QuestionConstants.VSCode.OpenApiDocument.questionName,
      title: QuestionConstants.VSCode.OpenApiDocument.description,
      staticOptions: [],
      dynamicOptions: async (inputs: Inputs): Promise<OptionItem[]> => {
        return this.getDynamicOptions(projectPath);
      },
      returnObject: true,
      skipSingleOption: false,
    };
  }

  private async getDynamicOptions(root: string): Promise<OptionItem[]> {
    const filePath2OpenApiMap = await this.openApiProcessor.listOpenApiDocument(
      root,
      QuestionConstants.VSCode.OpenApiDocument.excludeFolders,
      QuestionConstants.VSCode.OpenApiDocument.openApiDocumentFileExtensions
    );

    if (filePath2OpenApiMap.size === 0) {
      throw BuildError(NoValidOpenApiDocument);
    }

    const result: OptionItem[] = [];
    filePath2OpenApiMap.forEach((value, key) => result.push({ id: key, label: key, data: value }));
    return result;
  }
}

export class ExistingOpenApiDocumentFunc extends BaseQuestionService {
  private readonly openApiProcessor: OpenApiProcessor;

  constructor(
    openApiProcessor: OpenApiProcessor,
    telemetryReporter?: TelemetryReporter,
    logger?: LogProvider
  ) {
    super(telemetryReporter, logger);
    this.openApiProcessor = openApiProcessor;
  }

  public getQuestion(
    projectPath: string,
    envName: string,
    apimState: PluginConfig | Json
  ): FuncQuestion {
    return {
      type: "func",
      name: QuestionConstants.VSCode.ExistingOpenApiDocument.questionName,
      func: async (inputs: Inputs): Promise<OptionItem> => {
        const apimConfig = new ApimPluginConfig(apimState, envName);
        const openApiDocumentPath = apimConfig.checkAndGet(ApimPluginConfigKeys.apiDocumentPath);
        const openApiDocument = await this.openApiProcessor.loadOpenApiDocument(
          openApiDocumentPath,
          projectPath
        );
        return { id: openApiDocumentPath, label: openApiDocumentPath, data: openApiDocument };
      },
    };
  }
}

export class ApiPrefixQuestion extends BaseQuestionService implements IQuestionService {
  constructor(telemetryReporter?: TelemetryReporter, logger?: LogProvider) {
    super(telemetryReporter, logger);
  }

  public getQuestion(): TextInputQuestion {
    return {
      type: "text",
      name: QuestionConstants.VSCode.ApiPrefix.questionName,
      title: QuestionConstants.VSCode.ApiPrefix.description,
      prompt: QuestionConstants.VSCode.ApiPrefix.prompt,
      default: async (inputs: Inputs): Promise<string> => {
        const apiTitle = buildAnswer(inputs)?.openApiDocumentSpec?.info.title;
        let apiPrefix: string | undefined;
        if (apiTitle) {
          apiPrefix = NamingRules.apiPrefix.sanitize(apiTitle);
        }

        return apiPrefix ? apiPrefix : ApimDefaultValues.apiPrefix;
      },
      validation: {
        validFunc: (input: string, previousInputs?: Inputs): string | undefined =>
          NamingRules.validate(input as string, NamingRules.apiPrefix),
      },
    };
  }
}

export class ApiVersionQuestion extends BaseQuestionService {
  private readonly lazyApimService: Lazy<ApimService>;

  constructor(
    lazyApimService: Lazy<ApimService>,
    telemetryReporter?: TelemetryReporter,
    logger?: LogProvider
  ) {
    super(telemetryReporter, logger);
    this.lazyApimService = lazyApimService;
  }

  public getQuestion(envInfo: EnvInfo | v3.EnvInfoV3): SingleSelectQuestion {
    return {
      type: "singleSelect",
      name: QuestionConstants.VSCode.ApiVersion.questionName,
      title: QuestionConstants.VSCode.ApiVersion.description,
      staticOptions: [],
      dynamicOptions: async (inputs: Inputs): Promise<OptionItem[]> => {
        return this.getDynamicOptions(inputs, envInfo);
      },
      returnObject: true,
      skipSingleOption: false,
    };
  }

  private async getDynamicOptions(
    inputs: Inputs,
    envInfo: EnvInfo | v3.EnvInfoV3
  ): Promise<OptionItem[]> {
    const apimService = await this.lazyApimService.getValue();
    const apimState = envInfo.state.get
      ? (envInfo.state as Map<string, any>).get(BuiltInFeaturePluginNames.apim)
      : (envInfo.state as Json)[APIM_STATE_KEY];
    const apimConfig = new ApimPluginConfig(apimState, envInfo.envName);
    const solutionConfig = new SolutionConfig(envInfo);
    const answer = buildAnswer(inputs);

    const apimServiceResourceId = apimConfig.checkAndGet(ApimPluginConfigKeys.serviceResourceId);
    const resourceGroupName = getResourceGroupNameFromResourceId(apimServiceResourceId);
    const serviceName = getApimServiceNameFromResourceId(apimServiceResourceId);

    const apiPrefix = answer.apiPrefix ?? apimConfig.checkAndGet(ApimPluginConfigKeys.apiPrefix);
    const versionSetId =
      apimConfig.versionSetId ??
      NamingRules.versionSetId.sanitize(apiPrefix, solutionConfig.resourceNameSuffix);

    const apiContracts = await apimService.listApi(resourceGroupName, serviceName, versionSetId);

    const existingApiVersionOptions: OptionItem[] = apiContracts.map((api) => {
      const result: OptionItem = {
        id: api.name ?? "",
        label: api.apiVersion ?? "",
        description: api.name ?? "",
        data: api,
      };
      return result;
    });
    const createNewApiVersionOption: OptionItem = {
      id: QuestionConstants.VSCode.ApiVersion.createNewApiVersionOption,
      label: QuestionConstants.VSCode.ApiVersion.createNewApiVersionOption,
    };
    return [createNewApiVersionOption, ...existingApiVersionOptions];
  }
}

export class NewApiVersionQuestion extends BaseQuestionService implements IQuestionService {
  constructor(telemetryReporter?: TelemetryReporter, logger?: LogProvider) {
    super(telemetryReporter, logger);
  }

  public condition(): { target?: string } & ValidationSchema {
    return {
      equals: QuestionConstants.VSCode.ApiVersion.createNewApiVersionOption,
    };
  }

  public getQuestion(): TextInputQuestion {
    return {
      type: "text",
      name: QuestionConstants.VSCode.NewApiVersion.questionName,
      title: QuestionConstants.VSCode.NewApiVersion.description,
      default: async (inputs: Inputs): Promise<string> => {
        const apiVersion = buildAnswer(inputs)?.openApiDocumentSpec?.info.version;
        let versionIdentity: string | undefined;
        if (apiVersion) {
          versionIdentity = NamingRules.versionIdentity.sanitize(apiVersion);
        }

        return versionIdentity ? versionIdentity : ApimDefaultValues.apiVersion;
      },
      validation: {
        validFunc: (input: string, previousInputs?: Inputs): string | undefined =>
          NamingRules.validate(input as string, NamingRules.versionIdentity),
      },
    };
  }
}
