// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import mockedEnv, { RestoreFn } from "mocked-env";
import { CreateAadAppDriver } from "../../../../src/component/driver/aad/create";
import {
  MockedM365Provider,
  MockedTelemetryReporter,
  MockedUserInteraction,
} from "../../../plugins/solution/util";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { AadAppClient } from "../../../../src/component/driver/aad/utility/aadAppClient";
import { AADApplication } from "../../../../src/component/resource/aadApp/interfaces/AADApplication";
import {
  UnhandledSystemError,
  UnhandledUserError,
} from "../../../../src/component/driver/aad/error/unhandledError";
import { MissingEnvUserError } from "../../../../src/component/driver/aad/error/missingEnvError";
import { InvalidActionInputError } from "../../../../src/error/common";

chai.use(chaiAsPromised);
const expect = chai.expect;

const outputKeys = {
  AAD_APP_CLIENT_ID: "AAD_APP_CLIENT_ID",
  AAD_APP_OBJECT_ID: "AAD_APP_OBJECT_ID",
  AAD_APP_TENANT_ID: "AAD_APP_TENANT_ID",
  AAD_APP_OAUTH_AUTHORITY_HOST: "AAD_APP_OAUTH_AUTHORITY_HOST",
  AAD_APP_OAUTH_AUTHORITY: "AAD_APP_OAUTH_AUTHORITY",
  SECRET_AAD_APP_CLIENT_SECRET: "SECRET_AAD_APP_CLIENT_SECRET",
};

