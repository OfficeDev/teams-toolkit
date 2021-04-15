// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as fs from "fs-extra";
import * as path from "path";
import * as sinon from "sinon";
import AdmZip from "adm-zip";

import * as fetch from "../../../../../src/plugins/resource/function/utils/templates-fetch";
import { DependentPluginInfo, FunctionPluginInfo } from "../../../../../src/plugins/resource/function/constants";
import { FunctionPlugin } from "../../../../../src/plugins/resource/function/index";
import { FxResult } from "../../../../../src/plugins/resource/function/result";
import { FunctionLanguage, QuestionKey } from "../../../../../src/plugins/resource/function/enums";

const context: any = {
    configOfOtherPlugins: new Map<string, Map<string, string>>([
        [
            DependentPluginInfo.solutionPluginName,
            new Map<string, string>([
                [DependentPluginInfo.resourceGroupName, "ut"],
                [DependentPluginInfo.subscriptionId, "ut"],
                [DependentPluginInfo.resourceNameSuffix, "ut"],
                [DependentPluginInfo.programmingLanguage, "javascript"]
            ]),
        ],
    ]),
    app: {
        name: {
            short: "ut",
        },
    },
    config: new Map(),
    root: path.join(__dirname, "ut"),
};

describe(FunctionPluginInfo.pluginName, () => {
    describe("Function Scaffold Test", () => {
        afterEach(() => {
            fs.emptyDirSync(context.root);
            fs.rmdirSync(context.root);
            sinon.restore();
        });

        it("Test pre-scaffold without function name", async () => {
            // Arrange
            context.answers = new Map<string, string>();
            const plugin: FunctionPlugin = new FunctionPlugin();

            // Act
            const ret: FxResult = await plugin.preScaffold(context);

            // Assert
            chai.assert.isTrue(ret.isErr());
        });

        it("Test scaffold", async () => {
            // Arrange
            context.answers = new Map<string, string>([
                [QuestionKey.functionName, "httpTrigger"],
                [QuestionKey.programmingLanguage, FunctionLanguage.JavaScript],
            ]);
            const zip = new AdmZip();
            zip.addFile("test.js.tpl", Buffer.from("{{appName}} {{functionName}}"));
            sinon.stub(fetch, "getTemplateURL").resolves(undefined);
            sinon.stub(fetch, "fetchZipFromURL").resolves(zip);

            const plugin: FunctionPlugin = new FunctionPlugin();

            // Act
            await plugin.preScaffold(context);
            const ret: FxResult = await plugin.scaffold(context);

            // Assert
            chai.assert.isTrue(ret.isOk());
        });

        it("Test scaffold with additional function", async () => {
            // Arrange
            context.answers = new Map<string, string>([
                [QuestionKey.functionName, "httpTrigger"],
                [QuestionKey.programmingLanguage, FunctionLanguage.JavaScript],
            ]);
            const zip = new AdmZip();
            zip.addFile("test.js.tpl", Buffer.from("{{appName}} {{functionName}}"));
            sinon.stub(fetch, "getTemplateURL").resolves(undefined);
            sinon.stub(fetch, "fetchZipFromURL").resolves(zip);

            const plugin: FunctionPlugin = new FunctionPlugin();

            // Act
            await plugin.preScaffold(context);
            const ret: FxResult = await plugin.scaffold(context);

            // Assert
            chai.assert.isTrue(ret.isOk());
        });

        it("Test scaffold with fallback", async () => {
            // Arrange
            context.answers = new Map<string, string>([
                [QuestionKey.functionName, "httpTrigger"],
                [QuestionKey.programmingLanguage, FunctionLanguage.JavaScript],
            ]);
            const zip = new AdmZip();
            zip.addFile("test.js.tpl", Buffer.from("{{appName}} {{functionName}}"));
            sinon.stub(fetch, "getTemplateURL").rejects(new Error());
            sinon.stub(fs, "readFile").resolves(zip.toBuffer());

            const plugin: FunctionPlugin = new FunctionPlugin();

            // Act
            await plugin.preScaffold(context);
            const ret: FxResult = await plugin.scaffold(context);

            // Assert
            chai.assert.isTrue(ret.isOk());
        });
    });
});
