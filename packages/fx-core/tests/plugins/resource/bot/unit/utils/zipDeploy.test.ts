// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";

import { getZipDeployEndpoint } from "../../../../../../src/plugins/resource/bot/utils/zipDeploy";
import { PluginError } from "../../../../../../src/plugins/resource/bot/errors";
import { Messages } from "../messages";

describe("Test zipDeploy", () => {
  describe("getZipDeployEndpoint", () => {
    it("Happy Path", () => {
      // Arrange
      const siteName = "abc";

      // Act
      const deployEndpoint = getZipDeployEndpoint(siteName);

      // Assert
      chai.assert.isTrue(
        deployEndpoint === `https://${siteName}.scm.azurewebsites.net/api/zipdeploy`
      );
    });
  });
});
