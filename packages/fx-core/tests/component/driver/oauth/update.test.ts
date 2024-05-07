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
import { UpdateOauthDriver } from "../../../../src/component/driver/oauth/update";
import {
  OauthRegistrationAppType,
  OauthRegistrationTargetAudience,
} from "../../../../src/component/driver/teamsApp/interfaces/OauthRegistration";
import { SpecParser } from "@microsoft/m365-spec-parser";
import { ConfirmConfig, UserError, err, ok } from "@microsoft/teamsfx-api";
import { UpdateOauthArgs } from "../../../../src/component/driver/oauth/interface/updateOauthArgs";

chai.use(chaiAsPromised);
const expect = chai.expect;

describe("CreateOauthDriver", () => {
  const mockedDriverContext: any = {
    m365TokenProvider: new MockedM365Provider(),
    ui: new MockedUserInteraction(),
  };
  const updateOauthDriver = new UpdateOauthDriver();

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

  it("happy path: update all fields", async () => {
    sinon.stub(AppStudioClient, "updateOauthRegistration").resolves({
      description: "mockedDescription",
      targetUrlsShouldStartWith: ["https://test2"],
      applicableToApps: OauthRegistrationAppType.SpecificApp,
      targetAudience: OauthRegistrationTargetAudience.HomeTenant,
      m365AppId: "mockedAppId",
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      authorizationEndpoint: "mockedAuthorizationEndpoint",
      tokenExchangeEndpoint: "mockedTokenExchangeEndpoint",
      scopes: ["mockedScope"],
    });
    sinon.stub(AppStudioClient, "getOauthRegistrationById").resolves({
      oAuthConfigId: "mockedRegistrationId",
      description: "mockedDescription",
      targetUrlsShouldStartWith: ["https://test"],
      applicableToApps: OauthRegistrationAppType.AnyApp,
      targetAudience: OauthRegistrationTargetAudience.AnyTenant,
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      authorizationEndpoint: "mockedAuthorizationEndpoint",
      tokenExchangeEndpoint: "mockedTokenExchangeEndpoint",
      scopes: ["mockedScope"],
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
                  authorizationUrl: "https://test",
                  tokenUrl: "https://test",
                  scopes: {
                    mockedScopes: "mockedScopes",
                  },
                },
              },
            },
          },
          isValid: true,
          reason: [],
        },
        {
          api: "api2",
          server: "https://test",
          operationId: "get",
          auth: {
            name: "test2",
            authScheme: {
              type: "oauth2",
              flows: {
                authorizationCode: {
                  authorizationUrl: "https://test",
                  tokenUrl: "https://test",
                  scopes: {
                    mockedScopes: "mockedScopes",
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
    sinon.stub(mockedDriverContext.ui, "confirm").callsFake(async (config) => {
      expect((config as ConfirmConfig).title.includes("description")).to.be.true;
      expect((config as ConfirmConfig).title.includes("applicableToApps")).to.be.true;
      expect((config as ConfirmConfig).title.includes("m365AppId")).to.be.true;
      expect((config as ConfirmConfig).title.includes("targetAudience")).to.be.true;
      return ok({ type: "success", value: true });
    });

    const args: UpdateOauthArgs = {
      name: "test2",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      targetAudience: "HomeTenant",
      applicableToApps: "SpecificApp",
      configurationId: "mockedRegistrationId",
    };

    const result = await updateOauthDriver.execute(args, mockedDriverContext);
    expect(result.result.isOk()).to.be.true;
    if (result.result.isOk()) {
      expect(result.result.value.size).to.equal(0);
      expect(result.summaries.length).to.equal(1);
    }
  });

  it("happy path: does not update when no changes", async () => {
    sinon.stub(AppStudioClient, "getOauthRegistrationById").resolves({
      oAuthConfigId: "mockedRegistrationId",
      description: "test",
      targetUrlsShouldStartWith: ["https://test"],
      applicableToApps: OauthRegistrationAppType.AnyApp,
      targetAudience: OauthRegistrationTargetAudience.AnyTenant,
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      authorizationEndpoint: "mockedAuthorizationEndpoint",
      tokenExchangeEndpoint: "mockedTokenExchangeEndpoint",
      scopes: ["mockedScope"],
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
                  authorizationUrl: "https://test",
                  tokenUrl: "https://test",
                  scopes: {
                    mockedScopes: "mockedScopes",
                  },
                },
              },
            },
          },
          isValid: true,
          reason: [],
        },
        {
          api: "api2",
          server: "https://test",
          operationId: "get",
          auth: {
            name: "test2",
            authScheme: {
              type: "oauth2",
              flows: {
                authorizationCode: {
                  authorizationUrl: "https://test",
                  tokenUrl: "https://test",
                  scopes: {
                    mockedScopes: "mockedScopes",
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

    const args: UpdateOauthArgs = {
      name: "test",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      targetAudience: "AnyTenant",
      applicableToApps: "AnyApp",
      configurationId: "mockedRegistrationId",
    };

    const result = await updateOauthDriver.execute(args, mockedDriverContext);
    expect(result.result.isOk()).to.be.true;
    if (result.result.isOk()) {
      expect(result.result.value.size).to.equal(0);
      expect(result.summaries.length).to.equal(1);
    }
  });

  it("happy path: should not show confirm when only devtunnel url is different", async () => {
    sinon.stub(AppStudioClient, "updateOauthRegistration").resolves({
      description: "mockedDescription",
      targetUrlsShouldStartWith: ["https://test2.asse.devtunnels.ms"],
      applicableToApps: OauthRegistrationAppType.SpecificApp,
      targetAudience: OauthRegistrationTargetAudience.HomeTenant,
      m365AppId: "mockedAppId",
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      authorizationEndpoint: "mockedAuthorizationEndpoint",
      tokenExchangeEndpoint: "mockedTokenExchangeEndpoint",
      scopes: ["mockedScope"],
    });
    sinon.stub(AppStudioClient, "getOauthRegistrationById").resolves({
      oAuthConfigId: "mockedRegistrationId",
      description: "test",
      targetUrlsShouldStartWith: ["https://test.asse.devtunnels.ms"],
      applicableToApps: OauthRegistrationAppType.AnyApp,
      targetAudience: OauthRegistrationTargetAudience.AnyTenant,
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      authorizationEndpoint: "mockedAuthorizationEndpoint",
      tokenExchangeEndpoint: "mockedTokenExchangeEndpoint",
      scopes: ["mockedScope"],
    });
    sinon.stub(SpecParser.prototype, "list").resolves({
      APIs: [
        {
          api: "api",
          server: "https://test2.asse.devtunnels.ms",
          operationId: "get",
          auth: {
            name: "test",
            authScheme: {
              type: "oauth2",
              flows: {
                authorizationCode: {
                  authorizationUrl: "https://test",
                  tokenUrl: "https://test",
                  scopes: {
                    mockedScopes: "mockedScopes",
                  },
                },
              },
            },
          },
          isValid: true,
          reason: [],
        },
        {
          api: "api2",
          server: "https://test2.asse.devtunnels.ms",
          operationId: "get",
          auth: {
            name: "test2",
            authScheme: {
              type: "oauth2",
              flows: {
                authorizationCode: {
                  authorizationUrl: "https://test",
                  tokenUrl: "https://test",
                  scopes: {
                    mockedScopes: "mockedScopes",
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

    const confirmStub = sinon
      .stub(mockedDriverContext.ui, "confirm")
      .resolves(ok({ type: "success", value: true }));

    const args: UpdateOauthArgs = {
      name: "test",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      targetAudience: "AnyTenant",
      applicableToApps: "AnyApp",
      configurationId: "mockedRegistrationId",
    };

    const result = await updateOauthDriver.execute(args, mockedDriverContext);
    expect(result.result.isOk()).to.be.true;
    if (result.result.isOk()) {
      expect(result.result.value.size).to.equal(0);
      expect(result.summaries.length).to.equal(1);
    }
    expect(confirmStub.notCalled).to.be.true;
  });

  it("should throw error when user canel", async () => {
    sinon.stub(AppStudioClient, "getOauthRegistrationById").resolves({
      oAuthConfigId: "mockedRegistrationId",
      description: "mockedDescription",
      targetUrlsShouldStartWith: ["https://test"],
      applicableToApps: OauthRegistrationAppType.AnyApp,
      targetAudience: OauthRegistrationTargetAudience.AnyTenant,
      clientId: "mockedClientId",
      clientSecret: "mockedClientSecret",
      authorizationEndpoint: "mockedAuthorizationEndpoint",
      tokenExchangeEndpoint: "mockedTokenExchangeEndpoint",
      scopes: ["mockedScope"],
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
                  authorizationUrl: "https://test",
                  tokenUrl: "https://test",
                  scopes: {
                    mockedScopes: "mockedScopes",
                  },
                },
              },
            },
          },
          isValid: true,
          reason: [],
        },
        {
          api: "api2",
          server: "https://test",
          operationId: "get",
          auth: {
            name: "test2",
            authScheme: {
              type: "oauth2",
              flows: {
                authorizationCode: {
                  authorizationUrl: "https://test",
                  tokenUrl: "https://test",
                  scopes: {
                    mockedScopes: "mockedScopes",
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

    sinon
      .stub(mockedDriverContext.ui, "confirm")
      .returns(err(new UserError("source", "userCancelled", "Cancel by user")));
    const args: UpdateOauthArgs = {
      name: "test2",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      targetAudience: "HomeTenant",
      applicableToApps: "SpecificApp",
      configurationId: "mockedRegistrationId",
    };

    const result = await updateOauthDriver.execute(args, mockedDriverContext);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("userCancelled");
    }
  });

  it("should throw error if missing name", async () => {
    const args: any = {
      name: "",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      configurationId: "mockedRegistrationId",
    };
    const result = await updateOauthDriver.execute(args, mockedDriverContext);
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
      configurationId: "mockedRegistrationId",
    };
    const result = await updateOauthDriver.execute(args, mockedDriverContext);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("OauthNameTooLong");
    }
  });

  it("should throw error if missing appId", async () => {
    const args: any = {
      name: "",
      apiSpecPath: "mockedPath",
      configurationId: "mockedRegistrationId",
    };
    const result = await updateOauthDriver.execute(args, mockedDriverContext);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("InvalidActionInputError");
    }
  });

  it("should throw error if missing apiSpecPath", async () => {
    const args: any = {
      name: "",
      appId: "mockedAppId",
      configurationId: "mockedRegistrationId",
    };
    const result = await updateOauthDriver.execute(args, mockedDriverContext);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("InvalidActionInputError");
    }
  });

  it("should throw error if missing registrationId", async () => {
    const args: any = {
      name: "",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
    };
    const result = await updateOauthDriver.execute(args, mockedDriverContext);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("InvalidActionInputError");
    }
  });

  it("should throw error if invalid applicableToApps", async () => {
    const args: any = {
      name: "name",
      appId: "mockedAppId",
      configurationId: "mockedRegistrationId",
      apiSpecPath: "mockedPath",
      applicableToApps: "test",
    };
    const result = await updateOauthDriver.execute(args, mockedDriverContext);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("InvalidActionInputError");
    }
  });

  it("should throw error if invalid targetAudience", async () => {
    const args: any = {
      name: "name",
      appId: "mockedAppId",
      configurationId: "mockedRegistrationId",
      apiSpecPath: "mockedPath",
      targetAudience: "test",
    };
    const result = await updateOauthDriver.execute(args, mockedDriverContext);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("InvalidActionInputError");
    }
  });

  it("should throw error when unhandled error", async () => {
    sinon.stub(MockedM365Provider.prototype, "getAccessToken").throws(new Error("unhandled error"));
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
                  authorizationUrl: "https://test",
                  tokenUrl: "https://test",
                  scopes: {
                    mockedScopes: "mockedScopes",
                  },
                },
              },
            },
          },
          isValid: true,
          reason: [],
        },
        {
          api: "api2",
          server: "https://test",
          operationId: "get",
          auth: {
            name: "test2",
            authScheme: {
              type: "oauth2",
              flows: {
                authorizationCode: {
                  authorizationUrl: "https://test",
                  tokenUrl: "https://test",
                  scopes: {
                    mockedScopes: "mockedScopes",
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
    const args: UpdateOauthArgs = {
      name: "test2",
      appId: "mockedAppId",
      apiSpecPath: "mockedPath",
      targetAudience: "HomeTenant",
      applicableToApps: "SpecificApp",
      configurationId: "mockedRegistrationId",
    };

    const result = await updateOauthDriver.execute(args, mockedDriverContext);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.source).to.equal("oauthUpdate");
    }
  });
});
