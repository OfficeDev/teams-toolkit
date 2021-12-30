// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Platform, v2 } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import {
  CapabilityAlreadyAddedError,
  ResourceAlreadyAddedError,
} from "../../../src/plugins/solution/fx-solution/v3/error";
import { InvalidInputError } from "../../../src/plugins/solution/utils/error";

describe("SolutionV3 - errors", () => {
  it("CapabilityAlreadyAddedError", async () => {
    const error = new CapabilityAlreadyAddedError("Tab");
    assert.isTrue(error.name === "CapabilityAlreadyAddedError");
  });

  it("ResourceAlreadyAddedError", async () => {
    const error = new ResourceAlreadyAddedError("Tab");
    assert.isTrue(error.name === "ResourceAlreadyAddedError");
  });

  it("InvalidInputError", async () => {
    const inputs: v2.InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const error = new InvalidInputError(inputs, "capabilities is undefined");
    assert.isTrue(error.name === "InvalidInputError");
  });
});
