import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";

import { LocalEnvProvider } from "../../../../../src/plugins/resource/localdebug/localEnv";
import { LocalEnvFrontendKeys, LocalEnvBackendKeys, LocalEnvAuthKeys, LocalEnvBotKeys } from "../../../../../src/plugins/resource/localdebug/constants";
import { ConfigFolderName } from "fx-api";

chai.use(chaiAsPromised);

describe("LocalEnvProvider", ()=> {
    const workspaceFolder = path.resolve(__dirname, "../data/");
    const testFilePath = path.resolve(__dirname, `../data/.${ConfigFolderName}/local.env`);
    const testContent = `ENV1=foo${os.EOL}ENV2=bar${os.EOL}`;

    describe("loadLocalEnv", () => {
        let localEnvProvider: LocalEnvProvider;

        beforeEach(() => {
            localEnvProvider = new LocalEnvProvider(workspaceFolder);
            fs.emptyDirSync(workspaceFolder);
        });

        it("happy path", async () => {
            fs.createFileSync(testFilePath);
            fs.writeFileSync(testFilePath, testContent);

            const envs = await localEnvProvider.loadLocalEnv(true, false, false);

            chai.assert.isDefined(envs);
            chai.assert.equal(Object.keys(envs).length, 2);
            chai.assert.equal(envs["ENV1"], "foo");
            chai.assert.equal(envs["ENV2"], "bar");
        });

        it("empty file", async () => {
            fs.createFileSync(testFilePath);

            const envs = await localEnvProvider.loadLocalEnv(true, false, false);

            chai.assert.isDefined(envs);
            chai.assert.equal(Object.keys(envs).length, 0);
        });

        it("save then load", async () => {
            const expectedEnvs = {
                "ENV_A": "foo-a",
                "ENV_B": "bar-b"
            };
            await localEnvProvider.saveLocalEnv(expectedEnvs);

            const actualEnvs = await localEnvProvider.loadLocalEnv(true, false, false);

            chai.assert.deepEqual(actualEnvs, expectedEnvs);
        });

        it("no env file", async () => {
            const actualEnvs = await localEnvProvider.loadLocalEnv(true, true, true);

            chai.assert.isDefined(actualEnvs);
            const actualEntries = Object.entries(actualEnvs);
            const expectedKeys = Object.values(LocalEnvFrontendKeys)
                .concat(Object.values(LocalEnvAuthKeys)
                .concat(Object.values(LocalEnvBackendKeys)))
                .concat(Object.values(LocalEnvBotKeys));
            chai.assert.equal(actualEntries.length, expectedKeys.length);
            for (const key of expectedKeys) {
                chai.assert.isDefined(actualEnvs[key]);
            }
        });
    });

    describe("saveLocalEnv", () => {
        let localEnvProvider: LocalEnvProvider;

        beforeEach(() => {
            localEnvProvider = new LocalEnvProvider(workspaceFolder);
            fs.emptyDirSync(workspaceFolder);
        });

        it("happy path", async () => {
            const envs = {
                "ENV1": "foo",
                "ENV2": "bar"
            };

            await localEnvProvider.saveLocalEnv(envs);
            
            chai.assert.isTrue(fs.pathExistsSync(testFilePath));
            const actualContent = fs.readFileSync(testFilePath, "utf8");
            chai.assert.equal(actualContent, testContent);
        });

        it("empty envs", async () => {
            await localEnvProvider.saveLocalEnv({});
            
            chai.assert.isTrue(fs.pathExistsSync(testFilePath));
            const actualContent = fs.readFileSync(testFilePath, "utf8");
            chai.assert.isEmpty(actualContent);
        });

        it("undefined envs", async () => {
            await localEnvProvider.saveLocalEnv(undefined);
            
            chai.assert.isTrue(fs.pathExistsSync(testFilePath));
            const actualContent = fs.readFileSync(testFilePath, "utf8");
            chai.assert.isEmpty(actualContent);
        });
    });

    describe("initialLocalEnvs", () => {
        let localEnvProvider: LocalEnvProvider;

        beforeEach(() => {
            localEnvProvider = new LocalEnvProvider(workspaceFolder);
            fs.emptyDirSync(workspaceFolder);
        });

        it("tab include backend", async () => {
            const initLocalEnvs = localEnvProvider.initialLocalEnvs(true, true, false);
            
            chai.assert.isDefined(initLocalEnvs);
            const actualEntries = Object.entries(initLocalEnvs);
            const expectedKeys = Object.values(LocalEnvFrontendKeys)
                .concat(Object.values(LocalEnvAuthKeys)
                .concat(Object.values(LocalEnvBackendKeys)));
            chai.assert.equal(actualEntries.length, expectedKeys.length);
            for (const key of expectedKeys) {
                chai.assert.isDefined(initLocalEnvs[key]);
            }
        });

        it("tab exclude backend", async () => {
            const initLocalEnvs = localEnvProvider.initialLocalEnvs(true, false, false);
            
            chai.assert.isDefined(initLocalEnvs);
            const actualEntries = Object.entries(initLocalEnvs);
            const expectedKeys = Object.values(LocalEnvFrontendKeys)
                .concat(Object.values(LocalEnvAuthKeys));
            chai.assert.equal(actualEntries.length, expectedKeys.length);
            for (const key of expectedKeys) {
                chai.assert.isDefined(initLocalEnvs[key]);
            }
        });

        it("bot", async () => {
            const initLocalEnvs = localEnvProvider.initialLocalEnvs(false, false, true);
            
            chai.assert.isDefined(initLocalEnvs);
            const actualEntries = Object.entries(initLocalEnvs);
            const expectedKeys = Object.values(LocalEnvBotKeys);
            chai.assert.equal(actualEntries.length, expectedKeys.length);
            for (const key of expectedKeys) {
                chai.assert.isDefined(initLocalEnvs[key]);
            }
        });
    });
});