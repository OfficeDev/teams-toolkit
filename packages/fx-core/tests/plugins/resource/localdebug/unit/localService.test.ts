// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as sinon from "sinon";

import AdmZip from "adm-zip";
import * as fs from "fs-extra";
import os from "os";
import * as path from "path";

import { prepareLocalAuthService } from "../../../../../src/plugins/resource/localdebug/util/localService";

chai.use(chaiAsPromised);

describe("localService", () => {
    const workspaceFolder = path.resolve(__dirname, "../data/");
    beforeEach(() => {
        fs.emptyDirSync(workspaceFolder);
    });

    describe("prepareLocalAuthService", () => {
        const fakeHomeDir = path.resolve(__dirname, "../data/.home/");

        beforeEach(() => {
            sinon.stub(os, "homedir").callsFake(() => fakeHomeDir);
            fs.emptyDirSync(fakeHomeDir);
        });

        afterEach(() => {
            sinon.restore();
        });

        it("happy path", async () => {
            fs.createFileSync(`${fakeHomeDir}/Microsoft.TeamsFxSimpleAuth.dll`);
            const zip = new AdmZip();
            zip.addLocalFile(`${fakeHomeDir}/Microsoft.TeamsFxSimpleAuth.dll`);
            zip.writeZip(`${fakeHomeDir}/test.zip`);

            const localAuthFolder = await prepareLocalAuthService(`${fakeHomeDir}/test.zip`);

            chai.assert.equal(localAuthFolder, `${fakeHomeDir}/.teamsfx/localauth`);
            chai.assert.isTrue(fs.pathExistsSync(`${localAuthFolder}/Microsoft.TeamsFxSimpleAuth.dll`));
        });

        it("dll exists", async() => {
            fs.createFileSync(`${fakeHomeDir}/.teamsfx/localauth/Microsoft.TeamsFxSimpleAuth.dll`);
            fs.createFileSync(`${fakeHomeDir}/test.dll`);
            const zip = new AdmZip();
            zip.addLocalFile(`${fakeHomeDir}/test.dll`);
            zip.writeZip(`${fakeHomeDir}/test.zip`);

            const localAuthFolder = await prepareLocalAuthService(`${fakeHomeDir}/test.zip`);

            chai.assert.equal(localAuthFolder, `${fakeHomeDir}/.teamsfx/localauth`);
            chai.assert.isTrue(fs.pathExistsSync(`${localAuthFolder}/Microsoft.TeamsFxSimpleAuth.dll`));
            chai.assert.isFalse(fs.pathExistsSync(`${fakeHomeDir}/.teamsfx/localauth/test.dll`));
        });
    });
});