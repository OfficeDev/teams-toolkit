// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import AppStudioTokenProvider from "../../../src/commonlib/appStudioLogin";
import { CodeFlowLogin } from "../../../src/commonlib/codeFlowLogin";
import { expect } from "../utils";

describe("App studio login Tests", function () {
  sinon.stub(CodeFlowLogin.prototype, "reloadCache").callsFake(async () => {
    return;
  });
  sinon.stub(CodeFlowLogin.prototype, "getToken").callsFake(async () => {
    return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
  });
  sinon.stub(CodeFlowLogin.prototype, "logout").callsFake(async () => {
    return true;
  });

  before(async () => {});

  after(() => {});

  beforeEach(() => {});

  it("GetAccessToken", async () => {
    const result = await AppStudioTokenProvider.getAccessToken();
    expect(result).equal(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    );
  });

  it("GetJsonObject", async () => {
    const result = await AppStudioTokenProvider.getJsonObject();
    expect(result!.sub).equal("1234567890");
  });

  it("Signout", async () => {
    const result = await AppStudioTokenProvider.signout();
    expect(result).equal(true);
  });

  it("GetStatus", async () => {
    const result = await AppStudioTokenProvider.getStatus();
    expect(result.status).equal("SignedOut");
  });
});
