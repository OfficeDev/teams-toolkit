// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import * as tools from "../../../../src/common/tools";
import { TestAzureAccountProvider } from "../../util/azureAccountMock";
import { TestLogProvider } from "../../util/logProviderMock";
import { DriverContext } from "../../../../src/component/driver/interface/commonArgs";
import { scriptDriver } from "../../../../src/component/driver/script/scriptDriver";
import { assert } from "chai";
import { MockUserInteraction } from "../../../core/utils";

describe("Script Driver test", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.stub(tools, "waitSeconds").resolves();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("set output", async () => {
    const args = {
      workingDirectory: "./",
      run: "::set-output KEY=VALUE",
    };
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
      projectPath: "./",
    } as DriverContext;
    const res = await scriptDriver.executeCommand(args, context);
    chai.assert.equal(res.isOk(), true);
    if (res.isOk()) {
      const output = res.value[1];
      assert.deepEqual(output, { KEY: "VALUE" });
    }
  });
});
