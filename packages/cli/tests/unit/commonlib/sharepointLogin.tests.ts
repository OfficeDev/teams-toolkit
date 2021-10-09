// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import SharepointTokenProvider from "../../../src/commonlib/sharepointLogin";
import { CodeFlowLogin } from "../../../src/commonlib/codeFlowLogin";
import { expect } from "../utils";
import axios from "axios";

describe("Sharepoint login Tests", function () {
  before(async () => {
    sinon.restore();
    sinon.stub(CodeFlowLogin.prototype, "reloadCache").callsFake(async () => {
      return;
    });
    sinon.stub(CodeFlowLogin.prototype, "getToken").callsFake(async () => {
      return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    });
    sinon.stub(axios, "get").resolves({ data: { webUrl: "https://testtenant.sharepoint.com" } });
  });

  after(() => {
    sinon.restore();
  });

  beforeEach(() => {});

  it("GetAccessToken", async () => {
    const result = await SharepointTokenProvider.getAccessToken();
    expect(result).equal(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
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
