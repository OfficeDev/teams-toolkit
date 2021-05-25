// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import sinon from "sinon";
import fs from "fs-extra";
import path from "path";
import { v4 as uuid } from "uuid";
import { ConfigMap, PluginContext, ok } from "@microsoft/teamsfx-api";
import { AppStudioPlugin } from "./../../../../../src/plugins/resource/appstudio";
import { AppStudioClient } from "./../../../../../src/plugins/resource/appstudio/appStudio";
import { PublishingState } from "./../../../../../src/plugins/resource/appstudio/interfaces/IPublishingAppDefinition";
import { AppStudio } from "./../../../../../src/plugins/solution/fx-solution/appstudio/appstudio";
import { mockTokenProvider } from "./../../aad/helper";
import { mockDialogProvider } from "./../helper";

describe("Publish Teams app", () => {
    let plugin: AppStudioPlugin;
    let ctx: PluginContext;
    const appPackagePath = path.resolve(__dirname, "./../resources/.fx/appPackage.zip");

    beforeEach(async () => {
        const manifestFile = path.resolve(__dirname, "./../resources/valid.manifest.json");
        const manifest = await fs.readJson(manifestFile);

        plugin = new AppStudioPlugin();
        ctx = {
            root: path.resolve(__dirname, "./../resources"),
            configOfOtherPlugins: new Map(),
            config: new ConfigMap(),
            app: manifest,
            appStudioToken: mockTokenProvider()
        };
        sinon.stub(AppStudioClient, "validateManifest").resolves([]);
        sinon.stub(AppStudioClient, "publishTeamsApp").resolves(uuid());
        sinon.stub(AppStudioClient, "publishTeamsAppUpdate").resolves(uuid());
        sinon.stub(AppStudio, "updateApp").resolves();
    })

    afterEach(async() => {
        sinon.restore();
        if (await fs.pathExists(appPackagePath)) {
            await fs.remove(appPackagePath);
        }
    })

    it("Publish teams app", async () => {
        sinon.stub(AppStudioClient, "getAppByTeamsAppId").resolves(undefined);
        const teamsAppId = await plugin.publish(ctx);
        chai.assert.isTrue(teamsAppId.isOk());
        if (teamsAppId.isOk()) {
            chai.assert.isNotEmpty(teamsAppId.value);
        }
    });

    it("Update a submitted app", async () => {
        const mockApp = {
            lastModifiedDateTime: null,
            publishingState: PublishingState.submitted,
            teamsAppId: uuid(),
            displayName: "TestApp"
        };
        sinon.stub(AppStudioClient, "getAppByTeamsAppId").resolves(mockApp);
        ctx.dialog = mockDialogProvider;

        const teamsAppId = await plugin.publish(ctx);
        chai.assert.isTrue(teamsAppId.isOk());
        if (teamsAppId.isOk()) {
            chai.assert.isNotEmpty(teamsAppId.value);
        }
    });
});
