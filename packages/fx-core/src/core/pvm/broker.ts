/**
 *
 * Basic C.R.U.D operations for plugins.
 *
 * Data is persisted in '${ProjectRoot}/${TeamsFx}/package.json'
 *
 */

import { PLUGIN_DOT_JSON } from "./constant";
import { ConfigFolderName } from "@microsoft/teamsfx-api";
import { pathExists, readJSON, writeFile } from "fs-extra";
import { join } from "path";
import { InvalidProjectError } from "../error";
import { Plugins } from "./type";

/**
 * make sure all necessary files/folders are existed.
 * Otherwise, throw exception.
 */
const validate = () => {
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const root = args[0];
      if (!(await pathExists(root))) {
        throw InvalidProjectError();
      }

      if (!(await pathExists(join(root, ConfigFolderName)))) {
        throw InvalidProjectError();
      }

      if (!(await pathExists(join(root, ConfigFolderName, PLUGIN_DOT_JSON)))) {
        await writeFile(join(root, ConfigFolderName, PLUGIN_DOT_JSON), JSON.stringify({}, null, 4));
      }
      const result = originalMethod.apply(this, args);
      return result;
    };
  };
};

/**
 * Broker is stateless which means all api should know about the path of
 * target project.
 */
export class Broker {
  private static configPath(root: string): string {
    return join(root, ConfigFolderName, PLUGIN_DOT_JSON);
  }

  /**
   * both create & update
   */
  @validate()
  static async save(root: string, plugins: Plugins): Promise<void> {
    const config = (await readJSON(Broker.configPath(root))) as Plugins;

    for (const [name, uri] of plugins) {
      config.set(name, uri);
    }
    await writeFile(Broker.configPath(root), JSON.stringify(config, null, 4));
    return;
  }

  @validate()
  static async list(root: string): Promise<Plugins> {
    const config = (await readJSON(Broker.configPath(root))) as Plugins;
    return config;
  }

  @validate()
  static async remove(root: string, plugins: Plugins): Promise<void> {
    const config = (await readJSON(Broker.configPath(root))) as Plugins;

    for (const name in plugins) {
      config.delete(name);
    }
    await writeFile(Broker.configPath(root), JSON.stringify(config, null, 4));
    return;
  }
}
