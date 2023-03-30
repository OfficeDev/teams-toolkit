// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";

import * as chai from "chai";
import fs from "fs-extra";
import * as sinon from "sinon";
import * as util from "util";

import * as localizeUtils from "../../../../src/common/localizeUtils";
import { UpdateJsonDriver } from "../../../../src/component/driver/file/updateJson";
import { DriverContext } from "../../../../src/component/driver/interface/commonArgs";
import { MockedLogProvider } from "../../../plugins/solution/util";
import { InvalidActionInputError } from "../../../../src/error/common";

describe("UpdateJsonDriver", () => {
  const mockedDriverContext = {
    logProvider: new MockedLogProvider(),
  } as DriverContext;
  const driver = new UpdateJsonDriver();

  beforeEach(() => {
    sinon.stub(localizeUtils, "getDefaultString").callsFake((key, ...params) => {
      if (key === "error.yaml.InvalidActionInputError") {
        return util.format(
          "Following parameter is missing or invalid for %s action: %s.",
          ...params
        );
      } else if (key === "error.common.UnhandledError") {
        return util.format(
          'An unexpected error has occurred while performing the %s task. The reason for this error is: %s. Welcome to report this issue by clicking on the provided "Issue Link", so that we can investigate and resolve the problem as soon as possible.',
          ...params
        );
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
        chai.assert(result.error instanceof InvalidActionInputError);
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
        chai.assert(result.error instanceof InvalidActionInputError);
      }
    });

    it("exception", async () => {
      sinon.stub(fs, "pathExists").rejects(new Error("exception"));
      sinon.stub(fs, "existsSync").throws(new Error("exception"));
      const args: any = {
        target: "path",
        appsettings: {
          BOT_ID: "BOT_ID",
          BOT_PASSWORD: "BOT_PASSWORD",
        },
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isErr());
    });

    it("happy path: with target", async () => {
      const target = "path";
      let content = {};
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
        content = data;
        return;
      });
      sinon.stub(fs, "pathExists").resolves(true);
      sinon.stub(fs, "existsSync").callsFake((path) => {
        return true;
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
      if (result.isOk()) {
        chai.assert.equal('{\n\t"BOT_ID": "BOT_ID",\n\t"BOT_PASSWORD": "BOT_PASSWORD"\n}', content);
      }
    });

    it("happy path: execute with target", async () => {
      const target = "path";
      let content = {};
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
        content = data;
        return;
      });
      sinon.stub(fs, "pathExists").resolves(true);
      sinon.stub(fs, "existsSync").callsFake((path) => {
        return true;
      });
      const args: any = {
        target,
        appsettings: {
          BOT_ID: "BOT_ID",
          BOT_PASSWORD: "BOT_PASSWORD",
        },
      };
      const result = await driver.execute(args, mockedDriverContext);
      chai.assert(result.result.isOk());
      if (result.result.isOk()) {
        chai.assert.equal('{\n\t"BOT_ID": "BOT_ID",\n\t"BOT_PASSWORD": "BOT_PASSWORD"\n}', content);
      }
    });

    it("happy path: with target and customized data", async () => {
      const target = "path";
      let content = {};
      const appsettings = {
        Foo: "Bar",
        My: {
          BOT_ID: "$botId$",
          Foo: "Bar",
        },
      };
      sinon.stub(fs, "ensureFile").callsFake(async (path) => {
        return;
      });
      sinon.stub(fs, "readFileSync").callsFake((path) => {
        return Buffer.from(JSON.stringify(appsettings));
      });
      sinon.stub(fs, "writeFile").callsFake(async (path, data) => {
        content = data;
        return;
      });
      sinon.stub(fs, "pathExists").resolves(true);
      sinon.stub(fs, "existsSync").callsFake((path) => {
        return true;
      });
      const args: any = {
        target,
        appsettings: {
          My: {
            BOT_ID: "BOD_ID",
          },
        },
      };
      const result = await driver.run(args, mockedDriverContext);
      chai.assert(result.isOk());
      if (result.isOk()) {
        chai.assert.equal(
          '{\n\t"Foo": "Bar",\n\t"My": {\n\t\t"BOT_ID": "BOD_ID",\n\t\t"Foo": "Bar"\n\t}\n}',
          content
        );
      }
    });

    it("happy path: with appsettings.json", async () => {
      const target = "path";
      let content = {};
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
        content = data;
        return;
      });
      sinon.stub(fs, "pathExists").callsFake(async (path: fs.PathLike) => {
        if (path.toString().indexOf(target) >= 0) {
          return false;
        }
        return true;
      });
      sinon.stub(fs, "existsSync").callsFake((path) => {
        if (path.toString().indexOf(target) >= 0) {
          return false;
        }
        return true;
      });
      sinon.stub(fs, "copyFile").callsFake(async (p1, p2) => {
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
      if (result.isOk()) {
        chai.assert.equal('{\n\t"BOT_ID": "BOT_ID",\n\t"BOT_PASSWORD": "BOT_PASSWORD"\n}', content);
      }
    });
  });

  it("happy path: without appsettings.json", async () => {
    const target = "path";
    let content = {};
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
      content = data;
      return;
    });
    sinon.stub(fs, "pathExists").resolves(false);
    sinon.stub(fs, "existsSync").callsFake((path) => {
      return false;
    });
    sinon.stub(fs, "copyFile").callsFake(async (p1, p2) => {
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
    if (result.isOk()) {
      chai.assert.equal('{\n\t"BOT_ID": "BOT_ID",\n\t"BOT_PASSWORD": "BOT_PASSWORD"\n}', content);
    }
  });
});
