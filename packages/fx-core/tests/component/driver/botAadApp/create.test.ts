// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import mockedEnv, { RestoreFn } from "mocked-env";
import { CreateBotAadAppDriver } from "../../../../src/component/driver/botAadApp/create";
import {
  MockedLogProvider,
  MockedM365Provider,
  MockedTelemetryReporter,
} from "../../../plugins/solution/util";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { err, ok, UserError } from "@microsoft/teamsfx-api";
import {
  HttpClientError,
  HttpServerError,
  InvalidActionInputError,
  UnhandledError,
  UnhandledUserError,
} from "../../../../src";
import { AadAppClient } from "../../../../src/component/driver/aad/utility/aadAppClient";
import { AADApplication } from "../../../../src/component/driver/aad/interface/AADApplication";
import { OutputEnvironmentVariableUndefinedError } from "../../../../src/component/driver/error/outputEnvironmentVariableUndefinedError";
import { AadAppNameTooLongError } from "../../../../src/component/driver/aad/error/aadAppNameTooLongError";
import { MissingServiceManagementReferenceError } from "../../../../src/component/driver/aad/error/missingServiceManagamentReferenceError";

chai.use(chaiAsPromised);
const expect = chai.expect;

const outputKeys = {
  botId: "BOT_ID",
  botPassword: "SECRET_BOT_PASSWORD",
};

const outputEnvVarNames = new Map<string, string>(Object.entries(outputKeys));

