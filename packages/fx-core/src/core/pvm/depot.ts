/**
 * As plugins are developed by TS/JS and packed into NPM package, Depot will
 * act like npm but with several differences:
 *
 * 1. Depot will hold all versions of each plugin once loaded.
 * 2. All plugins will be stored in '${home}/${TeamsFx}'.
 *
 *  @example
 *  ~/.fx
 *  ├── manifest.json
 *  └── plugins
 *      ├── bot
 *      │   ├── 1.0.0
 *      │   │   └── node_modules
 *      │   │       └── bot
 *      │   └── 1.1.0
 *      │       └── node_modules
 *      │           └── bot
 *      ├── function
 *      │   └── 1.1.0
 *      │       └── node_modules
 *      │           └── function
 *      ├── keyvault
 *      │   └── 2.0.0
 *      │       └── node_modules
 *      │           └── keyvault
 *      └── ...
 *
 * If there's a resident process, depot will keep all of them in memory. Otherwise,
 * there will be a manifest to optimize performance like an index.
 */
import { join, resolve } from "path";
import { homedir } from "os";
import { move, remove, ensureDir, rmdir, writeFile, readJSON, pathExists } from "fs-extra";
import { lock, unlock } from "proper-lockfile";

import {
  ConcurrentError,
  ConfigFolderName,
  err,
  FxError,
  ok,
  ProductName,
  Result,
} from "@microsoft/teamsfx-api";

import { Executor } from "../../common/tools";
import { CoreSource, InvalidInputError, LoadPluginError } from "../error";
import { MANIFEST_DOT_JSON, PACKAGE_DOT_JSON, PLUGINS_FOLDER, PVM_SPEC_VERSION } from "./constant";
import { PluginName, Plugins, PluginVersion, PluginPath, PluginURI } from "./type";
import { jsonStringifyElegantly } from "./utility";
import { valid } from "semver";

/**
 * manifest is a structure to describe the details of all loaded plugins.
 * version is a reserved property.
 */
interface Manifest {
  version: string;
  plugins: Record<PluginName, PluginVersion[]>;
}

/**
 * Path is the address of depot to store plugins. Make it static because
 * this property should be immutable.
 */
const DEPOT_ADDR: string = join(homedir(), `.${ConfigFolderName}`);

/**
 * Write plugins as dependencies in package.json file to execute npm install
 */
async function writePackageJson(targetFolder: string, plugins: Plugins) {
  await ensureDir(targetFolder);
  const rawData = {
    // name & version are required in package.json
    name: ProductName,
    version: PVM_SPEC_VERSION,
    dependencies: plugins,
  };
  await writeFile(join(targetFolder, PACKAGE_DOT_JSON), jsonStringifyElegantly(rawData));
}

/**
 * make sure all necessary files/folders are existed.
 */
const ensureDepot = () => {
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      await ensureDir(DEPOT_ADDR);
      await ensureDir(join(DEPOT_ADDR, PLUGINS_FOLDER));
      if (!(await pathExists(join(DEPOT_ADDR, MANIFEST_DOT_JSON)))) {
        const rawData = {
          // name & version are required in package.json
          version: PVM_SPEC_VERSION,
          plugins: {},
        };
        await writeFile(join(DEPOT_ADDR, MANIFEST_DOT_JSON), jsonStringifyElegantly(rawData));
      }
      const result = originalMethod.apply(this, args);
      return result;
    };
  };
};

export class Depot {
  /**
   * only support two kinds of package
   * 1. local path
   * 2. semantic version
   *
   * @param packages - the URI of a package
   * @returns True if validation passed
   *
   * TODO use json-schema to validate
   */
  private static async validate(plugins: Plugins): Promise<boolean> {
    for (const name in plugins) {
      const uri = plugins[name];
      if (valid(uri)) {
        continue;
      }
      if (await pathExists(resolve(uri))) {
        continue;
      }
      return false;
    }
    return true;
  }

  /**
   * This is a wrapper of 'npm install' and store all packages in address.
   *
   * npm install {@link https://docs.npmjs.com/cli/v8/commands/npm-install}
   *
   * @param packages - the URI of a package
   * @returns paths of dynamic plugins. If exceptions, return FxError
   */
  @ensureDepot()
  public static async install(
    packages: Plugins
  ): Promise<Result<Record<PluginName, PluginPath>, FxError>> {
    if (!(await Depot.validate(packages))) {
      return err(InvalidInputError(Object.keys(packages).toString()));
    }

    const paths: Record<PluginName, PluginPath> = {};
    const versions: Record<PluginName, PluginVersion> = {};

    /**
     * lock is necesscary because there might be several process loading plugins.
     */
    try {
      await lock(DEPOT_ADDR);
    } catch (e) {
      return err(new ConcurrentError(CoreSource));
    }

    try {
      for (const name in packages) {
        const uri = packages[name];
        if (await Depot.has(name, uri)) {
          continue;
        }
        const co = join(DEPOT_ADDR, "plugins", name);
        const plugin: Plugins = {};
        plugin[name] = packages[name];

        // set as "undertermined" and rename after installing
        const source = join(co, "undertermined");
        await writePackageJson(source, plugin);

        // --prefix set the target diretory of npm package
        // --no-save will not gen package-lock.json
        await Executor.execCommandAsync(`npm install --prefix ${source} --no-save`);

        // rename the folder by version in node_modules/${name}/package.json
        const config = await readJSON(join(source, "node_modules", name, PACKAGE_DOT_JSON));
        const version = config.version;
        const destination = join(co, version);

        // if already installed, overwrite.
        if (await pathExists(destination)) {
          await rmdir(destination, { recursive: true });
        }
        await move(source, destination);

        // remove temporary package.json
        await remove(join(destination, PACKAGE_DOT_JSON));
        paths[name] = destination;
        versions[name] = version;
      }
      // sync to manifest
      Depot.saveManifest(versions);
    } catch (e) {
      console.log(e);
      await unlock(DEPOT_ADDR);
      return err(LoadPluginError());
    }

    await unlock(DEPOT_ADDR);

    return ok(paths);
  }

  @ensureDepot()
  public static async getManifest(): Promise<Manifest> {
    // sync to manifest
    const manifestPath = join(DEPOT_ADDR, MANIFEST_DOT_JSON);
    const manifest: Manifest = (await readJSON(manifestPath)) as Manifest;
    return manifest;
  }

  /**
   * @param name - plugin's name
   * @param version - if set, check specific version of plugin
   *
   * @returns whether plugin is existed or not
   */
  @ensureDepot()
  public static async has(name: PluginName, uri?: PluginURI): Promise<boolean> {
    const manifest = await Depot.getManifest();
    if (manifest.plugins[name]) {
      if (uri) {
        const vers = manifest.plugins[name];
        if (vers && vers.includes(uri)) {
          return true;
        }
      } else {
        return true;
      }
    }
    return false;
  }

  private static async saveManifest(plugins: Record<PluginName, PluginVersion>) {
    // sync to manifest
    const manifestPath = join(DEPOT_ADDR, MANIFEST_DOT_JSON);
    const manifest = (await readJSON(manifestPath)) as Manifest;

    for (const name in plugins) {
      const version = plugins[name];
      if (manifest.plugins[name]) {
        const vers = manifest.plugins[name];
        if (vers && !vers.includes(version)) {
          vers.push(plugins[name]);
          manifest.plugins[name] = vers;
        } else {
          manifest.plugins[name] = [version];
        }
      } else {
        manifest.plugins[name] = [version];
      }
    }
    await writeFile(manifestPath, jsonStringifyElegantly(manifest));
  }
}
