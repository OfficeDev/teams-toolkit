// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { AssertConfigNotEmpty, BuildError, NoValidOpenApiDocument } from "../error";
import {
    LogProvider,
    OptionItem,
    SingleSelectQuestion,
    NodeType,
    Validation,
    PluginContext,
    FuncQuestion,
    TextInputQuestion,
    TelemetryReporter,
} from "@microsoft/teamsfx-api";
import { ApimDefaultValues, ApimPluginConfigKeys, QuestionConstants, TeamsToolkitComponent } from "../constants";
import { ApimPluginConfig, SolutionConfig } from "../model/config";
import { ApimService } from "../service/apimService";
import { OpenApiProcessor } from "../utils/openApiProcessor";
import { buildAnswer } from "../model/answer";
import { NamingRules } from "../utils/namingRules";
import { BaseQuestionService, IQuestionService } from "./question";
import { Lazy } from "../utils/commonUtils";

export class ApimServiceQuestion extends BaseQuestionService implements IQuestionService {
    private readonly lazyApimService: Lazy<ApimService>;
    public readonly funcName = QuestionConstants.VSCode.Apim.funcName;

    constructor(lazyApimService: Lazy<ApimService>, telemetryReporter?: TelemetryReporter, logger?: LogProvider) {
        super(telemetryReporter, logger);
        this.lazyApimService = lazyApimService;
    }

    public async executeFunc(ctx: PluginContext): Promise<OptionItem[]> {
        const apimService: ApimService = await this.lazyApimService.getValue();
        const apimServiceList = await apimService.listService();
        const existingOptions = apimServiceList.map((apimService) => {
            return { id: apimService.serviceName, label: apimService.serviceName, description: apimService.resourceGroupName, data: apimService };
        });
        const newOption = { id: QuestionConstants.VSCode.Apim.createNewApimOption, label: QuestionConstants.VSCode.Apim.createNewApimOption };
        return [newOption, ...existingOptions];
    }

    public getQuestion(): SingleSelectQuestion {
        return {
            type: NodeType.singleSelect,
            name: QuestionConstants.VSCode.Apim.questionName,
            description: QuestionConstants.VSCode.Apim.description,
            option: {
                namespace: QuestionConstants.namespace,
                method: QuestionConstants.VSCode.Apim.funcName,
            },
            returnObject: true,
            skipSingleOption: false
        };
    }
}

export class OpenApiDocumentQuestion extends BaseQuestionService implements IQuestionService {
    private readonly openApiProcessor: OpenApiProcessor;
    public readonly funcName = QuestionConstants.VSCode.OpenApiDocument.funcName;

    constructor(openApiProcessor: OpenApiProcessor, telemetryReporter?: TelemetryReporter, logger?: LogProvider) {
        super(telemetryReporter, logger);
        this.openApiProcessor = openApiProcessor;
    }