describe("botAadAppCreate", async () => {
  const expectedObjectId = "00000000-0000-0000-0000-000000000000";
  const expectedClientId = "00000000-0000-0000-0000-111111111111";
  const expectedDisplayName = "AAD app name";
  const expectedSecretText = "fake secret";
  const createBotAadAppDriver = new CreateBotAadAppDriver();
  const mockedDriverContext: any = {
    m365TokenProvider: new MockedM365Provider(),
    telemetryReporter: new MockedTelemetryReporter(),
    logProvider: new MockedLogProvider(),
  };

  let envRestore: RestoreFn | undefined;

  afterEach(() => {
    sinon.restore();
    if (envRestore) {
      envRestore();
      envRestore = undefined;
    }
  });

  it("should throw error if argument property is missing", async () => {
    const args: any = {};
    await expect(
      createBotAadAppDriver.handler(args, mockedDriverContext, outputEnvVarNames)
    ).to.rejectedWith(InvalidActionInputError);
  });

  it("should throw error if argument property is invalid", async () => {
    const args: any = {
      name: "",
    };
    await expect(
      createBotAadAppDriver.handler(args, mockedDriverContext, outputEnvVarNames)
    ).to.rejectedWith(InvalidActionInputError);
  });

  it("should throw error if Microsoft Entra app name exceeds 120 characters", async () => {
    const invalidAppName = "a".repeat(121);
    const args: any = {
      name: invalidAppName,
    };
    const result = await createBotAadAppDriver.execute(
      args,
      mockedDriverContext,
      outputEnvVarNames
    );
    expect(result.result.isErr()).to.be.true;
    expect(result.result._unsafeUnwrapErr()).is.instanceOf(AadAppNameTooLongError);
  });

  it("should throw error if outputEnvVarNames is undefined", async () => {
    const args: any = {
      name: "test",
    };

    await expect(createBotAadAppDriver.handler(args, mockedDriverContext)).to.rejectedWith(
      OutputEnvironmentVariableUndefinedError
    );
  });

  it("happy path with handler", async () => {
    const args: any = {
      name: expectedDisplayName,
    };

    sinon.stub(AadAppClient.prototype, "createAadApp").resolves({
      id: expectedObjectId,
      displayName: expectedDisplayName,
      appId: expectedClientId,
    } as AADApplication);

    sinon.stub(AadAppClient.prototype, "generateClientSecret").resolves(expectedSecretText);

    const result = await createBotAadAppDriver.handler(
      args,
      mockedDriverContext,
      outputEnvVarNames
    );

    console.log(JSON.stringify(result));

    expect(result.output.get(outputKeys.botId)).to.be.equal(expectedClientId);
    expect(result.output.get(outputKeys.botPassword)).to.be.equal(expectedSecretText);
  });

  it("happy path with execute", async () => {
    const args: any = {
      name: expectedDisplayName,
    };

    sinon.stub(AadAppClient.prototype, "createAadApp").resolves({
      id: expectedObjectId,
      displayName: expectedDisplayName,
      appId: expectedClientId,
    } as AADApplication);

    sinon.stub(AadAppClient.prototype, "generateClientSecret").resolves(expectedSecretText);

    const result = await createBotAadAppDriver.execute(
      args,
      mockedDriverContext,
      outputEnvVarNames
    );
    expect(result.result.isOk()).to.be.true;
    expect(result.result.isOk() && result.result.value.get(outputKeys.botId)).to.be.equal(
      expectedClientId
    );
    expect(result.result.isOk() && result.result.value.get(outputKeys.botPassword)).to.be.equal(
      expectedSecretText
    );
  });

  it("should throw user error when GraphClient failed with 4xx error", async () => {
    sinon.stub(AadAppClient.prototype, "createAadApp").rejects({
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          error: {
            code: "Request_BadRequest",
            message:
              "Invalid value specified for property 'displayName' of resource 'Application'.",
          },
        },
      },
    });

    const args: any = {
      name: expectedDisplayName,
    };

    await expect(
      createBotAadAppDriver.handler(args, mockedDriverContext, outputEnvVarNames)
    ).to.be.rejected.then((error) => {
      expect(error instanceof HttpClientError).to.be.true;
      expect(error.message).contains(
        'A http client error occurred while performing the botAadApp/create task. The error response is: {"error":{"code":"Request_BadRequest","message":"Invalid value specified for property \'displayName\' of resource \'Application\'."}}'
      );
    });
  });

  it("should throw system error when GraphClient failed with non 4xx error", async () => {
    sinon.stub(AadAppClient.prototype, "createAadApp").rejects({
      isAxiosError: true,
      response: {
        status: 500,
        data: {
          error: {
            code: "InternalServerError",
            message: "Internal server error",
          },
        },
      },
    });

    const args: any = {
      name: expectedDisplayName,
    };

    await expect(
      createBotAadAppDriver.handler(args, mockedDriverContext, outputEnvVarNames)
    ).to.be.rejected.then((error) => {
      expect(error instanceof HttpServerError).to.be.true;
      expect(error.message).equals(
        'A http server error occurred while performing the botAadApp/create task. Try again later. The error response is: {"error":{"code":"InternalServerError","message":"Internal server error"}}'
      );
    });
  });

  it("should throw error when GraphClient throws errors", async () => {
    sinon.stub(AadAppClient.prototype, "createAadApp").throwsException();
    const args: any = {
      name: expectedDisplayName,
    };
    await expect(
      createBotAadAppDriver.handler(args, mockedDriverContext, outputEnvVarNames)
    ).to.be.rejected.then((error) => {
      expect(error instanceof UnhandledError).to.be.true;
    });
  });

  it("should throw UnexpectedEmptyBotPasswordError when bot password is empty", async () => {
    envRestore = mockedEnv({
      [outputKeys.botId]: expectedClientId,
      [outputKeys.botPassword]: "",
    });

    const args: any = {
      name: expectedDisplayName,
    };

    await expect(createBotAadAppDriver.handler(args, mockedDriverContext, outputEnvVarNames))
      .to.be.eventually.rejectedWith(
        "Bot password is empty. Add it in env file or clear bot id to have bot id/password pair regenerated. action: botAadApp/create."
      )
      .and.is.instanceOf(UserError);
  });

  it("should throw MissingServiceManagementReferenceError when using microsoft.com account", async () => {
    sinon
      .stub(mockedDriverContext.m365TokenProvider, "getJsonObject")
      .resolves(ok({ unique_name: "test@microsoft.com" }));

    const args: any = {
      name: expectedDisplayName,
    };

    await expect(
      createBotAadAppDriver.handler(args, mockedDriverContext, outputEnvVarNames)
    ).to.be.rejected.then((error) => {
      expect(error instanceof MissingServiceManagementReferenceError).to.be.true;
    });
  });

  it("should not throw MissingServiceManagementReferenceError when not using microsoft.com account", async () => {
    sinon
      .stub(mockedDriverContext.m365TokenProvider, "getJsonObject")
      .resolves(ok({ unique_name: "test@example.com" }));

    const args: any = {
      name: expectedDisplayName,
    };

    sinon.stub(AadAppClient.prototype, "createAadApp").resolves({
      id: expectedObjectId,
      displayName: expectedDisplayName,
      appId: expectedClientId,
    } as AADApplication);

    sinon.stub(AadAppClient.prototype, "generateClientSecret").resolves(expectedSecretText);

    const result = await createBotAadAppDriver.execute(
      args,
      mockedDriverContext,
      outputEnvVarNames
    );
    expect(result.result.isOk()).to.be.true;
  });

  it("should not throw MissingServiceManagementReferenceError when botId already exists", async () => {
    envRestore = mockedEnv({
      [outputKeys.botId]: expectedClientId,
      [outputKeys.botPassword]: expectedSecretText,
    });

    sinon
      .stub(mockedDriverContext.m365TokenProvider, "getJsonObject")
      .resolves(ok({ unique_name: "test@microsoft.com" }));

    const args: any = {
      name: expectedDisplayName,
    };

    const result = await createBotAadAppDriver.execute(
      args,
      mockedDriverContext,
      outputEnvVarNames
    );
    expect(result.result.isOk()).to.be.true;
  });

  it("should use service management reference value from environment variable when set", async () => {
    // This functionality is for internal use only.
    const expectedServiceManagementReference = "00000000-0000-0000-0000-000000000000";

    envRestore = mockedEnv({
      TTK_DEFAULT_SERVICE_MANAGEMENT_REFERENCE: expectedServiceManagementReference,
    });

    const args: any = {
      name: expectedDisplayName,
    };

    sinon
      .stub(AadAppClient.prototype, "createAadApp")
      .callsFake(async (displayName, signInAudience, serviceManagementReference) => {
        expect(serviceManagementReference).to.equal(expectedServiceManagementReference);
        return {
          id: expectedObjectId,
          displayName: expectedDisplayName,
          appId: expectedClientId,
        } as AADApplication;
      });

    sinon.stub(AadAppClient.prototype, "generateClientSecret").resolves(expectedSecretText);

    const result = await createBotAadAppDriver.execute(
      args,
      mockedDriverContext,
      outputEnvVarNames
    );
    expect(result.result.isOk()).to.be.true;
  });

  it("should be good when reusing existing bot in env", async () => {
    envRestore = mockedEnv({
      [outputKeys.botId]: expectedClientId,
      [outputKeys.botPassword]: expectedSecretText,
    });

    const args: any = {
      name: expectedDisplayName,
    };

    const result = await createBotAadAppDriver.execute(
      args,
      mockedDriverContext,
      outputEnvVarNames
    );
    expect(result.result.isOk()).to.be.true;
    expect(result.result.isOk() && result.result.value.get(outputKeys.botId)).to.be.equal(
      expectedClientId
    );
    expect(result.result.isOk() && result.result.value.get(outputKeys.botPassword)).to.be.equal(
      expectedSecretText
    );
  });

  it("should success when no log provider in context", async () => {
    const args: any = {
      name: expectedDisplayName,
    };
    const progressBar = {
      next: sinon.stub(),
    };
    const mockedDriverContextWithNoLogProvider: any = {
      m365TokenProvider: new MockedM365Provider(),
      telemetryReporter: new MockedTelemetryReporter(),
    };

    sinon.stub(AadAppClient.prototype, "createAadApp").resolves({
      id: expectedObjectId,
      displayName: expectedDisplayName,
      appId: expectedClientId,
    } as AADApplication);

    sinon.stub(AadAppClient.prototype, "generateClientSecret").resolves(expectedSecretText);

    mockedDriverContextWithNoLogProvider.progressBar = progressBar;

    const result = await createBotAadAppDriver.execute(
      args,
      mockedDriverContextWithNoLogProvider,
      outputEnvVarNames
    );
    expect(result.result.isOk()).to.be.true;
  });

  it("handler", async () => {
    const args: any = {
      name: expectedDisplayName,
    };
    const progressBar = {
      next: sinon.stub(),
    };
    const mockedDriverContextWithNoLogProvider: any = {
      m365TokenProvider: new MockedM365Provider(),
      telemetryReporter: new MockedTelemetryReporter(),
    };

    sinon.stub(createBotAadAppDriver, "validateArgs").throws({ name: "AadCreateAppError" });

    mockedDriverContextWithNoLogProvider.progressBar = progressBar;

    try {
      await createBotAadAppDriver.handler(
        args,
        mockedDriverContextWithNoLogProvider,
        outputEnvVarNames
      );
      expect.fail();
    } catch (e) {
      expect(e instanceof UnhandledError).to.be.true;
    }
  });

  it("should output delete aad information when using microsoft tenant", async () => {
    // Set default service management reference to avoid MissingServiceManagementReferenceError
    envRestore = mockedEnv({
      TTK_DEFAULT_SERVICE_MANAGEMENT_REFERENCE: "00000000-0000-0000-0000-000000000000",
    });

    sinon
      .stub(mockedDriverContext.m365TokenProvider, "getJsonObject")
      .resolves(ok({ unique_name: "test@microsoft.com" }));
    const args: any = {
      name: expectedDisplayName,
    };

    sinon.stub(AadAppClient.prototype, "createAadApp").resolves({
      id: expectedObjectId,
      displayName: expectedDisplayName,
      appId: expectedClientId,
    } as AADApplication);

    sinon.stub(AadAppClient.prototype, "generateClientSecret").resolves(expectedSecretText);

    const result = await createBotAadAppDriver.handler(
      args,
      mockedDriverContext,
      outputEnvVarNames
    );

    expect(result.output.get(outputKeys.botId)).to.be.equal(expectedClientId);
    expect(result.output.get(outputKeys.botPassword)).to.be.equal(expectedSecretText);
    expect(result.summaries[0]).includes(
      "Teams toolkit will delete the Microsoft Entra application after debugging"
    );
  });

  it("should not output delete aad information when using non microsoft tenant", async () => {
    sinon
      .stub(mockedDriverContext.m365TokenProvider, "getJsonObject")
      .resolves(ok({ unique_name: "test@test.com" }));
    const args: any = {
      name: expectedDisplayName,
    };

    sinon.stub(AadAppClient.prototype, "createAadApp").resolves({
      id: expectedObjectId,
      displayName: expectedDisplayName,
      appId: expectedClientId,
    } as AADApplication);

    sinon.stub(AadAppClient.prototype, "generateClientSecret").resolves(expectedSecretText);

    const result = await createBotAadAppDriver.handler(
      args,
      mockedDriverContext,
      outputEnvVarNames
    );

    expect(result.output.get(outputKeys.botId)).to.be.equal(expectedClientId);
    expect(result.output.get(outputKeys.botPassword)).to.be.equal(expectedSecretText);
    expect(result.summaries[0]).not.includes(
      "Teams toolkit will delete the Microsoft Entra application after debugging"
    );
  });

  it("should not output delete aad information when using non login information", async () => {
    sinon
      .stub(mockedDriverContext.m365TokenProvider, "getJsonObject")
      .resolves(err(new Error("Test error")));
    const args: any = {
      name: expectedDisplayName,
    };

    sinon.stub(AadAppClient.prototype, "createAadApp").resolves({
      id: expectedObjectId,
      displayName: expectedDisplayName,
      appId: expectedClientId,
    } as AADApplication);

    sinon.stub(AadAppClient.prototype, "generateClientSecret").resolves(expectedSecretText);

    const result = await createBotAadAppDriver.handler(
      args,
      mockedDriverContext,
      outputEnvVarNames
    );

    expect(result.output.get(outputKeys.botId)).to.be.equal(expectedClientId);
    expect(result.output.get(outputKeys.botPassword)).to.be.equal(expectedSecretText);
    expect(result.summaries[0]).not.includes(
      "Teams toolkit will delete the Microsoft Entra application after debugging"
    );
  });
});
