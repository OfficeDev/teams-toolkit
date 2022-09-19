// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import { expect } from "chai";
import { stub, restore, assert } from "sinon";
import rewire from "rewire";

import fs from "fs-extra";

import { TestHelper } from "../helper";

import { telemetryHelper } from "../../../../../src/component/resource/spfx/utils/telemetry-helper";
import { YoChecker } from "../../../../../src/component/resource/spfx/depsChecker/yoChecker";
import { LogProvider, LogLevel, Colors } from "@microsoft/teamsfx-api";

const ryc = rewire("../../../../../src/component/resource/spfx/depsChecker/yoChecker");

class StubLogger implements LogProvider {
  async log(logLevel: LogLevel, message: string): Promise<boolean> {
    return true;
  }

  async trace(message: string): Promise<boolean> {
    return true;
  }

  async debug(message: string): Promise<boolean> {
    return true;
  }

  async info(message: string | Array<{ content: string; color: Colors }>): Promise<boolean> {
    return true;
  }

  async warning(message: string): Promise<boolean> {
    return true;
  }

  async error(message: string): Promise<boolean> {
    return true;
  }

  async fatal(message: string): Promise<boolean> {
    return true;
  }
}

describe("Yo checker", () => {
  beforeEach(() => {
    stub(telemetryHelper, "sendSuccessEvent").callsFake(() => {
      console.log("success event");
      return;
    });
    stub(telemetryHelper, "sendErrorEvent").callsFake(() => {
      console.log("error event");
      return;
    });
  });

  afterEach(() => {
    restore();
  });

  it("get deps info", async () => {
    const deps = YoChecker.getDependencyInfo();
    expect(deps.supportedVersion).equals(ryc.__get__("supportedVersion"));
  });

  it("ensure deps - already installed", async () => {
    const yc = new YoChecker(new StubLogger());
    const pluginContext = TestHelper.getFakePluginContext("test", "./", "");
    stub(yc, "isInstalled").callsFake(async () => {
      return true;
    });
    const result = await yc.ensureDependency(pluginContext);
    expect(result.isOk()).is.true;
  });

  it("ensure deps - uninstalled", async () => {
    const yc = new YoChecker(new StubLogger());
    const pluginContext = TestHelper.getFakePluginContext("test", "./", "");
    stub(yc, "isInstalled").callsFake(async () => {
      return false;
    });

    stub(yc, "install").throwsException(new Error());

    const result = await yc.ensureDependency(pluginContext);
    expect(result.isOk()).is.false;
  });

  it("is installed", async () => {
    const yc = new YoChecker(new StubLogger());
    stub(fs, "pathExists").callsFake(async () => {
      console.log("stub pathExists");
      return true;
    });

    stub(YoChecker.prototype, <any>"queryVersion").callsFake(async () => {
      console.log("stub queryversion");
      return ryc.__get__("supportedVersion");
    });

    const result = await yc.isInstalled();
    expect(result).is.true;
  });

  it("install", async () => {
    const yc = new YoChecker(new StubLogger());
    const cleanStub = stub(YoChecker.prototype, <any>"cleanup").callsFake(async () => {
      console.log("stub cleanup");
      return;
    });
    const installStub = stub(YoChecker.prototype, <any>"installYo").callsFake(async () => {
      console.log("stub installyo");
      return;
    });
    const validateStub = stub(YoChecker.prototype, <any>"validate").callsFake(async () => {
      console.log("stub validate");
      return false;
    });

    try {
      await yc.install();
    } catch {
      assert.callCount(installStub, 1);
      assert.callCount(cleanStub, 2);
      assert.callCount(validateStub, 1);
    }
  });
});
