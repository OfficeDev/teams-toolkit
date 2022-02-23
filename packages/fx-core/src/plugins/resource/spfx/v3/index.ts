import { hooks } from "@feathersjs/hooks/lib";
import {
  AzureSolutionSettings,
  err,
  FxError,
  IConfigurableTab,
  Inputs,
  IStaticTab,
  ok,
  QTreeNode,
  Result,
  TokenProvider,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { CommonErrorHandlerMW } from "../../../../core/middleware/CommonErrorHandlerMW";
import { BuiltInFeaturePluginNames } from "../../../solution/fx-solution/v3/constants";
import { ensureSolutionSettings } from "../../../solution/fx-solution/utils/solutionSettingsHelper";
import { TabSPFxItem } from "../../../solution/fx-solution/question";
import { SPFxAlreadyExistError } from "./error";
import * as uuid from "uuid";
import {
  frameworkQuestion,
  SPFXQuestionNames,
  webpartDescriptionQuestion,
  webpartNameQuestion,
} from "../utils/questions";
import { DeepReadonly } from "@microsoft/teamsfx-api/build/v2";
import { SPFxPluginImpl } from "./plugin";
import { ManifestTemplate } from "../utils/constants";
import * as util from "util";

@Service(BuiltInFeaturePluginNames.spfx)
export class SPFxPluginV3 implements v3.PluginV3 {
  name = BuiltInFeaturePluginNames.spfx;
  displayName = "SPFx";
  description = "SharePoint Framework (SPFx)";

  spfxPluginImpl: SPFxPluginImpl = new SPFxPluginImpl();

  async getQuestionsForAddInstance(
    ctx: v2.Context,
    inputs: Inputs
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    const spfx_frontend_host = new QTreeNode({
      type: "group",
    });

    const spfx_framework_type = new QTreeNode(frameworkQuestion);
    spfx_frontend_host.addChild(spfx_framework_type);

    const spfx_webpart_name = new QTreeNode(webpartNameQuestion);
    spfx_frontend_host.addChild(spfx_webpart_name);

    const spfx_webpart_desp = new QTreeNode(webpartDescriptionQuestion);
    spfx_frontend_host.addChild(spfx_webpart_desp);

    return ok(spfx_frontend_host);
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.spfx } })])
  async addInstance(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<string[], FxError>> {
    ensureSolutionSettings(ctx.projectSetting);
    const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
    const capabilities = solutionSettings.capabilities;
    if (capabilities.includes(TabSPFxItem.id)) {
      return err(SPFxAlreadyExistError());
    }

    const componentId = uuid.v4();
    const webpartName = inputs[SPFXQuestionNames.webpart_name] as string;
    // spfx is added for first time, scaffold and generate resource template
    const scaffoldRes = await this.spfxPluginImpl.scaffold(ctx, inputs, componentId);
    if (scaffoldRes.isErr()) return err(scaffoldRes.error);
    capabilities.push(TabSPFxItem.id);

    const capabilitiesToAddManifest: v3.ManifestCapability[] = [];
    const localStaticSnippet: IStaticTab = {
      entityId: componentId,
      name: webpartName,
      contentUrl: util.format(ManifestTemplate.LOCAL_CONTENT_URL, componentId),
      websiteUrl: ManifestTemplate.WEBSITE_URL,
      scopes: ["personal"],
    };
    const localConfigurableSnippet: IConfigurableTab = {
      configurationUrl: util.format(ManifestTemplate.LOCAL_CONFIGURATION_URL, componentId),
      canUpdateConfiguration: true,
      scopes: ["team"],
    };
    const remoteStaticSnippet: IStaticTab = {
      entityId: componentId,
      name: webpartName,
      contentUrl: util.format(ManifestTemplate.REMOTE_CONTENT_URL, componentId),
      websiteUrl: ManifestTemplate.WEBSITE_URL,
      scopes: ["personal"],
    };
    const remoteConfigurableSnippet: IConfigurableTab = {
      configurationUrl: util.format(ManifestTemplate.REMOTE_CONFIGURATION_URL, componentId),
      canUpdateConfiguration: true,
      scopes: ["team"],
    };
    capabilitiesToAddManifest.push(
      { name: "staticTab", snippet: { local: localStaticSnippet, remote: remoteStaticSnippet } },
      {
        name: "configurableTab",
        snippet: { local: localConfigurableSnippet, remote: remoteConfigurableSnippet },
      }
    );

    const addCapRes = await ctx.appManifestProvider.addCapabilities(
      ctx,
      inputs,
      capabilitiesToAddManifest
    );
    if (addCapRes.isErr()) return err(addCapRes.error);

    const webAppInfo: v3.ManifestCapability = {
      name: "WebApplicationInfo",
      snippet: {
        resource: ManifestTemplate.WEB_APP_INFO_RESOURCE,
        id: ManifestTemplate.WEB_APP_INFO_ID,
      },
    };

    const updateWebAppInfoRes = await ctx.appManifestProvider.updateCapability(
      ctx,
      inputs,
      webAppInfo
    );
    if (updateWebAppInfoRes.isErr()) return err(updateWebAppInfoRes.error);

    const activeResourcePlugins = solutionSettings.activeResourcePlugins;
    if (!activeResourcePlugins.includes(this.name)) activeResourcePlugins.push(this.name);
    return ok([]);
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.spfx } })])
  async deploy(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    const buildRes = await this.spfxPluginImpl.buildSPPackage(ctx, inputs);
    if (buildRes.isErr()) {
      return buildRes;
    }
    return await this.spfxPluginImpl.deploy(ctx, inputs, tokenProvider);
  }
}
