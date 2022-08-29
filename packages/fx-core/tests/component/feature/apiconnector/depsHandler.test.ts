// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as path from "path";
import fs from "fs-extra";
import { expect } from "chai";
import sinon from "sinon";
import semver from "semver";
import { UserError } from "@microsoft/teamsfx-api";
import { DepsHandler } from "../../../../src/component/feature/apiconnector/depsHandler";

describe("DepsHandler in Api Connector", () => {
  const fakeProjectPath = path.join(__dirname, "test-api-connector-depsHandler");
  const botPath = path.join(fakeProjectPath, "bot");
  const apiPath = path.join(fakeProjectPath, "api");
  const sandbox = sinon.createSandbox();
  const pkgFile = "package.json";
  const sdkName = "@microsoft/teamsfx";
  beforeEach(async () => {
    await fs.ensureDir(fakeProjectPath);
    await fs.ensureDir(botPath);
    await fs.ensureDir(apiPath);
  });
  afterEach(async () => {
    sandbox.restore();
    await fs.remove(fakeProjectPath);
  });
  it("success to add sdk deps when no sdk", async () => {
    sandbox.stub(DepsHandler, "getDepsConfig").resolves({ "@microsoft/teamsfx": "1.0.0" });
    await fs.copyFile(path.join(__dirname, "sampleFiles", pkgFile), path.join(botPath, pkgFile));
    let pkg = await fs.readJson(path.join(botPath, pkgFile));
    expect(pkg.dependencies[sdkName]).to.be.undefined;
    const depsHandler: DepsHandler = new DepsHandler(fakeProjectPath, "bot");
    await depsHandler.addPkgDeps();
    pkg = await fs.readJson(path.join(botPath, pkgFile));
    expect(pkg.dependencies[sdkName]).to.be.exist;
    expect(semver.intersects(pkg.dependencies[sdkName], "1.0.0")).to.be.true;
  });
  it("succes to skip sdk deps when exist", async () => {
    sandbox.stub(DepsHandler, "getDepsConfig").resolves({ "@microsoft/teamsfx": "1.0.0" });
    const pkgContent = await fs.readJson(path.join(__dirname, "sampleFiles", pkgFile));
    pkgContent.dependencies[sdkName] = "^2.0.0";
    await fs.writeFile(path.join(botPath, pkgFile), JSON.stringify(pkgContent, null, 4));
    const depsHandler: DepsHandler = new DepsHandler(fakeProjectPath, "bot");
    await depsHandler.addPkgDeps();
    const pkg = await fs.readJson(path.join(botPath, pkgFile));
    expect(pkg.dependencies[sdkName]).to.be.exist;
    chai.assert.strictEqual(pkg.dependencies[sdkName], "^2.0.0");
  });
  it("success to skip sdk when local sdk version intersect with config", async () => {
    sandbox.stub(DepsHandler, "getDepsConfig").resolves({ "@microsoft/teamsfx": "^0.6.3" });
    const pkgContent = await fs.readJson(path.join(__dirname, "sampleFiles", pkgFile));
    pkgContent.dependencies[sdkName] = "^0.6.5";
    await fs.writeFile(path.join(botPath, pkgFile), JSON.stringify(pkgContent, null, 4));
    const depsHandler: DepsHandler = new DepsHandler(fakeProjectPath, "bot");
    await depsHandler.addPkgDeps();
    const pkg = await fs.readJson(path.join(botPath, pkgFile));
    expect(pkg.dependencies[sdkName]).to.be.exist;
    chai.assert.strictEqual(pkg.dependencies[sdkName], "^0.6.5");
  });
  it("fail to update sdk when local version lower than config", async () => {
    sandbox.stub(DepsHandler, "getDepsConfig").resolves({ "@microsoft/teamsfx": "0.2.0" });
    const pkgContent = await fs.readJson(path.join(__dirname, "sampleFiles", pkgFile));
    pkgContent.dependencies[sdkName] = "^0.1.0";
    await fs.writeFile(path.join(botPath, pkgFile), JSON.stringify(pkgContent, null, 4));
    const depsHandler: DepsHandler = new DepsHandler(fakeProjectPath, "bot");
    try {
      await depsHandler.addPkgDeps();
    } catch (err) {
      expect(err instanceof UserError).to.be.true;
      chai.assert.strictEqual(err.source, "api-connector");
      chai.assert.strictEqual(
        err.displayMessage,
        "In bot project, @microsoft/teamsfx version ^0.1.0 is not compatible. Please upgrade the @microsoft/teamsfx version to 0.2.0 and retry this feature."
      );
    }
  });
});
