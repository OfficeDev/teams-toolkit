// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";

import {
  PluginError,
  AADAppCheckingError,
  ConfigUpdatingError,
  ConfigValidationError,
  PackDirExistenceError,
  TemplateZipFallbackError,
  UnzipError,
  CreateAADSecretError,
  CreateAADAppError,
  ErrorType,
} from "../../../../../src/plugins/resource/bot/errors";

describe("Test Errors", () => {
  describe("PluginError", () => {
    it("Happy Path", () => {
      // Arrange
      const errorName = "error";
      const details = "some error occurs";
      const suggestions: string[] = ["suggestions"];
      // Act
      const pluginError = new PluginError(
        ErrorType.SYSTEM,
        errorName,
        [details, details],
        suggestions
      );

      // Assert
      chai.assert.isTrue(pluginError instanceof PluginError);
      chai.assert.isTrue(
        pluginError.genMessage() === `${pluginError.message} Suggestions: ${suggestions.join(" ")}`
      );
    });
  });

  describe("AADAppCheckingError", () => {
    it("Happy Path", () => {
      // Arrange
      // Act
      const myError = new AADAppCheckingError();

      // Assert
      chai.assert.isTrue(myError instanceof PluginError);
    });
  });

  describe("CreateAADAppError", () => {
    it("Happy Path", () => {
      // Arrange
      // Act
      const myError = new CreateAADAppError();

      // Assert
      chai.assert.isTrue(myError instanceof PluginError);
    });

    it("[InferInnerError] expect errorType changes to SystemError", () => {
      // Arrange
      // Act
      const myError = new CreateAADAppError({
        response: {
          status: 500,
          data: {
            error: {
              code: "SomeCode",
            },
          },
        },
      });

      // Assert
      chai.assert.isTrue(myError instanceof PluginError);
      chai.assert.isTrue(myError.errorType === ErrorType.SYSTEM);
    });
  });

  describe("CreateAADSecretError", () => {
    it("Happy Path", () => {
      // Arrange
      // Act
      const myError = new CreateAADSecretError();

      // Assert
      chai.assert.isTrue(myError instanceof PluginError);
    });

    it("[InferInnerError] expect errorType changes to SystemError", () => {
      // Arrange
      // Act
      const myError = new CreateAADSecretError({
        response: {
          status: 500,
          data: {
            error: {
              code: "SomeCode",
            },
          },
        },
      });

      // Assert
      chai.assert.isTrue(myError instanceof PluginError);
      chai.assert.isTrue(myError.errorType === ErrorType.SYSTEM);
    });
  });

  describe("TemplateZipFallbackError", () => {
    it("Happy Path", () => {
      // Arrange
      // Act
      const myError = new TemplateZipFallbackError();

      // Assert
      chai.assert.isTrue(myError instanceof PluginError);
      chai.assert.isTrue(myError.errorType === ErrorType.USER);
    });
  });

  describe("UnzipError", () => {
    it("Happy Path", () => {
      // Arrange
      // Act
      const myError = new UnzipError();

      // Assert
      chai.assert.isTrue(myError instanceof PluginError);
      chai.assert.isTrue(myError.errorType === ErrorType.USER);
    });
  });

  describe("ConfigUpdatingError", () => {
    it("Happy Path", () => {
      // Arrange
      const configName = "botId";

      // Act
      const myError = new ConfigUpdatingError(configName);

      // Assert
      chai.assert.isTrue(myError instanceof PluginError);
      chai.assert.isTrue(myError.errorType === ErrorType.USER);
    });
  });

  describe("ConfigValidationError", () => {
    it("Happy Path", () => {
      // Arrange
      const name = "name";
      const value = "value";

      // Act
      const myError = new ConfigValidationError(name, value);

      // Assert
      chai.assert.isTrue(myError instanceof PluginError);
      chai.assert.isTrue(myError.errorType === ErrorType.USER);
    });
  });

  describe("PackDirExistenceError", () => {
    it("Happy Path", () => {
      // Arrange
      // Act
      const myError = new PackDirExistenceError();

      // Assert
      chai.assert.isTrue(myError instanceof PluginError);
      chai.assert.isTrue(myError.errorType === ErrorType.USER);
    });
  });
});
