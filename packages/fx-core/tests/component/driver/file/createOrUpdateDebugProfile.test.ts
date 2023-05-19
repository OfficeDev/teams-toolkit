// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";

import * as chai from "chai";
import fs from "fs-extra";
import * as commentJson from "comment-json";
import * as sinon from "sinon";
import * as util from "util";

import * as localizeUtils from "../../../../src/common/localizeUtils";
import { CreateOrUpdateDebugProfileDriver } from "../../../../src/component/driver/file/createOrUpdateDebugProfile";
import { DriverContext } from "../../../../src/component/driver/interface/commonArgs";
import { MockedLogProvider, MockedM365Provider } from "../../../plugins/solution/util";
import { CreateOrUpdateDebugProfileArgs } from "../../../../src/component/driver/file/interface/createOrUpdateDebugProfileArgs";

describe("CreateOrUpdateJsonFileDriver", () => {
  const mockedDriverContext: any = {
    logProvider: new MockedLogProvider(),
    m365TokenProvider: new MockedM365Provider(),
  } as any;
  const driver = new CreateOrUpdateDebugProfileDriver();
  let mockArgs: CreateOrUpdateDebugProfileArgs = {
    name: "",
    appId: "",
    loginHint: undefined,
    host: undefined,
  };

  beforeEach(() => {
    sinon.stub(localizeUtils, "getDefaultString").callsFake((key, ...params) => {
      if (key === "error.yaml.InvalidActionInputError") {
        return util.format("error.yaml.InvalidActionInputError. %s. %s.", ...params);
      } else if (key === "error.common.UnhandledError") {
        return util.format("error.common.UnhandledError. %s. %s", ...params);
      }
      return "";
    });
    sinon.stub(localizeUtils, "getLocalizedString").returns("");
    mockArgs = {
      name: "MyProfile",
      appId: "${{TEAMS_APP_ID}}",
      loginHint: undefined,
      host: undefined,
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should throw a UserError if the launch settings file is invalid", async () => {
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFile").resolves(Buffer.from("invalid"));
    const result = await driver.run(mockArgs, mockedDriverContext);
    chai.assert(result.isErr());
  });

  it("should throw a UserError if the launch settings file is an array", async () => {
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFile").resolves(Buffer.from("[]"));
    const result = await driver.run(mockArgs, mockedDriverContext);
    chai.assert(result.isErr());
  });

  it("should update launch URL in launch settings file", async () => {
    mockArgs = {
      name: "MyProfile",
      appId: "${{TEAMS_APP_ID}}",
      loginHint: false,
      host: undefined,
    };
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFile").resolves(
      Buffer.from(
        JSON.stringify({
          profiles: {
            MyProfile: {
              launchUrl: "http://localhost:5000",
            },
          },
        })
      )
    );
    sinon.stub(fs, "writeFile").resolves();

    const result = await driver.run(mockArgs, mockedDriverContext);
    console.log(result);
    chai.assert(result.isOk());
  });

  it("should create a new launch settings file", async () => {
    mockArgs = {
      name: "MyProfile",
      appId: "${{TEAMS_APP_ID}}",
      loginHint: false,
      host: undefined,
    };
    sinon.stub(fs, "pathExists").resolves(false);
    sinon.stub(fs, "readFile").resolves(Buffer.from(JSON.stringify({})));
    sinon.stub(fs, "writeFile").resolves();

    const result = await driver.run(mockArgs, mockedDriverContext);
    chai.assert(result.isOk());
  });

  it("should update launch URL in launch settings file and add loginhint", async () => {
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFile").resolves(
      Buffer.from(
        JSON.stringify({
          profiles: {
            MyProfile: {
              launchUrl: "http://localhost:5000",
            },
          },
        })
      )
    );
    sinon.stub(fs, "writeFile").resolves();

    const result = await driver.run(mockArgs, mockedDriverContext);

    chai.assert(result.isOk());
  });

  it("should throw UserError when cannot get m365 account in adding loginhint", async () => {
    const myMockedDriverContext: any = {
      logProvider: new MockedLogProvider(),
    } as any;
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFile").resolves(
      Buffer.from(
        JSON.stringify({
          profiles: {
            MyProfile: {
              launchUrl: "http://localhost:5000",
            },
          },
        })
      )
    );
    sinon.stub(fs, "writeFile").resolves();

    const result = await driver.run(mockArgs, myMockedDriverContext);
    chai.assert(result.isErr());
  });
});
