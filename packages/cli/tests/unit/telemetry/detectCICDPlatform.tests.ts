// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import { tryDetectCICDPlatform } from "../../../src/commonlib/common/cicdPlatformDetector";
import { CliConfigRunFrom } from "../../../src/userSetttings";
import "mocha";
import { expect } from "../utils";

describe("Detect CI/CD Platforms", () => {
  describe("Detect CI/CD Platforms", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("No CI/CD Platform Detected", () => {
      // Arrange
      // Act
      const plat = tryDetectCICDPlatform();
      // Assert
      expect(plat).to.be.equals(CliConfigRunFrom.Other);
    });

    it("GitHub Detected", () => {
      // Arrange
      sandbox.stub(process.env, "GITHUB_ACTIONS").value("true");
      // Act
      const plat = tryDetectCICDPlatform();
      // Assert
      expect(plat).to.be.equals(CliConfigRunFrom.GitHub);
    });

    it("Azure DevOps Detected", () => {
      // Arrange
      sandbox.stub(process.env, "BUILD_SOURCEBRANCHNAME").value("anything");
      sandbox.stub(process.env, "AGENT_BUILDDIRECTORY").value("anything");
      // Act
      const plat = tryDetectCICDPlatform();
      // Assert
      expect(plat).to.be.equals(CliConfigRunFrom.AzDo);
    });

    it("Jenkins Detected", () => {
      // Arrange
      sandbox.stub(process.env, "JENKINS_URL").value("anything");
      sandbox.stub(process.env, "BUILD_URL").value("anything");
      // Act
      const plat = tryDetectCICDPlatform();
      // Assert
      expect(plat).to.be.equals(CliConfigRunFrom.Jenkins);
    });
  });
});
