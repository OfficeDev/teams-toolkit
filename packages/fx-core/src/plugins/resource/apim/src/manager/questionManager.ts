// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { AssertNotEmpty } from "../error";
import { IApimAnswer } from "../model/answer";
import { IApimPluginConfig, ISolutionConfig } from "../model/config";
import { IOpenApiDocument } from "../model/openApiDocument";
import { ApimServiceQuestion, ApiNameQuestion, ApiVersionQuestion, NewApiVersionQuestion, OpenApiDocumentQuestion } from "../service/questionService";
import { OpenApiProcessor } from "../util/openApiProcessor";

export class QuestionManager {
    private readonly apimServiceQuestion: ApimServiceQuestion;
    private readonly openApiDocumentQuestion: OpenApiDocumentQuestion;
    private readonly apiNameQuestion: ApiNameQuestion;
    private readonly apiVersionQuestion: ApiVersionQuestion;
    private readonly newApiVersionQuestion: NewApiVersionQuestion;
    private readonly openApiProcessor: OpenApiProcessor;

    constructor(
        apimServiceQuestion: ApimServiceQuestion,
        openApiDocumentQuestion: OpenApiDocumentQuestion,
        apiNameQuestion: ApiNameQuestion,
        apiVersionQuestion: ApiVersionQuestion,
        newApiVersionQuestion: NewApiVersionQuestion,
        openApiProcessor: OpenApiProcessor
    ) {
        this.apimServiceQuestion = apimServiceQuestion;
        this.openApiDocumentQuestion = openApiDocumentQuestion;
        this.apiNameQuestion = apiNameQuestion;
        this.apiVersionQuestion = apiVersionQuestion;
        this.newApiVersionQuestion = newApiVersionQuestion;
        this.openApiProcessor = openApiProcessor;
    }

    async preScaffold(apimConfig: IApimPluginConfig): Promise<void> {
        if (this.apimServiceQuestion.isVisible(apimConfig)) {
            const input = await this.apimServiceQuestion.generateQuestionInput();
            const answer = await this.apimServiceQuestion.ask(input);

            await this.apimServiceQuestion.save(apimConfig, answer, input.map);
        }
    }

    async preDeploy(solutionConfig: ISolutionConfig, apimConfig: IApimPluginConfig, projectRootPath: string, answer: IApimAnswer): Promise<void> {
        let openApiDocument: IOpenApiDocument | undefined;
        let versionIdentity: string | undefined;
        let existingApiId: string | undefined;

        if (this.openApiDocumentQuestion.isVisible(apimConfig)) {
            const input = await this.openApiDocumentQuestion.generateQuestionInput(projectRootPath);
            const answer = await this.openApiDocumentQuestion.ask(input);
            this.openApiDocumentQuestion.save(apimConfig, answer);
            openApiDocument = input.map.get(answer);
        } else {
            openApiDocument = await this.openApiProcessor.loadOpenApiDocument(
                AssertNotEmpty("apimConfig.apiDocumentPath", apimConfig.apiDocumentPath),
                projectRootPath
            );
        }

        // [First time] ask user the title and the version
        if (this.apiNameQuestion.isVisible(apimConfig)) {
            const input = await this.apiNameQuestion.generateQuestionInput(openApiDocument?.spec.info.title);
            const answer = await this.apiNameQuestion.ask(input);
            this.apiNameQuestion.save(apimConfig, answer);
        }

        if (this.apiVersionQuestion.isVisible(apimConfig)) {
            const input = await this.apiVersionQuestion.generateQuestionInput(solutionConfig, apimConfig);
            versionIdentity = await this.apiVersionQuestion.ask(input);
            existingApiId = input.map.get(versionIdentity)?.name;
        }

        if (this.newApiVersionQuestion.isVisible(versionIdentity)) {
            const input = await this.newApiVersionQuestion.generateQuestionInput(openApiDocument?.spec.info.version);
            versionIdentity = await this.newApiVersionQuestion.ask(input);
        }

        answer.versionIdentity = AssertNotEmpty("versionIdentity", versionIdentity);
        answer.apiId = existingApiId;
    }
}
