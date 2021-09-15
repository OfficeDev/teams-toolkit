import * as sinon from "sinon";
import * as chai from "chai";
import * as versionUtil from "../../../../src/utils/versionUtil";

suite("versionUtil", () => {
  suite("Compare Version", () => {
    test("same version", () => {
      chai.expect(versionUtil.compare("2.6.0", "2.6.0")).equals(0);
    });

    test("Compare Pre Version", () => {
      chai.expect(versionUtil.compare("2.6.0-alpha.1", "2.6.0")).equals(-1);
      chai.expect(versionUtil.compare("2.6.0", "2.6.0-alpha.1")).equals(1);
      chai.expect(versionUtil.compare("2.6.0-alpha.1", "2.6.0-alpha.1")).equals(0);
    });

    test("Compare Empty Version", () => {
      chai.expect(versionUtil.compare("", "")).equals(0);
      chai.expect(versionUtil.compare("2.6.0", "")).equals(0);
      chai.expect(versionUtil.compare("", "2.6.0")).equals(0);
    });
  });
});
