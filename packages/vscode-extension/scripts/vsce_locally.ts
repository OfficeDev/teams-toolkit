// Copyright (c) Microsoft Corporation.
//interfaces/**/*/ Licensed under the MIT license.
/**
 * @author Long Hao <71317774+LongOddCode@users.noreply.github.com>
 */
"use strict";

/**
 * vsce can only use non-locally packages to pack vsix.
 * This script use verdaccio to setup a local npm registry temporaryly
 * to keep npm package. And set localhost:4873 as the npm registry.
 * {@link https://github.com/verdaccio/verdaccio}
 */
import { killPortProcess } from "kill-port-process";

import { promisify } from "util";
import { exec } from "child_process";
import { join } from "path";
import { exit } from "process";
import { writeFile, copyFile, move, remove, pathExists } from "fs-extra";
import detectPort = require("detect-port");

function randomIntFromInterval(min: number, max: number) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function output(title: string): void;
function output(body: string[]): void;
function output(title: string, body: string[]): void;
function output(first: string | string[], second?: string[]) {
  if (typeof first == "string") {
    console.log(
      `━━━ ${first} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`.substring(
        0,
        70
      )
    );
  } else {
    for (const r of first) {
      console.log(r);
    }
  }
  if (second) {
    for (const r of second) {
      console.log(r);
    }
  }
}

async function overwrite(from: string, to: string) {
  if (await pathExists(from)) {
    if (await pathExists(to)) {
      await remove(to);
    }
    await move(from, to);
  }
}

const execAsync = promisify(exec);

async function publishLocally(
  name: string,
  deps?: Record<string, string>,
  scripts?: Record<string, string>,
  version?: string,
  vsce?: boolean
): Promise<string> {
  output(name, [`publishing ${name} to local registry...`]);
  const folder = join(__dirname, "..", "..", name);
  try {
    await copyFile(join(folder, "package.json"), join(folder, "package.json.backup"));
    await copyFile(join(folder, "package-lock.json"), join(folder, "package-lock.json.backup"));
    const json = require(join(folder, "package.json"));
    json.version = json.version + "-local." + randomIntFromInterval(0, 1000);

    if (deps) {
      for (const k in deps) {
        json.dependencies[k] = deps[k];
      }
    }

    if (scripts) {
      for (const k in scripts) {
        json.scripts[k] = scripts[k];
      }
    }
    if (version) {
      json.version = version;
    }

    await writeFile(join(folder, "package.json"), JSON.stringify(json, null, 2));

    await execAsync(`npm install --production`, {
      cwd: folder,
      maxBuffer: 1024 * 1024 * 50,
    });

    if (!vsce) {
      await execAsync(`npm publish`, {
        cwd: folder,
        maxBuffer: 1024 * 1024 * 50,
      });
      output([`[ DONE ] ${name} ${json.version} published.\n`]);
    }

    if (vsce) {
      output(name, [`vsce packaging...`]);
      await execAsync(`npm run package`, {
        cwd: folder,
        maxBuffer: 1024 * 1024 * 50,
      });
      await execAsync(`npx vsce package`, {
        cwd: folder,
        maxBuffer: 1024 * 1024 * 50,
      });
      output([`[ DONE ] vscode ${json.version} packed`]);
    }

    return json.version;
  } catch (e) {
    throw e;
  } finally {
    await overwrite(join(folder, "package.json.backup"), join(folder, "package.json"));
    await overwrite(join(folder, "package-lock.json.backup"), join(folder, "package-lock.json"));
  }
}

async function packLocally() {
  const port = await detectPort(4873);

  process.env.NPM_CONFIG_REGISTRY = `http://localhost:${port}`;
  process.env.NPM_TOKEN = "9527";

  output("tips", [
    "1. each step may take a little while, please be patient.",
    "2. run with '--clean' or '-c' to remove local package\n",
  ]);
  output("verdaccio");
  console.log(join(__dirname));
  const verdaccio = exec(`npx verdaccio --listen ${port} --config verdaccio.yaml`, {
    cwd: join(__dirname),
  });
  output([`[ DONE ] verdaccio is running at http://localhost:${port}...\n`]);

  try {
    const manifestVersion = await publishLocally(
      "manifest",
      {},
      { prepublishOnly: "npm run build" }
    );
    const apiVersion = await publishLocally(
      "api",
      { "@microsoft/teams-manifest": manifestVersion },
      { prepublishOnly: "npm run build" }
    );
    const coreVersion = await publishLocally(
      "fx-core",
      { "@microsoft/teamsfx-api": apiVersion },
      { prepublishOnly: "npm run build" }
    );

    await publishLocally(
      "vscode-extension",
      {
        "@microsoft/teamsfx-api": apiVersion,
        "@microsoft/teamsfx-core": coreVersion,
      },
      {},
      "9.9.9-local." + randomIntFromInterval(0, 1000),
      true
    );
  } catch (e) {
    throw e;
  } finally {
    output("tear down");
    if (process.argv.includes("--clean") || process.argv.includes("-c")) {
      await remove("verdaccio");
      output(["[ DONE ] cache is removed"]);
    }

    await killPortProcess(port);
    output(["[ DONE ] verdaccio is closed"]);
  }
}

packLocally().catch((e) => {
  console.error(e);
  exit(1);
});
