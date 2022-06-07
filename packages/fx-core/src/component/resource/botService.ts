// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  ok,
  Result,
  Action,
  Bicep,
  ContextV3,
  MaybePromise,
  InputsWithProjectPath,
  ProvisionContextV3,
  CloudResource,
  v3,
  err,
  AzureAccountProvider,
  Effect,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import "reflect-metadata";
import { Container, Service } from "typedi";
import { compileHandlebarsTemplateString } from "../../common/tools";
import { getTemplatesFolder } from "../../folder";
import {
  CommonStrings,
  ConfigNames,
  PluginLocalDebug,
} from "../../plugins/resource/bot/resources/strings";
import { CheckThrowSomethingMissing, PreconditionError } from "../../plugins/resource/bot/v3/error";
import { AzureWebAppResource } from "./azureWebApp";
import * as uuid from "uuid";
import { ResourceNameFactory } from "../../plugins/resource/bot/utils/resourceNameFactory";
import { AzureConstants, MaxLengths } from "../../plugins/resource/bot/constants";
import { AADRegistration } from "../../plugins/resource/bot/aadRegistration";
import { Messages } from "../../plugins/resource/bot/resources/messages";
import { IBotRegistration } from "../../plugins/resource/bot/appStudio/interfaces/IBotRegistration";
import { AppStudio } from "../../plugins/resource/bot/appStudio/appStudio";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import {
  createResourceProviderClient,
  ensureResourceProvider,
} from "../../plugins/resource/bot/clientFactory";
@Service("bot-service")
export class BotServiceResource implements CloudResource {
  outputs = {
    botId: {
      key: "botId",
    },
    botPassword: {
      key: "botPassword",
    },
  };
  finalOutputKeys = ["botId", "botPassword"];
  secretFields = ["botPassword"];
  readonly name = "bot-service";
  generateBicep(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "bot-service.generateBicep",
      type: "function",
      plan: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const bicep: Bicep = {
          type: "bicep",
          Configuration: {
            Modules: { botService: "1" },
            Orchestration: "1",
          },
        };
        return ok([bicep]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const mPath = path.join(getTemplatesFolder(), "bicep", "botService.config.module.bicep");
        const oPath = path.join(
          getTemplatesFolder(),
          "bicep",
          "botService.config.orchestration.bicep"
        );
        let module = await fs.readFile(mPath, "utf-8");
        const templateContext: any = {};
        if (inputs.hosting === "azure-web-app") {
          const resource = Container.get("azure-web-app") as AzureWebAppResource;
          templateContext.endpointVarName = resource.outputs.endpoint.bicepVariable;
        }
        module = compileHandlebarsTemplateString(module, templateContext);
        const orch = await fs.readFile(oPath, "utf-8");
        const bicep: Bicep = {
          type: "bicep",
          Configuration: { Modules: { botService: module }, Orchestration: orch },
        };
        return ok([bicep]);
      },
    };
    return ok(action);
  }
  // provision(
  //   context: ContextV3,
  //   inputs: InputsWithProjectPath
  // ): MaybePromise<Result<Action | undefined, FxError>> {
  //   const action: Action = {
  //     name: "bot-service.provision",
  //     type: "function",
  //     plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
  //       const ctx = context as ProvisionContextV3;
  //       const plans: Effect[] = [];
  //       if (ctx.envInfo.envName === "local") {
  //         plans.push({
  //           type: "service",
  //           name: "graph.microsoft.com",
  //           remarks: "create AAD app for bot service (botId, botPassword)",
  //         });
  //         plans.push({
  //           type: "service",
  //           name: "teams.microsoft.com",
  //           remarks: "create bot registration",
  //         });
  //       } else {
  //         plans.push({
  //           type: "service",
  //           name: "management.azure.com",
  //           remarks: "ensure resource providers for: " + AzureConstants.requiredResourceProviders,
  //         });
  //         plans.push({
  //           type: "service",
  //           name: "graph.microsoft.com",
  //           remarks: "create AAD app for bot service (botId, botPassword)",
  //         });
  //       }
  //       return ok(plans);
  //     },
  //     execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
  //       // create bot aad app by API call
  //       const ctx = context as ProvisionContextV3;
  //       const plans: Effect[] = [];
  //       if (ctx.envInfo.envName === "local") {
  //         const aadRes = await createBotAAD(ctx);
  //         if (aadRes.isErr()) return err(aadRes.error);
  //         const botConfig = aadRes.value;
  //         const regRes = await createBotRegInAppStudio(botConfig, ctx);
  //         if (regRes.isErr()) return err(regRes.error);
  //         plans.push({
  //           type: "service",
  //           name: "graph.microsoft.com",
  //           remarks: "create AAD app for bot service (botId, botPassword)",
  //         });
  //         plans.push({
  //           type: "service",
  //           name: "teams.microsoft.com",
  //           remarks: "create bot registration",
  //         });
  //       } else {
  //         // Check Resource Provider
  //         const azureCredential = await getAzureAccountCredential(
  //           ctx.tokenProvider.azureAccountProvider
  //         );
  //         const solutionConfig = ctx.envInfo.state.solution as v3.AzureSolutionConfig;
  //         const rpClient = createResourceProviderClient(
  //           azureCredential,
  //           solutionConfig.subscriptionId!
  //         );
  //         await ensureResourceProvider(rpClient, AzureConstants.requiredResourceProviders);
  //         const aadRes = await createBotAAD(ctx);
  //         if (aadRes.isErr()) return err(aadRes.error);
  //         plans.push({
  //           type: "service",
  //           name: "management.azure.com",
  //           remarks: "ensure resource providers for: " + AzureConstants.requiredResourceProviders,
  //         });
  //         plans.push({
  //           type: "service",
  //           name: "graph.microsoft.com",
  //           remarks: "create AAD app for bot service (botId, botPassword)",
  //         });
  //       }
  //       return ok(plans);
  //     },
  //   };
  //   return ok(action);
  // }
}

