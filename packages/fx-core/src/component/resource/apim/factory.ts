// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ApiManagementClient } from "@azure/arm-apimanagement";
import { ResourceManagementClient } from "@azure/arm-resources";
import {
  AzureAccountProvider,
  EnvInfo,
  Json,
  LogProvider,
  M365TokenProvider,
  Platform,
  ReadonlyPluginConfig,
  TelemetryReporter,
  v3,
} from "@microsoft/teamsfx-api";
import axios from "axios";
import { GraphScopes } from "../../../common";
import { ISolutionConfig, SolutionConfig } from "./config";
import { AadDefaultValues, TeamsToolkitComponent } from "./constants";
import { AssertNotEmpty, BuildError, NotImplemented } from "./error";
import { AadManager } from "./managers/aadManager";
import { ApimManager } from "./managers/apimManager";
import {
  CliQuestionManager,
  IQuestionManager,
  VscQuestionManager,
} from "./managers/questionManager";
import { ScaffoldManager } from "./managers/scaffoldManager";
import { TeamsAppAadManager } from "./managers/teamsAppAadManager";
import * as CLI from "./questions/cliQuestion";
import * as VSCode from "./questions/vscodeQuestion";
import { AadService } from "./services/aadService";
import { ApimService } from "./services/apimService";
import { Lazy } from "./utils/commonUtils";
import { OpenApiProcessor } from "./utils/openApiProcessor";

export class Factory {
  public static async buildApimManager(
    envInfo: EnvInfo | v3.EnvInfoV3,
    telemetryReporter?: TelemetryReporter,
    azureAccountProvider?: AzureAccountProvider,
    logProvider?: LogProvider
  ): Promise<ApimManager> {
    const openApiProcessor = new OpenApiProcessor(telemetryReporter, logProvider);

    const solutionConfig = new SolutionConfig(envInfo);
    const lazyApimService = new Lazy<ApimService>(
      async () =>
        await Factory.buildApimService(
          solutionConfig,
          azureAccountProvider,
          telemetryReporter,
          logProvider
        )
    );
    return new ApimManager(lazyApimService, openApiProcessor, telemetryReporter, logProvider);
  }

  public static async buildAadManager(
    m365TokenProvider?: M365TokenProvider,
    telemetryReporter?: TelemetryReporter,
    logProvider?: LogProvider
  ): Promise<AadManager> {
    const lazyAadService = new Lazy(
      async () => await Factory.buildAadService(m365TokenProvider, telemetryReporter, logProvider)
    );
    return new AadManager(lazyAadService, telemetryReporter, logProvider);
  }

  public static async buildTeamsAppAadManager(
    m365TokenProvider?: M365TokenProvider,
    telemetryReporter?: TelemetryReporter,
    logProvider?: LogProvider
  ): Promise<TeamsAppAadManager> {
    const lazyAadService = new Lazy(
      async () => await Factory.buildAadService(m365TokenProvider, telemetryReporter, logProvider)
    );
    return new TeamsAppAadManager(lazyAadService, telemetryReporter, logProvider);
  }

  public static async buildScaffoldManager(
    telemetryReporter?: TelemetryReporter,
    logProvider?: LogProvider
  ): Promise<ScaffoldManager> {
    const openApiProcessor = new OpenApiProcessor(telemetryReporter, logProvider);
    return new ScaffoldManager(openApiProcessor, telemetryReporter, logProvider);
  }

  public static async buildQuestionManager(
    platform: Platform,
    envInfo: EnvInfo | v3.EnvInfoV3,
    azureAccountProvider?: AzureAccountProvider,
    telemetryReporter?: TelemetryReporter,
    logProvider?: LogProvider
  ): Promise<IQuestionManager> {
    switch (platform) {
      case Platform.VSCode:
        const solutionConfig = new SolutionConfig(envInfo);
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
          openApiDocumentQuestion,
          apiPrefixQuestion,
          apiVersionQuestion,
          newApiVersionQuestion,
          existingOpenApiDocumentFunc
        );
      case Platform.CLI:
      case Platform.CLI_HELP:
        const cliOpenApiDocumentQuestion = new CLI.OpenApiDocumentQuestion();
        const cliApiPrefixQuestion = new CLI.ApiPrefixQuestion();
        const cliApiVersionQuestion = new CLI.ApiVersionQuestion();

        return new CliQuestionManager(
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
      await azureAccountProvider?.getIdentityCredentialAsync()
    );
    const identityCredential = AssertNotEmpty(
      "identityCredential",
      await azureAccountProvider?.getIdentityCredentialAsync()
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
    const resourceProviderClient = new ResourceManagementClient(identityCredential, subscriptionId);

    return new ApimService(
      apiManagementClient,
      resourceProviderClient.providers,
      credential,
      subscriptionId,
      telemetryReporter,
      logger
    );
  }

  public static async buildAadService(
    m365TokenProvider?: M365TokenProvider,
    telemetryReporter?: TelemetryReporter,
    logger?: LogProvider
  ): Promise<AadService> {
    const graphTokenRes = await m365TokenProvider?.getAccessToken({ scopes: GraphScopes });
    const graphToken = graphTokenRes?.isOk() ? graphTokenRes.value : undefined;
    AssertNotEmpty("accessToken", graphToken);

    const axiosInstance = axios.create({
      baseURL: AadDefaultValues.graphApiBasePath,
      headers: {
        authorization: `Bearer ${graphToken}`,
        "content-type": "application/json",
      },
    });
    return new AadService(axiosInstance, telemetryReporter, logger);
  }
}
