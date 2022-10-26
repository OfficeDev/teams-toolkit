// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import { RemoteBotRegistration } from "../../../../../src/component/resource/botService/botRegistration/remoteBotRegistration";
import {
  BotRegistrationFactory,
  BotRegistrationKind,
} from "../../../../../src/component/resource/botService/botRegistration/factory";
import { expect } from "chai";
import { LocalBotRegistration } from "../../../../../src/component/resource/botService/botRegistration/localBotRegistration";

describe("Test Factory", () => {
  it("should return an instance of LocalBotRegistration", async () => {
    const botReg = BotRegistrationFactory.create(BotRegistrationKind.Local);
    expect(botReg).to.be.instanceOf(LocalBotRegistration);
  });
  it("should return an instance of RemoteBotRegistration", async () => {
    const botReg = BotRegistrationFactory.create(BotRegistrationKind.Remote);
    expect(botReg).to.be.instanceOf(RemoteBotRegistration);
  });
});
