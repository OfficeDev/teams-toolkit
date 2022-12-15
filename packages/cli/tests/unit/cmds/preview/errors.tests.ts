// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import { Browser } from "../../../../src/cmds/preview/constants";
import * as errors from "../../../../src/cmds/preview/errors";

describe("errors", () => {
  describe("WorkSpaceNotSupported", () => {
    it("should have correct source and name", () => {
      const e = errors.WorkspaceNotSupported("");
      chai.expect(e.source).eq("TeamsfxCLI");
      chai.expect(e.name).eq("WorkspaceNotSupported");
    });
  });

  describe("ExclusiveLocalRemoteOptions", () => {
    it("should have correct source and name", () => {
      const e = errors.ExclusiveLocalRemoteOptions();
      chai.expect(e.source).eq("TeamsfxCLI");
      chai.expect(e.name).eq("ExclusiveLocalRemoteOptions");
    });
  });

  describe("RequiredPathNotExists", () => {
    it("should have correct source and name", () => {
      const e = errors.RequiredPathNotExists("");
      chai.expect(e.source).eq("TeamsfxCLI");
      chai.expect(e.name).eq("RequiredPathNotExists");
    });
  });
});
