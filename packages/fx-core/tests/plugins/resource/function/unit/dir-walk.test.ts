// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as fs from "fs-extra";
import * as path from "path";

import { FunctionPluginInfo } from "../../../../../src/plugins/resource/function/constants";
import { forEachFileAndDir } from "../../../../../src/plugins/resource/function/utils/dir-walk";

const root = path.join(__dirname, "ut");

describe(FunctionPluginInfo.pluginName, async () => {
    after(() => {
        fs.emptyDirSync(root);
        fs.rmdirSync(root);
    });

    describe("DirWalk Test", async () => {
        it("Test dir-walk", async () => {
            // Arrange
            await fs.ensureDir(root);
            await fs.writeFile(path.join(root, "ut-file"), "ut-file");
            const collect: string[] = [];

            // Act
            await forEachFileAndDir(root, (p, stats) => {
                if (!stats.isDirectory()) {
                    collect.push(p);
                }
            });

            // Assert
            chai.assert.deepEqual(collect.length, 1);
            chai.assert.deepEqual(path.basename(collect[0]), "ut-file");
        });
    });
});
