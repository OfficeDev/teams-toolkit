// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  Result,
  err,
  v2,
  IComposeExtension,
  IBot,
  IConfigurableTab,
  IStaticTab,
  TeamsAppManifest,
  PluginContext,
  ok,
} from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { BuiltInResourcePluginNames } from "../../../solution/fx-solution/v3/constants";
import { convert2PluginContext } from "../../utils4v2";
import { AppStudioResultFactory } from "../results";
import { AppStudioError } from "../errors";
import {
  init,
  addCapabilities,
  loadManifest,
  saveManifest,
  capabilityExceedLimit,
} from "../manifestTemplate";
import { getTemplatesFolder } from "../../../../folder";
import * as path from "path";
import fs from "fs-extra";
import {
  APP_PACKAGE_FOLDER_FOR_MULTI_ENV,
  COLOR_TEMPLATE,
  DEFAULT_COLOR_PNG_FILENAME,
  DEFAULT_OUTLINE_PNG_FILENAME,
  MANIFEST_RESOURCES,
  OUTLINE_TEMPLATE,
} from "../constants";
@Service(BuiltInResourcePluginNames.appStudio)
export class AppStudioPluginV3 {
  name = "fx-resource-appstudio";
  displayName = "App Studio";

  /**
   * Generate initial manifest template file, for both local debug & remote
   * @param ctx
   * @param inputs
   * @returns
   */
  async init(ctx: v2.Context, inputs: v2.InputsWithProjectPath): Promise<Result<any, FxError>> {
    const res = await init(inputs.projectPath);
    if (res.isErr()) return err(res.error);
    const templatesFolder = getTemplatesFolder();
    const defaultColorPath = path.join(templatesFolder, COLOR_TEMPLATE);
    const defaultOutlinePath = path.join(templatesFolder, OUTLINE_TEMPLATE);
    const appPackageDir = path.resolve(inputs.projectPath, APP_PACKAGE_FOLDER_FOR_MULTI_ENV);
    const resourcesDir = path.resolve(appPackageDir, MANIFEST_RESOURCES);
    await fs.ensureDir(resourcesDir);
    await fs.copy(defaultColorPath, path.join(resourcesDir, DEFAULT_COLOR_PNG_FILENAME));
    await fs.copy(defaultOutlinePath, path.join(resourcesDir, DEFAULT_OUTLINE_PNG_FILENAME));
    return ok(undefined);
  }

  /**
   * Append capabilities to manifest templates
   * @param ctx
   * @param inputs
   * @param capabilities
   * @returns
   */
  async addCapabilities(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    capabilities: (
      | { name: "staticTab"; snippet?: { local: IStaticTab; remote: IStaticTab } }
      | { name: "configurableTab"; snippet?: { local: IConfigurableTab; remote: IConfigurableTab } }
      | { name: "Bot"; snippet?: { local: IBot; remote: IBot } }
      | {
          name: "MessageExtension";
          snippet?: { local: IComposeExtension; remote: IComposeExtension };
        }
    )[]
  ): Promise<Result<any, FxError>> {
    const pluginContext: PluginContext = convert2PluginContext(this.name, ctx, inputs);
    capabilities.map(async (capability) => {
      const exceedLimit = await this.capabilityExceedLimit(ctx, inputs, capability.name);
      if (exceedLimit.isErr()) {
        return err(exceedLimit.error);
      }
      if (exceedLimit.value) {
        return err(
          AppStudioResultFactory.UserError(
            AppStudioError.CapabilityExceedLimitError.name,
            AppStudioError.CapabilityExceedLimitError.message(capability.name)
          )
        );
      }
    });
    return await addCapabilities(pluginContext.root, capabilities);
  }

  /**
   * Should conside both local and remote
   * @returns
   */
  async loadManifest(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<{ local: TeamsAppManifest; remote: TeamsAppManifest }, FxError>> {
    const pluginContext: PluginContext = convert2PluginContext(this.name, ctx, inputs);
    const localManifest = await loadManifest(pluginContext.root, true);
    if (localManifest.isErr()) {
      return err(localManifest.error);
    }

    const remoteManifest = await loadManifest(pluginContext.root, false);
    if (remoteManifest.isErr()) {
      return err(remoteManifest.error);
    }

    return ok({ local: localManifest.value, remote: remoteManifest.value });
  }

  /**
   * Save manifest template file
   * @param ctx ctx.manifest
   * @param inputs
   * @returns
   */
  async saveManifest(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    manifest: { local: TeamsAppManifest; remote: TeamsAppManifest }
  ): Promise<Result<any, FxError>> {
    const pluginContext: PluginContext = convert2PluginContext(this.name, ctx, inputs);
    let res = await saveManifest(pluginContext.root, manifest.local, true);
    if (res.isErr()) {
      return err(res.error);
    }

    res = await saveManifest(pluginContext.root, manifest.remote, false);
    if (res.isErr()) {
      return err(res.error);
    }

    return ok(undefined);
  }

  /**
   * Load manifest template, and check if it exceeds the limit.
   * The limit of staticTab if 16, others are 1
   * Should check both local & remote manifest template file
   * @param capability
   * @returns
   */
  async capabilityExceedLimit(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    capability: "staticTab" | "configurableTab" | "Bot" | "MessageExtension"
  ): Promise<Result<boolean, FxError>> {
    const pluginContext: PluginContext = convert2PluginContext(this.name, ctx, inputs);
    return await capabilityExceedLimit(pluginContext.root, capability);
  }
}
