// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FxError, Inputs, Json, ok, Result, TokenProvider, v2, Void } from "@microsoft/teamsfx-api";
import {
  Context,
  DeepReadonly,
  DeploymentInputs,
  EnvInfoV2,
  ProvisionInputs,
  ResourceTemplate,
} from "@microsoft/teamsfx-api/build/v2";
import { scaffold } from "./scaffold";
import * as utils from "../utils/common";
import path from "path";
import { AzureHostingFactory } from "../../../../common/azure-hosting/hostingFactory";
import { PluginBot, CommonStrings, Commands } from "../resources/strings";
import { CommandExecutionError } from "../errors";
import { BicepConfigs, ServiceType } from "../../../../common/azure-hosting/interfaces";
import { mergeTemplates } from "../../../../common/azure-hosting/utils";
import { getActivatedV2ResourcePlugins } from "../../../solution/fx-solution/ResourcePluginContainer";
import { NamedArmResourcePluginAdaptor } from "../../../solution/fx-solution/v2/adaptor";
import { ResourcePlugins } from "../../../../common/constants";
import { runtimeMap } from "./mapping";
import {
  getTemplateInfos,
  resolveHostType,
  resolveProgrammingLanguage,
  resolveServiceType,
} from "./common";

export class TeamsBotV2Impl {
  async scaffoldSourceCode(ctx: Context, inputs: Inputs): Promise<Result<Void, FxError>> {
    let workingPath = inputs.projectPath ?? "";
    const lang = resolveProgrammingLanguage(ctx);
    if (lang === "csharp") {
      workingPath = path.join(workingPath, "bot");
    }
    const hostType = resolveHostType(inputs);
    utils.checkAndSavePluginSettingV2(ctx, PluginBot.HOST_TYPE, hostType);

    const templateInfos = getTemplateInfos(ctx, inputs);
    await Promise.all(
      templateInfos.map(async (templateInfo) => {
        await scaffold(templateInfo, workingPath);
      })
    );

    return ok(Void);
  }

  async generateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<ResourceTemplate, FxError>> {
    const plugins = getActivatedV2ResourcePlugins(ctx.projectSetting).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    );
    const bicepConfigs = this.getBicepConfigs(ctx, inputs);
    const bicepContext = {
      plugins: plugins.map((obj) => obj.name),
      configs: bicepConfigs,
    };

    const serviceTypes = [resolveServiceType(ctx), ServiceType.BotService];
    const templates = await Promise.all(
      serviceTypes.map((serviceType) => {
        const hosting = AzureHostingFactory.createHosting(serviceType);
        return hosting.generateBicep(bicepContext, ResourcePlugins.Bot);
      })
    );
    const result = mergeTemplates(templates);

    return ok({ kind: "bicep", template: result });
  }

  async updateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<ResourceTemplate, FxError>> {
    const plugins = getActivatedV2ResourcePlugins(ctx.projectSetting).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    );
    const bicepConfigs = this.getBicepConfigs(ctx, inputs);
    const bicepContext = {
      plugins: plugins.map((obj) => obj.name),
      configs: bicepConfigs,
    };

    const serviceTypes = [resolveServiceType(ctx), ServiceType.BotService];
    const templates = await Promise.all(
      serviceTypes.map((serviceType) => {
        const hosting = AzureHostingFactory.createHosting(serviceType);
        return hosting.updateBicep(bicepContext, ResourcePlugins.Bot);
      })
    );
    const result = mergeTemplates(templates);

    return ok({ kind: "bicep", template: result });
  }

  async configureResource(
    ctx: Context,
    inputs: ProvisionInputs,
    envInfo: v2.EnvInfoV2,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    return ok(Void);
  }

  async deploy(
    ctx: Context,
    inputs: DeploymentInputs,
    envInfo: DeepReadonly<v2.EnvInfoV2>,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    const packDir = await this.localBuild(ctx, inputs);
    // TODO: zip packDir and upload to Azure Web App or Azure Function
    return ok(Void);
  }

  async provisionLocalResource(
    ctx: Context,
    inputs: Inputs,
    localSettings: Json,
    tokenProvider: TokenProvider,
    envInfo?: EnvInfoV2
  ): Promise<Result<Void, FxError>> {
    return ok(Void);
  }

  async configureLocalResource(
    ctx: Context,
    inputs: Inputs,
    localSettings: Json,
    tokenProvider: TokenProvider,
    envInfo?: v2.EnvInfoV2 | undefined
  ): Promise<Result<Void, FxError>> {
    return ok(Void);
  }

  private getBicepConfigs(ctx: Context, inputs: Inputs): BicepConfigs {
    const bicepConfigs: BicepConfigs = [];
    const lang = resolveProgrammingLanguage(ctx);
    bicepConfigs.push(runtimeMap[lang]);
    bicepConfigs.push("running-on-azure");
    return bicepConfigs;
  }

  private async localBuild(ctx: Context, inputs: Inputs): Promise<string> {
    // Return the folder path to be zipped and uploaded

    const lang = resolveProgrammingLanguage(ctx);
    const packDir = path.join(inputs.projectPath!, CommonStrings.BOT_WORKING_DIR_NAME);
    if (lang === "ts") {
      //Typescript needs tsc build before deploy because of windows app server. other languages don't need it.
      try {
        await utils.execute("npm install", packDir);
        await utils.execute("npm run build", packDir);
        return packDir;
      } catch (e) {
        throw new CommandExecutionError(`${Commands.NPM_INSTALL},${Commands.NPM_BUILD}`, e);
      }
    }

    if (lang === "js") {
      try {
        // fail to npm install @microsoft/teamsfx on azure web app, so pack it locally.
        await utils.execute("npm install", packDir);
        return packDir;
      } catch (e) {
        throw new CommandExecutionError(`${Commands.NPM_INSTALL}`, e);
      }
    }

    if (lang === "csharp") {
      try {
        // TODO: build csharp project
        await utils.execute("dotnet publish", packDir);
        return packDir;
      } catch (e) {
        throw new CommandExecutionError(`dotnet publish`, e);
      }
    }

    throw new Error("Invalid programming language");
  }
}

export default new TeamsBotV2Impl();
