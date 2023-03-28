// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";

import * as chai from "chai";
import fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as sinon from "sinon";
import * as util from "util";

import * as localizeUtils from "../../../../src/common/localizeUtils";
import { UnhandledSystemError } from "../../../../src/component/driver/file/error/unhandledError";
import { UpdateEnvDriver } from "../../../../src/component/driver/file/updateEnv";
import { DriverContext } from "../../../../src/component/driver/interface/commonArgs";
import { MockedLogProvider, MockedUserInteraction } from "../../../plugins/solution/util";
import { InvalidActionInputError } from "../../../../src/error/common";

describe("UpdateEnvDriver", () => {
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
  const driver = new UpdateEnvDriver();

  beforeEach(() => {
    sinon.stub(localizeUtils, "getDefaultString").callsFake((key, ...params) => {
      if (key === "error.yaml.InvalidActionInputError") {
        return util.format(
          "Following parameter is missing or invalid for %s action: %s.",
          ...params
        );
      } else if (key === "error.common.UnhandledError") {
        return util.format("Unhandled error happened in %s action: %s", ...params);
      } else if (key === "driver.file.summary.default") {
        return util.format(
          "The environment variables has been generated successfully to the .env file of '%s' environment.",
          ...params
        );
      } else if (key === "driver.file.summary.withTarget") {
        return util.format(
          "The environment variables has been generated successfully to %s.",
          ...params
        );
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
      it("invalid args: empty target", async () => {
        const args: any = {
          target: null,
          envs: {
            key: "value",
          },
        };
        const result = await driver.run(args, mockedDriverContext);
        chai.assert(result.isErr());
        if (result.isErr()) {
          chai.assert(result.error instanceof InvalidActionInputError);
        }
      });

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

      it("exception", async () => {
        sinon.stub(fs, "ensureFile").throws(new Error("exception"));
        const args: any = {
          target: "path",
          envs: {
            key1: "value1",
            key2: "value2",
          },
        };
        const result = await driver.run(args, mockedDriverContext);
        chai.assert(result.isErr());
        if (result.isErr()) {
          chai.assert(result.error instanceof UnhandledSystemError);
          const message = "Unhandled error happened in file/updateEnv action: exception.";
          chai.assert(result.error.message, message);
        }
      });

      it("happy path: without target", async () => {
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

      it("happy path: with target", async () => {
        const target = path.join(mockedDriverContext.projectPath, ".env.teamsfx.local");
        const existingEnvs = {
          existing1: "value1",
          existing2: "value2",
        };
        let content = Object.entries(existingEnvs)
          .map(([key, value]) => `${key}=${value}`)
          .join(os.EOL);
        sinon.stub(fs, "ensureFile").callsFake(async (path) => {
          if (path !== target) {
            content = "";
          }
        });
        sinon.stub(fs, "readFile").callsFake(async (path) => {
          if (path === target) {
            return Buffer.from(content);
          }
          return Buffer.from("");
        });
        sinon.stub(fs, "writeFile").callsFake(async (path, data) => {
          if (path === target) {
            content = data;
          }
        });
        const args: any = {
          target: ".env.teamsfx.local",
          envs: {
            key1: 10,
            key2: true,
            key3: "value3",
          },
        };
        const result = await driver.run(args, mockedDriverContext);
        chai.assert(result.isOk());
        if (result.isOk()) {
          chai.assert.equal(result.value.size, 0);
          const expectedEnvs = { ...existingEnvs, ...args.envs };
          const expectedContent = Object.entries(expectedEnvs)
            .map(([key, value]) => `${key}=${value}`)
            .join(os.EOL);
          chai.assert.equal(content, expectedContent);
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
      it("happy path: without target", async () => {
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
          "The environment variables has been generated successfully to the .env file of 'local' environment."
        );
      });

      it("happy path: with target", async () => {
        const target = path.join(mockedDriverContext.projectPath, ".env.teamsfx.local");
        const existingEnvs = {
          existing1: "value1",
          existing2: "value2",
        };
        let content = Object.entries(existingEnvs)
          .map(([key, value]) => `${key}=${value}`)
          .join(os.EOL);
        sinon.stub(fs, "ensureFile").callsFake(async (path) => {
          if (path !== target) {
            content = "";
          }
        });
        sinon.stub(fs, "readFile").callsFake(async (path) => {
          if (path === target) {
            return Buffer.from(content);
          }
          return Buffer.from("");
        });
        sinon.stub(fs, "writeFile").callsFake(async (path, data) => {
          if (path === target) {
            content = data;
          }
        });
        const args: any = {
          target: ".env.teamsfx.local",
          envs: {
            key1: 10,
            key2: true,
            key3: "value3",
          },
        };
        const executionResult = await driver.execute(args, mockedDriverContext);
        chai.assert(executionResult.result.isOk());
        if (executionResult.result.isOk()) {
          chai.assert.equal(executionResult.result.value.size, 0);
          const expectedEnvs = { ...existingEnvs, ...args.envs };
          const expectedContent = Object.entries(expectedEnvs)
            .map(([key, value]) => `${key}=${value}`)
            .join(os.EOL);
          chai.assert.equal(content, expectedContent);
        }
        chai.assert.equal(executionResult.summaries.length, 1);
        chai.assert.equal(
          executionResult.summaries[0],
          `The environment variables has been generated successfully to ${path.normalize(target)}.`
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
