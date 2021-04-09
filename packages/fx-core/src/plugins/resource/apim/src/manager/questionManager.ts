// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Func, PluginContext, QTreeNode } from "fx-api";
import { BuildError, NotImplemented } from "../error";
import { IApimPluginConfig } from "../model/config";
import {
    ApimServiceQuestion,
    ApiPrefixQuestion,
    ApiVersionQuestion,
    NewApiVersionQuestion,
    OpenApiDocumentQuestion,
    IQuestionService,
    ExistingOpenApiDocumentFunc,
} from "../service/questionService";

export interface IQuestionManager {
    callFunc(func: Func, ctx: PluginContext): Promise<any>;
    update(apimConfig: IApimPluginConfig): Promise<QTreeNode | undefined>;
    deploy(apimConfig: IApimPluginConfig): Promise<QTreeNode>;
}

export class VscQuestionManager implements IQuestionManager {
    private readonly apimServiceQuestion: ApimServiceQuestion;
    private readonly openApiDocumentQuestion: OpenApiDocumentQuestion;
    private readonly existingOpenApiDocumentFunc: ExistingOpenApiDocumentFunc;
    private readonly apiPrefixQuestion: ApiPrefixQuestion;
    private readonly apiVersionQuestion: ApiVersionQuestion;
    private readonly newApiVersionQuestion: NewApiVersionQuestion;

    constructor(
        apimServiceQuestion: ApimServiceQuestion,
        openApiDocumentQuestion: OpenApiDocumentQuestion,
        apiPrefixQuestion: ApiPrefixQuestion,
        apiVersionQuestion: ApiVersionQuestion,
        newApiVersionQuestion: NewApiVersionQuestion,
        existingOpenApiDocumentFunc: ExistingOpenApiDocumentFunc
    ) {
        this.apimServiceQuestion = apimServiceQuestion;
        this.openApiDocumentQuestion = openApiDocumentQuestion;
        this.apiPrefixQuestion = apiPrefixQuestion;
        this.apiVersionQuestion = apiVersionQuestion;
        this.newApiVersionQuestion = newApiVersionQuestion;
        this.existingOpenApiDocumentFunc = existingOpenApiDocumentFunc;
    }

    async callFunc(func: Func, ctx: PluginContext): Promise<any> {
        const questionServices: IQuestionService[] = [
            this.apimServiceQuestion,
            this.openApiDocumentQuestion,
            this.apiPrefixQuestion,
            this.apiVersionQuestion,
            this.newApiVersionQuestion,
            this.existingOpenApiDocumentFunc,
        ];
        for (const questionService of questionServices) {
            if (questionService.funcName === func.method) {
                return await questionService.executeFunc(ctx);
            }
        }

        throw BuildError(NotImplemented);
    }

    async update(apimConfig: IApimPluginConfig): Promise<QTreeNode | undefined> {
        if (apimConfig.serviceName) {
            return undefined;
        }

        const question = this.apimServiceQuestion.getQuestion();
        const node = new QTreeNode(question);
        return node;
    }

    async deploy(apimConfig: IApimPluginConfig): Promise<QTreeNode> {
        let rootNode: QTreeNode;
        if (!apimConfig.apiDocumentPath) {
            const documentPathQuestion = this.openApiDocumentQuestion.getQuestion();
            const documentPathQuestionNode = new QTreeNode(documentPathQuestion);
            rootNode = documentPathQuestionNode;
        } else {
            const documentPathFunc = this.existingOpenApiDocumentFunc.getQuestion();
            const documentPathFuncNode = new QTreeNode(documentPathFunc);
            rootNode = documentPathFuncNode;
        }

        if (!apimConfig.apiPrefix) {
            const apiPrefixQuestion = this.apiPrefixQuestion.getQuestion();
            const apiPrefixQuestionNode = new QTreeNode(apiPrefixQuestion);
            rootNode.addChild(apiPrefixQuestionNode);
        }

        const versionQuestion = this.apiVersionQuestion.getQuestion();
        const versionQuestionNode = new QTreeNode(versionQuestion);
        rootNode.addChild(versionQuestionNode);

        const newVersionQuestion = this.newApiVersionQuestion.getQuestion();
        const newVersionQuestionNode = new QTreeNode(newVersionQuestion);
        newVersionQuestionNode.condition = this.newApiVersionQuestion.condition();
        versionQuestionNode.addChild(newVersionQuestionNode);

        return rootNode;
    }
}
