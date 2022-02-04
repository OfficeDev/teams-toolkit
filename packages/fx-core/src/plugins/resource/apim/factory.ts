// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  AzureAccountProvider,
  GraphTokenProvider,
  Inputs,
  LogProvider,
  Platform,
  PluginContext,
  TelemetryReporter,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import { AssertNotEmpty, BuildError, NotImplemented } from "./error";
import { ApimService } from "./services/apimService";
import { AadService } from "./services/aadService";
import { OpenApiProcessor } from "./utils/openApiProcessor";
import { ApimManager } from "./managers/apimManager";
import { AadManager } from "./managers/aadManager";
import {
  CliQuestionManager,
  IQuestionManager,
  PluginContextV3,
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
import { Providers, ResourceManagementClientContext } from "@azure/arm-resources";
import { ISolutionConfig, SolutionConfig } from "./config";

export class Factory {
  public static async buildApimManager(ctx: PluginContext): Promise<ApimManager> {
    const openApiProcessor = new OpenApiProcessor(ctx.telemetryReporter, ctx.logProvider);

    const solutionConfig = new SolutionConfig(ctx.envInfo);
    const lazyApimService = new Lazy<ApimService>(
      async () =>
        await Factory.buildApimService(
          solutionConfig,
          ctx.azureAccountProvider,
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
    ctx: PluginContext | PluginContextV3
  ): Promise<ScaffoldManager> {
    const isV3 = (ctx as any)["isV3"] as boolean;
    const telemetryReporter = isV3
      ? (ctx as PluginContextV3).context.telemetryReporter
      : (ctx as PluginContext).telemetryReporter;
    const logProvider = isV3
      ? (ctx as PluginContextV3).context.logProvider
      : (ctx as PluginContext).logProvider;
    const openApiProcessor = new OpenApiProcessor(telemetryReporter, logProvider);
    return new ScaffoldManager(openApiProcessor, telemetryReporter, logProvider);
  }

  public static async buildQuestionManager(
    ctx: PluginContext | PluginContextV3
  ): Promise<IQuestionManager> {
    const isV3 = (ctx as any)["isV3"] as boolean;
    const solutionConfig = new SolutionConfig(ctx.envInfo!);
    const platform = isV3
      ? (ctx as PluginContextV3).inputs?.platform
      : (ctx as PluginContext).answers?.platform;
    const azureAccountProvider = isV3
      ? (ctx as PluginContextV3).azureAccountProvider
      : (ctx as PluginContext).azureAccountProvider;
    const telemetryReporter = isV3
      ? (ctx as PluginContextV3).context.telemetryReporter
      : (ctx as PluginContext).telemetryReporter;
    const logProvider = isV3
      ? (ctx as PluginContextV3).context.logProvider
      : (ctx as PluginContext).logProvider;
    switch (platform) {
      case Platform.VSCode:
        // Lazy init apim service to get the latest subscription id in configuration
        const lazyApimService = new Lazy<ApimService>(
          async () =>
            await Factory.buildApimService(
              solutionConfig,
              azureAccountProvider,
              telemetryReporter,
              logProvider
            )
        );
        const openApiProcessor = new OpenApiProcessor(telemetryReporter, logProvider);
        const apimServiceQuestion = new VSCode.ApimServiceQuestion(
          lazyApimService,
          telemetryReporter,
          logProvider
        );
        const openApiDocumentQuestion = new VSCode.OpenApiDocumentQuestion(
          openApiProcessor,
          telemetryReporter,
          logProvider
        );
        const existingOpenApiDocumentFunc = new VSCode.ExistingOpenApiDocumentFunc(
          openApiProcessor,
          telemetryReporter,
          logProvider
        );
        const apiPrefixQuestion = new VSCode.ApiPrefixQuestion(telemetryReporter, logProvider);
        const apiVersionQuestion = new VSCode.ApiVersionQuestion(
          lazyApimService,
          telemetryReporter,
          logProvider
        );
        const newApiVersionQuestion = new VSCode.NewApiVersionQuestion(
          telemetryReporter,
          logProvider
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
    solutionConfig: ISolutionConfig,
    azureAccountProvider: AzureAccountProvider | undefined,
    telemetryReporter?: TelemetryReporter,
    logger?: LogProvider
  ): Promise<ApimService> {
    const credential = AssertNotEmpty(
      "credential",
      await azureAccountProvider?.getAccountCredentialAsync()
    );
    let subscriptionId;
    if (solutionConfig.subscriptionId) {
      subscriptionId = solutionConfig.subscriptionId;
    } else {
      // fall back to asking user subscription info because some operations like "AddResource" can be before provision
      let subscriptionInfo = await azureAccountProvider?.getSelectedSubscription();
      subscriptionInfo = AssertNotEmpty("subscriptionInfo", subscriptionInfo);
      subscriptionId = subscriptionInfo.subscriptionId;
    }

    const apiManagementClient = new ApiManagementClient(credential, subscriptionId);
    const resourceProviderClient = new Providers(
      new ResourceManagementClientContext(credential, subscriptionId)
    );

    return new ApimService(
      apiManagementClient,
      resourceProviderClient,
      credential,
      subscriptionId,
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
