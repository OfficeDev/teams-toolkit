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
import { ConfigFolderName } from "@microsoft/teamsfx-api";

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
            fs.createFileSync(`${fakeHomeDir}/Microsoft.TeamsFx.SimpleAuth.dll`);
            const zip = new AdmZip();
            zip.addLocalFile(`${fakeHomeDir}/Microsoft.TeamsFx.SimpleAuth.dll`);
            zip.writeZip(`${fakeHomeDir}/test.zip`);

            const localAuthFolder = await prepareLocalAuthService(`${fakeHomeDir}/test.zip`);

            chai.assert.equal(localAuthFolder, `${fakeHomeDir}/.${ConfigFolderName}/localauth`);
            chai.assert.isTrue(fs.pathExistsSync(`${localAuthFolder}/Microsoft.TeamsFx.SimpleAuth.dll`));
        });

        it("version not match", async() => {
            fs.createFileSync(`${fakeHomeDir}/Microsoft.TeamsFx.SimpleAuth.dll`);
            fs.writeFileSync(`${fakeHomeDir}/version.txt`, "0.0.2", "utf8");
            fs.createFileSync(`${fakeHomeDir}/.${ConfigFolderName}/localauth-version.txt`);
            const zip = new AdmZip();
            zip.addLocalFile(`${fakeHomeDir}/Microsoft.TeamsFx.SimpleAuth.dll`);
            zip.writeZip(`${fakeHomeDir}/test.zip`);

            const localAuthFolder = await prepareLocalAuthService(`${fakeHomeDir}/test.zip`);

            chai.assert.equal(localAuthFolder, `${fakeHomeDir}/.${ConfigFolderName}/localauth`);
            chai.assert.isTrue(fs.pathExistsSync(`${localAuthFolder}/Microsoft.TeamsFx.SimpleAuth.dll`));
            chai.assert.equal(fs.readFileSync(`${fakeHomeDir}/.${ConfigFolderName}/localauth-version.txt`, "utf8").trim(), "0.0.2");
        });

        it("dll exists", async() => {
            fs.createFileSync(`${fakeHomeDir}/.${ConfigFolderName}/localauth/Microsoft.TeamsFx.SimpleAuth.dll`);
            fs.createFileSync(`${fakeHomeDir}/test.dll`);
            fs.writeFileSync(`${fakeHomeDir}/version.txt`, "0.0.1", "utf8");
            fs.writeFileSync(`${fakeHomeDir}/.${ConfigFolderName}/localauth-version.txt`, "0.0.1", "utf8");
            const zip = new AdmZip();
            zip.addLocalFile(`${fakeHomeDir}/test.dll`);
            zip.writeZip(`${fakeHomeDir}/test.zip`);

            const localAuthFolder = await prepareLocalAuthService(`${fakeHomeDir}/test.zip`);

            chai.assert.equal(localAuthFolder, `${fakeHomeDir}/.${ConfigFolderName}/localauth`);
            chai.assert.isTrue(fs.pathExistsSync(`${localAuthFolder}/Microsoft.TeamsFx.SimpleAuth.dll`));
            chai.assert.isFalse(fs.pathExistsSync(`${fakeHomeDir}/.${ConfigFolderName}/localauth/test.dll`));
        });
    });
});