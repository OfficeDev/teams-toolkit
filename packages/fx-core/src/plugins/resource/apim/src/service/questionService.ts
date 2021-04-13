// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { AssertConfigNotEmpty, BuildError, NoValidOpenApiDocument } from "../error";
import {
    LogProvider,
    Dialog,
    OptionItem,
    SingleSelectQuestion,
    NodeType,
    Question,
    Validation,
    PluginContext,
    FuncQuestion,
    TextInputQuestion,
    TelemetryReporter
} from "fx-api";
import { ApimDefaultValues, ApimPluginConfigKeys, QuestionConstants, TeamsToolkitComponent } from "../constants";
import { ApimPluginConfig, SolutionConfig } from "../model/config";
import { ApimService } from "./apimService";
import { OpenApiProcessor } from "../util/openApiProcessor";
import { buildAnswer } from "../model/answer";
import { Lazy } from "../util/lazy";
import { NamingRules } from "../util/namingRules";

export interface IQuestionService {
    // Control whether the question is displayed to the user.
    condition?(parentAnswerPath: string): { target?: string; } & Validation;

    // Define the method name
    funcName: string;

    // Generate the options / default value / answer of the question.
    executeFunc(ctx: PluginContext): Promise<string | OptionItem | OptionItem[]>;

    // Generate the question
    getQuestion(): Question;
}

class BaseQuestionService {
    protected readonly dialog: Dialog;
    protected readonly logger?: LogProvider;
    protected readonly telemetry?: TelemetryReporter;

    constructor(dialog: Dialog, telemetry?: TelemetryReporter, logger?: LogProvider) {
        this.dialog = dialog;
        this.telemetry = telemetry;
        this.logger = logger;
    }
}

export class ApimServiceQuestion extends BaseQuestionService implements IQuestionService {
    private readonly lazyApimService: Lazy<ApimService>;
    public readonly funcName = QuestionConstants.Apim.funcName;

    constructor(lazyApimService: Lazy<ApimService>, dialog: Dialog, telemetry?: TelemetryReporter, logger?: LogProvider) {
        super(dialog, telemetry, logger);
        this.lazyApimService = lazyApimService;
    }

    public async executeFunc(ctx: PluginContext): Promise<OptionItem[]> {
        const apimService: ApimService = await this.lazyApimService.getValue();
        const apimServiceList = await apimService.listService();
        const existingOptions = apimServiceList.map((apimService) => {
            return { id: apimService.serviceName, label: apimService.serviceName, description: apimService.resourceGroupName, data: apimService };
        });
        const newOption = { id: QuestionConstants.Apim.createNewApimOption, label: QuestionConstants.Apim.createNewApimOption };
        return [newOption, ...existingOptions];
    }

    public getQuestion(): SingleSelectQuestion {
        return {
            type: NodeType.singleSelect,
            name: QuestionConstants.Apim.questionName,
            description: QuestionConstants.Apim.description,
            option: {
                namespace: QuestionConstants.namespace,
                method: QuestionConstants.Apim.funcName,
            },
            returnObject: true,
            skipSingleOption: false
        };
    }
}

export class OpenApiDocumentQuestion extends BaseQuestionService implements IQuestionService {
    private readonly openApiProcessor: OpenApiProcessor;
    public readonly funcName = QuestionConstants.OpenApiDocument.funcName;

    constructor(openApiProcessor: OpenApiProcessor, dialog: Dialog, telemetry?: TelemetryReporter, logger?: LogProvider) {
        super(dialog, telemetry, logger);
        this.openApiProcessor = openApiProcessor;
    }

    public async executeFunc(ctx: PluginContext): Promise<OptionItem[]> {
        const filePath2OpenApiMap = await this.openApiProcessor.listOpenApiDocument(
            ctx.root,
            QuestionConstants.OpenApiDocument.excludeFolders,
            QuestionConstants.OpenApiDocument.openApiDocumentFileExtensions
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
            name: QuestionConstants.OpenApiDocument.questionName,
            description: QuestionConstants.OpenApiDocument.description,
            option: {
                namespace: QuestionConstants.namespace,
                method: QuestionConstants.OpenApiDocument.funcName,
            },
            returnObject: true,
            skipSingleOption: false
        };
    }
}

