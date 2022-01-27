/**
 *
 * Basic C.R.U.D operations for plugins.
 *
 * Data is persisted in '${ProjectRoot}/${TeamsFx}/package.json'
 *
 */

import { PLUGIN_DOT_JSON } from "./constant";
import { ConfigFolderName } from "@microsoft/teamsfx-api";
import { ensureDir, pathExists, readJSON, writeFile } from "fs-extra";
import { join } from "path";
import { InvalidProjectError } from "../error";
import { Plugins } from "./type";
import { jsonStringifyElegantly } from "./utility";

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

      await ensureDir(join(root, ConfigFolderName));

      if (!(await pathExists(join(root, ConfigFolderName, PLUGIN_DOT_JSON)))) {
        await writeFile(join(root, ConfigFolderName, PLUGIN_DOT_JSON), jsonStringifyElegantly({}));
      }
      const result = originalMethod.apply(this, args);
      return result;
    };
  };
};

/**
 * Broker is stateless which means all api should know about the path of
 * target project.
 *
 * All method will throw InvalidProjectError if project is invalid.
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

    for (const name in plugins) {
      config[name] = plugins[name];
    }
    await writeFile(Broker.configPath(root), jsonStringifyElegantly(config));
    return;
  }

  @validate()
  static async list(root: string): Promise<Plugins> {
    const config = (await readJSON(Broker.configPath(root))) as Plugins;
    return config;
  }

  @validate()
  static async remove(root: string, plugins: string[]): Promise<void> {
    const config = (await readJSON(Broker.configPath(root))) as Plugins;

    for (const i in plugins) {
      delete config[plugins[i]];
    }
    await writeFile(Broker.configPath(root), jsonStringifyElegantly(config));
    return;
  }
}
