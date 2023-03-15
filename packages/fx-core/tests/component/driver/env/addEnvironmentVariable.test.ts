// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";

import * as chai from "chai";
import * as sinon from "sinon";
import * as util from "util";

import * as localizeUtils from "../../../../src/common/localizeUtils";
import { AddEnvironmentVariableDriver } from "../../../../src/component/driver/env/addEnvironmentVariable";
import { DriverContext } from "../../../../src/component/driver/interface/commonArgs";
import { MockedLogProvider, MockedUserInteraction } from "../../../plugins/solution/util";
import { InvalidActionInputError } from "../../../../src/error/common";

describe("AddEnvironmentVariableDriver", () => {
  const mockedDriverContexts = [
    {
      logProvider: new MockedLogProvider(),
      projectPath: "/path/to/project",
      ui: new MockedUserInteraction(),
    } as DriverContext,
    {
      projectPath: "/path/to/project",
    } as DriverContext,
  ];
  const driver = new AddEnvironmentVariableDriver();

  beforeEach(() => {
    sinon.stub(localizeUtils, "getDefaultString").callsFake((key, ...params) => {
      if (key === "driver.file.error.invalidParameter") {
        return util.format("driver.file.error.invalidParameter. %s. %s.", ...params);
      } else if (key === "driver.file.error.unhandledError") {
        return util.format("driver.file.error.unhandledError. %s. %s.", ...params);
      } else if (key === "driver.env.addEnvironmentVariable.description") {
        return "driver.env.addEnvironmentVariable.description.";
      } else if (key === "driver.env.addEnvironmentVariable.summary") {
        return util.format("driver.env.addEnvironmentVariable.summary. %s.", ...params);
      }
      return "";
    });
    sinon
      .stub(localizeUtils, "getLocalizedString")
      .callsFake((key, ...params) => localizeUtils.getDefaultString(key, ...params));
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("run", () => {
    for (const mockedDriverContext of mockedDriverContexts) {
      it("invalid args: envs is not object", async () => {
        const args: any = {
          envs: "value",
        };
        const result = await driver.run(args, mockedDriverContext);
        chai.assert(result.isErr());
        if (result.isErr()) {
          chai.assert(result.error instanceof InvalidActionInputError);
        }
      });

      it("invalid args: envs is not key value pairs", async () => {
        const args: any = {
          envs: {
            key1: "value1",
            key2: {
              key3: "value3",
            },
          },
        };
        const result = await driver.run(args, mockedDriverContext);
        chai.assert(result.isErr());
        if (result.isErr()) {
          chai.assert(result.error instanceof InvalidActionInputError);
        }
      });

      it("happy path: output envs", async () => {
        const args: any = {
          envs: {
            key1: 10,
            key2: true,
            key3: "value3",
          },
        };
        const result = await driver.run(args, mockedDriverContext);
        chai.assert(result.isOk());
        if (result.isOk()) {
          chai.assert(equal(args.envs, result.value));
        }
      });
    }
  });

  describe("execute", () => {
    beforeEach(() => {
      process.env.TEAMSFX_ENV = "local";
    });

    afterEach(() => {
      delete process.env.TEAMSFX_ENV;
    });

    for (const mockedDriverContext of mockedDriverContexts) {
      it("happy path: output envs", async () => {
        const args: any = {
          envs: {
            key1: 10,
            key2: true,
            key3: "value3",
          },
        };
        const executionResult = await driver.execute(args, mockedDriverContext);
        chai.assert(executionResult.result.isOk());
        if (executionResult.result.isOk()) {
          chai.assert(equal(args.envs, executionResult.result.value));
        }
        chai.assert.equal(executionResult.summaries.length, 1);
        chai.assert.equal(
          executionResult.summaries[0],
          "driver.env.addEnvironmentVariable.summary. local."
        );
      });
    }
  });
});

function equal(input: Record<string, any>, output: Map<string, string>): boolean {
  if (Object.keys(input).length !== output.size) {
    return false;
  }
  for (const [key, value] of Object.entries(input)) {
    if (output.get(key) !== value) {
      return false;
    }
  }
  return true;
}
