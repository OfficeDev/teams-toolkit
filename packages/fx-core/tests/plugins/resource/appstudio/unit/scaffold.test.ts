// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import { AppStudioPlugin } from "./../../../../../src/plugins/resource/appstudio";
import {
  ConfigMap,
  PluginContext,
  TeamsAppManifest,
  Platform,
  AppPackageFolderName,
} from "@microsoft/teamsfx-api";
import * as uuid from "uuid";
import fs, { PathLike } from "fs-extra";
import sinon from "sinon";
import {
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
} from "../../../../../src/plugins/solution/fx-solution/question";
import {
  BOTS_TPL,
  BOTS_TPL_FOR_MULTI_ENV,
  COMPOSE_EXTENSIONS_TPL,
  COMPOSE_EXTENSIONS_TPL_FOR_MULTI_ENV,
  CONFIGURABLE_TABS_TPL,
  CONFIGURABLE_TABS_TPL_FOR_MULTI_ENV,
  MANIFEST_TEMPLATE,
  REMOTE_MANIFEST,
  STATIC_TABS_TPL,
  STATIC_TABS_TPL_FOR_MULTI_ENV,
} from "../../../../../src/plugins/resource/appstudio/constants";
import { newEnvInfo } from "../../../../../src/core/tools";
import { isMultiEnvEnabled } from "../../../../../src/common/tools";
import { LocalCrypto } from "../../../../../src/core/crypto";
import { getAzureProjectRoot } from "../helper";
import * as path from "path";

function getRemoteManifestPath(projectRoot: string): string {
  if (isMultiEnvEnabled()) {
    return `${projectRoot}/templates/${AppPackageFolderName}/${MANIFEST_TEMPLATE}`;
  } else {
    return `${projectRoot}/${AppPackageFolderName}/${REMOTE_MANIFEST}`;
  }
}

