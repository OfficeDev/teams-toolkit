// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import { expect } from "chai";
import axios from "axios";
import { stub, restore } from "sinon";
import rewire from "rewire";

const ngrok = rewire("../../../../../src/plugins/solution/fx-solution/debug/util/ngrok");

describe("ngrok", () => {
  before(() => {
    ngrok.__set__("delay", () => {});
  });

  afterEach(() => {
    restore();
  });

  it("don't support port out of [4040, 4045)", async () => {
    stub(axios, "get").callsFake(async () => {
      return undefined;
    });
    const result = await ngrok.getNgrokHttpUrl("4039");
    expect(result).to.be.undefined;
  });

  it("could get ngrok url if port in [4040, 4045)", async () => {
    stub(axios, "get").callsFake(async () => {
      return {
        data: {
          tunnels: [
            { public_url: "xxx", proto: "https", config: { addr: "http://localhost:4041" } },
          ],
        },
      };
    });
    const result = await ngrok.getNgrokHttpUrl("4041");
    expect(result).equals("xxx");
  });

  it("could get ngrok url by addr string", async () => {
    stub(axios, "get").callsFake(async () => {
      return {
        data: {
          tunnels: [
            { public_url: "test_url", proto: "https", config: { addr: "http://localhost:4041" } },
          ],
        },
      };
    });
    const result = await ngrok.getNgrokHttpUrl("http://localhost:4041");
    expect(result).equals("test_url");
  });

  it("could get ngrok url by addr string and trailing slash", async () => {
    stub(axios, "get").callsFake(async () => {
      return {
        data: {
          tunnels: [
            { public_url: "test_url", proto: "https", config: { addr: "http://localhost:4041" } },
          ],
        },
      };
    });
    const result = await ngrok.getNgrokHttpUrl("http://localhost:4041/");
    expect(result).equals("test_url");
  });

  it("could get ngrok url by addr number and trailing slash", async () => {
    stub(axios, "get").callsFake(async () => {
      return {
        data: {
          tunnels: [
            { public_url: "test_url", proto: "https", config: { addr: "http://localhost:4041/" } },
          ],
        },
      };
    });
    const result = await ngrok.getNgrokHttpUrl(4041);
    expect(result).equals("test_url");
  });
});
