// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";

import { convertToConstValues } from "../../../../../src/plugins/resource/bot/utils/common";
import { BotCapabilities } from "../../../../../src/plugins/resource/bot/resources/strings";

describe("#convertToConstValues", () => {
  describe("bot capabilities", () => {
    it("undefined", () => {
      chai.assert.equal(convertToConstValues(undefined, BotCapabilities), undefined);
    });
    it("error type", () => {
      chai.assert.equal(convertToConstValues("error-type", BotCapabilities), undefined);
    });
    it("notification", () => {
      chai.assert.equal(
        convertToConstValues("notification", BotCapabilities),
        BotCapabilities.NOTIFICATION
      );
    });
  });
});
