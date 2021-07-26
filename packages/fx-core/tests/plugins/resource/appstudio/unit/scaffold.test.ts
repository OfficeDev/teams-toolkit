// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import { AppStudioPlugin } from "./../../../../../src/plugins/resource/appstudio";
import { AppStudioPluginImpl } from "./../../../../../src/plugins/resource/appstudio/plugin";
import { TeamsBot } from "./../../../../../src/plugins/resource/bot";
import { AppStudioError } from "./../../../../../src/plugins/resource/appstudio/errors";
import {
  ConfigMap,
  PluginContext,
  TeamsAppManifest,
  ConfigFolderName,
  ok,
  err,
  Plugin,
  Platform,
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
  COMPOSE_EXTENSIONS_TPL,
  CONFIGURABLE_TABS_TPL,
  REMOTE_MANIFEST,
  STATIC_TABS_TPL,
} from "../../../../../src/plugins/resource/appstudio/constants";

describe("Scaffold", () => {
  let plugin: AppStudioPlugin;
  let ctx: PluginContext;
  const sandbox = sinon.createSandbox();
  const fileContent: Map<string, any> = new Map();

  beforeEach(async () => {
    plugin = new AppStudioPlugin();

    ctx = {
      root: "./",
      configOfOtherPlugins: new Map(),
      config: new ConfigMap(),
      answers: { platform: Platform.VSCode },
      app: new TeamsAppManifest(),
      projectSettings: undefined,
    };

    sandbox.stub(fs, "writeFile").callsFake((path: number | PathLike, data: any) => {
      fileContent.set(path.toString(), data);
    });
    // mocker.stub(fs, "writeFile").resolves();
    sandbox.stub(fs, "writeJSON").callsFake((file: string, obj: any) => {
      fileContent.set(file, JSON.stringify(obj));
    });
    // Uses stub<any, any> to circumvent type check. Beacuse sinon fails to mock my target overload of readJson.
    sandbox.stub<any, any>(fs, "copy").resolves();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should generate manifest for azure tab", async () => {
    fileContent.clear();
    ctx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
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
      fileContent.get(`${ctx.root}/.${ConfigFolderName}/${REMOTE_MANIFEST}`)
    );
    chai.expect(manifest.staticTabs).to.deep.equal(STATIC_TABS_TPL);
    chai.expect(manifest.configurableTabs).to.deep.equal(CONFIGURABLE_TABS_TPL);
    chai
      .expect(manifest.bots, "Bots should be empty, because only tab is chosen")
      .to.deep.equal([]);
    chai
      .expect(
        manifest.composeExtensions,
        "ComposeExtensions should be empty, because only tab is chosen"
      )
      .to.deep.equal([]);
  });

  it("should generate manifest for bot", async () => {
    fileContent.clear();
    ctx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
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
      fileContent.get(`${ctx.root}/.${ConfigFolderName}/${REMOTE_MANIFEST}`)
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
    chai.expect(manifest.bots).to.deep.equal(BOTS_TPL);
    chai
      .expect(
        manifest.composeExtensions,
        "ComposeExtensions should be empty, because only bot is chosen"
      )
      .to.deep.equal([]);
  });

  it("should generate manifest for messaging extension", async () => {
    fileContent.clear();
    ctx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
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
      fileContent.get(`${ctx.root}/.${ConfigFolderName}/${REMOTE_MANIFEST}`)
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
    chai.expect(manifest.composeExtensions).to.deep.equal(COMPOSE_EXTENSIONS_TPL);
  });

  it("should generate manifest for tab, bot and messaging extension", async () => {
    fileContent.clear();
    ctx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
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
      fileContent.get(`${ctx.root}/.${ConfigFolderName}/${REMOTE_MANIFEST}`)
    );
    chai.expect(manifest.staticTabs).to.deep.equal(STATIC_TABS_TPL);
    chai.expect(manifest.configurableTabs).to.deep.equal(CONFIGURABLE_TABS_TPL);
    chai.expect(manifest.bots).to.deep.equal(BOTS_TPL);
    chai.expect(manifest.composeExtensions).to.deep.equal(COMPOSE_EXTENSIONS_TPL);
  });

  it("shouldn't generate manifest for SPFx project", async () => {
    fileContent.clear();
    ctx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
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
    const manifest = fileContent.get(`${ctx.root}/.${ConfigFolderName}/${REMOTE_MANIFEST}`);
    chai.expect(manifest).to.be.not.undefined;
  });
});
