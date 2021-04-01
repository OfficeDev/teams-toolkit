// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { AssertNotEmpty, BuildError, EmptyChoice, InvalidApimServiceChoice, NoValidOpenApiDocument } from "../error";
import { LogProvider, Dialog, DialogMsg, DialogType, QuestionType } from "teamsfx-api";
import { IApimServiceResource } from "../model/resource";
import { QuestionConstants } from "../constants";
import { ApiContract } from "@azure/arm-apimanagement/src/models";
import { IApimPluginConfig, ISolutionConfig } from "../model/config";
import { ApimService } from "./apimService";
import { OpenApiProcessor } from "../util/openApiProcessor";
import { NameSanitizer } from "../util/nameSanitizer";
import { IOpenApiDocument } from "../model/openApiDocument";
import { Telemetry } from "../telemetry";

export type SelectQuestionInput<T> = { options: string[]; map: Map<string, T>; defaultValue?: string };
export type TextQuestionInput = { defaultValue?: string };
export type QuestionInput = SelectQuestionInput<any> | TextQuestionInput;

interface IQuestion {
    // Control whether the question is displayed to the user.
    isVisible(...params: any[]): boolean;

    // Generate the options and default value of the question.
    generateQuestionInput(...params: any[]): Promise<QuestionInput>;

    // Use dialog to ask user the question and return the answer.
    // TODO: Remove it after use question model.
    ask(input: QuestionInput): Promise<string>;

    // Save the answer to the configuration.
    save?(apimConfig: IApimPluginConfig, answer: string, map?: Map<string, any>): void;

    // Validate the answer of the question.
    validate?(answer: string): boolean;
}

class BaseQuestion {
    protected readonly dialog: Dialog;
    protected readonly logger?: LogProvider;
    protected readonly telemetry?: Telemetry;

    constructor(dialog: Dialog, telemetry?: Telemetry, logger?: LogProvider) {
        this.dialog = dialog;
        this.telemetry = telemetry;
        this.logger = logger;
    }
}

export class ApimServiceQuestion extends BaseQuestion implements IQuestion {
    private readonly apimService: ApimService;

    constructor(apimService: ApimService, dialog: Dialog, telemetry: Telemetry, logger?: LogProvider) {
        super(dialog, telemetry, logger);
        this.apimService = apimService;
    }

    public isVisible(apimConfig: IApimPluginConfig): boolean {
        return !apimConfig.serviceName;
    }

    public async generateQuestionInput(): Promise<SelectQuestionInput<IApimServiceResource>> {
        const apimServiceList = await this.apimService.listService();
        const name2ResourceMap = new Map<string, IApimServiceResource>();
        apimServiceList.forEach((resource) => name2ResourceMap.set(resource.serviceName, resource));
        const options = [QuestionConstants.createNewApimOption, ...name2ResourceMap.keys()];
        return { options: options, map: name2ResourceMap };
    }

    public async ask(input: SelectQuestionInput<IApimServiceResource>): Promise<string> {
        const answer = (
            await this.dialog.communicate(
                new DialogMsg(DialogType.Ask, {
                    type: QuestionType.Radio,
                    description: QuestionConstants.askApimServiceDescription,
                    options: input.options,
                })
            )
        ).getAnswer();

        if (!answer) {
            throw BuildError(EmptyChoice, QuestionConstants.askApimServiceDescription);
        }

        return answer;
    }

    public save(apimConfig: IApimPluginConfig, answer: string, name2ResourceMap: Map<string, IApimServiceResource>): void {
        if (answer === QuestionConstants.createNewApimOption) {
            apimConfig.resourceGroupName = undefined;
            apimConfig.serviceName = undefined;
            return;
        }

        const resource = name2ResourceMap.get(answer);
        if (!resource) {
            throw BuildError(InvalidApimServiceChoice, answer);
        }

        apimConfig.resourceGroupName = resource.resourceGroupName;
        apimConfig.serviceName = resource.serviceName;
    }
}

export class OpenApiDocumentQuestion extends BaseQuestion implements IQuestion {
    private readonly openApiProcessor: OpenApiProcessor;

    constructor(openApiProcessor: OpenApiProcessor, dialog: Dialog, telemetry: Telemetry, logger?: LogProvider) {
        super(dialog, telemetry, logger);
        this.openApiProcessor = openApiProcessor;
    }

    public isVisible(apimConfig: IApimPluginConfig): boolean {
        return !apimConfig.apiDocumentPath;
    }

    public async generateQuestionInput(rootPath: string): Promise<SelectQuestionInput<IOpenApiDocument>> {
        const filePath2OpenApiMap = await this.openApiProcessor.listOpenApiDocument(
            rootPath,
            QuestionConstants.excludeFolders,
            QuestionConstants.openApiDocumentFileExtensions
        );

        if (filePath2OpenApiMap.size === 0) {
            throw BuildError(NoValidOpenApiDocument);
        }

        return { options: [...filePath2OpenApiMap.keys()], map: filePath2OpenApiMap };
    }

