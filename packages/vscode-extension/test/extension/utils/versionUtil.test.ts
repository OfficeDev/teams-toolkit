import * as sinon from "sinon";
import * as chai from "chai";
import * as versionUtil from "../../../src/utils/versionUtil";

describe("versionUtil", () => {
  describe("Compare Version", () => {
    it("same version", () => {
      chai.expect(versionUtil.compare("2.6.0", "2.6.0")).equals(0);
    });

    it("Compare Pre Version", () => {
      chai.expect(versionUtil.compare("2.6.0-alpha.1", "2.6.0")).equals(-1);
      chai.expect(versionUtil.compare("2.6.0", "2.6.0-alpha.1")).equals(1);
      chai.expect(versionUtil.compare("2.6.0-alpha.1", "2.6.0-alpha.1")).equals(0);
    });

    it("Compare Empty Version", () => {
      chai.expect(versionUtil.compare("", "")).equals(0);
      chai.expect(versionUtil.compare("2.6.0", "")).equals(0);
      chai.expect(versionUtil.compare("", "2.6.0")).equals(0);
    });
  });
});
