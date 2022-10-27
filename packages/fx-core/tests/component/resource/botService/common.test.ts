// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as utils from "../../../../src/component/resource/botService/common";

describe("Common Utils", () => {
  describe("isHttpCodeOkOrCreated", () => {
    it("Expect True", () => {
      // Arrange
      const code = 200;

      // Act
      const result = utils.isHttpCodeOkOrCreated(code);

      // Assert
      chai.assert.isTrue(result);
    });
  });

  describe("makeBotName", () => {
    it("Happy Path", () => {
      // Arrange
      const raw = "testname";

      // Act
      const botName = utils.makeBotName(raw);

      // Assert
      chai.assert.isTrue(botName === raw);
    });

    it("Long name should be cut", () => {
      // Arrange
      const raw = "testname01234567890123456789012345678912345";
      const expectedName = "01234567890123456789012345678912345";

      // Act
      const botName = utils.makeBotName(raw);

      // Assert
      chai.assert.isTrue(botName === expectedName);
    });
  });
});