describe("aadAppCreate", async () => {
  const expectedObjectId = "00000000-0000-0000-0000-000000000000";
  const expectedClientId = "00000000-0000-0000-0000-111111111111";
  const expectedDisplayName = "AAD app name";
  const expectedSecretText = "fake secret";
  const createAadAppDriver = new CreateAadAppDriver();
  const mockedDriverContext: any = {
    m365TokenProvider: new MockedM365Provider(),
    ui: new MockedUserInteraction(),
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
    let args: any = {
      name: "test",
    };
    let result = await createAadAppDriver.execute(args, mockedDriverContext);
    expect(result.result.isErr()).to.be.true;
    expect(result.result._unsafeUnwrapErr()).is.instanceOf(InvalidActionInputError);

    args = {
      generateClientSecret: true,
    };
    result = await createAadAppDriver.execute(args, mockedDriverContext);
    expect(result.result.isErr()).to.be.true;
    expect(result.result._unsafeUnwrapErr()).is.instanceOf(InvalidActionInputError);

    args = {};
    result = await createAadAppDriver.execute(args, mockedDriverContext);
    expect(result.result.isErr()).to.be.true;
    expect(result.result._unsafeUnwrapErr()).is.instanceOf(InvalidActionInputError);
  });

  it("should throw error if argument property is invalid", async () => {
    let args: any = {
      name: "test",
      generateClientSecret: "no",
    };
    let result = await createAadAppDriver.execute(args, mockedDriverContext);
    expect(result.result.isErr()).to.be.true;
    expect(result.result._unsafeUnwrapErr()).is.instanceOf(InvalidActionInputError);

    args = {
      name: "",
      generateClientSecret: true,
    };
    result = await createAadAppDriver.execute(args, mockedDriverContext);
    expect(result.result.isErr()).to.be.true;
    expect(result.result._unsafeUnwrapErr()).is.instanceOf(InvalidActionInputError);

    args = {
      name: "",
      generateClientSecret: "no",
    };
    result = await createAadAppDriver.execute(args, mockedDriverContext);
    expect(result.result.isErr()).to.be.true;
    expect(result.result._unsafeUnwrapErr()).is.instanceOf(InvalidActionInputError);
  });

  it("should create new AAD app and client secret with empty .env", async () => {
    sinon.stub(AadAppClient.prototype, "createAadApp").resolves({
      id: expectedObjectId,
      displayName: expectedDisplayName,
      appId: expectedClientId,
    } as AADApplication);

    sinon.stub(AadAppClient.prototype, "generateClientSecret").resolves(expectedSecretText);

    const args: any = {
      name: "test",
      generateClientSecret: true,
    };

    const result = await createAadAppDriver.execute(args, mockedDriverContext);

    expect(result.result.isOk()).to.be.true;
    expect(result.result._unsafeUnwrap().get(outputKeys.AAD_APP_CLIENT_ID)).to.equal(
      expectedClientId
    );
    expect(result.result._unsafeUnwrap().get(outputKeys.AAD_APP_OBJECT_ID)).to.equal(
      expectedObjectId
    );
    expect(result.result._unsafeUnwrap().get(outputKeys.AAD_APP_TENANT_ID)).to.equal("tenantId");
    expect(result.result._unsafeUnwrap().get(outputKeys.AAD_APP_OAUTH_AUTHORITY)).to.equal(
      "https://login.microsoftonline.com/tenantId"
    );
    expect(result.result._unsafeUnwrap().get(outputKeys.AAD_APP_OAUTH_AUTHORITY_HOST)).to.equal(
      "https://login.microsoftonline.com"
    );
    expect(result.result._unsafeUnwrap().get(outputKeys.SECRET_AAD_APP_CLIENT_SECRET)).to.equal(
      expectedSecretText
    );
    expect(result.result._unsafeUnwrap().size).to.equal(6);
    expect(result.summaries.length).to.equal(2);
    expect(result.summaries).includes(
      `Created Azure Active Directory application with object id ${expectedObjectId}`
    );
    expect(result.summaries).includes(
      `Generated client secret for Azure Active Directory application with object id ${expectedObjectId}`
    );
  });

  it("should use existing AAD app and generate new secret when AAD_APP_CLIENT_ID exists", async () => {
    sinon.stub(AadAppClient.prototype, "createAadApp").rejects("createAadApp should not be called");
    sinon.stub(AadAppClient.prototype, "generateClientSecret").resolves(expectedSecretText);

    envRestore = mockedEnv({
      [outputKeys.AAD_APP_CLIENT_ID]: "existing value",
      [outputKeys.AAD_APP_OBJECT_ID]: "existing value",
    });

    const args = {
      name: "test",
      generateClientSecret: true,
    };

    const result = await createAadAppDriver.execute(args, mockedDriverContext);
    expect(result.result.isOk()).to.be.true;
    expect(result.result._unsafeUnwrap().get(outputKeys.AAD_APP_CLIENT_ID)).to.equal(
      "existing value"
    );
    expect(result.result._unsafeUnwrap().get(outputKeys.AAD_APP_OBJECT_ID)).to.equal(
      "existing value"
    );
    expect(result.result._unsafeUnwrap().get(outputKeys.SECRET_AAD_APP_CLIENT_SECRET)).to.equal(
      expectedSecretText
    );
    expect(result.result._unsafeUnwrap().size).to.equal(3); // 1 new env and 2 existing env
    expect(result.summaries.length).to.equal(1);
    expect(result.summaries).includes(
      `Generated client secret for Azure Active Directory application with object id existing value`
    );
  });

  it("should do nothing when AAD_APP_CLIENT_ID and SECRET_AAD_APP_CLIENT_SECRET exists", async () => {
    sinon.stub(AadAppClient.prototype, "createAadApp").rejects("createAadApp should not be called");
    sinon
      .stub(AadAppClient.prototype, "generateClientSecret")
      .rejects("generateClientSecret should not be called");

    envRestore = mockedEnv({
      [outputKeys.AAD_APP_CLIENT_ID]: "existing value",
      [outputKeys.AAD_APP_OBJECT_ID]: "existing value",
      [outputKeys.SECRET_AAD_APP_CLIENT_SECRET]: "existing value",
    });

    const args = {
      name: "test",
      generateClientSecret: true,
    };

    const result = await createAadAppDriver.execute(args, mockedDriverContext);
    expect(result.result.isOk()).to.be.true;
    expect(result.result._unsafeUnwrap().get(outputKeys.AAD_APP_CLIENT_ID)).to.equal(
      "existing value"
    );
    expect(result.result._unsafeUnwrap().get(outputKeys.AAD_APP_OBJECT_ID)).to.equal(
      "existing value"
    );
    expect(result.result._unsafeUnwrap().get(outputKeys.SECRET_AAD_APP_CLIENT_SECRET)).to.equal(
      "existing value"
    );
    expect(result.result._unsafeUnwrap().size).to.equal(3);
    expect(result.summaries.length).to.equal(0); // no summary when action does nothing
  });

  it("should not generate client secret when generateClientSecret is false", async () => {
    sinon.stub(AadAppClient.prototype, "createAadApp").resolves({
      id: expectedObjectId,
      displayName: expectedDisplayName,
      appId: expectedClientId,
    } as AADApplication);

    sinon
      .stub(AadAppClient.prototype, "generateClientSecret")
      .rejects("generateClientSecret should not be called");

    const args: any = {
      name: "test",
      generateClientSecret: false,
    };

    const result = await createAadAppDriver.execute(args, mockedDriverContext);
    expect(result.result.isOk()).to.be.true;
    expect(result.result._unsafeUnwrap().get(outputKeys.AAD_APP_CLIENT_ID)).to.equal(
      expectedClientId
    );
    expect(result.result._unsafeUnwrap().get(outputKeys.AAD_APP_OBJECT_ID)).to.equal(
      expectedObjectId
    );
    expect(result.result._unsafeUnwrap().get(outputKeys.AAD_APP_TENANT_ID)).to.equal("tenantId");
    expect(result.result._unsafeUnwrap().get(outputKeys.AAD_APP_OAUTH_AUTHORITY)).to.equal(
      "https://login.microsoftonline.com/tenantId"
    );
    expect(result.result._unsafeUnwrap().get(outputKeys.AAD_APP_OAUTH_AUTHORITY_HOST)).to.equal(
      "https://login.microsoftonline.com"
    );
    expect(result.result._unsafeUnwrap().get(outputKeys.SECRET_AAD_APP_CLIENT_SECRET)).to.be
      .undefined;
    expect(result.result._unsafeUnwrap().size).to.equal(5);
    expect(result.summaries.length).to.equal(1);
    expect(result.summaries).includes(
      `Created Azure Active Directory application with object id ${expectedObjectId}`
    );
  });

  it("should throw error when generate client secret if AAD_APP_OBJECT_ID is missing", async () => {
    envRestore = mockedEnv({
      [outputKeys.AAD_APP_CLIENT_ID]: "existing value",
    });

    const args: any = {
      name: "test",
      generateClientSecret: true,
    };

    const result = await createAadAppDriver.execute(args, mockedDriverContext);
    expect(result.result.isErr()).to.be.true;
    expect(result.result._unsafeUnwrapErr())
      .is.instanceOf(MissingEnvUserError)
      .and.has.property(
        "message",
        "Cannot generate client secret. Environment variable AAD_APP_OBJECT_ID is not set."
      );
  });

  it("should throw user error when AadAppClient failed with 4xx error", async () => {
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
      name: "test",
      generateClientSecret: false,
    };

    const result = await createAadAppDriver.execute(args, mockedDriverContext);
    expect(result.result.isErr()).to.be.true;
    expect(result.result._unsafeUnwrapErr())
      .is.instanceOf(UnhandledUserError)
      .and.has.property("message")
      .and.contains("Unhandled error happened in aadApp/create action");
  });

  it("should throw system error when AadAppClient failed with non 4xx error", async () => {
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
      name: "test",
      generateClientSecret: false,
    };

    const result = await createAadAppDriver.execute(args, mockedDriverContext);
    expect(result.result.isErr()).to.be.true;
    expect(result.result._unsafeUnwrapErr())
      .is.instanceOf(UnhandledSystemError)
      .and.has.property("message")
      .and.contains("Unhandled error happened in aadApp/create action");
  });

  it("should send telemetries when success", async () => {
    const mockedTelemetryReporter = new MockedTelemetryReporter();
    let startTelemetry: any, endTelemetry: any;

    sinon.stub(AadAppClient.prototype, "createAadApp").resolves({
      id: expectedObjectId,
      displayName: expectedDisplayName,
      appId: expectedClientId,
    } as AADApplication);

    sinon.stub(AadAppClient.prototype, "generateClientSecret").resolves(expectedSecretText);

    sinon
      .stub(mockedTelemetryReporter, "sendTelemetryEvent")
      .onFirstCall()
      .callsFake((eventName, properties, measurements) => {
        startTelemetry = {
          eventName,
          properties,
          measurements,
        };
      })
      .onSecondCall()
      .callsFake((eventName, properties, measurements) => {
        endTelemetry = {
          eventName,
          properties,
          measurements,
        };
      });

    const args: any = {
      name: "test",
      generateClientSecret: true,
    };
    const driverContext: any = {
      m365TokenProvider: new MockedM365Provider(),
      telemetryReporter: mockedTelemetryReporter,
    };

    const result = await createAadAppDriver.execute(args, driverContext);

    expect(result.result.isOk()).to.be.true;
    expect(startTelemetry.eventName).to.equal("aadApp/create-start");
    expect(startTelemetry.properties.component).to.equal("aadApp/create");
    expect(endTelemetry.eventName).to.equal("aadApp/create");
    expect(endTelemetry.properties.component).to.equal("aadApp/create");
    expect(endTelemetry.properties.success).to.equal("yes");
  });

  it("should send telemetries when fail", async () => {
    const mockedTelemetryReporter = new MockedTelemetryReporter();
    let startTelemetry: any, endTelemetry: any;

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

    sinon
      .stub(mockedTelemetryReporter, "sendTelemetryEvent")
      .onFirstCall()
      .callsFake((eventName, properties, measurements) => {
        startTelemetry = {
          eventName,
          properties,
          measurements,
        };
      });

    sinon
      .stub(mockedTelemetryReporter, "sendTelemetryErrorEvent")
      .onFirstCall()
      .callsFake((eventName, properties, measurements) => {
        endTelemetry = {
          eventName,
          properties,
          measurements,
        };
      });

    const args: any = {
      name: "test",
      generateClientSecret: true,
    };
    const driverContext: any = {
      m365TokenProvider: new MockedM365Provider(),
      telemetryReporter: mockedTelemetryReporter,
    };

    const result = await createAadAppDriver.execute(args, driverContext);

    expect(result.result.isOk()).to.be.false;
    expect(startTelemetry.eventName).to.equal("aadApp/create-start");
    expect(startTelemetry.properties.component).to.equal("aadApp/create");
    expect(endTelemetry.eventName).to.equal("aadApp/create");
    expect(endTelemetry.properties.component).to.equal("aadApp/create");
    expect(endTelemetry.properties.success).to.equal("no");
    expect(endTelemetry.properties["error-code"]).to.equal("aadApp/create.UnhandledError");
    expect(endTelemetry.properties["error-type"]).to.equal("user");
    expect(endTelemetry.properties["error-message"])
      .contain("Unhandled error happened in aadApp/create action")
      .and.contain("Invalid value specified for property");
  });
});
