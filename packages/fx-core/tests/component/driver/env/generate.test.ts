// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";

import * as chai from "chai";
import fs from "fs-extra";
import * as os from "os";
import * as sinon from "sinon";
import * as util from "util";

import * as localizeUtils from "../../../../src/common/localizeUtils";
import { InvalidParameterUserError } from "../../../../src/component/driver/env/error/invalidParameterUserError";
import { UnhandledSystemError } from "../../../../src/component/driver/env/error/unhandledError";
import { GenerateEnvDriver } from "../../../../src/component/driver/env/generate";
import { DriverContext } from "../../../../src/component/driver/interface/commonArgs";
import { MockedLogProvider } from "../../../plugins/solution/util";

describe("EnvGenerateDriver", () => {
  const mockedDriverContext = {
    logProvider: new MockedLogProvider(),
  } as DriverContext;
  const driver = new GenerateEnvDriver();

  beforeEach(() => {
    sinon.stub(localizeUtils, "getDefaultString").callsFake((key, ...params) => {
      if (key === "driver.env.error.invalidParameter") {
        return util.format(
          "Following parameter is missing or invalid for %s action: %s.",
          ...params
        );
      } else if (key === "driver.env.error.unhandledError") {
        return util.format("Unhandled error happened in %s action: %s", ...params);
      }
      return "";
    });
    sinon.stub(localizeUtils, "getLocalizedString").returns("");
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("run", () => {
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
        chai.assert(result.error instanceof InvalidParameterUserError);
        const message =
          "Following parameter is missing or invalid for env/generate action: target.";
        chai.assert.equal(result.error.message, message);
      }
    });

    it("invalid args: envs is not object", async () => {
      const args: any = {
        envs: "value",
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof InvalidParameterUserError);
        const message = "Following parameter is missing or invalid for env/generate action: envs.";
        chai.assert.equal(result.error.message, message);
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
        chai.assert(result.error instanceof InvalidParameterUserError);
        const message = "Following parameter is missing or invalid for env/generate action: envs.";
        chai.assert.equal(result.error.message, message);
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
        const message = "Unhandled error happened in env/generate action: exception.";
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
      const target = "path";
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
        target,
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
