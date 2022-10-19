// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import { RestoreFn } from "mocked-env";
import { CreateBotAadAppDriver } from "../../../../src/component/driver/botAadApp/create";
import { MockedM365Provider } from "../../../plugins/solution/util";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { UserError } from "@microsoft/teamsfx-api";
import { GraphClient } from "../../../../src/component/resource/botService/botRegistration/graphClient";

chai.use(chaiAsPromised);
const expect = chai.expect;

const outputKeys = {
  BOT_ID: "BOT_ID",
  BOT_PASSWORD: "BOT_PASSWORD",
};

describe("aadAppCreate", async () => {
  const expectedClientId = "00000000-0000-0000-0000-111111111111";
  const expectedDisplayName = "AAD app name";
  const expectedSecretText = "fake secret";
  const createBotAadAppDriver = new CreateBotAadAppDriver();
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

  it("happy path", async () => {
    const args: any = {
      name: expectedDisplayName,
    };

    sinon.stub(GraphClient, "registerAadApp").resolves({
      clientId: expectedClientId,
      clientSecret: expectedSecretText,
    });

    const result = await createBotAadAppDriver.handler(args, mockedDriverContext);

    expect(result.get(outputKeys.BOT_ID)).to.be.equal(expectedClientId);
    expect(result.get(outputKeys.BOT_PASSWORD)).to.be.equal(expectedSecretText);
  });
});
