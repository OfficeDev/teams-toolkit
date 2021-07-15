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
  ok,
  err,
  Plugin,
} from "@microsoft/teamsfx-api";
import * as uuid from "uuid";
import fs from "fs-extra";
import sinon from "sinon";
import { AppStudioResultFactory } from "../../../../../src/plugins/resource/appstudio/results";

describe("Reload Manifest and Check Required Fields", () => {
  let plugin: AppStudioPlugin;
  let internalError_ctx: PluginContext;
  let ctx: PluginContext;
  let manifest: TeamsAppManifest;
  let BotPlugin: Plugin;
  let selectedPlugins: Plugin[];
  const sandbox = sinon.createSandbox();

  beforeEach(async () => {
    plugin = new AppStudioPlugin();
    internalError_ctx = {
      root: "./",
      configOfOtherPlugins: new Map(),
      config: new ConfigMap(),
      app: new TeamsAppManifest(),
    };
    internalError_ctx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
      },
    };

    ctx = {
      root: "./",
      configOfOtherPlugins: new Map(),
      config: new ConfigMap(),
      app: new TeamsAppManifest(),
    };
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
    manifest = new TeamsAppManifest();
    const botplugin: Plugin = new TeamsBot();
    BotPlugin = botplugin as Plugin;
    BotPlugin.name = "fx-resource-bot";
    BotPlugin.displayName = "Bot";
    selectedPlugins = [BotPlugin];
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should return maybeSelectedPlugins error", async () => {
    const createManifestForRemoteResult = await plugin.createManifestForRemote(
      ctx,
      err(
        AppStudioResultFactory.SystemError(
          AppStudioError.UnhandledError.name,
          AppStudioError.UnhandledError.message
        )
      ),
      manifest
    );
    chai.assert.isTrue(createManifestForRemoteResult.isErr());
    if (createManifestForRemoteResult.isErr()) {
      chai
        .expect(createManifestForRemoteResult._unsafeUnwrapErr().name)
        .equals(AppStudioError.UnhandledError.name);
    }
  });

  it("has no bot or messaging extension and should return error", async () => {
    const createManifestForRemoteResult = await plugin.createManifestForRemote(
      internalError_ctx,
      ok(selectedPlugins),
      manifest
    );
    chai.assert.isTrue(createManifestForRemoteResult.isErr());
    if (createManifestForRemoteResult.isErr()) {
      chai
        .expect(createManifestForRemoteResult._unsafeUnwrapErr().name)
        .equals(AppStudioError.InternalError.name);
    }
  });

  it("failed to get config for creating manifest and should return error", async () => {
    sandbox
      .stub(AppStudioPluginImpl.prototype, "getConfigForCreatingManifest" as any)
      .returns(
        err(
          AppStudioResultFactory.SystemError(
            AppStudioError.UnhandledError.name,
            AppStudioError.UnhandledError.message
          )
        )
      );
    const createManifestForRemoteResult = await plugin.createManifestForRemote(
      ctx,
      ok(selectedPlugins),
      manifest
    );

    chai.assert.isTrue(createManifestForRemoteResult.isErr());
    if (createManifestForRemoteResult.isErr()) {
      chai
        .expect(createManifestForRemoteResult._unsafeUnwrapErr().name)
        .equals(AppStudioError.UnhandledError.name);
    }
  });

  it("succeeded to return app definition and should return Ok for happy path", async () => {
    sandbox.stub(AppStudioPluginImpl.prototype, "getConfigForCreatingManifest" as any).returns(
      ok({
        tabEndpoint: "tabEndpoint",
        tabDomain: "tabDomain",
        aadId: uuid.v4(),
        botDomain: "botDomain",
        botId: uuid.v4(),
        webApplicationInfoResource: "webApplicationInfoResource",
      })
    );
    const createManifestForRemoteResult = await plugin.createManifestForRemote(
      ctx,
      ok(selectedPlugins),
      manifest
    );

    chai.assert.isTrue(createManifestForRemoteResult.isOk());
  });
});
