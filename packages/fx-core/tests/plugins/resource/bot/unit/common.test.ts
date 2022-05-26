// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";

import { convertToEnumValues } from "../../../../../src/plugins/resource/bot/utils/common";
import { HostType } from "../../../../../src/plugins/resource/bot/v2/enum";

describe("#convertToEnumValues", () => {
  describe("Host Type", () => {
    it("undefined", () => {
      chai.assert.equal(convertToEnumValues(undefined, HostType), undefined);
    });
    it("error type", () => {
      chai.assert.equal(convertToEnumValues("error-type", HostType), undefined);
    });
    it("azure-functions", () => {
      chai.assert.equal(convertToEnumValues("azure-functions", HostType), HostType.Functions);
    });
  });
});
