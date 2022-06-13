// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as path from "path";
import { AzureHostingFactory } from "../../../src/common/azure-hosting/hostingFactory";
import { BicepContext, ServiceType } from "../../../src/common/azure-hosting/interfaces";
import { ResourcePlugins } from "../../../src/common/constants";
const fs = require("fs-extra");

describe("azure hosting", () => {
  describe("function hosting", () => {
    const bicepContext: BicepContext = {
      plugins: [ResourcePlugins.Aad, ResourcePlugins.Bot],
      configs: ["node"],
      moduleNames: { [ServiceType.Functions]: "botFunction" },
      moduleAlias: "bot",
      pluginId: ResourcePlugins.Bot,
    };

    it("generate bicep nodejs", async () => {
      const functionHosting = AzureHostingFactory.createHosting(ServiceType.Functions);
      const template = await functionHosting.generateBicep(bicepContext);

      chai.assert.exists(template.Configuration);
      chai.assert.deepEqual(template.Reference, functionHosting.reference);
      chai.assert.notExists(template.Parameters);

      const expectedConfigModule = await fs.readFile(
        path.resolve(path.join(__dirname, "expectedBicep", "botFunctionConfigModule.bicep")),
        "utf-8"
      );
      chai.assert.equal(template.Configuration.Modules["botFunction"], expectedConfigModule);

      const expectedProvisionModule = await fs.readFile(
        path.resolve(path.join(__dirname, "expectedBicep", "botFunctionProvisionModule.bicep")),
        "utf-8"
      );
      chai.assert.equal(template.Provision.Modules["botFunction"], expectedProvisionModule);

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

    it("generate bicep dotnet", async () => {
      bicepContext.configs = ["dotnet"];
      const functionHosting = AzureHostingFactory.createHosting(ServiceType.Functions);
      const template = await functionHosting.generateBicep(bicepContext);

      chai.assert.exists(template.Configuration);
      chai.assert.deepEqual(template.Reference, functionHosting.reference);
      chai.assert.notExists(template.Parameters);
      chai.assert.include(template.Provision.Modules?.["botFunction"], "dotnet");
    });
  });
});