// export async function createBotAAD(ctx: ProvisionContextV3): Promise<Result<any, FxError>> {
//   const token = await ctx.tokenProvider.graphTokenProvider.getAccessToken();
//   CheckThrowSomethingMissing(ConfigNames.GRAPH_TOKEN, token);
//   CheckThrowSomethingMissing(CommonStrings.SHORT_APP_NAME, ctx.projectSetting.appName);
//   let botConfig = ctx.envInfo.state["bot-service"];
//   if (!botConfig) {
//     botConfig = {};
//     ctx.envInfo.state["bot-service"] = botConfig;
//   }
//   const botAADCreated = botConfig?.botId !== undefined && botConfig?.botPassword !== undefined;
//   if (!botAADCreated) {
//     const solutionConfig = ctx.envInfo.state.solution as v3.AzureSolutionConfig;
//     const resourceNameSuffix = solutionConfig.resourceNameSuffix
//       ? solutionConfig.resourceNameSuffix
//       : uuid.v4();
//     const aadDisplayName = ResourceNameFactory.createCommonName(
//       resourceNameSuffix,
//       ctx.projectSetting.appName,
//       MaxLengths.AAD_DISPLAY_NAME
//     );
//     const botAuthCredentials = await AADRegistration.registerAADAppAndGetSecretByGraph(
//       token!,
//       aadDisplayName,
//       botConfig.objectId,
//       botConfig.botId
//     );
//     botConfig.botId = botAuthCredentials.clientId;
//     botConfig.botPassword = botAuthCredentials.clientSecret;
//     botConfig.objectId = botAuthCredentials.objectId;
//     ctx.logProvider.info(Messages.SuccessfullyCreatedBotAadApp);
//   }
//   return ok(botConfig);
// }

// export async function createBotRegInAppStudio(
//   botConfig: any,
//   ctx: ProvisionContextV3
// ): Promise<Result<undefined, FxError>> {
//   // 2. Register bot by app studio.
//   const botReg: IBotRegistration = {
//     botId: botConfig.botId,
//     name: ctx.projectSetting.appName + PluginLocalDebug.LOCAL_DEBUG_SUFFIX,
//     description: "",
//     iconUrl: "",
//     messagingEndpoint: "",
//     callingEndpoint: "",
//   };
//   ctx.logProvider.info(Messages.ProvisioningBotRegistration);
//   const appStudioToken = await ctx.tokenProvider.appStudioToken.getAccessToken();
//   CheckThrowSomethingMissing(ConfigNames.APPSTUDIO_TOKEN, appStudioToken);
//   await AppStudio.createBotRegistration(appStudioToken!, botReg);
//   ctx.logProvider.info(Messages.SuccessfullyProvisionedBotRegistration);
//   return ok(undefined);
// }

// export async function getAzureAccountCredential(
//   tokenProvider: AzureAccountProvider
// ): Promise<TokenCredentialsBase> {
//   const serviceClientCredentials = await tokenProvider.getAccountCredentialAsync();
//   if (!serviceClientCredentials) {
//     throw new PreconditionError(Messages.FailToGetAzureCreds, [Messages.TryLoginAzure]);
//   }
//   return serviceClientCredentials;
// }
