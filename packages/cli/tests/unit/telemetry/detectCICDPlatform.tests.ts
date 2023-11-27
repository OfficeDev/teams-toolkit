// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { tryDetectCICDPlatform } from "../../../src/commonlib/common/cicdPlatformDetector";
import "mocha";
import { expect } from "../utils";
import { CliConfigRunFrom } from "../../../src/telemetry/cliTelemetryEvents";

function backupAndSetEnv(key: string, value: string) {
  if (key in process.env) {
    process.env[`${key}_BACKUP`] = process.env[key];
  } else {
    process.env[`${key}_BACKUP`] = "NOT-EXISTED";
  }
  process.env[key] = value;
}

function restoreAndDeleteEnv(key: string) {
  if (process.env[`${key}_BACKUP`] === "NOT-EXISTED") {
    delete process.env[key];
  } else {
    process.env[key] = process.env[`${key}_BACKUP`];
  }

  delete process.env[`${key}_BACKUP`];
}

describe("Detect CI/CD Platforms", () => {
  before(() => {
    // As the UT is to be executed under GitHub, reset the predefined var.
    backupAndSetEnv("GITHUB_ACTIONS", "false");
  });

  after(() => {
    restoreAndDeleteEnv("GITHUB_ACTIONS");
  });

  describe("Detect CI/CD Platforms", () => {
    it("No CI/CD Platform Detected", () => {
      // Arrange
      // Act
      const plat = tryDetectCICDPlatform();
      // Assert
      expect(plat).to.be.equals(CliConfigRunFrom.Other);
    });

    it("GitHub Detected", () => {
      // Arrange
      backupAndSetEnv("GITHUB_ACTIONS", "true");
      // Act
      const plat = tryDetectCICDPlatform();
      restoreAndDeleteEnv("GITHUB_ACTIONS");
      // Assert
      expect(plat).to.be.equals(CliConfigRunFrom.GitHub);
    });

    it("Azure DevOps Detected", () => {
      // Arrange
      backupAndSetEnv("BUILD_SOURCEBRANCHNAME", "anything");
      backupAndSetEnv("AGENT_BUILDDIRECTORY", "anything");
      // Act
      const plat = tryDetectCICDPlatform();
      restoreAndDeleteEnv("BUILD_SOURCEBRANCHNAME");
      restoreAndDeleteEnv("AGENT_BUILDDIRECTORY");
      // Assert
      expect(plat).to.be.equals(CliConfigRunFrom.AzDo);
    });

    it("Jenkins Detected", () => {
      // Arrange
      backupAndSetEnv("JENKINS_URL", "anything");
      backupAndSetEnv("BUILD_URL", "anything");
      // Act
      const plat = tryDetectCICDPlatform();
      restoreAndDeleteEnv("JENKINS_URL");
      restoreAndDeleteEnv("BUILD_URL");
      // Assert
      expect(plat).to.be.equals(CliConfigRunFrom.Jenkins);
    });
  });
});
