// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as sinon from "sinon";
import { window } from "vscode";

import { ProgressHandler } from "../../src/progressHandler";
import * as commonUtils from "../../src/utils/commonUtils";
import * as vscodeMocks from "../mocks/vsc";

describe("ProgressHandler", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("terminal", async () => {
    const progressHandler = new ProgressHandler("test title", 2, "terminal");
    sinon.stub(window, "withProgress").callsFake(async (options, task) => {
      return await task({ report: () => {} }, new vscodeMocks.CancellationToken());
    });
    sinon.stub(commonUtils, "sleep").callsFake(async () => {});
    await progressHandler.start();
    await progressHandler.next();
    sinon.restore();
  });

  it("output", async () => {
    const progressHandler = new ProgressHandler("test title", 2, "terminal");
    sinon.stub(window, "withProgress").callsFake(async (options, task) => {
      return await task({ report: () => {} }, new vscodeMocks.CancellationToken());
    });
    sinon.stub(commonUtils, "sleep").callsFake(async () => {});
    await progressHandler.start();
    await progressHandler.next();
    sinon.restore();
  });
});
