// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ApiContract } from "@azure/arm-apimanagement/src/models";
import { ConfigMap, Platform, PluginContext, Stage } from "teamsfx-api";
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
    save(stage: Stage, apimConfig: IApimPluginConfig): void;
}

export interface IApimVscAnswer extends IAnswer {
    openApiDocumentSpec: OpenAPI.Document | undefined;
}

export function buildAnswer(ctx: PluginContext): IApimVscAnswer {
    switch (ctx.platform) {
        case Platform.VSCode:
            const answers = AssertNotEmpty("ctx.answers", ctx.answers);
            return new VscAnswer(answers);
        default:
            throw BuildError(NotImplemented);
    }
}

export class VscAnswer implements IApimVscAnswer {
    private answer: ConfigMap;
    constructor(answer: ConfigMap) {
        this.answer = answer;
    }
    get resourceGroupName(): string | undefined {
        const apimService = this.answer?.getOptionItem(QuestionConstants.Apim.questionName)?.data as IApimServiceResource;
        return apimService?.resourceGroupName;
    }
    get apimServiceName(): string | undefined {
        const apimService = this.answer?.getOptionItem(QuestionConstants.Apim.questionName)?.data as IApimServiceResource;
        return apimService?.serviceName;
    }
    get apiDocumentPath(): string | undefined {
        return this.answer?.getOptionItem(QuestionConstants.OpenApiDocument.questionName)?.label;
    }
    get openApiDocumentSpec(): OpenAPI.Document | undefined {
        const openApiDocument = this.answer?.getOptionItem(QuestionConstants.OpenApiDocument.questionName)?.data as IOpenApiDocument;
        return openApiDocument?.spec as OpenAPI.Document;
    }
    get apiPrefix(): string | undefined {
        return this.answer?.getString(QuestionConstants.ApiPrefix.questionName);
    }
    get apiId(): string | undefined {
        const api = this.answer?.getOptionItem(QuestionConstants.ApiVersion.questionName)?.data as ApiContract;
        return api?.name;
    }
    get versionIdentity(): string | undefined {
        const api = this.answer?.getOptionItem(QuestionConstants.ApiVersion.questionName)?.data as ApiContract;
        return api?.apiVersion ?? this.answer?.getString(QuestionConstants.NewApiVersion.questionName);
    }

    save(stage: Stage, apimConfig: IApimPluginConfig): void {
        switch (stage) {
            case Stage.update:
                apimConfig.resourceGroupName = this.resourceGroupName;
                apimConfig.serviceName = this.apimServiceName;
                break;
            case Stage.deploy:
                apimConfig.apiDocumentPath = this.apiDocumentPath;
                apimConfig.apiPrefix = this.apiPrefix;
                break;
        }
    }
}
