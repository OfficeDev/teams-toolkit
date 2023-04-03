// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import mockedEnv, { RestoreFn } from "mocked-env";
import { CreateBotAadAppDriver } from "../../../../src/component/driver/botAadApp/create";
import { MockedM365Provider, MockedTelemetryReporter } from "../../../plugins/solution/util";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { UserError } from "@microsoft/teamsfx-api";
import { GraphClient } from "../../../../src/component/resource/botService/botRegistration/graphClient";
import {
  UnhandledSystemError,
  UnhandledUserError,
} from "../../../../src/component/driver/botAadApp/error/unhandledError";
import axios from "axios";

chai.use(chaiAsPromised);
const expect = chai.expect;

const outputKeys = {
  BOT_ID: "BOT_ID",
  SECRET_BOT_PASSWORD: "SECRET_BOT_PASSWORD",
};

describe("botAadAppCreate", async () => {
  const expectedClientId = "00000000-0000-0000-0000-111111111111";
  const expectedDisplayName = "AAD app name";
  const expectedSecretText = "fake secret";
  const createBotAadAppDriver = new CreateBotAadAppDriver();
  const mockedDriverContext: any = {
    m365TokenProvider: new MockedM365Provider(),
    telemetryReporter: new MockedTelemetryReporter(),
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
    await expect(createBotAadAppDriver.handler(args, mockedDriverContext))
      .to.be.eventually.rejectedWith(
        "Following parameter is missing or invalid for botAadApp/create action: name."
      )
      .and.is.instanceOf(UserError);
  });

  it("should throw error if argument property is invalid", async () => {
    const args: any = {
      name: "",
    };
    await expect(createBotAadAppDriver.handler(args, mockedDriverContext))
      .to.be.eventually.rejectedWith(
        "Following parameter is missing or invalid for botAadApp/create action: name."
      )
      .and.is.instanceOf(UserError);
  });

  it("happy path with handler", async () => {
    const args: any = {
      name: expectedDisplayName,
    };

    sinon.stub(GraphClient, "registerAadApp").resolves({
      clientId: expectedClientId,
      clientSecret: expectedSecretText,
    });

    const result = await createBotAadAppDriver.handler(args, mockedDriverContext);

    expect(result.output.get(outputKeys.BOT_ID)).to.be.equal(expectedClientId);
    expect(result.output.get(outputKeys.SECRET_BOT_PASSWORD)).to.be.equal(expectedSecretText);
  });

  it("happy path with run", async () => {
    const args: any = {
      name: expectedDisplayName,
    };

    sinon.stub(GraphClient, "registerAadApp").resolves({
      clientId: expectedClientId,
      clientSecret: expectedSecretText,
    });

    const result = await createBotAadAppDriver.run(args, mockedDriverContext);
    expect(result.isOk()).to.be.true;
    expect(result.isOk() && result.value.get(outputKeys.BOT_ID)).to.be.equal(expectedClientId);
    expect(result.isOk() && result.value.get(outputKeys.SECRET_BOT_PASSWORD)).to.be.equal(
      expectedSecretText
    );
  });

  it("happy path with execute", async () => {
    const args: any = {
      name: expectedDisplayName,
    };

    sinon.stub(GraphClient, "registerAadApp").resolves({
      clientId: expectedClientId,
      clientSecret: expectedSecretText,
    });

    const result = await createBotAadAppDriver.execute(args, mockedDriverContext);
    expect(result.result.isOk()).to.be.true;
    expect(result.result.isOk() && result.result.value.get(outputKeys.BOT_ID)).to.be.equal(
      expectedClientId
    );
    expect(
      result.result.isOk() && result.result.value.get(outputKeys.SECRET_BOT_PASSWORD)
    ).to.be.equal(expectedSecretText);
  });

  it("should throw user error when GraphClient failed with 4xx error", async () => {
    sinon.stub(axios, "isAxiosError").returns(true);
    sinon.stub(GraphClient, "registerAadApp").rejects({
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

    await expect(createBotAadAppDriver.handler(args, mockedDriverContext)).to.be.rejected.then(
      (error) => {
        expect(error instanceof UnhandledUserError).to.be.true;
        expect(error.message).contains(
          "An unexpected error has occurred while performing the botAadApp/create task"
        );
      }
    );
  });

  it("should throw system error when GraphClient failed with non 4xx error", async () => {
    sinon.stub(axios, "isAxiosError").returns(true);
    sinon.stub(GraphClient, "registerAadApp").rejects({
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

    await expect(createBotAadAppDriver.handler(args, mockedDriverContext)).to.be.rejected.then(
      (error) => {
        expect(error instanceof UnhandledSystemError).to.be.true;
        expect(error.message).contains(
          "An unexpected error has occurred while performing the botAadApp/create task"
        );
      }
    );
  });

  it("should throw error when GraphClient throws errors", async () => {
    sinon.stub(GraphClient, "registerAadApp").throwsException();
    const args: any = {
      name: expectedDisplayName,
    };
    await expect(createBotAadAppDriver.handler(args, mockedDriverContext)).to.be.rejected.then(
      (error) => {
        expect(error instanceof UnhandledSystemError).to.be.true;
      }
    );
  });

  it("should be good when reusing existing bot in env", async () => {
    envRestore = mockedEnv({
      [outputKeys.BOT_ID]: expectedClientId,
      [outputKeys.SECRET_BOT_PASSWORD]: expectedSecretText,
    });

    const args: any = {
      name: expectedDisplayName,
    };

    const result = await createBotAadAppDriver.execute(args, mockedDriverContext);

    expect(result.result.isOk()).to.be.true;
    expect(result.result.isOk() && result.result.value.get(outputKeys.BOT_ID)).to.be.equal(
      expectedClientId
    );
    expect(
      result.result.isOk() && result.result.value.get(outputKeys.SECRET_BOT_PASSWORD)
    ).to.be.equal(expectedSecretText);
  });
});
