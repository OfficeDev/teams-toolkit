// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import mockedEnv from "mocked-env";
import rewire from "rewire";
import fs from "fs-extra";
import chai from "chai";
import { stub, restore } from "sinon";
import { GeneratorChecker } from "../../../../../src/component/resource/spfx/depsChecker/generatorChecker";
import { telemetryHelper } from "../../../../../src/component/resource/spfx/utils/telemetry-helper";
import { Colors, LogLevel, LogProvider, UserError } from "@microsoft/teamsfx-api";
import { TestHelper } from "../helper";
import { cpUtils } from "../../../../../src/common/deps-checker/util/cpUtils";
import { createContextV3 } from "../../../../../src/component/utils";

const rGeneratorChecker = rewire(
  "../../../../../src/component/resource/spfx/depsChecker/generatorChecker"
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
      const info = GeneratorChecker.getDependencyInfo();

      chai.expect(info).to.be.deep.equal({
        supportedVersion: "1.16.1",
        displayName: "@microsoft/generator-sharepoint@latest",
      });
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
      stub(cpUtils, "executeCommand").resolves();
      stub(fs, "pathExists").callsFake(async () => {
        return true;
      });

      try {
        await generatorChecker.install();
      } catch {
        chai.expect(cleanStub.callCount).equal(2);
      }
    });

    it("findGloballyInstalledVersion: returns version", async () => {
      const generatorChecker = new GeneratorChecker(new StubLogger());
      stub(cpUtils, "executeCommand").resolves(
        "C:\\Roaming\\npm\n`-- @microsoft/generator-sharepoint@1.16.1\n\n"
      );

      const res = await generatorChecker.findGloballyInstalledVersion(1);
      chai.expect(res).equal("1.16.1");
    });

    it("findGloballyInstalledVersion: regex error", async () => {
      const generatorChecker = new GeneratorChecker(new StubLogger());
      stub(cpUtils, "executeCommand").resolves(
        "C:\\Roaming\\npm\n`-- @microsoft/generator-sharepoint@empty\n\n"
      );

      const res = await generatorChecker.findGloballyInstalledVersion(1);
      chai.expect(res).equal(undefined);
    });

    it("findGloballyInstalledVersion: exeute commmand error", async () => {
      const generatorChecker = new GeneratorChecker(new StubLogger());
      stub(cpUtils, "executeCommand").throws("run command error");
      let error = undefined;

      try {
        const res = await generatorChecker.findGloballyInstalledVersion(1);
      } catch (e) {
        error = e;
      }
      chai.expect(error).not.undefined;
    });

    it("findLatestVersion: returns version", async () => {
      const generatorChecker = new GeneratorChecker(new StubLogger());
      stub(cpUtils, "executeCommand").resolves("1.16.1");

      const res = await generatorChecker.findLatestVersion(1);
      chai.expect(res).equal("1.16.1");
    });

    it("findLatestVersion: regex error", async () => {
      const generatorChecker = new GeneratorChecker(new StubLogger());
      stub(cpUtils, "executeCommand").resolves("empty");

      const res = await generatorChecker.findLatestVersion(1);
      chai.expect(res).to.be.undefined;
    });

    it("findLatestVersion: exeute commmand error", async () => {
      const generatorChecker = new GeneratorChecker(new StubLogger());
      stub(cpUtils, "executeCommand").throws("run command error");

      const res = await generatorChecker.findLatestVersion();
      chai.expect(res).to.be.undefined;
    });
  });

  describe("isLatestInstalled", () => {
    it("is latest installed", async () => {
      const checker = new GeneratorChecker(new StubLogger());
      stub(fs, "pathExists").callsFake(async () => {
        console.log("stub pathExists");
        return true;
      });

      stub(GeneratorChecker.prototype, <any>"queryVersion").callsFake(async () => {
        console.log("stub queryversion");
        return "latest";
      });

      stub(GeneratorChecker.prototype, <any>"findLatestVersion").callsFake(async () => {
        console.log("stub findLatestVersion");
        return "latest";
      });

      const result = await checker.isLatestInstalled();
      chai.expect(result).is.true;
    });

    it("latest not installed", async () => {
      const checker = new GeneratorChecker(new StubLogger());
      stub(fs, "pathExists").callsFake(async () => {
        console.log("stub pathExists");
        return true;
      });

      stub(GeneratorChecker.prototype, <any>"queryVersion").callsFake(async () => {
        console.log("stub queryversion");
        return "lower version";
      });

      stub(GeneratorChecker.prototype, <any>"findLatestVersion").callsFake(async () => {
        console.log("stub findLatestVersion");
        return "latest";
      });

      const result = await checker.isLatestInstalled();
      chai.expect(result).is.false;
    });

    it("latest not installed", async () => {
      const checker = new GeneratorChecker(new StubLogger());
      stub(fs, "pathExists").callsFake(async () => {
        console.log("stub pathExists");
        return false;
      });

      stub(GeneratorChecker.prototype, <any>"queryVersion").callsFake(async () => {
        console.log("stub queryversion");
        return "lower version";
      });

      stub(GeneratorChecker.prototype, <any>"findLatestVersion").callsFake(async () => {
        console.log("stub findLatestVersion");
        return "latest";
      });

      const result = await checker.isLatestInstalled();
      chai.expect(result).is.false;
    });

    it("throw error", async () => {
      const checker = new GeneratorChecker(new StubLogger());
      stub(fs, "pathExists").callsFake(async () => {
        console.log("stub pathExists");
        return true;
      });

      stub(GeneratorChecker.prototype, <any>"queryVersion").throws("error");

      const result = await checker.isLatestInstalled();
      chai.expect(result).is.false;
    });
  });

  describe("ensureLatestDependency", () => {
    it("install successfully", async () => {
      const checker = new GeneratorChecker(new StubLogger());

      stub(GeneratorChecker.prototype, <any>"install").callsFake(async () => {
        console.log("installing");
      });

      const context = createContextV3();

      const result = await checker.ensureLatestDependency(context);
      chai.expect(result.isOk()).to.be.true;
    });

    it("install error", async () => {
      const checker = new GeneratorChecker(new StubLogger());

      stub(GeneratorChecker.prototype, <any>"install").callsFake(async () => {
        throw new UserError("source", "name", "msg", "msg");
      });

      const context = createContextV3();

      const result = await checker.ensureLatestDependency(context);
      chai.expect(result.isErr()).to.be.true;
    });
  });
});
