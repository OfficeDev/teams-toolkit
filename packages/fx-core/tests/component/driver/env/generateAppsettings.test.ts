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
import { GenerateAppsettingsDriver } from "../../../../src/component/driver/env/appsettingsGenerate";
import { DriverContext } from "../../../../src/component/driver/interface/commonArgs";
import { MockedLogProvider } from "../../../plugins/solution/util";

describe("AppsettingsGenerateDriver", () => {
  const mockedDriverContext = {
    logProvider: new MockedLogProvider(),
  } as DriverContext;
  const driver = new GenerateAppsettingsDriver();

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
        appsettings: {
          BOT_ID: "BOT_ID",
          BOT_PASSWORD: "BOT_PASSWORD",
        },
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof InvalidParameterUserError);
        const message =
          "Following parameter is missing or invalid for appsettings/generate action: target.";
        chai.assert.equal(result.error.message, message);
      }
    });

    it("invalid args: appsettings is not object", async () => {
      const args: any = {
        target: "target",
        appsettings: "value",
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof InvalidParameterUserError);
        const message =
          "Following parameter is missing or invalid for appsettings/generate action: appsettings.";
        chai.assert.equal(result.error.message, message);
      }
    });

    it("exception", async () => {
      sinon.stub(fs, "ensureFile").throws(new Error("exception"));
      const args: any = {
        target: "path",
        appsettings: {
          BOT_ID: "BOT_ID",
          BOT_PASSWORD: "BOT_PASSWORD",
        },
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof UnhandledSystemError);
        const message = "Unhandled error happened in appsettings/generate action: exception.";
        chai.assert(result.error.message, message);
      }
    });

    it("happy path: with target", async () => {
      const target = "path";
      const appsettings = {
        BOT_ID: "$botId$",
        BOT_PASSWORD: "$bot-password$",
      };
      sinon.stub(fs, "ensureFile").callsFake(async (path) => {
        return;
      });
      sinon.stub(fs, "readFileSync").callsFake((path) => {
        return Buffer.from(JSON.stringify(appsettings));
      });
      sinon.stub(fs, "writeFile").callsFake(async (path, data) => {
        return;
      });
      const args: any = {
        target,
        appsettings: {
          BOT_ID: "BOT_ID",
          BOT_PASSWORD: "BOT_PASSWORD",
        },
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isOk());
    });
  });
});
