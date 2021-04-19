// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { AzureAccountProvider, GraphTokenProvider, LogProvider, Platform, PluginContext, TelemetryReporter } from "fx-api";
import { AssertNotEmpty, BuildError, NotImplemented } from "./error";
import { ApimService } from "./service/apimService";
import { ISolutionConfig, SolutionConfig } from "./model/config";
import { AadService } from "./service/aadService";
import { OpenApiProcessor } from "./util/openApiProcessor";
import { ApimManager } from "./manager/apimManager";
import { AadManager } from "./manager/aadManager";
import { IQuestionManager, VscQuestionManager } from "./manager/questionManager";
import { VSCode } from "./service/questionService";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import { TeamsAppAadManager } from "./manager/teamsAppAadManager";
import axios from "axios";
import { AadDefaultValues } from "./constants";
import { Lazy } from "./util/lazy";

export class Factory {
    public static async buildApimManager(ctx: PluginContext, solutionConfig: SolutionConfig): Promise<ApimManager> {
        const openApiProcessor = new OpenApiProcessor(ctx.telemetryReporter, ctx.logProvider);
        const lazyApimService = new Lazy<ApimService>(async () => await Factory.buildApimService(ctx.azureAccountProvider, solutionConfig, ctx.telemetryReporter, ctx.logProvider));
        return new ApimManager(lazyApimService, openApiProcessor, ctx.telemetryReporter, ctx.logProvider);
    }

    public static async buildAadManager(ctx: PluginContext): Promise<AadManager> {
        const lazyAadService = new Lazy(async () => await Factory.buildAadService(ctx.graphTokenProvider, ctx.telemetryReporter, ctx.logProvider));
        return new AadManager(lazyAadService, ctx.telemetryReporter, ctx.logProvider);
    }

    public static async buildTeamsAppAadManager(ctx: PluginContext): Promise<TeamsAppAadManager> {
        const lazyAadService = new Lazy(async () => await Factory.buildAadService(ctx.graphTokenProvider, ctx.telemetryReporter, ctx.logProvider));
        return new TeamsAppAadManager(lazyAadService, ctx.telemetryReporter, ctx.logProvider);
    }

    public static async buildQuestionManager(ctx: PluginContext, solutionConfig: SolutionConfig): Promise<IQuestionManager> {
        switch (ctx.platform) {
            case Platform.VSCode:
                // Lazy init apim service to get the latest subscription id in configuration
                const lazyApimService = new Lazy<ApimService>(async () => await Factory.buildApimService(ctx.azureAccountProvider, solutionConfig, ctx.telemetryReporter, ctx.logProvider));
                const openApiProcessor = new OpenApiProcessor(ctx.telemetryReporter, ctx.logProvider);
                const apimServiceQuestion = new VSCode.ApimServiceQuestion(lazyApimService, ctx.telemetryReporter, ctx.logProvider);
                const openApiDocumentQuestion = new VSCode.OpenApiDocumentQuestion(openApiProcessor, ctx.telemetryReporter, ctx.logProvider);
                const existingOpenApiDocumentFunc = new VSCode.ExistingOpenApiDocumentFunc(openApiProcessor, ctx.telemetryReporter, ctx.logProvider);
                const apiPrefixQuestion = new VSCode.ApiPrefixQuestion(ctx.telemetryReporter, ctx.logProvider);
                const apiVersionQuestion = new VSCode.ApiVersionQuestion(lazyApimService, ctx.telemetryReporter, ctx.logProvider);
                const newApiVersionQuestion = new VSCode.NewApiVersionQuestion(ctx.telemetryReporter, ctx.logProvider);

                return new VscQuestionManager(
                    apimServiceQuestion,
                    openApiDocumentQuestion,
                    apiPrefixQuestion,
                    apiVersionQuestion,
                    newApiVersionQuestion,
                    existingOpenApiDocumentFunc
                );
            default:
                throw BuildError(NotImplemented);
        }
    }

    public static async buildApimService(azureAccountProvider: AzureAccountProvider | undefined, solutionConfig: ISolutionConfig, telemetryReporter?: TelemetryReporter, logger?: LogProvider): Promise<ApimService> {
        const credential = AssertNotEmpty("credential", await azureAccountProvider?.getAccountCredentialAsync());
        const apiManagementClient = new ApiManagementClient(credential, solutionConfig.subscriptionId);
        return new ApimService(apiManagementClient, credential, solutionConfig.subscriptionId, telemetryReporter, logger);
    }

    public static async buildAadService(graphTokenProvider: GraphTokenProvider | undefined, telemetryReporter?: TelemetryReporter, logger?: LogProvider): Promise<AadService> {
        const accessToken = AssertNotEmpty("accessToken", await graphTokenProvider?.getAccessToken());
        const axiosInstance = axios.create({
            baseURL: AadDefaultValues.graphApiBasePath,
            headers: {
                authorization: `Bearer ${accessToken}`,
                "content-type": "application/json",
            },
        });
        return new AadService(axiosInstance, telemetryReporter, logger);
    }
}