// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import mockedEnv, { RestoreFn } from "mocked-env";
import {
  MockedAzureAccountProvider,
  MockedLogProvider,
  MockedM365Provider,
  MockedUserInteraction,
} from "../../../plugins/solution/util";
import { setTools } from "../../../../src/core/globalVars";
import { AppStudioClient } from "../../../../src/component/driver/teamsApp/clients/appStudioClient";
import {
  OauthRegistrationAppType,
  OauthRegistrationTargetAudience,
} from "../../../../src/component/driver/teamsApp/interfaces/OauthRegistration";
import { SpecParser } from "@microsoft/m365-spec-parser";
import { CreateOauthDriver } from "../../../../src/component/driver/oauth/create";
import { SystemError, UserError, err } from "@microsoft/teamsfx-api";

chai.use(chaiAsPromised);
const expect = chai.expect;

const outputKeys = {
  configurationId: "REGISTRATION_ID",
};
const outputEnvVarNames = new Map<string, string>(Object.entries(outputKeys));

describe("CreateOauthDriver", () => {
  const mockedDriverContext: any = {
    m365TokenProvider: new MockedM365Provider(),
    ui: new MockedUserInteraction(),
  };
  const createOauthDriver = new CreateOauthDriver();

  let envRestore: RestoreFn | undefined;

  beforeEach(() => {
    setTools({
      ui: new MockedUserInteraction(),
      logProvider: new MockedLogProvider(),
      tokenProvider: {
        azureAccountProvider: new MockedAzureAccountProvider(),
        m365TokenProvider: new MockedM365Provider(),
      },
    });
  });

  afterEach(() => {
    sinon.restore();
    if (envRestore) {
      envRestore();
      envRestore = undefined;
    }
  });

  it("happy path: read clientSecret, refreshurl from input ", async () => {
    sinon
      .stub(AppStudioClient, "createOauthRegistration")
      .callsFake(async (token, oauthRegistration) => {
        expect(oauthRegistration.clientId).to.equals("mockedClientId");
        expect(oauthRegistration.clientSecret).to.equals("mockedClientSecret");
        expect(oauthRegistration.description).to.equals("test");
        expect(oauthRegistration.authorizationEndpoint).to.equals("mockedAuthorizationUrl");
        expect(oauthRegistration.scopes[0]).to.equals("mockedScope");
        expect(oauthRegistration.targetUrlsShouldStartWith[0]).to.equals("https://test");
        expect(oauthRegistration.tokenExchangeEndpoint).to.equals("mockedTokenUrl");
        expect(oauthRegistration.tokenRefreshEndpoint).to.equal("mockedRefreshUrl");
        expect(oauthRegistration.applicableToApps).to.equals(OauthRegistrationAppType.AnyApp);
        expect(oauthRegistration.targetAudience).to.equals(
          OauthRegistrationTargetAudience.AnyTenant
        );
        expect(oauthRegistration.specificAppId).to.equal("");
        return {
          configurationId: {
            oAuthConfigId: "mockedRegistrationId",
          },
        };
      });
    sinon.stub(SpecParser.prototype, "list").resolves({
      APIs: [
        {
          api: "api",
          server: "https://test",
          operationId: "get",
          auth: {
            name: "test",
            authScheme: {
              type: "oauth2",
              flows: {
                authorizationCode: {
                  authorizationUrl: "mockedAuthorizationUrl",
                  tokenUrl: "mockedTokenUrl",
                  scopes: {
                    mockedScope: "description for mocked scope",
                  },
                },
              },
            },
          },
          isValid: true,
          reason: [],
        },
      ],
      allAPICount: 1,
      validAPICount: 1,
    });

    const args: any = {
      name: "test",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      flow: "authorizationCode",
      refreshUrl: "mockedRefreshUrl",
    };
    const result = await createOauthDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isOk()).to.be.true;
    if (result.result.isOk()) {
      expect(result.result.value.get(outputKeys.configurationId)).to.equal("mockedRegistrationId");
      expect(result.summaries.length).to.equal(1);
    }
  });

  it("happy path: read refreshurl from input, client and clientSecret from env", async () => {
    sinon
      .stub(AppStudioClient, "createOauthRegistration")
      .callsFake(async (token, oauthRegistration) => {
        expect(oauthRegistration.clientId).to.equals("mockedClientId");
        expect(oauthRegistration.clientSecret).to.equals("mockedClientSecret");
        expect(oauthRegistration.description).to.equals("test");
        expect(oauthRegistration.authorizationEndpoint).to.equals("mockedAuthorizationUrl");
        expect(oauthRegistration.scopes[0]).to.equals("mockedScope");
        expect(oauthRegistration.targetUrlsShouldStartWith[0]).to.equals("https://test");
        expect(oauthRegistration.tokenExchangeEndpoint).to.equals("mockedTokenUrl");
        expect(oauthRegistration.tokenRefreshEndpoint).to.equal("mockedRefreshUrl");
        expect(oauthRegistration.applicableToApps).to.equals(OauthRegistrationAppType.AnyApp);
        expect(oauthRegistration.targetAudience).to.equals(
          OauthRegistrationTargetAudience.AnyTenant
        );
        expect(oauthRegistration.specificAppId).to.equal("");
        return {
          configurationId: {
            oAuthConfigId: "mockedRegistrationId",
          },
        };
      });
    sinon.stub(SpecParser.prototype, "list").resolves({
      APIs: [
        {
          api: "api",
          server: "https://test",
          operationId: "get",
          auth: {
            name: "test",
            authScheme: {
              type: "oauth2",
              flows: {
                authorizationCode: {
                  authorizationUrl: "mockedAuthorizationUrl",
                  tokenUrl: "mockedTokenUrl",
                  scopes: {
                    mockedScope: "description for mocked scope",
                  },
                },
              },
            },
          },
          isValid: true,
          reason: [],
        },
      ],
      allAPICount: 1,
      validAPICount: 1,
    });

    envRestore = mockedEnv({
      ["oauth-client-secret"]: "mockedClientSecret",
      ["oauth-client-id"]: "mockedClientId",
    });

    const args: any = {
      name: "test",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      flow: "authorizationCode",
      refreshUrl: "mockedRefreshUrl",
    };
    const result = await createOauthDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isOk()).to.be.true;
    if (result.result.isOk()) {
      expect(result.result.value.get(outputKeys.configurationId)).to.equal("mockedRegistrationId");
      expect(result.summaries.length).to.equal(1);
    }
  });

  it("happy path: read clientSecret from input and refreshurl from spec", async () => {
    sinon
      .stub(AppStudioClient, "createOauthRegistration")
      .callsFake(async (token, oauthRegistration) => {
        expect(oauthRegistration.clientId).to.equals("mockedClientId");
        expect(oauthRegistration.clientSecret).to.equals("mockedClientSecret");
        expect(oauthRegistration.description).to.equals("test");
        expect(oauthRegistration.authorizationEndpoint).to.equals("mockedAuthorizationUrl");
        expect(oauthRegistration.scopes[0]).to.equals("mockedScope");
        expect(oauthRegistration.targetUrlsShouldStartWith[0]).to.equals("https://test");
        expect(oauthRegistration.tokenExchangeEndpoint).to.equals("mockedTokenUrl");
        expect(oauthRegistration.tokenRefreshEndpoint).to.equal("mockedRefreshUrl");
        expect(oauthRegistration.applicableToApps).to.equals(OauthRegistrationAppType.AnyApp);
        expect(oauthRegistration.targetAudience).to.equals(
          OauthRegistrationTargetAudience.AnyTenant
        );
        expect(oauthRegistration.specificAppId).to.equal("");
        return {
          configurationId: {
            oAuthConfigId: "mockedRegistrationId",
          },
        };
      });
    sinon.stub(SpecParser.prototype, "list").resolves({
      APIs: [
        {
          api: "api",
          server: "https://test",
          operationId: "get",
          auth: {
            name: "test",
            authScheme: {
              type: "oauth2",
              flows: {
                authorizationCode: {
                  authorizationUrl: "mockedAuthorizationUrl",
                  tokenUrl: "mockedTokenUrl",
                  refreshUrl: "mockedRefreshUrl",
                  scopes: {
                    mockedScope: "description for mocked scope",
                  },
                },
              },
            },
          },
          isValid: true,
          reason: [],
        },
      ],
      allAPICount: 1,
      validAPICount: 1,
    });

    const args: any = {
      name: "test",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      flow: "authorizationCode",
      refreshUrl: "mockedRefreshUrl",
    };
    const result = await createOauthDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isOk()).to.be.true;
    if (result.result.isOk()) {
      expect(result.result.value.get(outputKeys.configurationId)).to.equal("mockedRegistrationId");
      expect(result.summaries.length).to.equal(1);
    }
  });

  it("happy path: read applicableToApps, targetAudience from input", async () => {
    sinon
      .stub(AppStudioClient, "createOauthRegistration")
      .callsFake(async (token, oauthRegistration) => {
        expect(oauthRegistration.clientId).to.equals("mockedClientId");
        expect(oauthRegistration.clientSecret).to.equals("mockedClientSecret");
        expect(oauthRegistration.description).to.equals("test");
        expect(oauthRegistration.authorizationEndpoint).to.equals("mockedAuthorizationUrl");
        expect(oauthRegistration.scopes[0]).to.equals("mockedScope");
        expect(oauthRegistration.targetUrlsShouldStartWith[0]).to.equals("https://test");
        expect(oauthRegistration.tokenExchangeEndpoint).to.equals("mockedTokenUrl");
        expect(oauthRegistration.tokenRefreshEndpoint).to.equal("mockedRefreshUrl");
        expect(oauthRegistration.applicableToApps).to.equals(OauthRegistrationAppType.SpecificApp);
        expect(oauthRegistration.specificAppId).to.equals("mockedAppId");
        expect(oauthRegistration.targetAudience).to.equals(
          OauthRegistrationTargetAudience.HomeTenant
        );
        return {
          configurationId: {
            oAuthConfigId: "mockedRegistrationId",
          },
        };
      });
    sinon.stub(SpecParser.prototype, "list").resolves({
      APIs: [
        {
          api: "api",
          server: "https://test",
          operationId: "get",
          auth: {
            name: "test",
            authScheme: {
              type: "oauth2",
              flows: {
                authorizationCode: {
                  authorizationUrl: "mockedAuthorizationUrl",
                  tokenUrl: "mockedTokenUrl",
                  scopes: {
                    mockedScope: "description for mocked scope",
                  },
                },
              },
            },
          },
          isValid: true,
          reason: [],
        },
      ],
      allAPICount: 1,
      validAPICount: 1,
    });

    const args: any = {
      name: "test",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      flow: "authorizationCode",
      refreshUrl: "mockedRefreshUrl",
      applicableToApps: "SpecificApp",
      targetAudience: "HomeTenant",
    };
    const result = await createOauthDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isOk()).to.be.true;
    if (result.result.isOk()) {
      expect(result.result.value.get(outputKeys.configurationId)).to.equal("mockedRegistrationId");
      expect(result.summaries.length).to.equal(1);
    }
  });

  it("happy path: registration id exists in env", async () => {
    sinon.stub(AppStudioClient, "getOauthRegistrationById").resolves({
      oAuthConfigId: "mockedId",
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      authorizationEndpoint: "mockedAuthorizationEndpoint",
      tokenExchangeEndpoint: "mockedTokenEndpoint",
      scopes: ["mockedScopes"],
      applicableToApps: OauthRegistrationAppType.AnyApp,
      targetUrlsShouldStartWith: ["mockedDomain"],
    });
    const args: any = {
      name: "test",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      flow: "authorizationCode",
      refreshUrl: "mockedRefreshUrl",
    };
    envRestore = mockedEnv({
      [outputKeys.configurationId]: "existing value",
    });
    const result = await createOauthDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isOk()).to.be.true;
    if (result.result.isOk()) {
      expect(result.result.value.size).to.equal(0);
      expect(result.summaries.length).to.equal(0);
    }
  });

  it("should throw error when empty outputEnvVarNames", async () => {
    const args: any = {
      name: "test",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      flow: "authorizationCode",
      refreshUrl: "mockedRefreshUrl",
    };
    const result = await createOauthDriver.execute(args, mockedDriverContext, undefined);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("OutputEnvironmentVariableUndefined");
    }
  });

  it("should throw error when failed to get app studio token", async () => {
    sinon
      .stub(MockedM365Provider.prototype, "getAccessToken")
      .resolves(err(new SystemError("source", "name", "message")));
    const args: any = {
      name: "test",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      flow: "authorizationCode",
      refreshUrl: "mockedRefreshUrl",
    };
    const result = await createOauthDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("name");
    }
  });

  it("should show warning if registration id exists and failed to get Oauth registration", async () => {
    sinon
      .stub(AppStudioClient, "getOauthRegistrationById")
      .throws(new SystemError("source", "name", "message"));

    const args: any = {
      name: "test",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      flow: "authorizationCode",
      refreshUrl: "mockedRefreshUrl",
    };
    envRestore = mockedEnv({
      [outputKeys.configurationId]: "existing value",
    });
    const result = await createOauthDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isOk()).to.be.true;
  });

  it("should throw error if missing name", async () => {
    const args: any = {
      name: "",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      flow: "authorizationCode",
      refreshUrl: "mockedRefreshUrl",
    };
    const result = await createOauthDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("InvalidActionInputError");
    }
  });

  it("should throw error if name is too long", async () => {
    const args: any = {
      name: "a".repeat(129),
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      flow: "authorizationCode",
      refreshUrl: "mockedRefreshUrl",
    };
    const result = await createOauthDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("OauthNameTooLong");
    }
  });

  it("should throw error if missing appId", async () => {
    const args: any = {
      name: "test",
      apiSpecPath: "mockedPath",
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      flow: "authorizationCode",
      refreshUrl: "mockedRefreshUrl",
    };
    const result = await createOauthDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("InvalidActionInputError");
    }
  });

  it("should throw error if missing clientId", async () => {
    const args: any = {
      name: "test",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      clientSecret: "mockedClientSecret",
      flow: "authorizationCode",
      refreshUrl: "mockedRefreshUrl",
    };
    const result = await createOauthDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("InvalidActionInputError");
    }
  });

  it("should throw error if missing flow", async () => {
    const args: any = {
      name: "test",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      refreshUrl: "mockedRefreshUrl",
    };
    const result = await createOauthDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("InvalidActionInputError");
    }
  });

  it("should throw error if missing apiSpecPath", async () => {
    const args: any = {
      name: "test",
      appId: "mockedAppId",
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      flow: "authorizationCode",
      refreshUrl: "mockedRefreshUrl",
    };
    const result = await createOauthDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("InvalidActionInputError");
    }
  });

  it("should throw error if invalid clientSecret", async () => {
    const args: any = {
      name: "test",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      clientId: "mockedClientId",
      clientSecret: "a",
      flow: "authorizationCode",
      refreshUrl: "mockedRefreshUrl",
    };
    const result = await createOauthDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("InvalidActionInputError");
    }
  });

  it("should throw error if domain > 1", async () => {
    const args: any = {
      name: "test",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      flow: "authorizationCode",
      refreshUrl: "mockedRefreshUrl",
    };

    sinon.stub(SpecParser.prototype, "list").resolves({
      APIs: [
        {
          api: "api",
          server: "https://test",
          operationId: "get",
          auth: {
            name: "test",
            authScheme: {
              type: "oauth2",
              flows: {
                authorizationCode: {
                  authorizationUrl: "mockedAuthorizationUrl",
                  tokenUrl: "mockedTokenUrl",
                  scopes: {
                    mockedScope: "description for mocked scope",
                  },
                },
              },
            },
          },
          isValid: true,
          reason: [],
        },
        {
          api: "api",
          server: "https://test2",
          operationId: "get",
          auth: {
            name: "test",
            authScheme: {
              type: "oauth2",
              flows: {
                authorizationCode: {
                  authorizationUrl: "mockedAuthorizationUrl",
                  tokenUrl: "mockedTokenUrl",
                  scopes: {
                    mockedScope: "description for mocked scope",
                  },
                },
              },
            },
          },
          isValid: true,
          reason: [],
        },
      ],
      allAPICount: 1,
      validAPICount: 1,
    });

    const result = await createOauthDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("OauthDomainInvalid");
    }
  });

  it("should throw error if list api is empty and domain = 0", async () => {
    sinon
      .stub(SpecParser.prototype, "list")
      .resolves({ APIs: [], validAPICount: 0, allAPICount: 1 });
    const args: any = {
      name: "test",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      flow: "authorizationCode",
      refreshUrl: "mockedRefreshUrl",
      applicableToApps: "SpecificApp",
      targetAudience: "HomeTenant",
    };

    const result = await createOauthDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("OauthFailedToGetDomain");
    }
  });

  it("should throw error if list api contains no auth and domain = 0", async () => {
    sinon.stub(SpecParser.prototype, "list").resolves({
      APIs: [
        {
          api: "api",
          server: "https://test",
          operationId: "get",
          isValid: true,
          reason: [],
        },
      ],
      validAPICount: 0,
      allAPICount: 1,
    });
    const args: any = {
      name: "test",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      flow: "authorizationCode",
      refreshUrl: "mockedRefreshUrl",
      applicableToApps: "SpecificApp",
      targetAudience: "HomeTenant",
    };

    const result = await createOauthDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("OauthFailedToGetDomain");
    }
  });

  it("should throw error if multiple auth schema", async () => {
    sinon.stub(SpecParser.prototype, "list").resolves({
      APIs: [
        {
          api: "api",
          server: "https://test",
          operationId: "get",
          auth: {
            name: "test",
            authScheme: {
              type: "oauth2",
              flows: {
                authorizationCode: {
                  authorizationUrl: "mockedAuthorizationUrl",
                  tokenUrl: "mockedTokenUrl",
                  scopes: {
                    mockedScope: "description for mocked scope",
                  },
                },
              },
            },
          },
          isValid: true,
          reason: [],
        },
        {
          api: "api",
          server: "https://test",
          operationId: "get",
          auth: {
            name: "test",
            authScheme: {
              type: "oauth2",
              flows: {
                authorizationCode: {
                  authorizationUrl: "mockedAuthorizationUrl2",
                  tokenUrl: "mockedTokenUrl2",
                  scopes: {
                    mockedScope2: "description for mocked scope",
                  },
                },
              },
            },
          },
          isValid: true,
          reason: [],
        },
      ],
      validAPICount: 0,
      allAPICount: 1,
    });
    const args: any = {
      name: "test",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      flow: "authorizationCode",
      refreshUrl: "mockedRefreshUrl",
      applicableToApps: "SpecificApp",
      targetAudience: "HomeTenant",
    };

    const result = await createOauthDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("OauthAuthInfoInvalid");
    }
  });

  it("should throw error if failed to create Oauth registration", async () => {
    sinon
      .stub(AppStudioClient, "createOauthRegistration")
      .throws(new SystemError("source", "name", "message"));
    sinon.stub(SpecParser.prototype, "list").resolves({
      APIs: [
        {
          api: "api",
          server: "https://test",
          operationId: "get",
          auth: {
            name: "test",
            authScheme: {
              type: "oauth2",
              flows: {
                authorizationCode: {
                  authorizationUrl: "mockedAuthorizationUrl",
                  tokenUrl: "mockedTokenUrl",
                  scopes: {
                    mockedScope: "description for mocked scope",
                  },
                },
              },
            },
          },
          isValid: true,
          reason: [],
        },
      ],
      allAPICount: 1,
      validAPICount: 1,
    });

    const args: any = {
      name: "test",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      flow: "authorizationCode",
      refreshUrl: "mockedRefreshUrl",
    };
    const result = await createOauthDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("name");
    }
  });

  it("should throw unhandled error if error is not SystemError or UserError", async () => {
    sinon.stub(AppStudioClient, "createOauthRegistration").throws(new Error("error"));
    sinon.stub(SpecParser.prototype, "list").resolves({
      APIs: [
        {
          api: "api",
          server: "https://test",
          operationId: "get",
          auth: {
            name: "test",
            authScheme: {
              type: "oauth2",
              flows: {
                authorizationCode: {
                  authorizationUrl: "mockedAuthorizationUrl",
                  tokenUrl: "mockedTokenUrl",
                  scopes: {
                    mockedScope: "description for mocked scope",
                  },
                },
              },
            },
          },
          isValid: true,
          reason: [],
        },
      ],
      allAPICount: 1,
      validAPICount: 1,
    });

    const args: any = {
      name: "test",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      flow: "authorizationCode",
      refreshUrl: "mockedRefreshUrl",
    };
    const result = await createOauthDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.source).to.equal("oauthRegister");
    }
  });

  it("should throw error if invalid applicableToApps and targetAudience", async () => {
    const args: any = {
      name: "test",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      flow: "authorizationCode",
      refreshUrl: "mockedRefreshUrl",
      applicableToApps: "specificapp",
      targetAudience: "hometenant",
    };
    const result = await createOauthDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("InvalidActionInputError");
      expect(result.result.error.message.includes("applicableToApps")).to.be.true;
      expect(result.result.error.message.includes("targetAudience")).to.be.true;
    }
  });

  it("should throw error if invalid flow", async () => {
    const args: any = {
      name: "test",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      flow: "test",
    };
    const result = await createOauthDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("InvalidActionInputError");
      expect(result.result.error.message.includes("flow")).to.be.true;
    }
  });
});
