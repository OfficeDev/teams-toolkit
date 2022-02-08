// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import chai from "chai";
import {
  ApimPluginConfigKeys,
  SolutionConfigKeys,
} from "../../../../src/plugins/resource/apim/constants";
import { ApimPluginConfig, SolutionConfig } from "../../../../src/plugins/resource/apim/config";
import { ConfigMap, ConfigValue } from "@microsoft/teamsfx-api";

describe("config", () => {
  describe("SolutionConfig", () => {
    const solutionConfig = new SolutionConfig(
      "dev",
      new Map<string, ConfigValue>([[SolutionConfigKeys.resourceNameSuffix, 1]])
    );

    it("Undefined property", () => {
      chai
        .expect(() => solutionConfig.teamsAppTenantId)
        .to.throw(
          `Project configuration 'teamsAppTenantId' of 'solution' is missing in 'state.dev.json'. Retry provision in the cloud or set the value manually.`
        );
    });
    it("Error type property", () => {
      chai
        .expect(() => solutionConfig.resourceNameSuffix)
        .to.throw("Property 'resourceNameSuffix' is not type 'string'");
    });
  });

  describe("ApimPluginConfig", () => {
    const configContent = ConfigMap.fromJSON({
      [ApimPluginConfigKeys.apiPrefix]: "prefix",
      [ApimPluginConfigKeys.versionSetId]: "error><version?set",
      [ApimPluginConfigKeys.apiDocumentPath]: 1,
    });

    if (!configContent) {
      throw Error("Empty test input");
    }

    const apimPluginConfig = new ApimPluginConfig(configContent, "dev");
    it("Undefined property", () => {
      chai.expect(apimPluginConfig.apiPath).to.equal(undefined);
    });
    it("Error type property", () => {
      chai
        .expect(() => apimPluginConfig.versionSetId)
        .to.throw(
          "Project configuration 'versionSetId' of 'fx-resource-apim' is invalid. The value cannot contain any characters in '*#&+:<>?'"
        );
    });
    it("Property with value", () => {
      chai.expect(apimPluginConfig.apiPrefix).to.equal("prefix");
    });
    it("Check and get undefined property", () => {
      chai
        .expect(() => apimPluginConfig.checkAndGet(ApimPluginConfigKeys.apiPath))
        .to.throw(
          `Project configuration 'apiPath' of 'fx-resource-apim' is missing in 'state.dev.json'. Retry deploy to the cloud or set the value manually.`
        );
    });
    it("Check and get error type property", () => {
      chai.expect(apimPluginConfig.checkAndGet(ApimPluginConfigKeys.apiDocumentPath)).to.equal("1");
    });
    it("Check and get property with value", () => {
      chai.expect(apimPluginConfig.checkAndGet(ApimPluginConfigKeys.apiPrefix)).to.equal("prefix");
    });
  });
});
