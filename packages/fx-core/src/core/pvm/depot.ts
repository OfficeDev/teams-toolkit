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
import { join } from "path";
import { homedir, tmpdir } from "os";
import { move, remove, ensureDir, rmdir, writeFile, readJSON, pathExists } from "fs-extra";
import { nanoid } from "nanoid";
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
import { CoreSource, InvalidInputError, NpmInstallError } from "../error";
import { MANIFEST_DOT_JSON, PACKAGE_DOT_JSON, PLUGINS_FOLDER, PVM_SPEC_VERSION } from "./constant";
import { PluginName, PluginURI, Plugins, PluginVersion, PluginPath } from "./type";

/**
 * manifest is a structure to describe the details of all loaded plugins.
 * version is a reserved property.
 */
interface Manifest {
  version: string;
  plugins: Map<PluginName, PluginVersion[]>;
}

/**
 * Path is the address of depot to store plugins. Make it static because
 * this property should be immutable.
 */
const DEPOT_ADDR: string = join(homedir(), `.${ConfigFolderName}`);

/**
 * Write plugins as dependencies in package.json file to execute npm install
 */
async function writePackageJson(destination: string, plugins: Plugins) {
  await ensureDir(destination);
  const rawData = {
    // name & version are required in package.json
    name: ProductName,
    version: PVM_SPEC_VERSION,
    dependencies: plugins,
  };
  // npm install use "package.json" as default config file
  await writeFile(join(destination, PACKAGE_DOT_JSON), rawData);
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
      if (!(await pathExists(join(DEPOT_ADDR, PLUGINS_FOLDER, MANIFEST_DOT_JSON)))) {
        await writePackageJson(join(DEPOT_ADDR, PLUGINS_FOLDER, MANIFEST_DOT_JSON), new Map());
      }
      const result = originalMethod.apply(this, args);
      return result;
    };
  };
};

export class Depot {
  /**
   * I haven't found any lib to validate deps in package.json. Currently, execute
   * 'npm install --dry-run' in /tmp folder and catch the exit code to validate it.
   *
   * @param packages - the URI of a package
   * @returns True if the version fit Semantic Versioning format
   */
  private static async validate(plugins: Plugins): Promise<boolean> {
    // Flush data into package.json in system temp folder.
    // Nanoid is safer and faster than uuid.
    const targetPath = join(tmpdir(), `.${ConfigFolderName}`, nanoid(16));
    await writePackageJson(targetPath, plugins);

    // execute 'npm install' with "dry-run"
    try {
      Executor.execCommandAsync("npm install --dry-run");
    } catch (e) {
      return false;
    }

    // teardown
    await rmdir(targetPath);
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
  ): Promise<Result<Map<PluginName, PluginPath>, FxError>> {
    if (await Depot.validate(packages)) {
      return err(InvalidInputError(Array.from(packages.values()).toString()));
    }

    const paths: Map<PluginName, PluginPath> = new Map();
    const versions: Map<PluginName, PluginVersion> = new Map();

    /**
     * lock is necesscary because there might be several process loading plugins.
     */
    try {
      await lock(DEPOT_ADDR);
    } catch (e) {
      console.error(e);
      return err(new ConcurrentError(CoreSource));
    }

    for (const [name, uri] of packages.entries()) {
      if (await Depot.has(name, uri)) {
        continue;
      }
      const co = join(DEPOT_ADDR, "plugins", name);
      const plugin: Plugins = new Map();
      plugin.set(name, uri);

      // set as "undertermined" and rename after installing
      const source = join(co, "undertermined");
      await writePackageJson(source, plugin);

      try {
        // --prefix set the target diretory of npm package
        // --no-save will not gen package-lock.json
        Executor.execCommandAsync(`npm install --prefix ${source} --no-save`);
      } catch (e) {
        if (e instanceof Error) {
          return err(NpmInstallError(source, e));
        } else {
          return err(NpmInstallError(source, new Error(`exception: ${e}`)));
        }
      }

      /**
       * rename the folder by version in node_modules/${name}/package.json
       */
      const config = await readJSON(join(source, "node_modules", name, PACKAGE_DOT_JSON));
      const version = config.version;
      const destination = join(co, version);
      await move(source, destination);

      /**
       * remove temporary package.json
       */
      await remove(join(destination, PACKAGE_DOT_JSON));
      paths.set(name, destination);
      versions.set(name, version);
    }

    /**
     * sync to manifest
     */
    Depot.saveManifest(versions);

    await unlock(DEPOT_ADDR);

    return ok(paths);
  }

  public static async getManifest(): Promise<Manifest> {
    // sync to manifest
    const manifestPath = join(DEPOT_ADDR, MANIFEST_DOT_JSON);
    const manifest = (await readJSON(manifestPath)) as Manifest;
    return manifest;
  }

  public static async has(name: PluginName, version: PluginVersion): Promise<boolean> {
    const manifest = await Depot.getManifest();
    if (manifest.plugins.has(name)) {
      const vers = manifest.plugins.get(name);
      if (vers && vers.includes(version)) {
        return true;
      }
    }
    return false;
  }

  private static async saveManifest(plugins: Map<PluginName, PluginVersion>) {
    // sync to manifest
    const manifestPath = join(DEPOT_ADDR, MANIFEST_DOT_JSON);
    const manifest = (await readJSON(manifestPath)) as Manifest;

    for (const [name, version] of plugins.entries()) {
      if (manifest.plugins.has(name)) {
        const vers = manifest.plugins.get(name);
        if (vers && !vers.includes(version)) {
          vers.push(version);
          manifest.plugins.set(name, vers);
        } else {
          manifest.plugins.set(name, [version]);
        }
      } else {
        manifest.plugins.set(name, [version]);
      }
    }
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  }
}
