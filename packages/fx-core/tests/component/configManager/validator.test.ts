// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yefuwang@microsoft.com
 */

import chai from "chai";
import { describe, it } from "mocha";
import { Validator } from "../../../src/component/configManager/validator";

describe("yaml validator", () => {
  const validator = new Validator();
  it("should not support invalid versions", () => {
    chai.expect(validator.isVersionSupported("invalid version")).to.be.false;
  });

  it("should support valid versions", () => {
    chai
      .expect(validator.supportedVersions())
      .contains("1.0.0")
      .and.contains("1.1.0")
      .and.contains("v1.2");
  });
});
