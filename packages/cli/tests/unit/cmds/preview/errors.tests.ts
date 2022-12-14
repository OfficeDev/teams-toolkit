import * as chai from "chai";
import {
  ExclusiveLocalRemoteOptions,
  RequiredPathNotExists,
  WorkspaceNotSupported,
} from "../../../../src/cmds/preview/errors";

describe("errors", () => {
  describe("WorkSpaceNotSupported", () => {
    it("should have correct source and name", () => {
      const e = WorkspaceNotSupported("");
      chai.expect(e.source).eq("TeamsfxCLI");
      chai.expect(e.name).eq("WorkspaceNotSupported");
    });
  });

  describe("ExclusiveLocalRemoteOptions", () => {
    it("should have correct source and name", () => {
      const e = ExclusiveLocalRemoteOptions();
      chai.expect(e.source).eq("TeamsfxCLI");
      chai.expect(e.name).eq("ExclusiveLocalRemoteOptions");
    });
  });

  describe("RequiredPathNotExists", () => {
    it("should have correct source and name", () => {
      const e = RequiredPathNotExists("");
      chai.expect(e.source).eq("TeamsfxCLI");
      chai.expect(e.name).eq("RequiredPathNotExists");
    });
  });
});
