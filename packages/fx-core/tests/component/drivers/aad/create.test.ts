// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import mockedEnv, { RestoreFn } from "mocked-env";
import { CreateAadAppDriver } from "../../../../src/component/driver/aad/create";
import { MockedM365Provider } from "../../../plugins/solution/util";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { UserError } from "@microsoft/teamsfx-api";
import { AadAppClient } from "../../../../src/component/driver/aad/utility/aadAppClient";
import { AADApplication } from "../../../../src/component/resource/aadApp/interfaces/AADApplication";
import {
  UnhandledSystemError,
  UnhandledUserError,
} from "../../../../src/component/driver/aad/error/unhandledError";

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
    await expect(createAadAppDriver.run(args, mockedDriverContext))
      .to.be.eventually.rejectedWith(
        "Following parameter is missing or invalid for aadApp/create action: generateClientSecret."
      )
      .and.is.instanceOf(UserError);

    args = {
      generateClientSecret: true,
    };
    await expect(createAadAppDriver.run(args, mockedDriverContext))
      .to.be.eventually.rejectedWith(
        "Following parameter is missing or invalid for aadApp/create action: name."
      )
      .and.is.instanceOf(UserError);

    args = {};
    await expect(createAadAppDriver.run(args, mockedDriverContext))
      .to.be.eventually.rejectedWith(
        "Following parameter is missing or invalid for aadApp/create action: name, generateClientSecret."
      )
      .and.is.instanceOf(UserError);
  });

  it("should throw error if argument property is invalid", async () => {
    let args: any = {
      name: "test",
      generateClientSecret: "no",
    };
    await expect(createAadAppDriver.run(args, mockedDriverContext))
      .to.be.eventually.rejectedWith(
        "Following parameter is missing or invalid for aadApp/create action: generateClientSecret."
      )
      .and.is.instanceOf(UserError);

    args = {
      name: "",
      generateClientSecret: true,
    };
    await expect(createAadAppDriver.run(args, mockedDriverContext))
      .to.be.eventually.rejectedWith(
        "Following parameter is missing or invalid for aadApp/create action: name."
      )
      .and.is.instanceOf(UserError);

    args = {
      name: "",
      generateClientSecret: "no",
    };
    await expect(createAadAppDriver.run(args, mockedDriverContext))
      .to.be.eventually.rejectedWith(
        "Following parameter is missing or invalid for aadApp/create action: name, generateClientSecret."
      )
      .and.is.instanceOf(UserError);
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

    const result = await createAadAppDriver.run(args, mockedDriverContext);

    expect(result.get(outputKeys.AAD_APP_CLIENT_ID)).to.equal(expectedClientId);
    expect(result.get(outputKeys.AAD_APP_OBJECT_ID)).to.equal(expectedObjectId);
    expect(result.get(outputKeys.AAD_APP_TENANT_ID)).to.equal("tenantId");
    expect(result.get(outputKeys.AAD_APP_OAUTH_AUTHORITY)).to.equal(
      "https://login.microsoftonline.com/tenantId"
    );
    expect(result.get(outputKeys.AAD_APP_OAUTH_AUTHORITY_HOST)).to.equal(
      "https://login.microsoftonline.com"
    );
    expect(result.get(outputKeys.SECRET_AAD_APP_CLIENT_SECRET)).to.equal(expectedSecretText);
    expect(result.size).to.equal(6);
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

    await expect(createAadAppDriver.run(args, mockedDriverContext)).not.eventually.be.rejected.then(
      (result) => {
        expect(result.get(outputKeys.AAD_APP_CLIENT_ID)).to.equal("existing value");
        expect(result.get(outputKeys.AAD_APP_OBJECT_ID)).to.equal("existing value");
        expect(result.get(outputKeys.SECRET_AAD_APP_CLIENT_SECRET)).to.equal(expectedSecretText);
        expect(result.size).to.equal(3); // 1 new env and 2 existing env
      }
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

    await expect(createAadAppDriver.run(args, mockedDriverContext)).not.eventually.be.rejected.then(
      (result) => {
        expect(result.get(outputKeys.AAD_APP_CLIENT_ID)).to.equal("existing value");
        expect(result.get(outputKeys.AAD_APP_OBJECT_ID)).to.equal("existing value");
        expect(result.get(outputKeys.SECRET_AAD_APP_CLIENT_SECRET)).to.equal("existing value");
        expect(result.size).to.equal(3);
      }
    );
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

    await expect(createAadAppDriver.run(args, mockedDriverContext)).not.eventually.be.rejected.then(
      (result) => {
        expect(result.get(outputKeys.AAD_APP_CLIENT_ID)).to.equal(expectedClientId);
        expect(result.get(outputKeys.AAD_APP_OBJECT_ID)).to.equal(expectedObjectId);
        expect(result.get(outputKeys.AAD_APP_TENANT_ID)).to.equal("tenantId");
        expect(result.get(outputKeys.AAD_APP_OAUTH_AUTHORITY)).to.equal(
          "https://login.microsoftonline.com/tenantId"
        );
        expect(result.get(outputKeys.AAD_APP_OAUTH_AUTHORITY_HOST)).to.equal(
          "https://login.microsoftonline.com"
        );
        expect(result.get(outputKeys.SECRET_AAD_APP_CLIENT_SECRET)).to.be.undefined;
        expect(result.size).to.equal(5);
      }
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

    await expect(createAadAppDriver.run(args, mockedDriverContext)).to.be.eventually.rejectedWith(
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

    await expect(createAadAppDriver.run(args, mockedDriverContext)).to.be.rejected.then((error) => {
      expect(error instanceof UnhandledUserError).to.be.true;
      expect(error.message).contains("Unhandled error happened in aadApp/create action");
    });
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

    await expect(createAadAppDriver.run(args, mockedDriverContext)).to.be.rejected.then((error) => {
      expect(error instanceof UnhandledSystemError).to.be.true;
      expect(error.message).contains("Unhandled error happened in aadApp/create action");
    });
  });
});
