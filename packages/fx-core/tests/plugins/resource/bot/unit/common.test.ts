// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";

import { convertToConstValues } from "../../../../../src/plugins/resource/bot/utils/common";
import { HostTypes } from "../../../../../src/plugins/resource/bot/resources/strings";

describe("#convertToConstValues", () => {
  describe("Host Type", () => {
    it("undefined", () => {
      chai.assert.equal(convertToConstValues(undefined, HostTypes), undefined);
    });
    it("error type", () => {
      chai.assert.equal(convertToConstValues("error-type", HostTypes), undefined);
    });
    it("azure-functions", () => {
      chai.assert.equal(
        convertToConstValues("azure-functions", HostTypes),
        HostTypes.AZURE_FUNCTIONS
      );
    });
  });
});
