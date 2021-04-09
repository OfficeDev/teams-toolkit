// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { AzureAccountProvider, GraphTokenProvider, LogProvider, Platform, PluginContext } from "fx-api";
import { AssertNotEmpty, BuildError, NotImplemented } from "./error";
import { ApimService } from "./service/apimService";
import { ISolutionConfig, SolutionConfig } from "./model/config";
import { AadService } from "./service/aadService";
import { OpenApiProcessor } from "./util/openApiProcessor";
import { ApimManager } from "./manager/apimManager";
import { AadManager } from "./manager/aadManager";
import { Telemetry } from "./telemetry";
import { IQuestionManager, VscQuestionManager } from "./manager/questionManager";
import {
    ApimServiceQuestion,
    ApiPrefixQuestion,
    ApiVersionQuestion,
    ExistingOpenApiDocumentFunc,
    NewApiVersionQuestion,
    OpenApiDocumentQuestion,
} from "./service/questionService";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import { TeamsAppAadManager } from "./manager/teamsAppAadManager";
import axios from "axios";
import { AadDefaultValues } from "./constants";
import { Lazy } from "./util/lazy";

export class Factory {
    public static buildTelemetry(ctx: PluginContext) {
        return new Telemetry(ctx.telemetryReporter);
    }

    public static async buildApimManager(ctx: PluginContext, solutionConfig: SolutionConfig, telemetry: Telemetry): Promise<ApimManager> {
        const openApiProcessor = new OpenApiProcessor(telemetry, ctx.logProvider);
        const lazyApimService = new Lazy<ApimService>(async () => await Factory.buildApimService(ctx.azureAccountProvider, solutionConfig, telemetry, ctx.logProvider));
        return new ApimManager(lazyApimService, openApiProcessor, telemetry, ctx.logProvider);
    }

    public static async buildAadManager(ctx: PluginContext, telemetry: Telemetry): Promise<AadManager> {
        const lazyAadService = new Lazy(async () => await Factory.buildAadService(ctx.graphTokenProvider, telemetry, ctx.logProvider));
        return new AadManager(lazyAadService, telemetry, ctx.logProvider);
    }

    public static async buildTeamsAppAadManager(ctx: PluginContext, telemetry: Telemetry): Promise<TeamsAppAadManager> {
        const lazyAadService = new Lazy(async () => await Factory.buildAadService(ctx.graphTokenProvider, telemetry, ctx.logProvider));
        return new TeamsAppAadManager(lazyAadService, telemetry, ctx.logProvider);
    }

    public static async buildQuestionManager(ctx: PluginContext, solutionConfig: SolutionConfig, telemetry: Telemetry): Promise<IQuestionManager> {
        switch (ctx.platform) {
            case Platform.VSCode:
                const lazyApimService = new Lazy<ApimService>(async () => await Factory.buildApimService(ctx.azureAccountProvider, solutionConfig, telemetry, ctx.logProvider));
                const dialog = AssertNotEmpty("ctx.dialog", ctx.dialog);
                const openApiProcessor = new OpenApiProcessor(telemetry, ctx.logProvider);
                const apimServiceQuestion = new ApimServiceQuestion(lazyApimService, dialog, telemetry, ctx.logProvider);
                const openApiDocumentQuestion = new OpenApiDocumentQuestion(openApiProcessor, dialog, telemetry, ctx.logProvider);
                const existingOpenApiDocumentFunc = new ExistingOpenApiDocumentFunc(openApiProcessor, dialog, telemetry, ctx.logProvider);
                const apiPrefixQuestion = new ApiPrefixQuestion(dialog, telemetry, ctx.logProvider);
                const apiVersionQuestion = new ApiVersionQuestion(lazyApimService, dialog, telemetry, ctx.logProvider);
                const newApiVersionQuestion = new NewApiVersionQuestion(dialog, telemetry, ctx.logProvider);

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

    public static async buildApimService(azureAccountProvider: AzureAccountProvider | undefined, solutionConfig: ISolutionConfig, telemetry: Telemetry, logger?: LogProvider): Promise<ApimService> {
        const credential = AssertNotEmpty("credential", await azureAccountProvider?.getAccountCredentialAsync());
        const apiManagementClient = new ApiManagementClient(credential, solutionConfig.subscriptionId);
        return new ApimService(apiManagementClient, credential, solutionConfig.subscriptionId, telemetry, logger);
    }

    public static async buildAadService(graphTokenProvider: GraphTokenProvider | undefined, telemetry: Telemetry, logger?: LogProvider): Promise<AadService> {
        const accessToken = AssertNotEmpty("accessToken", await graphTokenProvider?.getAccessToken());
        const axiosInstance = axios.create({
            baseURL: AadDefaultValues.graphApiBasePath,
            headers: {
                authorization: `Bearer ${accessToken}`,
                "content-type": "application/json",
            },
        });
        return new AadService(axiosInstance, telemetry, logger);
    }
}