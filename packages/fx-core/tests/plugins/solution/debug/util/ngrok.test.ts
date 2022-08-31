// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import { expect } from "chai";
import axios from "axios";
import { stub, restore } from "sinon";
import rewire from "rewire";

const ngrok = rewire("../../../../../src/plugins/solution/fx-solution/debug/util/ngrok.ts");

describe("ngrok", () => {
  before(() => {
    ngrok.__set__("delay", () => {});
  });

  afterEach(() => {
    restore();
  });

  it("only support port in [4040, 4045)", async () => {
    stub(axios, "get").callsFake(async () => {
      console.log("running!");
      return undefined;
    });
    const result = await ngrok.getNgrokHttpUrl("4039");
    expect(result).to.be.undefined;
  });
});
