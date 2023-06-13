// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import { MockedM365Provider } from "../../../plugins/solution/util";
import {
  BotAuthType,
  createBotAadApp,
} from "../../../../src/component/resource/botService/botRegistration/botAadApp";

describe("botAadApp", () => {
  describe("createBotAadApp", () => {
    it("existing", async () => {
      const mockM365 = new MockedM365Provider();

      const botAadAppRes = await createBotAadApp(mockM365, "test", {
        botId: "existing",
        botPassword: "existing",
      });

      chai.assert.isTrue(botAadAppRes.isOk());
      chai.assert.equal((botAadAppRes as any).value.botId, "existing");
    });

    it("identity not supported", async () => {
      const mockM365 = new MockedM365Provider();

      const botAadAppRes = await createBotAadApp(
        mockM365,
        "test",
        undefined,
        undefined,
        BotAuthType.Identity
      );

      chai.assert.isTrue(botAadAppRes.isErr());
    });
  });
});
