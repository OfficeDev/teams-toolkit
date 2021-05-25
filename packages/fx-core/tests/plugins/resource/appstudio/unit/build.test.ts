// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import fs from "fs-extra";
import path from "path";
import { ConfigMap, PluginContext, TeamsAppManifest} from "@microsoft/teamsfx-api";
import { AppStudioPlugin } from "./../../../../../src/plugins/resource/appstudio";

describe("Build Teams Package", () => {
    let plugin: AppStudioPlugin;
    let ctx: PluginContext;

    beforeEach(async () => {
        plugin = new AppStudioPlugin();
        ctx = {
            root: "./",
            configOfOtherPlugins: new Map(),
            config: new ConfigMap(),
            app: new TeamsAppManifest()
        }
    })

    it("Build Teams Package", async () => {
        const manifestFile = path.resolve(__dirname, "./../resources/valid.manifest.json");
        const manifest = await fs.readJson(manifestFile);
        const manifestString = JSON.stringify(manifest);
        const appDirectory = path.resolve(__dirname, "./../resources/.fx");

        const builtPackage = await plugin.buildTeamsPackage(ctx, appDirectory, manifestString);
        chai.assert.isTrue(builtPackage.isOk());
        if (builtPackage.isOk()) {
            chai.assert.isNotEmpty(builtPackage.value);
            await fs.remove(builtPackage.value);
        }
    });
});
