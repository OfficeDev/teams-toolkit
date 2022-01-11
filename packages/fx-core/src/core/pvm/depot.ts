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
import { MANIFEST_DOT_JSON, PACKAGE_DOT_JSON, PVM_SPEC_VERSION } from "./constant";

/**
 * Actually, you can just use `type xx = string` to create an alias for a type.
 * This kind of implement just makes the code more readable and easy to index.
 */
type alias<T> = T;
type PluginName = alias<string>;
type PluginVersion = alias<string>;

/**
 * manifest is a structure to describe the details of all loaded plugins.
 * version is a reserved property.
 */
interface Manifest {
  version: string;
  plugins: Map<PluginName, PluginVersion[]>;
}

export class Depot {
  private static instance: Depot;

  /**
   * The static method that controls the access to the singleton instance.
   *
   * This implementation let you subclass the Singleton class while keeping
   * just one instance of each subclass around.
   */
  public static async getInstance(): Promise<Depot> {
    if (!Depot.instance) {
      Depot.instance = new Depot();
    }
    await Depot.instance.init();
    return Depot.instance;
  }

  /**
   * Path is the address of depot to store plugins. Make it static because
   * this property should be immutable.
   */
  private static readonly address: string = join(homedir(), `.${ConfigFolderName}`);

  /**
   * Manifest is a list of all plugins. You can use the two-step index to
   * find a particular version of a plugin.
   *
   */
  private _manifest: Manifest;

  /**
   * The Singleton's constructor should always be private to prevent direct
   * construction calls with the `new` operator.
   */
  private constructor() {
    this._manifest = {
      version: PVM_SPEC_VERSION,
      plugins: new Map(),
    };
  }

  /**
   * Do some necesscary preparations before providing services.
   */
  private async init(): Promise<void> {
    await ensureDir(Depot.address);
    await this.tally();
  }

  /**
   * I haven't found any lib to validate deps in package.json. Currently, execute
   * 'npm install --dry-run' in /tmp folder and catch the exit code to validate it.
   *
   * @param packages - the URI of a package
   * @returns True if the version fit Semantic Versioning format
   */
  private async validate(plugins: Map<PluginName, PluginVersion>): Promise<boolean> {
    // Flush data into package.json in system temp folder.
    // Nanoid is safer and faster than uuid.
    const targetPath = join(tmpdir(), `.${ConfigFolderName}`, nanoid(16));
    await this.writePackageJson(targetPath, plugins);

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
   * Write plugins as dependencies in package.json file to execute npm install
   */
  private async writePackageJson(destination: string, plugins: Map<PluginName, PluginVersion>) {
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
   * This is a wrapper of 'npm install' and store all packages in address.
   *
   * npm install {@link https://docs.npmjs.com/cli/v8/commands/npm-install}
   *
   * @param packages - the URI of a package
   * @returns paths of dynamic plugins. If exceptions, return FxError
   */
  public async load(packages: Map<PluginName, PluginVersion>): Promise<Result<string[], FxError>> {
    if (await this.validate(packages)) {
      return err(InvalidInputError(Array.from(packages.values()).toString()));
    }

    const paths: string[] = [];

    /**
     * lock is necesscary because there might be several process loading plugins.
     */
    try {
      await lock(Depot.address);
    } catch (e) {
      console.error(e);
      return err(new ConcurrentError(CoreSource));
    }

    for (const [name, version] of packages.entries()) {
      const co = join(Depot.address, "plugins", name);
      const plugin: Map<PluginName, PluginVersion> = new Map();
      plugin.set(name, version);

      // set as "undertermined" and rename after installing
      const source = join(co, "undertermined");
      await this.writePackageJson(source, plugin);

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
      const destination = join(co, config.version);
      await move(source, destination);

      /**
       * remove temporary package.json
       */
      await remove(join(destination, PACKAGE_DOT_JSON));
      paths.push(destination);
    }

    await unlock(Depot.address);

    return ok(paths);
  }

  /**
   * Load manifest from disk as a memory cache.
   *
   * @param packages - particular packages to write into manifest file. Or reload manifest file.
   */
  private async tally(packages?: Map<PluginName, PluginVersion>): Promise<void> {
    const manifestPath = join(Depot.address, MANIFEST_DOT_JSON);
    /**
     * if packages exist, update manifest (both memory and disk)
     */
    if (packages) {
      const manifest = (await readJSON(manifestPath)) as Manifest;
      for (const [name, version] of packages) {
        if (!manifest.plugins.has(name)) {
          manifest.plugins.set(name, [version]);
        } else {
          let versions = manifest.plugins.get(name);
          if (versions) {
            if (!versions.includes(version)) {
              versions.push(version);
            }
          } else {
            versions = [version];
          }
          manifest.plugins.set(name, versions);
        }
      }
      manifest.version = PVM_SPEC_VERSION;

      // update disk
      await writeFile(manifestPath, JSON.stringify(manifest, null, 4));
      // update memory
      this._manifest = manifest;
    } else {
      /**
       * if packages is undefined, reload plugins into memory
       */
      if (await pathExists(manifestPath)) {
        const manifest = (await readJSON(manifestPath)) as Manifest;
        this._manifest = manifest;
      } else {
        await writeFile(manifestPath, JSON.stringify(this._manifest, null, 4));
      }
    }
    return;
  }

  public get manifest(): Manifest {
    return this._manifest;
  }
}
