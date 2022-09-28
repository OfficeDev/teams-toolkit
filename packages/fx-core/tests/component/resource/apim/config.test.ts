// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import chai from "chai";
import {
  AadPluginConfigKeys,
  ApimPluginConfigKeys,
  SolutionConfigKeys,
  TeamsToolkitComponent,
} from "../../../../src/component/resource/apim/constants";
import {
  AadPluginConfig,
  ApimPluginConfig,
  FunctionPluginConfig,
  SolutionConfig,
} from "../../../../src/component/resource/apim/config";
import {
  ConfigMap,
  ConfigValue,
  EnvInfo,
  PluginIdentity,
  ReadonlyPluginConfig,
  v3,
} from "@microsoft/teamsfx-api";

describe("config", () => {
  describe("SolutionConfig", () => {
    const configContent = new Map<PluginIdentity, ReadonlyPluginConfig>([
      [
        TeamsToolkitComponent.Solution,
        new Map<string, ConfigValue>([[SolutionConfigKeys.resourceNameSuffix, 1]]),
      ],
    ]);
    const envInfo: EnvInfo = {
      envName: "dev",
      config: { manifest: { appName: { short: "appname" } } },
      state: configContent,
    };
    const solutionConfig = new SolutionConfig(envInfo);

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
      [ApimPluginConfigKeys.serviceResourceId]: "serviceResourceId",
      [ApimPluginConfigKeys.productResourceId]: "productResourceId",
      [ApimPluginConfigKeys.authServerResourceId]: "authServerResourceId",
      [ApimPluginConfigKeys.publisherEmail]: "email",
      [ApimPluginConfigKeys.publisherName]: "name",
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
          "Project configuration 'versionSetId' of 'apim' is invalid. The value cannot contain any characters in '*#&+:<>?'"
        );
    });
    it("Property with value", () => {
      chai.expect(apimPluginConfig.apiPrefix).to.equal("prefix");
    });
    it("Check and get undefined property", () => {
      chai
        .expect(() => apimPluginConfig.checkAndGet(ApimPluginConfigKeys.apiPath))
        .to.throw(
          `Project configuration 'apiPath' of 'apim' is missing in 'state.dev.json'. Retry deploy to the cloud or set the value manually.`
        );
    });
    it("Check and get error type property", () => {
      chai.expect(apimPluginConfig.checkAndGet(ApimPluginConfigKeys.apiDocumentPath)).to.equal("1");
    });
    it("Check and get property with value", () => {
      chai.expect(apimPluginConfig.checkAndGet(ApimPluginConfigKeys.apiPrefix)).to.equal("prefix");
    });

    it("verify property", () => {
      chai
        .expect(apimPluginConfig.checkAndGet(ApimPluginConfigKeys.versionSetId))
        .to.equal("error><version?set");
      chai
        .expect(apimPluginConfig.checkAndGet(ApimPluginConfigKeys.serviceResourceId))
        .to.equal("serviceResourceId");
      chai
        .expect(apimPluginConfig.checkAndGet(ApimPluginConfigKeys.productResourceId))
        .to.equal("productResourceId");
      chai
        .expect(apimPluginConfig.checkAndGet(ApimPluginConfigKeys.authServerResourceId))
        .to.equal("authServerResourceId");
      chai
        .expect(apimPluginConfig.checkAndGet(ApimPluginConfigKeys.publisherEmail))
        .to.equal("email");
      chai
        .expect(apimPluginConfig.checkAndGet(ApimPluginConfigKeys.publisherName))
        .to.equal("name");
    });
  });

  describe("FunctionPluginConfig", () => {
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      config: { manifest: { appName: { short: "appname" } } },
      state: { solution: {}, "teams-api": { functionEndpoint: "endpoint" } },
    };
    const functionConfig = new FunctionPluginConfig(envInfo);

    it("functionEndpoint", () => {
      chai.expect(functionConfig.functionEndpoint).to.equal("endpoint");
    });
  });

  describe("AadPluginConfig", () => {
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      config: { manifest: { appName: { short: "appname" } } },
      state: {
        solution: {},
        "aad-app": {
          [AadPluginConfigKeys.objectId]: "objectId",
          [AadPluginConfigKeys.clientId]: "clientId",
          [AadPluginConfigKeys.oauth2PermissionScopeId]: "scopeId",
          [AadPluginConfigKeys.applicationIdUris]: "uri",
        },
      },
    };
    const aadConfig = new AadPluginConfig(envInfo);

    it("verify config", () => {
      chai.expect(aadConfig.objectId).to.equal("objectId");
      chai.expect(aadConfig.clientId).to.equal("clientId");
      chai.expect(aadConfig.oauth2PermissionScopeId).to.equal("scopeId");
      chai.expect(aadConfig.applicationIdUris).to.equal("uri");
    });
  });
});
