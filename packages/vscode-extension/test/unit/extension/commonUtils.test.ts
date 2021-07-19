import * as chai from "chai";
import * as sinon from "sinon";
import * as fs from "fs-extra";
import * as commonUtils from "../../../src/utils/commonUtils";
import * as extensionPackage from "../../../package.json";

suite("CommonUtils", () => {
  suite("getPackageVersion", () => {
    test("alpha version", () => {
      const version = "1.1.1-alpha.4";

      chai.expect(commonUtils.getPackageVersion(version)).equals("alpha");
    });

    test("beta version", () => {
      const version = "1.1.1-beta.2";

      chai.expect(commonUtils.getPackageVersion(version)).equals("beta");
    });

    test("rc version", () => {
      const version = "1.0.0-rc.3";

      chai.expect(commonUtils.getPackageVersion(version)).equals("rc");
    });

    test("formal version", () => {
      const version = "4.6.0";

      chai.expect(commonUtils.getPackageVersion(version)).equals("formal");
    });
  });

  suite("isFeatureFlag", () => {
    test("return true when enabled", () => {
      sinon.stub(extensionPackage, "featureFlag").value("true");

      chai.expect(commonUtils.isFeatureFlag()).equals(true);
      sinon.restore();
    });

    test("return false when disabled", () => {
      sinon.stub(extensionPackage, "featureFlag").value("false");

      chai.expect(commonUtils.isFeatureFlag()).equals(false);
      sinon.restore();
    });
  });

  suite("isSPFxProject", () => {
    test("return false for non-spfx project", async () => {
      const testPath = "./testProject/SPFx";
      sinon.stub(fs, "pathExists").callsFake((path: string) => {
        if (path === testPath) {
          return true;
        }
        return false;
      });

      chai.expect(await commonUtils.isSPFxProject("./invalidPath")).equals(false);
      sinon.restore();
    });

    test("return true for spfx project", async () => {
      const testPath = "./testProject";
      sinon.stub(fs, "pathExists").callsFake((path: string) => {
        if (path === `${testPath}/SPFx`) {
          return true;
        }
        return false;
      });

      chai.expect(await commonUtils.isSPFxProject(testPath)).equals(true);
      sinon.restore();
    });
  });
});
