// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";

import * as chai from "chai";
import fs from "fs-extra";
import * as sinon from "sinon";
import * as util from "util";

import * as localizeUtils from "../../../../src/common/localizeUtils";
import { UpdateLaunchUrlInLaunchSettingsDriver } from "../../../../src/component/driver/file/updateLaunchUrlInLaunchSettings";
import { DriverContext } from "../../../../src/component/driver/interface/commonArgs";
import { MockedLogProvider, MockedM365Provider } from "../../../plugins/solution/util";
import { UpdateLaunchUrlInLaunchSettingsArgs } from "../../../../src/component/driver/file/interface/UpdateLaunchUrlInLaunchSettingsArgs";

describe("CreateOrUpdateJsonFileDriver", () => {
  const mockedDriverContext: any = {
    logProvider: new MockedLogProvider(),
    m365TokenProvider: new MockedM365Provider(),
  } as any;
  const driver = new UpdateLaunchUrlInLaunchSettingsDriver();
  let mockArgs: UpdateLaunchUrlInLaunchSettingsArgs = {
    target: "",
    profile: "",
    launchUrl: "",
    addLoginHint: false,
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
      target: "launchSettings.json",
      profile: "MyProfile",
      launchUrl: "http://localhost:3000",
      addLoginHint: false,
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should throw UserError if launch settings file does not exist", async () => {
    sinon.stub(fs, "pathExists").resolves(false);
    const result = await driver.run(mockArgs, mockedDriverContext);
    chai.assert(result.isErr());
  });

  it("should throw UserError if read launch settings file fail", async () => {
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFileSync").rejects(new Error("exception"));
    const result = await driver.run(mockArgs, mockedDriverContext);
    chai.assert(result.isErr());
  });

  it("should throw UserError if cannot find launchUrl in profile", async () => {
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFileSync").returns(
      JSON.stringify({
        profiles: {
          MyProfile: {
            test: "value",
          },
        },
      })
    );
    sinon.stub(fs, "writeFile").resolves();

    const result = await driver.run(mockArgs, mockedDriverContext);
    chai.assert(result.isErr());
  });

  it("should update launch URL in launch settings file", async () => {
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFileSync").returns(
      JSON.stringify({
        profiles: {
          MyProfile: {
            launchUrl: "http://localhost:5000",
          },
        },
      })
    );
    sinon.stub(fs, "writeFile").resolves();

    const result = await driver.run(mockArgs, mockedDriverContext);

    console.log(JSON.stringify(result));
    chai.assert(result.isOk());
  });

  it("should update launch URL in launch settings file and add loginhint", async () => {
    mockArgs.addLoginHint = true;
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFileSync").returns(
      JSON.stringify({
        profiles: {
          MyProfile: {
            launchUrl: "http://localhost:5000",
          },
        },
      })
    );
    sinon.stub(fs, "writeFile").resolves();

    const result = await driver.run(mockArgs, mockedDriverContext);

    chai.assert(result.isOk());
  });

  it("should throw UserError when cannot get m365 account in adding loginhint", async () => {
    const myMockedDriverContext: any = {
      logProvider: new MockedLogProvider(),
    } as any;
    mockArgs.addLoginHint = true;
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFileSync").returns(
      JSON.stringify({
        profiles: {
          MyProfile: {
            launchUrl: "http://localhost:5000",
          },
        },
      })
    );
    sinon.stub(fs, "writeFile").resolves();

    const result = await driver.run(mockArgs, myMockedDriverContext);

    chai.assert(result.isErr());
  });
});
