// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ApiContract } from "@azure/arm-apimanagement/src/models";
import { ConfigMap, Platform, PluginContext, Stage } from "fx-api";
import { OpenAPI } from "openapi-types";
import { QuestionConstants } from "../constants";
import { AssertNotEmpty, BuildError, NotImplemented } from "../error";
import { IApimPluginConfig } from "./config";
import { IOpenApiDocument } from "./openApiDocument";
import { IApimServiceResource } from "./resource";

export interface IAnswer {
    resourceGroupName: string | undefined;
    apimServiceName: string | undefined;
    apiDocumentPath: string | undefined;
    apiPrefix: string | undefined;
    apiId: string | undefined;
    versionIdentity: string | undefined;
    openApiDocumentSpec?: OpenAPI.Document;
    save(stage: Stage, apimConfig: IApimPluginConfig): void;
}

export function buildAnswer(ctx: PluginContext): IAnswer {
    const answers = AssertNotEmpty("ctx.answers", ctx.answers);
    switch (ctx.platform) {
        case Platform.VSCode:
            return new VSCodeAnswer(answers);
        case Platform.CLI:
            return new CLIAnswer(answers)
        default:
            throw BuildError(NotImplemented);
    }
}

export class VSCodeAnswer implements IAnswer {
    private answer: ConfigMap;
    constructor(answer: ConfigMap) {
        this.answer = answer;
    }
    get resourceGroupName(): string | undefined {
        const apimService = this.answer?.getOptionItem(QuestionConstants.VSCode.Apim.questionName)?.data as IApimServiceResource;
        return apimService?.resourceGroupName;
    }
    get apimServiceName(): string | undefined {
        const apimService = this.answer?.getOptionItem(QuestionConstants.VSCode.Apim.questionName)?.data as IApimServiceResource;
        return apimService?.serviceName;
    }
    get apiDocumentPath(): string | undefined {
        return this.answer?.getOptionItem(QuestionConstants.VSCode.OpenApiDocument.questionName)?.label;
    }
    get openApiDocumentSpec(): OpenAPI.Document | undefined {
        const openApiDocument = this.answer?.getOptionItem(QuestionConstants.VSCode.OpenApiDocument.questionName)?.data as IOpenApiDocument;
        return openApiDocument?.spec as OpenAPI.Document;
    }
    get apiPrefix(): string | undefined {
        return this.answer?.getString(QuestionConstants.VSCode.ApiPrefix.questionName);
    }
    get apiId(): string | undefined {
        const api = this.answer?.getOptionItem(QuestionConstants.VSCode.ApiVersion.questionName)?.data as ApiContract;
        return api?.name;
    }
    get versionIdentity(): string | undefined {
        const api = this.answer?.getOptionItem(QuestionConstants.VSCode.ApiVersion.questionName)?.data as ApiContract;
        return api?.apiVersion ?? this.answer?.getString(QuestionConstants.VSCode.NewApiVersion.questionName);
    }

    save(stage: Stage, apimConfig: IApimPluginConfig): void {
        switch (stage) {
            case Stage.update:
                apimConfig.resourceGroupName = this.resourceGroupName ?? apimConfig.resourceGroupName;
                apimConfig.serviceName = this.apimServiceName ?? apimConfig.serviceName;
                break;
            case Stage.deploy:
                apimConfig.apiDocumentPath = this.apiDocumentPath ?? apimConfig.apiDocumentPath;
                apimConfig.apiPrefix = this.apiPrefix ?? apimConfig.apiPrefix;
                break;
        }
    }
}

export class CLIAnswer implements IAnswer {
    private answer: ConfigMap;
    constructor(answer: ConfigMap) {
        this.answer = answer;
    }

    get resourceGroupName(): string | undefined {
        return this.answer?.getString(QuestionConstants.CLI.ApimResourceGroup.questionName);
    }
    get apimServiceName(): string | undefined {
        return this.answer?.getString(QuestionConstants.CLI.ApimServiceName.questionName);
    }
    get apiDocumentPath(): string | undefined {
        return this.answer?.getString(QuestionConstants.CLI.OpenApiDocument.questionName);
    }
    get apiPrefix(): string | undefined {
        return this.answer?.getString(QuestionConstants.CLI.ApiPrefix.questionName);
    }
    get apiId(): string | undefined {
        return this.answer?.getString(QuestionConstants.CLI.ApiId.questionName);
    }
    get versionIdentity(): string | undefined {
        return this.answer?.getString(QuestionConstants.CLI.ApiVersion.questionName);
    }

    save(stage: Stage, apimConfig: IApimPluginConfig): void {
        switch (stage) {
            case Stage.update:
                apimConfig.resourceGroupName = this.resourceGroupName ?? apimConfig.resourceGroupName;
                apimConfig.serviceName = this.apimServiceName ?? apimConfig.serviceName;
                break;
            case Stage.deploy:
                apimConfig.apiDocumentPath = this.apiDocumentPath ?? apimConfig.apiDocumentPath;
                apimConfig.apiPrefix = this.apiPrefix ?? apimConfig.apiPrefix;
                break;
        }
    }
}