describe("Scaffold", () => {
  let plugin: AppStudioPlugin;
  let ctx: PluginContext;
  const sandbox = sinon.createSandbox();
  const fileContent: Map<string, any> = new Map();

  beforeEach(async () => {
    plugin = new AppStudioPlugin();

    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(),
      config: new ConfigMap(),
      answers: { platform: Platform.VSCode },
      projectSettings: undefined,
      cryptoProvider: new LocalCrypto(""),
    };

    sandbox.stub(fs, "writeFile").callsFake((file: number | PathLike, data: any) => {
      fileContent.set(path.normalize(file.toString()), data);
    });

    sandbox.stub(fs, "writeJSON").callsFake((file: string, obj: any) => {
      fileContent.set(path.normalize(file), JSON.stringify(obj));
    });
    // Uses stub<any, any> to circumvent type check. Beacuse sinon fails to mock my target overload of readJson.
    sandbox.stub<any, any>(fs, "copy").callsFake((originPath: string, filePath: string) => {
      fileContent.set(path.normalize(filePath), JSON.stringify(filePath));
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should generate manifest for azure tab", async () => {
    fileContent.clear();
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        capabilities: ["Tab"],
      },
    };

    const result = await plugin.scaffold(ctx);
    chai.expect(result.isOk()).equals(true);

    const manifest: TeamsAppManifest = JSON.parse(
      fileContent.get(path.normalize(getRemoteManifestPath(ctx.root)))
    );
    chai
      .expect(manifest.staticTabs)
      .to.deep.equal(isMultiEnvEnabled() ? STATIC_TABS_TPL_FOR_MULTI_ENV : STATIC_TABS_TPL);
    chai
      .expect(manifest.configurableTabs)
      .to.deep.equal(
        isMultiEnvEnabled() ? CONFIGURABLE_TABS_TPL_FOR_MULTI_ENV : CONFIGURABLE_TABS_TPL
      );
    chai
      .expect(manifest.bots, "Bots should be empty, because only tab is chosen")
      .to.deep.equal([]);
    chai
      .expect(
        manifest.composeExtensions,
        "ComposeExtensions should be empty, because only tab is chosen"
      )
      .to.deep.equal([]);

    // NOTE(aochengwang):
    // The `path.normalize` is a simple workaround.
    //
    // We need to normalize the file path when multi-env is turned on
    //  because the code in appstudio plugin will use `path.join` to generate these file path (only when multi-env is enabled)
    //  which implicitly calls `path.normalize`
    //  and it removes the leading "./" in "./tests/plugins/resource/appstudio/...",
    //  causing the test to fail.
    // However the test case should not fail because these paths are essentially the same.
    // A better approach to solve this issue is to write helper functions to:
    //   1. normalize all paths in `fileContent.set`
    //   2. normalize all paths before checking path existence in `fileContent`
    // Maybe we can refactor this later.
    chai.expect(
      fileContent.has(
        isMultiEnvEnabled()
          ? path.normalize(`${ctx.root}/templates/${AppPackageFolderName}/resources/color.png`)
          : path.normalize(`${ctx.root}/${AppPackageFolderName}/color.png`)
      )
    ).to.be.true;
    chai.expect(
      fileContent.has(
        isMultiEnvEnabled()
          ? path.normalize(`${ctx.root}/templates/${AppPackageFolderName}/resources/outline.png`)
          : path.normalize(`${ctx.root}/${AppPackageFolderName}/outline.png`)
      )
    ).to.be.true;
  });

  it("should generate manifest for bot", async () => {
    fileContent.clear();
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };

    const result = await plugin.scaffold(ctx);
    chai.expect(result.isOk()).equals(true);
    const manifest: TeamsAppManifest = JSON.parse(
      fileContent.get(path.normalize(getRemoteManifestPath(ctx.root)))
    );
    chai
      .expect(manifest.staticTabs, "staticTabs should be empty, because only bot is chosen")
      .to.deep.equal([]);
    chai
      .expect(
        manifest.configurableTabs,
        "configurableTabs should be empty, because only bot is chosen"
      )
      .to.deep.equal([]);
    chai
      .expect(manifest.bots)
      .to.deep.equal(isMultiEnvEnabled() ? BOTS_TPL_FOR_MULTI_ENV : BOTS_TPL);
    chai
      .expect(
        manifest.composeExtensions,
        "ComposeExtensions should be empty, because only bot is chosen"
      )
      .to.deep.equal([]);

    chai.expect(
      fileContent.has(
        isMultiEnvEnabled()
          ? path.normalize(`${ctx.root}/templates/${AppPackageFolderName}/resources/color.png`)
          : path.normalize(`${ctx.root}/${AppPackageFolderName}/color.png`)
      )
    ).to.be.true;
    chai.expect(
      fileContent.has(
        isMultiEnvEnabled()
          ? path.normalize(`${ctx.root}/templates/${AppPackageFolderName}/resources/outline.png`)
          : path.normalize(`${ctx.root}/${AppPackageFolderName}/outline.png`)
      )
    ).to.be.true;
  });

  it("should generate manifest for messaging extension", async () => {
    fileContent.clear();
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["MessagingExtension"],
      },
    };

    const result = await plugin.scaffold(ctx);
    chai.expect(result.isOk()).equals(true);
    const manifest: TeamsAppManifest = JSON.parse(
      fileContent.get(path.normalize(getRemoteManifestPath(ctx.root)))
    );
    chai
      .expect(manifest.staticTabs, "staticTabs should be empty, because only msgext is chosen")
      .to.deep.equal([]);
    chai
      .expect(
        manifest.configurableTabs,
        "configurableTabs should be empty, because msgext bot is chosen"
      )
      .to.deep.equal([]);
    chai
      .expect(manifest.bots, "Bots should be empty, because only msgext is chosen")
      .to.deep.equal([]);
    chai
      .expect(manifest.composeExtensions)
      .to.deep.equal(
        isMultiEnvEnabled() ? COMPOSE_EXTENSIONS_TPL_FOR_MULTI_ENV : COMPOSE_EXTENSIONS_TPL
      );

    chai.expect(
      fileContent.has(
        isMultiEnvEnabled()
          ? path.normalize(`${ctx.root}/templates/${AppPackageFolderName}/resources/color.png`)
          : path.normalize(`${ctx.root}/${AppPackageFolderName}/color.png`)
      )
    ).to.be.true;
    chai.expect(
      fileContent.has(
        isMultiEnvEnabled()
          ? path.normalize(`${ctx.root}/templates/${AppPackageFolderName}/resources/outline.png`)
          : path.normalize(`${ctx.root}/${AppPackageFolderName}/outline.png`)
      )
    ).to.be.true;
  });

  it("should generate manifest for tab, bot and messaging extension", async () => {
    fileContent.clear();
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        capabilities: ["Bot", "Tab", "MessagingExtension"],
      },
    };

    const result = await plugin.scaffold(ctx);
    chai.expect(result.isOk()).equals(true);
    const manifest: TeamsAppManifest = JSON.parse(
      fileContent.get(path.normalize(getRemoteManifestPath(ctx.root)))
    );
    chai
      .expect(manifest.staticTabs)
      .to.deep.equal(isMultiEnvEnabled() ? STATIC_TABS_TPL_FOR_MULTI_ENV : STATIC_TABS_TPL);
    chai
      .expect(manifest.configurableTabs)
      .to.deep.equal(
        isMultiEnvEnabled() ? CONFIGURABLE_TABS_TPL_FOR_MULTI_ENV : CONFIGURABLE_TABS_TPL
      );
    chai
      .expect(manifest.bots)
      .to.deep.equal(isMultiEnvEnabled() ? BOTS_TPL_FOR_MULTI_ENV : BOTS_TPL);
    chai
      .expect(manifest.composeExtensions)
      .to.deep.equal(
        isMultiEnvEnabled() ? COMPOSE_EXTENSIONS_TPL_FOR_MULTI_ENV : COMPOSE_EXTENSIONS_TPL
      );

    chai.expect(
      fileContent.has(
        isMultiEnvEnabled()
          ? path.normalize(`${ctx.root}/templates/${AppPackageFolderName}/resources/color.png`)
          : path.normalize(`${ctx.root}/${AppPackageFolderName}/color.png`)
      )
    ).to.be.true;
    chai.expect(
      fileContent.has(
        isMultiEnvEnabled()
          ? path.normalize(`${ctx.root}/templates/${AppPackageFolderName}/resources/outline.png`)
          : path.normalize(`${ctx.root}/${AppPackageFolderName}/outline.png`)
      )
    ).to.be.true;
  });

  it("shouldn't generate manifest for SPFx project", async () => {
    fileContent.clear();
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionSPFx.id,
        name: "azure",
        version: "1.0",
        capabilities: ["Tab"],
        activeResourcePlugins: ["fx-resource-spfx"],
      },
    };

    const result = await plugin.scaffold(ctx);
    chai.expect(result.isOk()).equals(true);
    const manifest = fileContent.get(path.normalize(getRemoteManifestPath(ctx.root)));
    chai.expect(manifest).to.be.not.undefined;

    chai.expect(
      fileContent.has(
        isMultiEnvEnabled()
          ? path.normalize(`${ctx.root}/templates/${AppPackageFolderName}/resources/color.png`)
          : path.normalize(`${ctx.root}/${AppPackageFolderName}/color.png`)
      )
    ).to.be.true;
    chai.expect(
      fileContent.has(
        isMultiEnvEnabled()
          ? path.normalize(`${ctx.root}/templates/${AppPackageFolderName}/resources/outline.png`)
          : path.normalize(`${ctx.root}/${AppPackageFolderName}/outline.png`)
      )
    ).to.be.true;
  });
});
