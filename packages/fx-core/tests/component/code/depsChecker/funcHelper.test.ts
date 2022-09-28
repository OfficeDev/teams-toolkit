// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { assert } from "chai";
import "mocha";
import sinon from "sinon";
import * as os from "os";
import * as path from "path";
import fs from "fs-extra";
import { MockTools } from "../../../core/utils";
import { setTools } from "../../../../src/core/globalVars";

describe("Api function deps checker helper", () => {
  const tools = new MockTools();
  setTools(tools);
  const sandbox = sinon.createSandbox();

  beforeEach(() => {});
  afterEach(() => {
    sandbox.restore();
  });
  it("", async () => {});
});
