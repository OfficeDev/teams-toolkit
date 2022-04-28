// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import path from "path";
import { AzureHostingFactory } from "../../../src/common/azure-hosting/hostingFactory";
import { BicepContext, HostType } from "../../../src/common/azure-hosting/interfaces";
import { ResourcePlugins } from "../../../src/common/constants";
const fs = require("fs-extra");

describe("azure hosting", () => {
  describe("function hosting", () => {
    const bicepContext: BicepContext = {
      plugins: [ResourcePlugins.Aad, ResourcePlugins.Bot],
      configs: ["node"],
    };
    const pluginId = ResourcePlugins.Bot;

    it("generate bicep", async () => {
      const functionHosting = AzureHostingFactory.createHosting(HostType.Function);
      const template = await functionHosting.generateBicep(bicepContext, pluginId);

      chai.assert.exists(template.Configuration);
      chai.assert.deepEqual(template.Reference, functionHosting.reference);
      chai.assert.notExists(template.Parameters);

      const expectedConfigModule = await fs.readFile(
        path.resolve(path.join(__dirname, "expectedBicep", "botFunctionConfigModule.bicep")),
        "utf-8"
      );
      chai.assert.equal(
        template.Configuration.Modules[functionHosting.hostType],
        expectedConfigModule
      );

      const expectedProvisionModule = await fs.readFile(
        path.resolve(path.join(__dirname, "expectedBicep", "botFunctionProvisionModule.bicep")),
        "utf-8"
      );
      chai.assert.equal(
        template.Provision.Modules[functionHosting.hostType],
        expectedProvisionModule
      );

      const expectedProvisionOrchestration = await fs.readFile(
        path.resolve(
          path.join(__dirname, "expectedBicep", "botFunctionProvisionOrchestration.bicep")
        ),
        "utf-8"
      );
      chai.assert.equal(template.Provision.Orchestration, expectedProvisionOrchestration);

      const expectedConfigOrchestration = await fs.readFile(
        path.resolve(path.join(__dirname, "expectedBicep", "botFunctionConfigOrchestration.bicep")),
        "utf-8"
      );
      chai.assert.equal(template.Configuration.Orchestration, expectedConfigOrchestration);
    });
  });
});