    public async executeFunc(ctx: PluginContext): Promise<OptionItem[]> {
        const filePath2OpenApiMap = await this.openApiProcessor.listOpenApiDocument(
            ctx.root,
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

    public getQuestion(): SingleSelectQuestion {
        return {
            type: NodeType.singleSelect,
            name: QuestionConstants.VSCode.OpenApiDocument.questionName,
            description: QuestionConstants.VSCode.OpenApiDocument.description,
            option: {
                namespace: QuestionConstants.namespace,
                method: QuestionConstants.VSCode.OpenApiDocument.funcName,
            },
            returnObject: true,
            skipSingleOption: false
        };
    }
}

export class ExistingOpenApiDocumentFunc extends BaseQuestionService implements IQuestionService {
    private readonly openApiProcessor: OpenApiProcessor;
    public readonly funcName = QuestionConstants.VSCode.ExistingOpenApiDocument.funcName;

    constructor(openApiProcessor: OpenApiProcessor, telemetryReporter?: TelemetryReporter, logger?: LogProvider) {
        super(telemetryReporter, logger);
        this.openApiProcessor = openApiProcessor;
    }

    public async executeFunc(ctx: PluginContext): Promise<OptionItem> {
        const apimConfig = new ApimPluginConfig(ctx.config);
        const openApiDocumentPath = AssertConfigNotEmpty(
            TeamsToolkitComponent.ApimPlugin,
            ApimPluginConfigKeys.apiDocumentPath,
            apimConfig.apiDocumentPath
        );
        const openApiDocument = await this.openApiProcessor.loadOpenApiDocument(openApiDocumentPath, ctx.root);
        return { id: openApiDocumentPath, label: openApiDocumentPath, data: openApiDocument };
    }

    public getQuestion(): FuncQuestion {
        return {
            type: NodeType.func,
            name: QuestionConstants.VSCode.ExistingOpenApiDocument.questionName,
            namespace: QuestionConstants.namespace,
            method: QuestionConstants.VSCode.ExistingOpenApiDocument.funcName,
        };
    }
}

export class ApiPrefixQuestion extends BaseQuestionService implements IQuestionService {
    public readonly funcName = QuestionConstants.VSCode.ApiPrefix.funcName;

    constructor(telemetryReporter?: TelemetryReporter, logger?: LogProvider) {
        super(telemetryReporter, logger);
    }

    public async executeFunc(ctx: PluginContext): Promise<string> {
        const apiTitle = buildAnswer(ctx)?.openApiDocumentSpec?.info.title;
        return !!apiTitle ? NamingRules.apiPrefix.sanitize(apiTitle) : ApimDefaultValues.apiPrefix;
    }

    public getQuestion(): TextInputQuestion {
        return {
            type: NodeType.text,
            name: QuestionConstants.VSCode.ApiPrefix.questionName,
            description: QuestionConstants.VSCode.ApiPrefix.description,
            prompt: QuestionConstants.VSCode.ApiPrefix.prompt,
            default: {
                namespace: QuestionConstants.namespace,
                method: QuestionConstants.VSCode.ApiPrefix.funcName,
            },
            validation: {
                validFunc: (input: string): string | undefined => NamingRules.validate(input, NamingRules.apiPrefix)
            }
        };
    }
}

export class ApiVersionQuestion extends BaseQuestionService implements IQuestionService {
    private readonly lazyApimService: Lazy<ApimService>;
    public readonly funcName = QuestionConstants.VSCode.ApiVersion.funcName;

    constructor(lazyApimService: Lazy<ApimService>, telemetryReporter?: TelemetryReporter, logger?: LogProvider) {
        super(telemetryReporter, logger);
        this.lazyApimService = lazyApimService;
    }

    public async executeFunc(ctx: PluginContext): Promise<OptionItem[]> {
        const apimService = await this.lazyApimService.getValue();
        const apimConfig = new ApimPluginConfig(ctx.config);
        const solutionConfig = new SolutionConfig(ctx.configOfOtherPlugins);
        const answer = buildAnswer(ctx);
        const resourceGroupName = apimConfig.resourceGroupName ?? solutionConfig.resourceGroupName;
        const serviceName = AssertConfigNotEmpty(TeamsToolkitComponent.ApimPlugin, ApimPluginConfigKeys.serviceName, apimConfig.serviceName);
        const apiPrefix =
            answer.apiPrefix ?? AssertConfigNotEmpty(TeamsToolkitComponent.ApimPlugin, ApimPluginConfigKeys.apiPrefix, apimConfig.apiPrefix);
        const versionSetId = apimConfig.versionSetId ?? NamingRules.versionSetId.sanitize(apiPrefix, solutionConfig.resourceNameSuffix);

        const apiContracts = await apimService.listApi(resourceGroupName, serviceName, versionSetId);

        const existingApiVersionOptions: OptionItem[] = apiContracts.map((api) => {
            const result: OptionItem = { id: api.name ?? "", label: api.apiVersion ?? "", description: api.name, data: api };
            return result;
        });
        const createNewApiVersionOption: OptionItem = { id: QuestionConstants.VSCode.ApiVersion.createNewApiVersionOption, label: QuestionConstants.VSCode.ApiVersion.createNewApiVersionOption };
        return [createNewApiVersionOption, ...existingApiVersionOptions];
    }

    public getQuestion(): SingleSelectQuestion {
        return {
            type: NodeType.singleSelect,
            name: QuestionConstants.VSCode.ApiVersion.questionName,
            description: QuestionConstants.VSCode.ApiVersion.description,
            option: {
                namespace: QuestionConstants.namespace,
                method: QuestionConstants.VSCode.ApiVersion.funcName,
            },
            returnObject: true,
            skipSingleOption: false
        };
    }
}

export class NewApiVersionQuestion extends BaseQuestionService implements IQuestionService {
    public readonly funcName = QuestionConstants.VSCode.NewApiVersion.funcName;

    constructor(telemetryReporter?: TelemetryReporter, logger?: LogProvider) {
        super(telemetryReporter, logger);
    }

    public condition(): { target?: string; } & Validation {
        return {
            equals: QuestionConstants.VSCode.ApiVersion.createNewApiVersionOption,
        };
    }

    public async executeFunc(ctx: PluginContext): Promise<string> {
        const apiVersion = buildAnswer(ctx)?.openApiDocumentSpec?.info.version;
        return !!apiVersion ? NamingRules.versionIdentity.sanitize(apiVersion) : ApimDefaultValues.apiVersion;
    }

    public getQuestion(): TextInputQuestion {
        return {
            type: NodeType.text,
            name: QuestionConstants.VSCode.NewApiVersion.questionName,
            description: QuestionConstants.VSCode.NewApiVersion.description,
            default: {
                namespace: QuestionConstants.namespace,
                method: QuestionConstants.VSCode.NewApiVersion.funcName,
            },
            validation: {
                validFunc: (input: string): string | undefined => NamingRules.validate(input, NamingRules.versionIdentity)
            }
        };
    }
}