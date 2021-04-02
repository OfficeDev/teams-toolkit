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
        it("happy path", async () => {
            const envPath = faker.system.filePath();
            const funcEnv = { defaultName: "httpTrigger", endpoint: faker.internet.url() };
            const runtimeEnv = { endpoint: faker.internet.url(), startLoginPageUrl: "start-login.html" };

            sinon.stub(fs, "ensureFile").resolves(Buffer.from(""));
            const appendFileStub = sinon.stub(fs, "appendFile");

            const args = [
                [envPath, `${EnvironmentVariables.FuncName}=${funcEnv.defaultName}\r\n`],
                [envPath, `${EnvironmentVariables.FuncEndpoint}=${funcEnv.endpoint}\r\n`],
                [envPath, `${EnvironmentVariables.RuntimeEndpoint}=${runtimeEnv.endpoint}\r\n`],
                [envPath, `${EnvironmentVariables.StartLoginPage}=${runtimeEnv.startLoginPageUrl}\r\n`],
            ];

            await FrontendProvision.setEnvironments(envPath, funcEnv, runtimeEnv);
            const calls = appendFileStub.getCalls();
            chai.assert.deepEqual(
                calls.map((call) => call.args as string[]),
                args,
            );
        });
    });
});
