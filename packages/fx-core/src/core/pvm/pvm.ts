/**
 *
 * PVM(Plugin Version Manager)
 *
 *  ...........           .....................
 *  .. Depot .. <-------> .. Dynamic  Plugin ..
 *  ...........           .....................
 *       ^
 *       |
 *       v
 *   .........
 *   .. PVM .. 1. init & load 2.plugins
 *   .........
 *       ^
 *       |
 *       v
 *   ..........           ...................
 *   .. Core .. <-------> .. Static Plugin ..
 *   ..........           ...................
 *
 * We're gonna setup a community for developers to contribute plugin together, which
 * means Core should have capability to manage and load plugin dynamically.
 *
 * This component will act as:
 * 1. A depot which holds all plugins with varieties of versions.
 * 2. A broker which load plugin for core dynamically.
 * 3. A coordinator which combine build-in plugins and dynamic plugins.
 *
 * PVM will store all plugins with the pattern '${home}/.fx/${plugin}/${version}/'
 *
 */

import { FxError } from "@microsoft/teamsfx-api";
import { LoadPluginError } from "../error";
import { Depot } from "./depot";

export default class PVM {
  private static instance: PVM;

  /**
   * The Singleton's constructor should always be private to prevent direct
   * construction calls with the `new` operator.
   */
  private constructor() {}

  /**
   * The static method that controls the access to the singleton instance.
   *
   * This implementation let you subclass the Singleton class while keeping
   * just one instance of each subclass around.
   */
  public static async getInstance(): Promise<PVM> {
    if (!PVM.instance) {
      PVM.instance = new PVM();
    }

    return PVM.instance;
  }

  /**
   * Core should use this api to load plugins dynamically
   *
   * @param plugins - this should be like dependencies in package.json
   * @returns error on requiring plugins.
   */
  public async load(plugins: Record<string, string>): Promise<FxError | void> {
    const result = await (await Depot.getInstance()).load(plugins);

    if (result.isOk()) {
      try {
        for (const i of result.value) {
          await require(i);
        }
      } catch (e) {
        return LoadPluginError();
      }
    } else {
      return result.error;
    }
  }
}

export const BuiltInResourcePluginNames = {
  appStudio: "fx-resource-appstudio",
  aad: "fx-resource-aad",
  bot: "fx-resource-bot",
  webApp: "fx-resource-azure-web-app",
  storage: "fx-resource-azure-storage",
  spfx: "fx-resource-spfx",
};
export const BuiltInScaffoldPluginNames = {
  blazor: "fx-scaffold-blazor",
  tab: "fx-scaffold-react-tab",
  spfx: "fx-scaffold-spfx",
  bot: "fx-scaffold-bot",
};
