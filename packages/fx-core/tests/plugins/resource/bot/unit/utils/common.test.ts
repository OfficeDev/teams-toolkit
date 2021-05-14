// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";

import * as utils from "../../../../../../src/plugins/resource/bot/utils/common";

describe("Common Utils", () => {
  describe("toBase64", () => {
    it("Happy Path", async () => {
      // Arrange
      const source = "12345";
      const expectResult = "MTIzNDU=";

      // Act
      const result = utils.toBase64(source);

      // Assert
      chai.assert.isTrue(result === expectResult);
    });
  });

  describe("isValidWebAppSiteName", () => {
    it("Name Valid", () => {
      // Arrange
      const name = "validName";

      // Act
      const result = utils.isValidWebAppSiteName(name);

      // Assert
      chai.assert.isTrue(result);
    });

    it("Name Invalid", () => {
      // Arrange
      const name = "-starthyphen";

      // Act
      const result = utils.isValidWebAppSiteName(name);

      // Assert
      chai.assert.isFalse(result);
    });
  });

  describe("isValidAppServicePlanName", () => {
    it("Name Valid", () => {
      // Arrange
      const name = "validName";

      // Act
      const result = utils.isValidAppServicePlanName(name);

      // Assert
      chai.assert.isTrue(result);
    });

    it("Name Invalid", () => {
      // Arrange
      const name = "@+-";

      // Act
      const result = utils.isValidAppServicePlanName(name);

      // Assert
      chai.assert.isFalse(result);
    });
  });

  describe("isValidBotChannelRegName", () => {
    it("Name Valid", () => {
      // Arrange
      const name = "validName";

      // Act
      const result = utils.isValidBotChannelRegName(name);

      // Assert
      chai.assert.isTrue(result);
    });

    it("Name Invalid", () => {
      // Arrange
      const name = ".startperiod";

      // Act
      const result = utils.isValidBotChannelRegName(name);

      // Assert
      chai.assert.isFalse(result);
    });
  });

  describe("isDomainValidForAzureWebApp", () => {
    it("Valid Domain", () => {
      // Arrange
      const url = "https://040523tbp5sf2z17ymkn4e4wze.azurewebsites.net";

      // Act
      const result = utils.isDomainValidForAzureWebApp(url);

      // Assert
      chai.assert.isTrue(result);
    });
  });

  describe("existsInEnumValues", () => {
    it("Value Existing In Enum", () => {
      // Arrange
      enum Color {
        Red = "Red",
        Green = "Green",
        Blue = "Blue",
      }

      // Act
      const result = utils.existsInEnumValues("Red", Color);

      // Assert
      chai.assert.isTrue(result);
    });
  });

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

  describe("genBotSectionInManifest", () => {
    it("Happy Path", () => {
      // Arrange
      const botId = "123";

      // Act
      const result = utils.genBotSectionInManifest(botId);

      // Assert
      chai.assert.isTrue(result.length > 0);
    });
  });

  describe("genMsgExtSectionInManifest", () => {
    it("Happy Path", () => {
      // Arrange
      const botId = "123";

      // Act
      const result = utils.genMsgExtSectionInManifest(botId);

      // Assert
      chai.assert.isTrue(result.length > 0);
    });
  });

  describe("convertToTelemetryName", () => {
    it("Happy Path", () => {
      // Arrange
      const raw = "A b C";

      // Act
      const result = utils.convertToTelemetryName(raw);
      console.log(result);

      // Assert
      chai.assert.isTrue(result === "a-b-c");
    });
  });
});
