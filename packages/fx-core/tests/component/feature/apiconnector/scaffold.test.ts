// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as path from "path";
import os from "os";
import sinon from "sinon";
import fs from "fs-extra";
import { expect } from "chai";
import { SampleHandler } from "../../../../src/component/feature/apiconnector/sampleHandler";
import { ContextV3, Inputs, Platform, SystemError, UserError, ok } from "@microsoft/teamsfx-api";
import { MockContext } from "./utils";
import { Constants as Constants1 } from "../../../../src/component/feature/apiconnector/constants";
import { ApiConnectorImpl } from "../../../../src/component/feature/apiconnector/ApiConnectorImpl";
import { ConstantString } from "../../../../src/common/constants";
import { MockUserInteraction } from "../../../core/utils";
import { Notification } from "../../../../src/component/feature/apiconnector/utils";

class Constants {
  public static readonly envFileName = ".env.teamsfx.local";
  public static readonly pkgJsonFile = "package.json";
  public static readonly pkgLockFile = "package-lock.json";
}

describe("Api Connector scaffold sample code", async () => {
  const sandbox = sinon.createSandbox();
  const testpath = path.join(__dirname, "api-connect-scaffold");
  const botPath = path.join(testpath, "bot");
  const apiPath = path.join(testpath, "api");

  const inputs: Inputs = { platform: Platform.VSCode, projectPath: testpath };
  beforeEach(async () => {
    await fs.ensureDir(testpath);
    await fs.ensureDir(botPath);
    await fs.ensureDir(apiPath);
    await fs.copyFile(
      path.join(__dirname, "sampleFiles", "package.json"),
      path.join(botPath, "package.json")
    );
    await fs.copyFile(
      path.join(__dirname, "sampleFiles", "package.json"),
      path.join(apiPath, "package.json")
    );
  });

  afterEach(async () => {
    await fs.remove(testpath);
    sandbox.restore();
  });

  it("scaffold api without project path", async () => {
    const expectInputs = {
      component: ["api", "bot"],
      alias: "test",
      endpoint: "test.endpoint",
      "auth-type": "cert",
    };
    const context = MockContext();
    const fakeInputs: Inputs = { ...inputs, ...expectInputs, projectPath: "" };
    const apiConnector: ApiConnectorImpl = new ApiConnectorImpl();
    try {
      await apiConnector.scaffold(context, fakeInputs);
    } catch (err) {
      expect(err instanceof UserError).to.be.true;
      chai.assert.strictEqual(err.name, "InvalidProjectError");
    }
  });

  it("scaffold api without api active resource", async () => {
    const expectInputs = {
      component: ["api"],
      alias: "test",
      endpoint: "test.endpoint",
      "auth-type": "basic",
      "user-name": "test account",
    };
    const context = MockContext();
    const fakeInputs: Inputs = { ...inputs, ...expectInputs };
    const apiConnector: ApiConnectorImpl = new ApiConnectorImpl();
    try {
      await apiConnector.scaffold(context, fakeInputs);
    } catch (err) {
      expect(err instanceof UserError).to.be.true;
      chai.assert.strictEqual(err.source, "api-connector");
      chai.assert.strictEqual(err.displayMessage, "Component api not exist, please add first");
    }
  });

  it("scaffold api without api active resource", async () => {
    const expectInputs = {
      component: ["api", "bot"],
      alias: "test",
      endpoint: "test.endpoint",
      "auth-type": "basic",
      "user-name": "test account",
    };
    const context = MockContext();
    context.projectSetting.components = [];
    const fakeInputs: Inputs = { ...inputs, ...expectInputs };
    const apiConnector: ApiConnectorImpl = new ApiConnectorImpl();
    try {
      await apiConnector.scaffold(context, fakeInputs);
    } catch (err) {
      expect(err instanceof UserError).to.be.true;
      chai.assert.strictEqual(err.source, "api-connector");
      chai.assert.strictEqual(err.displayMessage, "Component bot not exist, please add first");
    }
  });

  it("call add existing api connector success", async () => {
    const expectInputs = {
      component: ["api", "bot"],
      alias: "test",
      endpoint: "test.endpoint",
      "auth-type": "basic",
      "user-name": "test account",
    };
    const context = MockContext();
    const fakeInputs: Inputs = { ...inputs, ...expectInputs };
    const apiConnector: ApiConnectorImpl = new ApiConnectorImpl();
    const result = await apiConnector.scaffold(context as ContextV3, fakeInputs);
    expect(await fs.pathExists(path.join(botPath, Constants.envFileName))).to.be.true;
    expect(await fs.pathExists(path.join(botPath, Constants1.sampleCodeDir, "test.js"))).to.be.true;
    expect(await fs.pathExists(path.join(apiPath, Constants.envFileName))).to.be.true;
    expect(await fs.pathExists(path.join(apiPath, Constants1.sampleCodeDir, "test.js"))).to.be.true;
    const expectResult = ["api", "bot"].map((item) => {
      return path.join(testpath, item, Constants1.sampleCodeDir, "test.js");
    });
    expect(result).to.deep.equal({ generatedFiles: expectResult });
  });

  it("call add existing api connector success and read more", async () => {
    sandbox
      .stub(MockUserInteraction.prototype, "showMessage")
      .callsFake((level, message, modal, ...items) => {
        return Promise.resolve(ok(Notification.READ_MORE));
      });

    const openUrl = sandbox.stub(MockUserInteraction.prototype, "openUrl").callsFake((url) => {
      return Promise.resolve(ok(true));
    });
    const expectInputs = {
      component: ["api", "bot"],
      alias: "test",
      endpoint: "test.endpoint",
      "auth-type": "basic",
      "user-name": "test account",
    };
    const context = MockContext();
    const fakeInputs: Inputs = { ...inputs, ...expectInputs };
    const apiConnector: ApiConnectorImpl = new ApiConnectorImpl();
    await apiConnector.scaffold(context as ContextV3, fakeInputs);
    expect(openUrl.calledOnceWith(Notification.READ_MORE_URL)).equal(true);
  });

  it("call add existing api connector success with CLI", async () => {
    const expectInputs = {
      component: ["api", "bot"],
      alias: "test",
      endpoint: "test.endpoint",
      "auth-type": "basic",
      "user-name": "test account",
    };
    const context = MockContext();
    const fakeInputs: Inputs = { ...inputs, ...expectInputs, platform: Platform.CLI };
    const apiConnector: ApiConnectorImpl = new ApiConnectorImpl();
    const result = await apiConnector.scaffold(context as ContextV3, fakeInputs);
    expect(await fs.pathExists(path.join(botPath, Constants.envFileName))).to.be.true;
    expect(await fs.pathExists(path.join(botPath, Constants1.sampleCodeDir, "test.js"))).to.be.true;
    expect(await fs.pathExists(path.join(apiPath, Constants.envFileName))).to.be.true;
    expect(await fs.pathExists(path.join(apiPath, Constants1.sampleCodeDir, "test.js"))).to.be.true;
    const expectResult = ["api", "bot"].map((item) => {
      return path.join(testpath, item, Constants1.sampleCodeDir, "test.js");
    });
    expect(result).to.deep.equal({ generatedFiles: expectResult });
  });

  it("call add existing api connector success with no need to update package.json", async () => {
    await fs.copyFile(
      path.join(__dirname, "sampleFiles", "package-teamsfx-included.json"),
      path.join(botPath, "package.json")
    );
    await fs.copyFile(
      path.join(__dirname, "sampleFiles", "package-teamsfx-included.json"),
      path.join(apiPath, "package.json")
    );

    const expectInputs = {
      component: ["api", "bot"],
      alias: "test",
      endpoint: "test.endpoint",
      "auth-type": "basic",
      "user-name": "test account",
    };
    const context = MockContext();
    const fakeInputs: Inputs = { ...inputs, ...expectInputs };
    const apiConnector: ApiConnectorImpl = new ApiConnectorImpl();
    const result = await apiConnector.scaffold(context as ContextV3, fakeInputs);
    expect(await fs.pathExists(path.join(botPath, Constants.envFileName))).to.be.true;
    expect(await fs.pathExists(path.join(botPath, Constants1.sampleCodeDir, "test.js"))).to.be.true;
    expect(await fs.pathExists(path.join(apiPath, Constants.envFileName))).to.be.true;
    expect(await fs.pathExists(path.join(apiPath, Constants1.sampleCodeDir, "test.js"))).to.be.true;
    const expectResult = ["api", "bot"].map((item) => {
      return path.join(testpath, item, Constants1.sampleCodeDir, "test.js");
    });
    expect(result).to.deep.equal({ generatedFiles: expectResult });
  });

  it("call add existing api connector success with using existing aad", async () => {
    const expectInputs = {
      component: ["api", "bot"],
      alias: "test",
      endpoint: "test.endpoint",
      "auth-type": "aad",
      "user-name": "test account",
      "app-type": "existing",
    };
    const context = MockContext();
    const fakeInputs: Inputs = { ...inputs, ...expectInputs };
    const apiConnector: ApiConnectorImpl = new ApiConnectorImpl();
    const result = await apiConnector.scaffold(context as ContextV3, fakeInputs);
    expect(await fs.pathExists(path.join(botPath, Constants.envFileName))).to.be.true;
    expect(await fs.pathExists(path.join(botPath, Constants1.sampleCodeDir, "test.js"))).to.be.true;
    expect(await fs.pathExists(path.join(apiPath, Constants.envFileName))).to.be.true;
    expect(await fs.pathExists(path.join(apiPath, Constants1.sampleCodeDir, "test.js"))).to.be.true;
    const expectResult = ["api", "bot"].map((item) => {
      return path.join(testpath, item, Constants1.sampleCodeDir, "test.js");
    });
    expect(result).to.deep.equal({ generatedFiles: expectResult });
  });

  it("call add existing api connector missing input with using not existing aad", async () => {
    const expectInputs = {
      component: ["api", "bot"],
      alias: "test",
      endpoint: "test.endpoint",
      "auth-type": "aad",
      "user-name": "test account",
      "app-type": "existing",
    };
    const context = MockContext();
    const fakeInputs: Inputs = { ...inputs, ...expectInputs };
    const apiConnector: ApiConnectorImpl = new ApiConnectorImpl();
    try {
      await apiConnector.scaffold(context, fakeInputs);
    } catch (err) {
      expect(err instanceof SystemError).to.be.true;
      chai.assert.strictEqual(err.name, "api-ApiConnectorInputError");
    }
  });

  it("call add existing api connector success with not existing aad", async () => {
    const expectInputs = {
      component: ["api", "bot"],
      alias: "test",
      endpoint: "test.endpoint",
      "auth-type": "aad",
      "user-name": "test account",
      "tenant-id": "49fb14d7-e1fd-4d93-acf1-bebfc6f50b94",
      "app-id": "49fb14d7-e1fd-4d93-acf1-bebfc6f50b94",
    };
    const context = MockContext();
    const fakeInputs: Inputs = { ...inputs, ...expectInputs };
    const apiConnector: ApiConnectorImpl = new ApiConnectorImpl();
    const result = await apiConnector.scaffold(context as ContextV3, fakeInputs);
    expect(await fs.pathExists(path.join(botPath, Constants.envFileName))).to.be.true;
    expect(await fs.pathExists(path.join(botPath, Constants1.sampleCodeDir, "test.js"))).to.be.true;
    expect(await fs.pathExists(path.join(apiPath, Constants.envFileName))).to.be.true;
    expect(await fs.pathExists(path.join(apiPath, Constants1.sampleCodeDir, "test.js"))).to.be.true;
    const expectResult = ["api", "bot"].map((item) => {
      return path.join(testpath, item, Constants1.sampleCodeDir, "test.js");
    });
    expect(result).to.deep.equal({ generatedFiles: expectResult });
  });

  it("call add existing api connector success with api key", async () => {
    const expectInputs = {
      component: ["api", "bot"],
      alias: "test",
      endpoint: "test.endpoint",
      "auth-type": "apikey",
      "user-name": "test account",
      "key-location": "header",
      "key-name": "keyName",
    };
    const context = MockContext();
    const fakeInputs: Inputs = { ...inputs, ...expectInputs };
    const apiConnector: ApiConnectorImpl = new ApiConnectorImpl();
    const result = await apiConnector.scaffold(context as ContextV3, fakeInputs);
    expect(await fs.pathExists(path.join(botPath, Constants.envFileName))).to.be.true;
    expect(await fs.pathExists(path.join(botPath, Constants1.sampleCodeDir, "test.js"))).to.be.true;
    expect(await fs.pathExists(path.join(apiPath, Constants.envFileName))).to.be.true;
    expect(await fs.pathExists(path.join(apiPath, Constants1.sampleCodeDir, "test.js"))).to.be.true;
    const expectResult = ["api", "bot"].map((item) => {
      return path.join(testpath, item, Constants1.sampleCodeDir, "test.js");
    });
    expect(result).to.deep.equal({ generatedFiles: expectResult });
  });

  it("call add existing api connector success with api key and localtion key not in header", async () => {
    const expectInputs = {
      component: ["api", "bot"],
      alias: "test",
      endpoint: "test.endpoint",
      "auth-type": "apikey",
      "user-name": "test account",
      "key-name": "keyName",
    };
    const context = MockContext();
    const fakeInputs: Inputs = { ...inputs, ...expectInputs };
    const apiConnector: ApiConnectorImpl = new ApiConnectorImpl();
    const result = await apiConnector.scaffold(context as ContextV3, fakeInputs);
    expect(await fs.pathExists(path.join(botPath, Constants.envFileName))).to.be.true;
    expect(await fs.pathExists(path.join(botPath, Constants1.sampleCodeDir, "test.js"))).to.be.true;
    expect(await fs.pathExists(path.join(apiPath, Constants.envFileName))).to.be.true;
    expect(await fs.pathExists(path.join(apiPath, Constants1.sampleCodeDir, "test.js"))).to.be.true;
    const expectResult = ["api", "bot"].map((item) => {
      return path.join(testpath, item, Constants1.sampleCodeDir, "test.js");
    });
    expect(result).to.deep.equal({ generatedFiles: expectResult });
  });

  it("call add existing api connector success with cert", async () => {
    const expectInputs = {
      component: ["api", "bot"],
      alias: "test",
      endpoint: "test.endpoint",
      "auth-type": "cert",
    };
    const context = MockContext();
    const fakeInputs: Inputs = { ...inputs, ...expectInputs };
    const apiConnector: ApiConnectorImpl = new ApiConnectorImpl();
    const result = await apiConnector.scaffold(context as ContextV3, fakeInputs);
    expect(await fs.pathExists(path.join(botPath, Constants.envFileName))).to.be.true;
    expect(await fs.pathExists(path.join(botPath, Constants1.sampleCodeDir, "test.js"))).to.be.true;
    expect(await fs.pathExists(path.join(apiPath, Constants.envFileName))).to.be.true;
    expect(await fs.pathExists(path.join(apiPath, Constants1.sampleCodeDir, "test.js"))).to.be.true;
    const expectResult = ["api", "bot"].map((item) => {
      return path.join(testpath, item, Constants1.sampleCodeDir, "test.js");
    });
    expect(result).to.deep.equal({ generatedFiles: expectResult });
  });

  it("call add existing api connector success with custom auth type", async () => {
    const expectInputs = {
      component: ["api", "bot"],
      alias: "test",
      endpoint: "test.endpoint",
      "auth-type": "custom",
    };
    const context = MockContext();
    const fakeInputs: Inputs = { ...inputs, ...expectInputs };
    const apiConnector: ApiConnectorImpl = new ApiConnectorImpl();
    const result = await apiConnector.scaffold(context as ContextV3, fakeInputs);
    expect(await fs.pathExists(path.join(botPath, Constants.envFileName))).to.be.true;
    expect(await fs.pathExists(path.join(botPath, Constants1.sampleCodeDir, "test.js"))).to.be.true;
    expect(await fs.pathExists(path.join(apiPath, Constants.envFileName))).to.be.true;
    expect(await fs.pathExists(path.join(apiPath, Constants1.sampleCodeDir, "test.js"))).to.be.true;
    const expectResult = ["api", "bot"].map((item) => {
      return path.join(testpath, item, Constants1.sampleCodeDir, "test.js");
    });
    expect(result).to.deep.equal({ generatedFiles: expectResult });
  });

  it("call add existing api connector error with invalid auth type", async () => {
    const expectInputs = {
      component: ["api", "bot"],
      alias: "test",
      endpoint: "test.endpoint",
      "auth-type": "cert",
    };
    const context = MockContext();
    const fakeInputs: Inputs = { ...inputs, ...expectInputs };
    const apiConnector: ApiConnectorImpl = new ApiConnectorImpl();
    try {
      await apiConnector.scaffold(context, fakeInputs);
    } catch (err) {
      expect(err instanceof SystemError).to.be.true;
      chai.assert.strictEqual(err.name, "ApiConnectorInputError");
    }
  });

  it("restore files meets failure on scaffold", async () => {
    sandbox.stub(SampleHandler.prototype, "generateSampleCode").throws(new Error("fake error"));
    const expectInputs = {
      component: ["api", "bot"],
      alias: "test",
      endpoint: "test.endpoint",
      "auth-type": "basic",
      "user-name": "test account",
    };
    const context = MockContext();
    const fakeInputs: Inputs = { ...inputs, ...expectInputs };
    const apiConnector: ApiConnectorImpl = new ApiConnectorImpl();
    await fs.copyFile(
      path.join(__dirname, "sampleFiles", "package.json"),
      path.join(botPath, "package.json")
    );
    try {
      await apiConnector.scaffold(context, fakeInputs);
    } catch (err) {
      expect(err instanceof SystemError).to.be.true;
      chai.assert.strictEqual(err.source, "api-connector");
      chai.assert.strictEqual(
        err.displayMessage,
        "Failed to scaffold connect API files, Reason: fake error"
      );
    }
    expect(await fs.pathExists(path.join(botPath, Constants1.sampleCodeDir, "fake.ts"))).to.be
      .false;
    const actualFile = await fs.readFile(
      path.join(__dirname, "sampleFiles", "package.json"),
      ConstantString.UTF8Encoding
    );
    const expectedContent = await fs.readFile(
      path.join(botPath, "package.json"),
      ConstantString.UTF8Encoding
    );
    chai.assert.strictEqual(
      actualFile.replace(/\r?\n/g, os.EOL),
      expectedContent.replace(/\r?\n/g, os.EOL)
    );
  });
});
