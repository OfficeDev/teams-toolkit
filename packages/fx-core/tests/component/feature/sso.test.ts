// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { InputsWithProjectPath, Platform, Stage } from "@microsoft/teamsfx-api";
import AdmZip from "adm-zip";
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import { createSandbox } from "sinon";
import { Container } from "typedi";
import { ComponentNames } from "../../../src/component/migrate";
import "../../../src/component/feature/sso";
import * as templateUtils from "../../../src/component/generator/utils";
import * as utils from "../../../src/common/globalVars";
import { setTools } from "../../../src/common/globalVars";
import { MockTools, randomAppName } from "../../core/utils";

describe("SSO can add in VS V3 project", () => {
  const sandbox = createSandbox();
  const tools = new MockTools();
  setTools(tools);
  const appName = `unittest${randomAppName()}`;
  const context = utils.createContext();
  afterEach(() => {
    sandbox.restore();
  });

  it("happy path for VS v3 project", async () => {
    const component = Container.get(ComponentNames.SSO) as any;
    const inputs: InputsWithProjectPath = {
      projectPath: "projectPath",
      platform: Platform.VS,
      language: "csharp",
      "app-name": appName,
      stage: Stage.addFeature,
    };

    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(templateUtils, "unzip").callsFake(async (zip: AdmZip, dstPath: string) => {
      const zipFiles = zip.getEntries().map((element, index, array) => {
        return element.entryName;
      });
      assert.isTrue(zipFiles.includes("aad.manifest.template.json"));
      assert.isTrue(zipFiles.includes("Enable SSO.txt"));
      return zipFiles;
    });
    const ssoRes = await component.add(context, inputs);
    assert.isTrue(ssoRes.isOk());
  });

  it("add sso failed for VS v3 project due to project path is empty", async () => {
    const component = Container.get(ComponentNames.SSO) as any;
    const inputs: InputsWithProjectPath = {
      projectPath: "projectPath",
      platform: Platform.VS,
      language: "csharp",
      "app-name": appName,
      stage: Stage.addFeature,
    };

    sandbox.stub(fs, "pathExists").resolves(false);
    const ssoRes = await component.add(context, inputs);
    assert.isTrue(ssoRes.isErr() && ssoRes.error.name === "FileNotFoundError");
  });

  it("add sso failed for VS v3 project due to unexpected error", async () => {
    const component = Container.get(ComponentNames.SSO) as any;
    const inputs: InputsWithProjectPath = {
      projectPath: "projectPath",
      platform: Platform.VS,
      language: "csharp",
      "app-name": appName,
      stage: Stage.addFeature,
    };

    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "remove").resolves();
    sandbox.stub(templateUtils, "unzip").throws(new Error("errorMessage"));
    const ssoRes = await component.add(context, inputs);
    console.log(ssoRes);
    assert.isTrue(ssoRes.isErr() && ssoRes.error.name === "FailedToCreateAuthFiles");
  });
});
