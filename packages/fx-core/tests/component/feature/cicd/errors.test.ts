// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";

import {
  PluginError,
  ErrorType,
  InternalError,
  NoProjectOpenedError,
  FileSystemError,
} from "../../../../src/component/feature/cicd/errors";

describe("Test Errors", () => {
  describe("PluginError", () => {
    it("Happy Path", () => {
      // Arrange
      const errorName = "error";
      const details = "some error occurs";
      const suggestions: string[] = ["suggestions"];
      // Act
      const pluginError = new PluginError(
        ErrorType.System,
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

  describe("InternalError", () => {
    it("Happy Path", () => {
      // Arrange
      // Act
      const myError = new InternalError(["Some internal error", "Some internal error"]);

      // Assert
      chai.assert.isTrue(myError instanceof PluginError);
      chai.assert.isTrue(myError.errorType === ErrorType.System);
    });
  });

  describe("NoProjectOpenedError", () => {
    it("Happy Path", () => {
      // Arrange
      // Act
      const myError = new NoProjectOpenedError();

      // Assert
      chai.assert.isTrue(myError instanceof PluginError);
      chai.assert.isTrue(myError.errorType === ErrorType.User);
    });
  });

  describe("FileSystemError", () => {
    it("Happy Path", () => {
      // Arrange
      // Act
      const myError = new FileSystemError(["Some file system error", "Some file system error"]);

      // Assert
      chai.assert.isTrue(myError instanceof PluginError);
      chai.assert.isTrue(myError.errorType === ErrorType.User);
    });
  });
});
