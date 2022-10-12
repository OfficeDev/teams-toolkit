// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { createSandbox, match, SinonSandbox } from "sinon";
import dotenv from "dotenv";
import { AadManager } from "../../../../src/component/resource/apim/managers/aadManager";
import { v4 } from "uuid";
import {
  AssertConfigNotEmpty,
  InvalidAadObjectId,
} from "../../../../src/component/resource/apim/error";
import { IRequiredResourceAccess } from "../../../../src/component/resource/apim/interfaces/IAadResource";
import { AadService } from "../../../../src/component/resource/apim/services/aadService";
import {
  IAadPluginConfig,
  IApimPluginConfig,
} from "../../../../src/component/resource/apim/config";
import {
  ApimPluginConfigKeys,
  TeamsToolkitComponent,
} from "../../../../src/component/resource/apim/constants";
import { Lazy } from "../../../../src/component/resource/apim/utils/commonUtils";
import {
  aadMatcher,
  DefaultTestInput,
  DefaultTestOutput,
  mockAxios,
  MockAxiosInput,
  MockAxiosOutput,
} from "./mock";
dotenv.config();
chai.use(chaiAsPromised);

describe("AadManager", () => {
  describe("#provision()", () => {
    const sandbox = createSandbox();
    afterEach(() => {
      sandbox.restore();
    });

    it("Create a new AAD", async () => {
      // Arrange
      const newAppName = "test-new-app-name";
      const apimPluginConfig = buildApimPluginConfig();
      const { aadManager, requestStub } = buildAadManager(sandbox);

      // Act
      await aadManager.provision(apimPluginConfig, newAppName);

      // Assert
      sandbox.assert.calledWithMatch(requestStub, aadMatcher.createAad);
      sandbox.assert.calledWithMatch(requestStub, aadMatcher.addSecret);
      sandbox.assert.neverCalledWithMatch(requestStub, aadMatcher.getAad);
      chai.assert.isNotEmpty(apimPluginConfig.apimClientAADObjectId);
      chai.assert.isNotEmpty(apimPluginConfig.apimClientAADClientId);
      chai.assert.isNotEmpty(apimPluginConfig.apimClientAADClientSecret);
    });

    it("Use an existing AAD failed because of error object id", async () => {
      // Arrange
      const apimPluginConfig = buildApimPluginConfig(DefaultTestInput.aadObjectId.new);
      const { aadManager, requestStub } = buildAadManager(sandbox);

      // Act & Assert
      await chai
        .expect(aadManager.provision(apimPluginConfig, DefaultTestInput.aadDisplayName.new))
        .to.be.rejectedWith(InvalidAadObjectId.message(DefaultTestInput.aadObjectId.new)[0]);
      sandbox.assert.calledOnceWithMatch(requestStub, aadMatcher.getAad);
    });

    it("Use an existing AAD, using existing secret", async () => {
      // Arrange
      const apimPluginConfig = buildApimPluginConfig(
        DefaultTestInput.aadObjectId.created,
        "test-secret"
      );
      const { aadManager, requestStub } = buildAadManager(sandbox);

      // Act
      await aadManager.provision(apimPluginConfig, DefaultTestInput.aadDisplayName.new);

      // Assert
      sandbox.assert.calledOnceWithMatch(requestStub, aadMatcher.getAad);
      chai.assert.equal(
        DefaultTestInput.aadObjectId.created,
        apimPluginConfig.apimClientAADObjectId
      );
      chai.assert.equal(DefaultTestOutput.createAad.appId, apimPluginConfig.apimClientAADClientId);
      chai.assert.equal("test-secret", apimPluginConfig.apimClientAADClientSecret);
    });

    it("Use an existing AAD, create new secret", async () => {
      // Arrange
      const apimPluginConfig = buildApimPluginConfig(DefaultTestInput.aadObjectId.created);
      const { aadManager, requestStub } = buildAadManager(sandbox);

      // Act
      await aadManager.provision(apimPluginConfig, DefaultTestInput.aadDisplayName.new);

      // Assert
      sandbox.assert.calledWithMatch(requestStub, aadMatcher.addSecret);
      sandbox.assert.calledWithMatch(requestStub, aadMatcher.getAad);
      sandbox.assert.neverCalledWithMatch(requestStub, aadMatcher.createAad);
      chai.assert.equal(
        DefaultTestInput.aadObjectId.created,
        apimPluginConfig.apimClientAADObjectId
      );
      chai.assert.equal(DefaultTestOutput.getAad.appId, apimPluginConfig.apimClientAADClientId);
      chai.assert.equal(
        DefaultTestOutput.addSecret.secretText,
        apimPluginConfig.apimClientAADClientSecret
      );
    });
  });

  describe("#postProvision()", () => {
    const sandbox = createSandbox();
    afterEach(() => {
      sandbox.restore();
    });

    it("Add a existing scope and add a new redirect url", async () => {
      // Arrange
      const apimPluginConfig = buildApimPluginConfig(DefaultTestInput.aadObjectId.created);
      const aadPluginConfig = buildAadPluginConfig(
        "test-scope-client-id-created",
        "test-scope-id-created"
      );
      const redirectUris = [`https://testredirect/${v4()}`];
      const { aadManager, requestStub } = buildAadManager(sandbox, DefaultTestInput, {
        getAad: {
          id: "test-aad-object-id-created",
          appId: "test-aad-client-id-created",
          displayName: "test-aad-display-name-created",
          requiredResourceAccess: [
            {
              resourceAppId: "test-scope-client-id-created",
              resourceAccess: [{ id: "test-scope-id-created", type: "Scope" }],
            },
          ],
          web: {
            redirectUris: [],
            implicitGrantSettings: { enableIdTokenIssuance: true },
          },
        },
      });

      // Act
      await aadManager.postProvision(apimPluginConfig, aadPluginConfig, redirectUris);

      // Assert
      const updatedAadInfo = {
        web: {
          redirectUris: redirectUris,
        },
      };
      sandbox.assert.calledWithMatch(requestStub, aadMatcher.getAad);
      sandbox.assert.calledWithMatch(
        requestStub,
        aadMatcher.updateAad.and(aadMatcher.body(updatedAadInfo))
      );
    });

    it("Add a new scope and existing redirect url", async () => {
      // Arrange
      const apimPluginConfig = buildApimPluginConfig(DefaultTestInput.aadObjectId.created);
      const aadPluginConfig = buildAadPluginConfig(
        "test-scope-client-id-created",
        "test-scope-id-new"
      );
      const redirectUris = [`https://testredirect/${v4()}`];
      const { aadManager, requestStub } = buildAadManager(sandbox, DefaultTestInput, {
        getAad: {
          id: "test-aad-object-id-created",
          appId: "test-aad-client-id-created",
          displayName: "test-aad-display-name-created",
          requiredResourceAccess: [
            {
              resourceAppId: "test-scope-client-id-created",
              resourceAccess: [{ id: "test-scope-id-created", type: "Scope" }],
            },
          ],
          web: {
            redirectUris: redirectUris,
            implicitGrantSettings: { enableIdTokenIssuance: false },
          },
        },
      });

      // Act
      await aadManager.postProvision(apimPluginConfig, aadPluginConfig, redirectUris);

      // Assert
      const updatedAadInfo = {
        requiredResourceAccess: [
          {
            resourceAppId: "test-scope-client-id-created",
            resourceAccess: [
              { id: "test-scope-id-created", type: "Scope" },
              { id: "test-scope-id-new", type: "Scope" },
            ],
          },
        ],
        web: {
          implicitGrantSettings: { enableIdTokenIssuance: true },
        },
      };
      sandbox.assert.calledWithMatch(requestStub, aadMatcher.getAad);
      sandbox.assert.calledWithMatch(
        requestStub,
        aadMatcher.updateAad.and(aadMatcher.body(updatedAadInfo))
      );
    });

    it("Add existing scope and existing redirect url", async () => {
      // Arrange
      const apimPluginConfig = buildApimPluginConfig(DefaultTestInput.aadObjectId.created);
      const aadPluginConfig = buildAadPluginConfig(
        "test-scope-client-id-created",
        "test-scope-id-created"
      );
      const redirectUris = [`https://testredirect/${v4()}`];
      const { aadManager, requestStub } = buildAadManager(sandbox, DefaultTestInput, {
        getAad: {
          id: "test-aad-object-id-created",
          appId: "test-aad-client-id-created",
          displayName: "test-aad-display-name-created",
          requiredResourceAccess: [
            {
              resourceAppId: "test-scope-client-id-created",
              resourceAccess: [{ id: "test-scope-id-created", type: "Scope" }],
            },
          ],
          web: {
            redirectUris: redirectUris,
            implicitGrantSettings: { enableIdTokenIssuance: true },
          },
        },
      });

      // Act
      await aadManager.postProvision(apimPluginConfig, aadPluginConfig, redirectUris);

      // Assert
      sandbox.assert.calledOnceWithMatch(requestStub, aadMatcher.getAad);
    });
  });

  describe("#refreshRequiredResourceAccess()", () => {
    const sandbox = createSandbox();
    afterEach(() => {
      sandbox.restore();
    });

    const testInput: {
      message: string;
      source: IRequiredResourceAccess[] | undefined;
      expected: IRequiredResourceAccess[] | undefined;
    }[] = [
      {
        message: "Undefined source",
        source: undefined,
        expected: [{ resourceAppId: "0", resourceAccess: [{ id: "0", type: "Scope" }] }],
      },
      {
        message: "Empty source",
        source: [],
        expected: [{ resourceAppId: "0", resourceAccess: [{ id: "0", type: "Scope" }] }],
      },
      {
        message: "No existing client id",
        source: [{ resourceAppId: "1" }],
        expected: [
          { resourceAppId: "1" },
          { resourceAppId: "0", resourceAccess: [{ id: "0", type: "Scope" }] },
        ],
      },
      {
        message: "Existing client id and undefined resource access",
        source: [{ resourceAppId: "0" }],
        expected: [{ resourceAppId: "0", resourceAccess: [{ id: "0", type: "Scope" }] }],
      },
      {
        message: "Existing client id and empty resource access",
        source: [{ resourceAppId: "0", resourceAccess: [] }],
        expected: [{ resourceAppId: "0", resourceAccess: [{ id: "0", type: "Scope" }] }],
      },
      {
        message: "Existing client id and no scope id",
        source: [{ resourceAppId: "0", resourceAccess: [{ id: "1", type: "Scope" }] }],
        expected: [
          {
            resourceAppId: "0",
            resourceAccess: [
              { id: "1", type: "Scope" },
              { id: "0", type: "Scope" },
            ],
          },
        ],
      },
      {
        message: "Existing client id and existing scope id",
        source: [{ resourceAppId: "0", resourceAccess: [{ id: "0", type: "Scope" }] }],
        expected: undefined,
      },
    ];

    testInput.forEach((input) => {
      it(input.message, async () => {
        // Arrange
        const apimPluginConfig = buildApimPluginConfig(DefaultTestInput.aadObjectId.created);
        const aadPluginConfig = buildAadPluginConfig("0", "0");
        const { aadManager, requestStub } = buildAadManager(sandbox, DefaultTestInput, {
          getAad: {
            requiredResourceAccess: input.source,
          },
        });

        // Act
        await aadManager.postProvision(apimPluginConfig, aadPluginConfig, []);

        // Assert
        sandbox.assert.calledWithMatch(requestStub, aadMatcher.getAad);
        if (input.expected) {
          sandbox.assert.calledWithMatch(
            requestStub,
            aadMatcher.updateAad.and(
              aadMatcher.body(match.has("requiredResourceAccess", input.expected))
            )
          );
        } else {
          sandbox.assert.calledWithMatch(requestStub, aadMatcher.updateAad);
          sandbox.assert.neverCalledWithMatch(
            requestStub,
            aadMatcher.updateAad.and(match.has("requiredResourceAccess"))
          );
        }
      });
    });
  });

  describe("#refreshRedirectUri()", () => {
    const sandbox = createSandbox();
    afterEach(() => {
      sandbox.restore();
    });

    const testInput: {
      message: string;
      source: string[] | undefined;
      added: string[];
      expected: string[] | undefined;
    }[] = [
      {
        message: "Undefined source",
        source: undefined,
        added: ["https://added-url"],
        expected: ["https://added-url"],
      },
      {
        message: "Empty source",
        source: [],
        added: ["https://added-url"],
        expected: ["https://added-url"],
      },
      {
        message: "No existing redirect uri",
        source: ["https://existing-url"],
        added: ["https://added-url"],
        expected: ["https://existing-url", "https://added-url"],
      },
      {
        message: "Existing redirect uri",
        source: ["https://existing-url", "https://added-url"],
        added: ["https://added-url"],
        expected: undefined,
      },
      {
        message: "Add multiple redirect uris",
        source: ["https://existing-url", "https://added-url"],
        added: ["https://added-url", "https://added-url-1"],
        expected: ["https://existing-url", "https://added-url", "https://added-url-1"],
      },
      {
        message: "Not add uri",
        source: ["https://existing-url", "https://added-url"],
        added: [],
        expected: undefined,
      },
    ];

    testInput.forEach((input) => {
      it(input.message, async () => {
        // Arrange
        const apimPluginConfig = buildApimPluginConfig(DefaultTestInput.aadObjectId.created);
        const aadPluginConfig = buildAadPluginConfig("", "");
        const { aadManager, requestStub } = buildAadManager(sandbox, DefaultTestInput, {
          getAad: {
            web: { redirectUris: input.source },
          },
        });

        // Act
        await aadManager.postProvision(apimPluginConfig, aadPluginConfig, input.added);

        // Assert
        sandbox.assert.calledWithMatch(requestStub, aadMatcher.getAad);
        if (input.expected) {
          sandbox.assert.calledWithMatch(
            requestStub,
            aadMatcher.updateAad.and(
              aadMatcher.body(match.has("web", match.has("redirectUris", input.expected)))
            )
          );
        } else {
          sandbox.assert.calledWithMatch(requestStub, aadMatcher.updateAad);
          sandbox.assert.neverCalledWithMatch(
            requestStub,
            aadMatcher.updateAad.and(match.has("web", match.has("redirectUris")))
          );
        }
      });
    });
  });
});

