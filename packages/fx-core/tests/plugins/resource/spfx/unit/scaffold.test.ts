// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import { expect } from "chai";
import { SpfxPlugin } from "../../../../../src/plugins/resource/spfx";
import * as sinon from "sinon";
import { Utils } from "../../../../../src/plugins/resource/spfx/utils/utils";
import { TestHelper } from "../helper";

describe("SPFxScaffold", function () {
  const testFolder = path.resolve("./tmp");
  const subFolderName = "SPFx";
  const appName = "spfxApp";
  let plugin: SpfxPlugin;

  beforeEach(async () => {
    plugin = new SpfxPlugin();
    await fs.ensureDir(testFolder);
    sinon.stub(Utils, "configure");
  });

  it("scaffold SPFx project without framework", async function () {
    const pluginContext = TestHelper.getFakePluginContext(appName, testFolder, "none");
    const result = await plugin.postScaffold(pluginContext);
    expect(result.isOk()).to.eq(true);
    // check specified files
    const files: string[] = [
      "config/config.json",
      "config/copy-assets.json",
      "config/deploy-azure-storage.json",
      "config/package-solution.json",
      "config/serve.json",
      "config/write-manifests.json",
      "src/webparts/helloworld/HelloworldWebPart.manifest.json",
      "src/webparts/helloworld/HelloworldWebPart.ts",
      "src/webparts/helloworld/loc/en-us.js",
      "src/webparts/helloworld/loc/mystrings.d.ts",
      "src/index.ts",
      ".gitignore",
      "gulpfile.js",
      "package.json",
      "README.md",
      "tsconfig.json",
      "tslint.json",
    ];
    for (const file of files) {
      const filePath = path.join(testFolder, subFolderName, file);
      expect(await fs.pathExists(filePath), `${filePath} must exist.`).to.eq(true);
    }
  });

  it("scaffold SPFx project with react framework", async function () {
    const pluginContext = TestHelper.getFakePluginContext(appName, testFolder, "react");
    const result = await plugin.postScaffold(pluginContext);

    expect(result.isOk()).to.eq(true);
    // check specified files
    const files: string[] = [
      "config/config.json",
      "config/copy-assets.json",
      "config/deploy-azure-storage.json",
      "config/package-solution.json",
      "config/serve.json",
      "config/write-manifests.json",
      "src/webparts/helloworld/HelloworldWebPart.manifest.json",
      "src/webparts/helloworld/HelloworldWebPart.ts",
      "src/webparts/helloworld/components/Helloworld.tsx",
      "src/webparts/helloworld/components/IHelloworldProps.ts",
      "src/webparts/helloworld/components/Helloworld.module.scss",
      "src/webparts/helloworld/loc/en-us.js",
      "src/webparts/helloworld/loc/mystrings.d.ts",
      "src/index.ts",
      ".gitignore",
      "gulpfile.js",
      "package.json",
      "README.md",
      "tsconfig.json",
      "tslint.json",
    ];
    for (const file of files) {
      const filePath = path.join(testFolder, subFolderName, file);
      expect(await fs.pathExists(filePath), `${filePath} must exist.`).to.eq(true);
    }
  });

  it("scaffold SPFx project with extremely long webpart name", async function () {
    const pluginContext = TestHelper.getFakePluginContext(
      appName,
      testFolder,
      "react",
      "extremelylongextremelylongextremelylongextremelylongspfxwebpartname"
    );

    const result = await plugin.postScaffold(pluginContext);
    expect(result.isOk()).to.eq(true);
  });

  afterEach(async () => {
    sinon.restore();
    await fs.remove(testFolder);
  });
});
