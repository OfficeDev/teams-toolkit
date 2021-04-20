// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";

import * as chai from "chai";
import * as sinon from "sinon";
import chaiAsPromised from "chai-as-promised";
import faker from "faker";
import fs from "fs-extra";

import { EnvironmentVariables } from "../../../../../src/plugins/resource/frontend/constants";
import { FrontendProvision } from "../../../../../src/plugins/resource/frontend/ops/provision";

chai.use(chaiAsPromised);

describe("FrontendProvision", () => {
    describe("setEnvironment", () => {
        let writeFileStub: sinon.SinonStub;

        beforeEach(() => {
            sinon.stub(fs, "ensureFile").resolves(Buffer.from(""));
            sinon.stub(fs, "readFile").resolves(Buffer.from(`${EnvironmentVariables.FuncName}=testFunc`));
            writeFileStub = sinon.stub(fs, "writeFile") as any;
        });

        afterEach(() => {
            sinon.restore();
        });

        it("overwrite .env", async () => {
            const envPath = faker.system.filePath();
            const funcEnv = { defaultName: "httpTrigger", endpoint: faker.internet.url() };
            const runtimeEnv = { endpoint: faker.internet.url(), startLoginPageUrl: "start-login.html" };

            const args = [envPath,
                `${EnvironmentVariables.FuncName}=${funcEnv.defaultName}\r\n` +
                `${EnvironmentVariables.FuncEndpoint}=${funcEnv.endpoint}\r\n` +
                `${EnvironmentVariables.RuntimeEndpoint}=${runtimeEnv.endpoint}\r\n` +
                `${EnvironmentVariables.StartLoginPage}=${runtimeEnv.startLoginPageUrl}\r\n`];

            await FrontendProvision.setEnvironments(envPath, funcEnv, runtimeEnv);
            const call = writeFileStub.getCall(0);
            chai.assert.deepEqual(
                call.args,
                args,
            );
        });
    });
});
