// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import { AppLocalYmlGenerator } from "../../../../src/core/middleware/utils/debug/appLocalYmlGenerator";
import * as yaml from "js-yaml";

describe("AppLocalYmlGenerator", () => {
  it("empty deploy", async () => {
    const appLocalYmlGenerator = new AppLocalYmlGenerator(
      generateProjectSettings(),
      {
        provision: {},
      },
      {}
    );
    const res = await appLocalYmlGenerator.generateAppYml();
    const obj = yaml.load(res) as any;

    chai.assert.isUndefined(obj.deploy);
  });

  it("dev cert", async () => {
    const appLocalYmlGenerator = new AppLocalYmlGenerator(
      generateProjectSettings(),
      {
        provision: {},
        deploy: { tools: { devCert: { trust: true } } },
      },
      {}
    );
    const res = await appLocalYmlGenerator.generateAppYml();
    const obj = yaml.load(res) as any;

    chai.assert.deepEqual(obj.deploy, [
      {
        uses: "devTool/install",
        with: { devCert: { trust: true } },
        writeToEnvironmentFile: { sslCertFile: "SSL_CRT_FILE", sslKeyFile: "SSL_KEY_FILE" },
      },
    ]);
  });

  it("empty npm install", async () => {
    const appLocalYmlGenerator = new AppLocalYmlGenerator(
      generateProjectSettings(),
      {
        provision: {},
        deploy: { npmCommands: [] },
      },
      {}
    );
    const res = await appLocalYmlGenerator.generateAppYml();
    const obj = yaml.load(res) as any;
    chai.assert.isNull(obj.deploy);
  });

  it("npm install", async () => {
    const appLocalYmlGenerator = new AppLocalYmlGenerator(
      generateProjectSettings(),
      {
        provision: {},
        deploy: { npmCommands: [{ args: "install" }] },
      },
      {}
    );
    const res = await appLocalYmlGenerator.generateAppYml();
    const obj = yaml.load(res) as any;
    chai.assert.deepEqual(obj.deploy, [{ uses: "cli/runNpmCommand", with: { args: "install" } }]);
  });
});

function generateProjectSettings(): any {
  return {
    projectId: "",
    programmingLanguage: "typescript",
    solutionSettings: {
      name: "fx-solution-azure",
      hostType: "Azure",
      capabilities: [],
      azureResources: [],
      activeResourcePlugins: [],
    },
  };
}
