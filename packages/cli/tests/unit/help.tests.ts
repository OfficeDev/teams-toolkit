// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Stage } from "@microsoft/teamsfx-api";
import "mocha";
import { sqlPasswordConfirmQuestionName } from "../../src/constants";
import HelpParamGenerator from "../../src/helpParamGenerator";
import { expect } from "./utils";

describe("Help Parameter Tests", async () => {
  await HelpParamGenerator.initializeQuestionsForHelp();

  it("Create Parameter Hardcode Check", async () => {
    const result = HelpParamGenerator.getYargsParamForHelp(Stage.create);
    expect(result.folder.default).equals("./");
    expect(result.scratch.hidden).equals(true);
  });

  it("Resource Add Parameter Hardcode Check", async () => {
    const resources = ["sql", "apim", "function", "keyvault"];
    resources.forEach((resourceName) => {
      const result = HelpParamGenerator.getYargsParamForHelp("addFeature-" + resourceName);
      expect(result.folder.default).equals("./");

      // const nodes = Object.values(result);
      // const rootNodes = nodes.filter(
      //   (node) =>
      //     typeof node.default === "object" &&
      //     node.default.length === 1 &&
      //     node.default[0] === resourceName
      // );
      // expect(rootNodes.length === 1, JSON.stringify(nodes)).to.be.true;
      // expect(rootNodes[0].hidden).to.be.true;
    });
  });

  it("Capability Add Parameter Hardcode Check", async () => {
    const capabilities = ["Tab", "Bot", "MessagingExtension"];
    capabilities.forEach((capabilityName) => {
      const result = HelpParamGenerator.getYargsParamForHelp("addCapability-" + capabilityName);
      expect(result.folder.default).equals("./");
    });
  });

  it("Provision Parameter Hardcode Check", async () => {
    const result = HelpParamGenerator.getYargsParamForHelp(Stage.provision);
    expect(result.folder.default).equals("./");
    expect(result[sqlPasswordConfirmQuestionName].hidden).to.be.true;
  });

  it("Publish Parameter Hardcode Check", async () => {
    const result = HelpParamGenerator.getYargsParamForHelp(Stage.publish);
    expect(result.folder.default).equals("./");

    for (const key of Object.keys(result)) {
      if (key === "folder" || key === "env") {
        expect(result[key].hidden).to.be.false;
      } else {
        expect(result[key].hidden).to.be.true;
      }
    }
  });
});
