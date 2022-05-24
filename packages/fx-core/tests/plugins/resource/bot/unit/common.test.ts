// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";

import { convertToConstValues } from "../../../../../src/plugins/resource/bot/utils/common";
import { HostType } from "../../../../../src/plugins/resource/bot/resources/strings";

describe("#convertToConstValues", () => {
  describe("Host Type", () => {
    it("undefined", () => {
      chai.assert.equal(convertToConstValues(undefined, HostType), undefined);
    });
    it("error type", () => {
      chai.assert.equal(convertToConstValues("error-type", HostType), undefined);
    });
    it("azure-functions", () => {
      chai.assert.equal(
        convertToConstValues("azure-functions", HostType),
        HostType.AZURE_FUNCTIONS
      );
    });
  });
});