function buildAadManager(
  sandbox: SinonSandbox,
  mockInput?: MockAxiosInput,
  mockOutput?: MockAxiosOutput
): {
  aadManager: AadManager;
  requestStub: any;
} {
  const res = mockAxios(sandbox, mockInput, mockOutput);
  const requestStub = res.requestStub;
  const axiosInstance = res.axiosInstance;
  const lazyAadService = new Lazy(
    async () => new AadService(axiosInstance, undefined, undefined, 2)
  );
  const aadManager = new AadManager(lazyAadService);
  return { aadManager: aadManager, requestStub: requestStub };
}

function buildApimPluginConfig(objectId?: string, clientSecret?: string): IApimPluginConfig {
  return {
    apimClientAADObjectId: objectId,
    apimClientAADClientSecret: clientSecret,
    checkAndGet(key: string): string {
      let res: string | undefined = undefined;
      if (key === ApimPluginConfigKeys.apimClientAADObjectId) {
        res = objectId;
      } else if (key === ApimPluginConfigKeys.apimClientAADClientSecret) {
        res = clientSecret;
      }
      return AssertConfigNotEmpty(TeamsToolkitComponent.ApimPlugin, key, res, "dev");
    },
  };
}

function buildAadPluginConfig(clientId: string, scopeId: string): IAadPluginConfig {
  return {
    objectId: "",
    clientId: clientId,
    oauth2PermissionScopeId: scopeId,
    applicationIdUris: "",
  };
}
