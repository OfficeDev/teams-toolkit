// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { BotRegistration } from "../../../../../src/component/resource/botService/botRegistration/botRegistration";
import { RemoteBotRegistration } from "../../../../../src/component/resource/botService/botRegistration/remoteBotRegistration";
import { MockedM365Provider } from "../../../../plugins/solution/util";
import { IBotRegistration } from "../../../../../src/component/resource/botService/appStudio/interfaces/IBotRegistration";

chai.use(chaiAsPromised);
const expect = chai.expect;

describe("Test BotRegistration", async () => {
  const m365TokenProvider = new MockedM365Provider();
  const botRegistrationData: IBotRegistration = {
    botId: "",
    name: "",
    description: "",
    iconUrl: "",
    messagingEndpoint: "",
    callingEndpoint: "",
  };

  it("BotRegistration.createBotRegistraion should throw notImplementedError", async () => {
    const botRegistration: BotRegistration = new BotRegistration();

    const res = await botRegistration.createBotRegistration(m365TokenProvider, "test", "test");
    expect(res.isErr()).to.be.true;
  });

  it("BotRegistration.createOrUpdateBotRegistraion should throw notImplementedError", async () => {
    const botRegistration: BotRegistration = new BotRegistration();

    const res = await botRegistration.createOrUpdateBotRegistration(
      m365TokenProvider,
      botRegistrationData
    );
    expect(res.isErr()).to.be.true;
  });

  it("BotRegistration.updateMessageEndpoint should throw notImplementedError", async () => {
    const botRegistration: BotRegistration = new BotRegistration();

    const res = await botRegistration.updateMessageEndpoint(m365TokenProvider, "", "");
    expect(res.isErr()).to.be.true;
  });

  it("RemoteBotRegistration should just return Ok about createOrUpdateBotRegistration", async () => {
    const botRegistration: BotRegistration = new RemoteBotRegistration();
    const res = await botRegistration.createOrUpdateBotRegistration(
      m365TokenProvider,
      botRegistrationData
    );
    expect(res.isOk()).to.be.true;
  });

  it("RemoteBotRegistration should just return Ok about updateMessageEndpoint", async () => {
    const botRegistration: BotRegistration = new RemoteBotRegistration();
    const res = await botRegistration.updateMessageEndpoint(m365TokenProvider, "", "");
    expect(res.isOk()).to.be.true;
  });
});
