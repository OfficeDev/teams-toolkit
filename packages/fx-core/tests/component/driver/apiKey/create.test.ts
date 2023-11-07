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
import { CreateApiKeyDriver } from "../../../../src/component/driver/apiKey/create";
import { AppStudioClient } from "../../../../src/component/driver/teamsApp/clients/appStudioClient";
import { ApiSecretRegistrationAppType } from "../../../../src/component/driver/teamsApp/interfaces/ApiSecretRegistration";
import { SystemError, err } from "@microsoft/teamsfx-api";
import { setTools } from "../../../../src/core/globalVars";
import { SpecParser } from "../../../../src/common/spec-parser";

chai.use(chaiAsPromised);
const expect = chai.expect;

const outputKeys = {
  registrationId: "REGISTRATION_ID",
};

const outputEnvVarNames = new Map<string, string>(Object.entries(outputKeys));

describe("CreateApiKeyDriver", () => {
  const mockedDriverContext: any = {
    m365TokenProvider: new MockedM365Provider(),
    ui: new MockedUserInteraction(),
  };
  const createApiKeyDriver = new CreateApiKeyDriver();

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

  it("happy path: create registraionid, read domain from api spec, clientSecret from input", async () => {
    sinon.stub(AppStudioClient, "createApiKeyRegistration").resolves({
      id: "mockedRegistrationId",
      clientSecrets: [],
      targetUrlsShouldStartWith: [],
      applicableToApps: ApiSecretRegistrationAppType.SpecificApp,
    });
    sinon.stub(SpecParser.prototype, "list").resolves([
      {
        api: "api",
        server: "https://test",
        operationId: "get",
        auth: {
          type: "apiKey",
          name: "test",
          in: "header",
        },
      },
    ]);

    const args: any = {
      name: "test",
      domain: "https://test",
      appId: "mockedAppId",
      clientSecret: "mockedClientSecret, mockedClientSecret2",
    };
    const result = await createApiKeyDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isOk()).to.be.true;
    if (result.result.isOk()) {
      expect(result.result.value.get(outputKeys.registrationId)).to.equal("mockedRegistrationId");
      expect(result.summaries.length).to.equal(1);
    }
  });

  it("happy path: create registraionid and read domain from env and secret from env", async () => {
    sinon.stub(AppStudioClient, "createApiKeyRegistration").resolves({
      id: "mockedRegistrationId",
      clientSecrets: [],
      targetUrlsShouldStartWith: [],
      applicableToApps: ApiSecretRegistrationAppType.SpecificApp,
    });
    sinon.stub(SpecParser.prototype, "list").resolves([
      {
        api: "api",
        server: "https://test",
        operationId: "get",
        auth: {
          type: "apiKey",
          name: "test",
          in: "header",
        },
      },
    ]);

    envRestore = mockedEnv({
      ["api-key"]: "existingvalue",
    });
    const args: any = {
      name: "test",
      domain: "https://test",
      appId: "mockedAppId",
    };
    const result = await createApiKeyDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isOk()).to.be.true;
    if (result.result.isOk()) {
      expect(result.result.value.get(outputKeys.registrationId)).to.equal("mockedRegistrationId");
      expect(result.summaries.length).to.equal(1);
    }
  });

  it("happy path: registration id exists in env", async () => {
    sinon.stub(AppStudioClient, "getApiKeyRegistrationById").resolves({
      id: "mockedRegistrationId",
      clientSecrets: [],
      targetUrlsShouldStartWith: [],
      applicableToApps: ApiSecretRegistrationAppType.SpecificApp,
    });

    const args: any = {
      name: "test",
      domain: "https://test",
      appId: "mockedAppId",
      clientSecret: "mockedClientSecret",
    };
    envRestore = mockedEnv({
      [outputKeys.registrationId]: "existing value",
    });
    const result = await createApiKeyDriver.execute(args, mockedDriverContext, outputEnvVarNames);
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
      clientSecret: "mockedClientSecret",
    };
    const result = await createApiKeyDriver.execute(args, mockedDriverContext, undefined);
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
      clientSecret: "mockedClientSecret",
    };
    const result = await createApiKeyDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("name");
    }
  });

  it("should show warning if registration id exists and failed to get API key", async () => {
    sinon
      .stub(AppStudioClient, "getApiKeyRegistrationById")
      .throws(new SystemError("source", "name", "message"));

    const args: any = {
      name: "test",
      appId: "mockedAppId",
      clientSecret: "mockedClientSecret",
    };
    envRestore = mockedEnv({
      [outputKeys.registrationId]: "existing value",
    });
    const result = await createApiKeyDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isOk()).to.be.true;
  });

  it("should throw error if missing name", async () => {
    const args: any = {
      name: "",
      appId: "mockedAppId",
      clientSecret: "mockedClientSecret",
    };
    const result = await createApiKeyDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("InvalidActionInputError");
    }
  });

  it("should throw error if name is too long", async () => {
    const args: any = {
      name: "a".repeat(129),
      appId: "mockedAppId",
      clientSecret: "mockedClientSecret",
    };
    const result = await createApiKeyDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("ApiKeyNameTooLong");
    }
  });

  it("should throw error if missing appId", async () => {
    const args: any = {
      name: "test",
      appId: "",
      clientSecret: "mockedClientSecret",
    };
    const result = await createApiKeyDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("InvalidActionInputError");
    }
  });

  it("should throw error if invalid clientSecret", async () => {
    let args: any = {
      name: "test",
      appId: "",
      clientSecret: "secret",
    };
    let result = await createApiKeyDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("ApiKeyClientSecretInvalid");
    }

    args = {
      name: "test",
      appId: "",
      clientSecret: "mockedSecret, mockedSecret2, mockedSecret3",
    };
    result = await createApiKeyDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("ApiKeyClientSecretInvalid");
    }
  });

  it("should throw error if domain > 1", async () => {
    const args: any = {
      name: "test",
      appId: "mockedAppId",
      clientSecret: "mockedSecret",
    };
    sinon.stub(SpecParser.prototype, "list").resolves([
      {
        api: "api",
        server: "https://test",
        operationId: "get",
        auth: {
          type: "apiKey",
          name: "test",
          in: "header",
        },
      },
      {
        api: "api",
        server: "https://test2",
        operationId: "get",
        auth: {
          type: "apiKey",
          name: "test",
          in: "header",
        },
      },
    ]);
    const result = await createApiKeyDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("ApiKeyDomainInvalid");
    }
  });

  it("should throw error if domain = 0", async () => {
    const args: any = {
      name: "test",
      appId: "mockedAppId",
      clientSecret: "mockedSecret",
    };
    sinon.stub(SpecParser.prototype, "list").resolves([]);
    const result = await createApiKeyDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("ApiKeyFailedToGetDomain");
    }
  });

  it("should throw error if failed to create API key", async () => {
    sinon
      .stub(AppStudioClient, "createApiKeyRegistration")
      .throws(new SystemError("source", "name", "message"));
    sinon.stub(SpecParser.prototype, "list").resolves([
      {
        api: "api",
        server: "https://test",
        operationId: "get",
        auth: {
          type: "apiKey",
          name: "test",
          in: "header",
        },
      },
    ]);

    const args: any = {
      name: "test",
      appId: "mockedAppId",
      clientSecret: "mockedClientSecret, mockedClientSecret2",
    };
    const result = await createApiKeyDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.name).to.equal("name");
    }
  });

  it("should throw unhandled error if error is not SystemError or UserError", async () => {
    sinon.stub(MockedM365Provider.prototype, "getAccessToken").throws(new Error("unhandled error"));
    const args: any = {
      name: "test",
      appId: "mockedAppId",
      clientSecret: "mockedClientSecret, mockedClientSecret2",
    };
    const result = await createApiKeyDriver.execute(args, mockedDriverContext, outputEnvVarNames);
    expect(result.result.isErr()).to.be.true;
    if (result.result.isErr()) {
      expect(result.result.error.source).to.equal("apiKeyCreate");
    }
  });
});
