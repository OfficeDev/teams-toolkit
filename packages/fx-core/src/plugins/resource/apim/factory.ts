// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  AzureAccountProvider,
  GraphTokenProvider,
  LogProvider,
  Platform,
  PluginContext,
  TelemetryReporter,
} from "@microsoft/teamsfx-api";
import { AssertNotEmpty, BuildError, NotImplemented } from "./error";
import { ApimService } from "./services/apimService";
import { ISolutionConfig, SolutionConfig } from "./config";
import { AadService } from "./services/aadService";
import { OpenApiProcessor } from "./utils/openApiProcessor";
import { ApimManager } from "./managers/apimManager";
import { AadManager } from "./managers/aadManager";
import {
  CliQuestionManager,
  IQuestionManager,
  VscQuestionManager,
} from "./managers/questionManager";
import * as VSCode from "./questions/vscodeQuestion";
import * as CLI from "./questions/cliQuestion";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import { TeamsAppAadManager } from "./managers/teamsAppAadManager";
import axios from "axios";
import { AadDefaultValues } from "./constants";
import { Lazy } from "./utils/commonUtils";
import { ScaffoldManager } from "./managers/scaffoldManager";

export class Factory {
  public static async buildApimManager(
    ctx: PluginContext,
    solutionConfig: SolutionConfig
  ): Promise<ApimManager> {
    const openApiProcessor = new OpenApiProcessor(ctx.telemetryReporter, ctx.logProvider);
    const lazyApimService = new Lazy<ApimService>(
      async () =>
        await Factory.buildApimService(
          ctx.azureAccountProvider,
          solutionConfig,
          ctx.telemetryReporter,
          ctx.logProvider
        )
    );
    return new ApimManager(
      lazyApimService,
      openApiProcessor,
      ctx.telemetryReporter,
      ctx.logProvider
    );
  }

  public static async buildAadManager(ctx: PluginContext): Promise<AadManager> {
    const lazyAadService = new Lazy(
      async () =>
        await Factory.buildAadService(
          ctx.graphTokenProvider,
          ctx.telemetryReporter,
          ctx.logProvider
        )
    );
    return new AadManager(lazyAadService, ctx.telemetryReporter, ctx.logProvider);
  }

  public static async buildTeamsAppAadManager(ctx: PluginContext): Promise<TeamsAppAadManager> {
    const lazyAadService = new Lazy(
      async () =>
        await Factory.buildAadService(
          ctx.graphTokenProvider,
          ctx.telemetryReporter,
          ctx.logProvider
        )
    );
    return new TeamsAppAadManager(lazyAadService, ctx.telemetryReporter, ctx.logProvider);
  }

  public static async buildScaffoldManager(
    ctx: PluginContext,
    solutionConfig: SolutionConfig
  ): Promise<ScaffoldManager> {
    const openApiProcessor = new OpenApiProcessor(ctx.telemetryReporter, ctx.logProvider);
    return new ScaffoldManager(openApiProcessor, ctx.telemetryReporter, ctx.logProvider);
  }

  public static async buildQuestionManager(
    ctx: PluginContext,
    solutionConfig: SolutionConfig
  ): Promise<IQuestionManager> {
    switch (ctx.answers?.platform) {
      case Platform.VSCode:
        // Lazy init apim service to get the latest subscription id in configuration
        const lazyApimService = new Lazy<ApimService>(
          async () =>
            await Factory.buildApimService(
              ctx.azureAccountProvider,
              solutionConfig,
              ctx.telemetryReporter,
              ctx.logProvider
            )
        );
        const openApiProcessor = new OpenApiProcessor(ctx.telemetryReporter, ctx.logProvider);
        const apimServiceQuestion = new VSCode.ApimServiceQuestion(
          lazyApimService,
          ctx.telemetryReporter,
          ctx.logProvider
        );
        const openApiDocumentQuestion = new VSCode.OpenApiDocumentQuestion(
          openApiProcessor,
          ctx.telemetryReporter,
          ctx.logProvider
        );
        const existingOpenApiDocumentFunc = new VSCode.ExistingOpenApiDocumentFunc(
          openApiProcessor,
          ctx.telemetryReporter,
          ctx.logProvider
        );
        const apiPrefixQuestion = new VSCode.ApiPrefixQuestion(
          ctx.telemetryReporter,
          ctx.logProvider
        );
        const apiVersionQuestion = new VSCode.ApiVersionQuestion(
          lazyApimService,
          ctx.telemetryReporter,
          ctx.logProvider
        );
        const newApiVersionQuestion = new VSCode.NewApiVersionQuestion(
          ctx.telemetryReporter,
          ctx.logProvider
        );

        return new VscQuestionManager(
          apimServiceQuestion,
          openApiDocumentQuestion,
          apiPrefixQuestion,
          apiVersionQuestion,
          newApiVersionQuestion,
          existingOpenApiDocumentFunc
        );
      case Platform.CLI:
      case Platform.CLI_HELP:
        const cliApimServiceNameQuestion = new CLI.ApimServiceNameQuestion();
        const cliApimResourceGroupQuestion = new CLI.ApimResourceGroupQuestion();
        const cliOpenApiDocumentQuestion = new CLI.OpenApiDocumentQuestion();
        const cliApiPrefixQuestion = new CLI.ApiPrefixQuestion();
        const cliApiVersionQuestion = new CLI.ApiVersionQuestion();

        return new CliQuestionManager(
          cliApimServiceNameQuestion,
          cliApimResourceGroupQuestion,
          cliOpenApiDocumentQuestion,
          cliApiPrefixQuestion,
          cliApiVersionQuestion
        );
      default:
        throw BuildError(NotImplemented);
    }
  }

  public static async buildApimService(
    azureAccountProvider: AzureAccountProvider | undefined,
    solutionConfig: ISolutionConfig,
    telemetryReporter?: TelemetryReporter,
    logger?: LogProvider
  ): Promise<ApimService> {
    const credential = AssertNotEmpty(
      "credential",
      await azureAccountProvider?.getAccountCredentialAsync()
    );
    const subscriptionInfo = await azureAccountProvider?.getSelectedSubscription();
    AssertNotEmpty("subscriptionInfo", subscriptionInfo);
    const apiManagementClient = new ApiManagementClient(
      credential,
      subscriptionInfo!.subscriptionId
    );
    return new ApimService(
      apiManagementClient,
      credential,
      subscriptionInfo!.subscriptionId,
      telemetryReporter,
      logger
    );
  }

  public static async buildAadService(
    graphTokenProvider: GraphTokenProvider | undefined,
    telemetryReporter?: TelemetryReporter,
    logger?: LogProvider
  ): Promise<AadService> {
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