export class ExistingOpenApiDocumentFunc extends BaseQuestionService implements IQuestionService {
    private readonly openApiProcessor: OpenApiProcessor;
    public readonly funcName = QuestionConstants.ExistingOpenApiDocument.funcName;

    constructor(openApiProcessor: OpenApiProcessor, dialog: Dialog, telemetry?: TelemetryReporter, logger?: LogProvider) {
        super(dialog, telemetry, logger);
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
            name: QuestionConstants.ExistingOpenApiDocument.questionName,
            namespace: QuestionConstants.namespace,
            method: QuestionConstants.ExistingOpenApiDocument.funcName,
        };
    }
}

export class ApiPrefixQuestion extends BaseQuestionService implements IQuestionService {
    public readonly funcName = QuestionConstants.ApiPrefix.funcName;

    constructor(dialog: Dialog, telemetry?: TelemetryReporter, logger?: LogProvider) {
        super(dialog, telemetry, logger);
    }

    public async executeFunc(ctx: PluginContext): Promise<string> {
        const apiTitle = buildAnswer(ctx)?.openApiDocumentSpec?.info.title;
        return !!apiTitle ? NamingRules.apiPrefix.sanitize(apiTitle) : ApimDefaultValues.apiPrefix;
    }

    public getQuestion(): TextInputQuestion {
        return {
            type: NodeType.text,
            name: QuestionConstants.ApiPrefix.questionName,
            description: QuestionConstants.ApiPrefix.description,
            default: {
                namespace: QuestionConstants.namespace,
                method: QuestionConstants.ApiPrefix.funcName,
            },
            validation: {
                validFunc: (input: string): string | undefined => NamingRules.validate(input, NamingRules.apiPrefix)
            }
        };
    }
}

export class ApiVersionQuestion extends BaseQuestionService implements IQuestionService {
    private readonly lazyApimService: Lazy<ApimService>;
    public readonly funcName = QuestionConstants.ApiVersion.funcName;

    constructor(lazyApimService: Lazy<ApimService>, dialog: Dialog, telemetry?: TelemetryReporter, logger?: LogProvider) {
        super(dialog, telemetry, logger);
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
        const createNewApiVersionOption: OptionItem = { id: QuestionConstants.ApiVersion.createNewApiVersionOption, label: QuestionConstants.ApiVersion.createNewApiVersionOption };
        return [createNewApiVersionOption, ...existingApiVersionOptions];
    }

    public getQuestion(): SingleSelectQuestion {
        return {
            type: NodeType.singleSelect,
            name: QuestionConstants.ApiVersion.questionName,
            description: QuestionConstants.ApiVersion.description,
            option: {
                namespace: QuestionConstants.namespace,
                method: QuestionConstants.ApiVersion.funcName,
            },
            returnObject: true,
            skipSingleOption: false
        };
    }
}

export class NewApiVersionQuestion extends BaseQuestionService implements IQuestionService {
    public readonly funcName = QuestionConstants.NewApiVersion.funcName;

    constructor(dialog: Dialog, telemetry?: TelemetryReporter, logger?: LogProvider) {
        super(dialog, telemetry, logger);
    }

    public condition(): { target?: string; } & Validation {
        return {
            equals: QuestionConstants.ApiVersion.createNewApiVersionOption,
        };
    }

    public async executeFunc(ctx: PluginContext): Promise<string> {
        const apiVersion = buildAnswer(ctx)?.openApiDocumentSpec?.info.version;
        return !!apiVersion ? NamingRules.versionIdentity.sanitize(apiVersion) : ApimDefaultValues.apiVersion;
    }

    public getQuestion(): TextInputQuestion {
        return {
            type: NodeType.text,
            name: QuestionConstants.NewApiVersion.questionName,
            description: QuestionConstants.NewApiVersion.description,
            default: {
                namespace: QuestionConstants.namespace,
                method: QuestionConstants.NewApiVersion.funcName,
            },
            validation: {
                validFunc: (input: string): string | undefined => NamingRules.validate(input, NamingRules.versionIdentity)
            }
        };
    }
}
