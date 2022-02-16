/**
 *
 * PVM(Plugin Version Manager)
 *
 * ....................     ....................
 * .. Project Config ..     .. Dynamic Plugin ..
 * ....................     ....................
 *          |                        |
 *          v                        v
 *     ............             ...........
 *     .. Broker ..             .. Depot ..
 *     ............             ...........
 *          ^                        ^
 *          |                        |
 *          v                        v
 * .............................................           ...................
 * ..       PVM(Plugin Version Manager)       .. <-------> .. Static Plugin ..
 * .............................................           ...................
 *                    ^
 *                    |
 *                    v
 *                ..........
 *                .. Core ..
 *                ..........
 *
 * We're gonna setup a community for developers to contribute plugin together, which
 * means Core should have capability to manage and load plugin dynamically.
 *
 * This component will act as:
 * 1. A depot which holds all plugins with varieties of versions.
 * 2. A broker which provides C.R.U.D operation of plugin for core.
 * 3. A coordinator which combines build-in plugins and dynamic plugins.
 *
 * PVM will store all plugins with the pattern '${home}/.fx/${plugin}/${version}/'
 *
 */

import { err, FxError, ok, Result } from "@microsoft/teamsfx-api";

import { LoadPluginError } from "../error";
import { Depot } from "./depot";
import { Broker } from "./broker";
import { PluginName } from "./type";

export default class PVM {
  /**
   * core should use this api to load plugins of a specific project dynamically
   *
   * @param root - target project root path.
   * @returns error on requiring plugins.
   */
  public static async load(root: string): Promise<Result<PluginName[], FxError>> {
    const config = await Broker.list(root);

    const result = await Depot.install(config);
    if (result.isOk()) {
      const plugins = result.value;
      try {
        for (const name in plugins) {
          await require(name);
        }
      } catch (e) {
        return err(LoadPluginError());
      }
      const dynamicPlugins = Object.keys(plugins);
      const allPlugins = [...dynamicPlugins, ...BuiltInFeaturePluginNames] as PluginName[];
      return ok(allPlugins);
    } else {
      return err(result.error);
    }
  }
}

export const BuiltInFeaturePluginNames: string[] = [
  "fx-resource-appstudio",
  "fx-resource-aad",
  "fx-resource-bot",
  "fx-resource-azure-web-app",
  "fx-resource-frontend-hosting",
  "fx-resource-spfx",
];
