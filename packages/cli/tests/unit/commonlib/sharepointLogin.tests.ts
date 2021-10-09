// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import SharepointTokenProvider from "../../../src/commonlib/sharepointLogin";
import { CodeFlowLogin } from "../../../src/commonlib/codeFlowLogin";
import { expect } from "../utils";
import axios from "axios";

describe("Sharepoint login Tests", function () {
  sinon.stub(CodeFlowLogin.prototype, "reloadCache").callsFake(async () => {
    return;
  });
  sinon.stub(CodeFlowLogin.prototype, "getToken").callsFake(async () => {
    return "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6Imwzc1EtNTBjQ0g0eEJWWkxIVEd3blNSNzY4MCIsImtpZCI6Imwzc1EtNTBjQ0g0eEJWWkxIVEd3blNSNzY4MCJ9.eyJhdWQiOiJodHRwczo";
  });
  sinon
    .stub(axios.prototype, "get")
    .returns({ data: { webUrl: "https://testtenant.sharepoint.com" } });

  before(async () => {});

  after(() => {});

  beforeEach(() => {});

  it("GetAccessToken", async () => {
    const result = await SharepointTokenProvider.getAccessToken();
    expect(result).equal(
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6Imwzc1EtNTBjQ0g0eEJWWkxIVEd3blNSNzY4MCIsImtpZCI6Imwzc1EtNTBjQ0g0eEJWWkxIVEd3blNSNzY4MCJ9.eyJhdWQiOiJodHRwczo"
    );
  });

  it("GetJsonObject", async () => {
    const result = await SharepointTokenProvider.getJsonObject();
    expect(result!.sub).equal("1234567890");
  });

  it("GetStatus", async () => {
    const result = await SharepointTokenProvider.getStatus();
    expect(result.status).equal("SignedOut");
  });
});