    public async ask(input: SelectQuestionInput<IOpenApiDocument>): Promise<string> {
        const answer = (
            await this.dialog.communicate(
                new DialogMsg(DialogType.Ask, {
                    type: QuestionType.Radio,
                    description: QuestionConstants.askOpenApiDocumentDescription,
                    options: input.options,
                })
            )
        ).getAnswer();

        if (!answer) {
            throw BuildError(EmptyChoice, QuestionConstants.askOpenApiDocumentDescription);
        }

        return answer;
    }

    public save(apimConfig: IApimPluginConfig, answer: string): void {
        apimConfig.apiDocumentPath = answer;
    }
}

export class ApiNameQuestion extends BaseQuestion implements IQuestion {
    constructor(dialog: Dialog, telemetry: Telemetry, logger?: LogProvider) {
        super(dialog, telemetry, logger);
    }

    public isVisible(apimConfig: IApimPluginConfig): boolean {
        return !apimConfig.apiPrefix;
    }

    public async generateQuestionInput(apiTitle?: string): Promise<TextQuestionInput> {
        return {
            defaultValue: !!apiTitle ? NameSanitizer.sanitizeApiNamePrefix(apiTitle) : undefined,
        };
    }

    public async ask(input: TextQuestionInput): Promise<string> {
        const answer = (
            await this.dialog.communicate(
                new DialogMsg(DialogType.Ask, {
                    type: QuestionType.Text,
                    description: QuestionConstants.askApiNameDescription,
                    prompt: QuestionConstants.askApiNamePrompt,
                    defaultAnswer: input.defaultValue,
                })
            )
        ).getAnswer();

        if (!answer) {
            throw BuildError(EmptyChoice, QuestionConstants.askApiNameDescription);
        }

        return answer;
    }

    public save(apimConfig: IApimPluginConfig, answer: string): void {
        apimConfig.apiPrefix = answer;
    }
}

export class ApiVersionQuestion extends BaseQuestion implements IQuestion {
    private readonly apimService: ApimService;

    constructor(apimService: ApimService, dialog: Dialog, telemetry: Telemetry, logger?: LogProvider) {
        super(dialog, telemetry, logger);
        this.apimService = apimService;
    }

    public isVisible(apimConfig: IApimPluginConfig): boolean {
        return true;
    }

    public async generateQuestionInput(solutionConfig: ISolutionConfig, apimConfig: IApimPluginConfig): Promise<SelectQuestionInput<ApiContract>> {
        const resourceGroupName = apimConfig.resourceGroupName ?? solutionConfig.resourceGroupName;
        const serviceName = AssertNotEmpty("apimConfig.serviceName", apimConfig.serviceName);
        const apiPrefix = AssertNotEmpty("apimConfig.apiPrefix", apimConfig.apiPrefix);
        const versionSetId = apimConfig.versionSetId ?? NameSanitizer.sanitizeVersionSetId(apiPrefix, solutionConfig.resourceNameSuffix);

        const version2ApiContract = new Map<string, ApiContract>();
        const apiContracts = await this.apimService.listApi(resourceGroupName, serviceName, versionSetId);

        // TODO: Deal with same version name.
        apiContracts.forEach((api) => {
            if (!!api.apiVersion) {
                version2ApiContract.set(api.apiVersion, api);
            }
        });

        return {
            options: [QuestionConstants.createNewApiVersionOption, ...version2ApiContract.keys()],
            map: version2ApiContract,
        };
    }

    public async ask(input: SelectQuestionInput<ApiContract>): Promise<string> {
        const answer = (
            await this.dialog.communicate(
                new DialogMsg(DialogType.Ask, {
                    type: QuestionType.Radio,
                    description: QuestionConstants.askApiVersionDescription,
                    options: input.options,
                })
            )
        ).getAnswer();

        if (!answer) {
            throw BuildError(EmptyChoice, QuestionConstants.askApiVersionDescription);
        }

        return answer;
    }
}

export class NewApiVersionQuestion extends BaseQuestion implements IQuestion {
    constructor(dialog: Dialog, telemetry: Telemetry, logger?: LogProvider) {
        super(dialog, telemetry, logger);
    }

    public isVisible(parent?: string): boolean {
        return !parent || parent === QuestionConstants.createNewApiVersionOption;
    }

    public async generateQuestionInput(apiVersion?: string): Promise<TextQuestionInput> {
        return {
            defaultValue: !!apiVersion ? NameSanitizer.sanitizeApiVersionIdentity(apiVersion) : apiVersion,
        };
    }

    public async ask(input: TextQuestionInput): Promise<string> {
        const answer = (
            await this.dialog.communicate(
                new DialogMsg(DialogType.Ask, {
                    type: QuestionType.Text,
                    description: QuestionConstants.askNewApiVersionDescription,
                    prompt: QuestionConstants.askNewApiVersionPrompt,
                    defaultAnswer: input.defaultValue,
                })
            )
        ).getAnswer();

        if (!answer) {
            throw BuildError(EmptyChoice, QuestionConstants.askNewApiVersionDescription);
        }

        return answer;
    }
}
