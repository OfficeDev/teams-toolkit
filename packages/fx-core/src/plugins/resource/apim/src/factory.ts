// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext } from "fx-api";
import { AssertNotEmpty } from "./error";
import { ApimService } from "./service/apimService";
import { SolutionConfig } from "./model/config";
import { AadService } from "./service/aadService";
import { OpenApiProcessor } from "./util/openApiProcessor";
import { ApimManager } from "./manager/apimManager";
import { AadManager } from "./manager/aadManager";
import { Telemetry } from "./telemetry";
import { QuestionManager } from "./manager/questionManager";
import { ApimServiceQuestion, ApiNameQuestion, ApiVersionQuestion, NewApiVersionQuestion, OpenApiDocumentQuestion } from "./service/questionService";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import { TeamsAppAadManager } from "./manager/teamsAppAadManager";
import axios from "axios";
import { AadDefaultValues } from "./constants";

export class Factory {
    public static buildTelemetry(ctx: PluginContext) {
        return new Telemetry(ctx.telemetryReporter);
    }

    public static async buildApimManager(ctx: PluginContext, solutionConfig: SolutionConfig, telemetry: Telemetry): Promise<ApimManager> {
        const apimService = await this.buildApimService(ctx, solutionConfig, telemetry);
        const openApiProcessor = new OpenApiProcessor(telemetry, ctx.logProvider);
        return new ApimManager(apimService, openApiProcessor, telemetry, ctx.logProvider);
    }

    public static async buildAadManager(ctx: PluginContext, telemetry: Telemetry): Promise<AadManager> {
        const aadService = await this.buildAadService(ctx, telemetry);
        return new AadManager(aadService, telemetry, ctx.logProvider);
    }

    public static async buildTeamsAppAadManager(ctx: PluginContext, telemetry: Telemetry): Promise<TeamsAppAadManager> {
        const aadService = await this.buildAadService(ctx, telemetry);
        return new TeamsAppAadManager(aadService, telemetry, ctx.logProvider);
    }

    public static async buildQuestionManager(ctx: PluginContext, solutionConfig: SolutionConfig, telemetry: Telemetry): Promise<QuestionManager> {
        const dialog = AssertNotEmpty("ctx.dialog", ctx.dialog);
        const apimService = await this.buildApimService(ctx, solutionConfig, telemetry);
        const openApiProcessor = new OpenApiProcessor(telemetry, ctx.logProvider);
        const apimServiceQuestion = new ApimServiceQuestion(apimService, dialog, telemetry, ctx.logProvider);
        const openApiDocumentQuestion = new OpenApiDocumentQuestion(openApiProcessor, dialog, telemetry, ctx.logProvider);
        const apiNameQuestion = new ApiNameQuestion(dialog, telemetry, ctx.logProvider);
        const apiVersionQuestion = new ApiVersionQuestion(apimService, dialog, telemetry, ctx.logProvider);
        const newApiVersionQuestion = new NewApiVersionQuestion(dialog, telemetry, ctx.logProvider);

        return new QuestionManager(
            apimServiceQuestion,
            openApiDocumentQuestion,
            apiNameQuestion,
            apiVersionQuestion,
            newApiVersionQuestion,
            openApiProcessor
        );
    }

    private static async buildApimService(ctx: PluginContext, solutionConfig: SolutionConfig, telemetry: Telemetry): Promise<ApimService> {
        const credential = AssertNotEmpty("credential", await ctx.azureAccountProvider?.getAccountCredentialAsync());
        const apiManagementClient = new ApiManagementClient(credential, solutionConfig.subscriptionId);
        return new ApimService(apiManagementClient, credential, solutionConfig.subscriptionId, telemetry, ctx.logProvider);
    }

    private static async buildAadService(ctx: PluginContext, telemetry: Telemetry): Promise<AadService> {
        const accessToken = AssertNotEmpty("accessToken", await ctx.graphTokenProvider?.getAccessToken());
        const axiosInstance = axios.create({
            baseURL: AadDefaultValues.graphApiBasePath,
            headers: {
                authorization: `Bearer ${accessToken}`,
                "content-type": "application/json",
            },
        });
        return new AadService(axiosInstance, telemetry, ctx.logProvider);
    }
}
