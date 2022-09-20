// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import mockedEnv from "mocked-env";
import rewire from "rewire";
import fs from "fs-extra";
import * as chai from "chai";
import { stub, restore } from "sinon";
import { GeneratorChecker } from "../../../../../src/plugins/resource/spfx/depsChecker/generatorChecker";
import { telemetryHelper } from "../../../../../src/plugins/resource/spfx/utils/telemetry-helper";
import { Colors, LogLevel, LogProvider } from "@microsoft/teamsfx-api";
import { TestHelper } from "../helper";

const rGeneratorChecker = rewire(
  "../../../../../src/plugins/resource/spfx/depsChecker/generatorChecker"
);

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

describe("generator checker", () => {
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

  describe("getDependencyInfo", async () => {
    it("Set SPFx version to 1.15", () => {
      const mockedEnvRestore = mockedEnv({ TEAMSFX_SPFX_VERSIOIN: "1.15.0" });
      const info = GeneratorChecker.getDependencyInfo();

      chai.expect(info).to.be.deep.equal({
        supportedVersion: "1.15.0",
        displayName: "@microsoft/generator-sharepoint@1.15.0",
      });
      mockedEnvRestore();
    });

    it("Set SPFx version to 1.16-beta", () => {
      const mockedEnvRestore = mockedEnv({ TEAMSFX_SPFX_VERSIOIN: "1.16.0-beta.1" });
      const info = GeneratorChecker.getDependencyInfo();

      chai.expect(info).to.be.deep.equal({
        supportedVersion: "1.16.0-beta.1",
        displayName: "@microsoft/generator-sharepoint@1.16.0-beta.1",
      });
      mockedEnvRestore();
    });

    it("By default is 1.15 if undefined", () => {
      const mockedEnvRestore = mockedEnv({ TEAMSFX_SPFX_VERSIOIN: undefined });
      const info = GeneratorChecker.getDependencyInfo();

      chai.expect(info).to.be.deep.equal({
        supportedVersion: "1.15.0",
        displayName: "@microsoft/generator-sharepoint@1.15.0",
      });
      mockedEnvRestore();
    });

    it("ensure deps - already installed", async () => {
      const generatorChecker = new GeneratorChecker(new StubLogger());
      const pluginContext = TestHelper.getFakePluginContext("test", "./", "");
      stub(generatorChecker, "isInstalled").callsFake(async () => {
        return true;
      });
      const result = await generatorChecker.ensureDependency(pluginContext);
      chai.expect(result.isOk()).is.true;
    });

    it("ensure deps - uninstalled", async () => {
      const generatorChecker = new GeneratorChecker(new StubLogger());
      const pluginContext = TestHelper.getFakePluginContext("test", "./", "");
      stub(generatorChecker, "isInstalled").callsFake(async () => {
        return false;
      });

      stub(generatorChecker, "install").throwsException(new Error());

      const result = await generatorChecker.ensureDependency(pluginContext);
      chai.expect(result.isOk()).is.false;
    });

    it("ensure deps -  install", async () => {
      const generatorChecker = new GeneratorChecker(new StubLogger());
      const pluginContext = TestHelper.getFakePluginContext("test", "./", "");
      stub(generatorChecker, "isInstalled").callsFake(async () => {
        return false;
      });

      stub(generatorChecker, "install");

      const result = await generatorChecker.ensureDependency(pluginContext);
      chai.expect(result.isOk()).is.true;
    });

    it("is installed", async () => {
      const generatorChecker = new GeneratorChecker(new StubLogger());
      stub(fs, "pathExists").callsFake(async () => {
        console.log("stub pathExists");
        return true;
      });

      stub(GeneratorChecker.prototype, <any>"queryVersion").callsFake(async () => {
        console.log("stub queryversion");
        return rGeneratorChecker.__get__("supportedVersion");
      });

      const result = await generatorChecker.isInstalled();
      chai.expect(result).is.true;
    });

    it("install", async () => {
      const generatorChecker = new GeneratorChecker(new StubLogger());
      const cleanStub = stub(GeneratorChecker.prototype, <any>"cleanup").callsFake(async () => {
        console.log("stub cleanup");
        return;
      });
      const installStub = stub(GeneratorChecker.prototype, <any>"installGenerator").callsFake(
        async () => {
          console.log("stub installyo");
          return;
        }
      );
      const validateStub = stub(GeneratorChecker.prototype, <any>"validate").callsFake(async () => {
        console.log("stub validate");
        return false;
      });

      try {
        await generatorChecker.install();
      } catch {
        chai.expect(installStub.callCount).equal(1);
        chai.expect(cleanStub.callCount).equal(2);
      }
    });
  });
});
