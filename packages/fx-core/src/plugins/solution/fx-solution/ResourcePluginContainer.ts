// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { AzureSolutionSettings, Plugin, returnUserError } from "@microsoft/teamsfx-api";
import { Container, inject, injectable } from "inversify";
import "reflect-metadata";

/**
 * In this file, all resource plugins are registered in injected into the global container named by "AZ_RC_CONTAINER".
 * The resource plugin can be accessed by: `AZ_RC_CONTAINER.SqlPlugin`
 */

/**
 * 1: add import statement
 */
import { SpfxPlugin } from "../../resource/spfx";
import { FrontendPlugin } from "../../resource/frontend";
import { IdentityPlugin } from "../../resource/identity";
import { SqlPlugin } from "../../resource/sql";
import { TeamsBot } from "../../resource/bot";
import { AadAppForTeamsPlugin } from "../../resource/aad";
import { FunctionPlugin } from "../../resource/function";
import { SimpleAuthPlugin } from "../../resource/simpleauth";
import { LocalDebugPlugin } from "../../resource/localdebug";
import { ApimPlugin } from "../../resource/apim";
import { AppStudioPlugin } from "../../resource/appstudio";
import { SolutionError } from "./constants";

/**
 * 2: define Symbols
 */
const PluginTypes = {
  SpfxPlugin: Symbol.for("SpfxPlugin"),
  FrontendPlugin: Symbol.for("FrontendPlugin"),
  IdentityPlugin: Symbol.for("IdentityPlugin"),
  SqlPlugin: Symbol.for("SqlPlugin"),
  BotPlugin: Symbol.for("BotPlugin"),
  AadPlugin: Symbol.for("AadPlugin"),
  FunctionPlugin: Symbol.for("FunctionPlugin"),
  LocalDebugPlugin: Symbol.for("LocalDebugPlugin"),
  ApimPlugin: Symbol.for("ApimPlugin"),
  AppStudioPlugin: Symbol.for("AppStudioPlugin"),
  SimpleAuthPlugin: Symbol.for("SimpleAuthPlugin"),
};

/**
 * 3: inject into container
 */
@injectable()
class AzureResourcePluginContainer {
  SpfxPlugin: Plugin;
  FrontendPlugin: Plugin;
  IdentityPlugin: Plugin;
  SqlPlugin: Plugin;
  BotPlugin: Plugin;
  AadPlugin: Plugin;
  FunctionPlugin: Plugin;
  LocalDebugPlugin: Plugin;
  ApimPlugin: Plugin;
  AppStudioPlugin: Plugin;
  SimpleAuthPlugin: Plugin;

  constructor(
    @inject(PluginTypes.SpfxPlugin) SpfxPlugin: Plugin,
    @inject(PluginTypes.FrontendPlugin) FrontendPlugin: Plugin,
    @inject(PluginTypes.IdentityPlugin) IdentityPlugin: Plugin,
    @inject(PluginTypes.SqlPlugin) SqlPlugin: Plugin,
    @inject(PluginTypes.BotPlugin) BotPlugin: Plugin,
    @inject(PluginTypes.AadPlugin) AadPlugin: Plugin,
    @inject(PluginTypes.FunctionPlugin) FunctionPlugin: Plugin,
    @inject(PluginTypes.LocalDebugPlugin) LocalDebugPlugin: Plugin,
    @inject(PluginTypes.ApimPlugin) ApimPlugin: Plugin,
    @inject(PluginTypes.SimpleAuthPlugin) SimpleAuthPlugin: Plugin,
    @inject(PluginTypes.AppStudioPlugin) AppStudioPlugin: Plugin
  ) {
    this.SpfxPlugin = SpfxPlugin;
    this.FrontendPlugin = FrontendPlugin;
    this.IdentityPlugin = IdentityPlugin;
    this.SqlPlugin = SqlPlugin;
    this.BotPlugin = BotPlugin;
    this.AadPlugin = AadPlugin;
    this.FunctionPlugin = FunctionPlugin;
    this.LocalDebugPlugin = LocalDebugPlugin;
    this.ApimPlugin = ApimPlugin;
    this.AppStudioPlugin = AppStudioPlugin;
    this.SimpleAuthPlugin = SimpleAuthPlugin;
  }

  /**
   * @returns all registered resource plugins
   */
  getAllResourcePlugins(): Plugin[] {
    const plugins: Plugin[] = [];
    const keys = Object.getOwnPropertyNames(this);
    for (const k of keys) {
      const plugin = (this as any)[k];
      if (plugin) {
        plugins.push(plugin);
      }
    }
    return plugins;
  }

  /**
   *
   * @returns all registered resource plugin map
   */
  getAllResourcePluginMap(): Map<string, Plugin> {
    const map = new Map<string, Plugin>();
    const allPlugins = this.getAllResourcePlugins();
    for (const p of allPlugins) {
      map.set(p.name, p);
    }
    return map;
  }

  /**
   * return activated resource plugin according to solution settings
   * @param solutionSettings Azure solution settings
   * @returns activated resource plugins
   */
  getActivatedResourcePlugins(solutionSettings: AzureSolutionSettings): Plugin[] {
    const allPlugins = this.getAllResourcePluginMap();
    let activatedPlugins: Plugin[] = [];
    if (
      solutionSettings.activeResourcePlugins &&
      solutionSettings.activeResourcePlugins.length > 0
    ) {
      // load existing config
      for (const p of solutionSettings.activeResourcePlugins) {
        const plugin = allPlugins.get(p);
        if (plugin === undefined) {
          throw returnUserError(
            new Error(`Plugin name ${p} is not valid`),
            "Solution",
            SolutionError.PluginNotFound
          );
        }
        activatedPlugins.push(plugin);
      }
    } // create from zero
    else {
      activatedPlugins = Array.from(allPlugins)
        .filter((p) => p[1].activate && p[1].activate(solutionSettings) === true)
        .map((p) => p[1]);
    }
    if (activatedPlugins.length === 0) {
      throw returnUserError(
        new Error(`No plugin selected`),
        "Solution",
        SolutionError.NoResourcePluginSelected
      );
    }
    return activatedPlugins;
  }
}

/**
 * 4: bind symbol to real class
 */
const PluginContainer = new Container();
PluginContainer.bind<Plugin>(PluginTypes.SpfxPlugin).to(SpfxPlugin);
PluginContainer.bind<Plugin>(PluginTypes.FrontendPlugin).to(FrontendPlugin);
PluginContainer.bind<Plugin>(PluginTypes.IdentityPlugin).to(IdentityPlugin);
PluginContainer.bind<Plugin>(PluginTypes.SqlPlugin).to(SqlPlugin);
PluginContainer.bind<Plugin>(PluginTypes.BotPlugin).to(TeamsBot);
PluginContainer.bind<Plugin>(PluginTypes.AadPlugin).to(AadAppForTeamsPlugin);
PluginContainer.bind<Plugin>(PluginTypes.FunctionPlugin).to(FunctionPlugin);
PluginContainer.bind<Plugin>(PluginTypes.LocalDebugPlugin).to(LocalDebugPlugin);
PluginContainer.bind<Plugin>(PluginTypes.ApimPlugin).to(ApimPlugin);
PluginContainer.bind<Plugin>(PluginTypes.AppStudioPlugin).to(AppStudioPlugin);
PluginContainer.bind<Plugin>(PluginTypes.SimpleAuthPlugin).to(SimpleAuthPlugin);

export const AZ_RC_CONTAINER = PluginContainer.resolve(AzureResourcePluginContainer);
