import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import { Utils } from "../../../../../src/component/resource/spfx/utils/utils";
import { PackageSelectOptionsHelper } from "../../../../../src/component/resource/spfx/utils/question-helper";

describe("question-helpers", () => {
  describe("PackageSelectOptionsHelper", () => {
    const sandbox = sinon.createSandbox();

    afterEach(async () => {
      PackageSelectOptionsHelper.clear();
      sandbox.restore();
    });

    it("loadOptions and getOptions: not find latest", async () => {
      sandbox.stub(Utils, "findGloballyInstalledVersion").resolves(undefined);
      sandbox.stub(Utils, "findLatestVersion").resolves(undefined);

      const originalOptions = PackageSelectOptionsHelper.getOptions();
      chai.expect(originalOptions.length).equal(0);
      await PackageSelectOptionsHelper.loadOptions();
      const options = PackageSelectOptionsHelper.getOptions();
      const latestVersion = PackageSelectOptionsHelper.getLatestSpGeneratorVersion();
      const isLowerVersion = PackageSelectOptionsHelper.isLowerThanRecommendedVersion();

      chai.expect(options.length).equal(2);
      chai.expect(options[0].label.includes("(")).equal(false);
      chai.expect(options[1].label.includes("(")).equal(false);
      chai.expect(latestVersion).to.be.undefined;
      chai.expect(isLowerVersion).to.be.undefined;
    });

    it("loadOptions and getOptions: find latest", async () => {
      sandbox.stub(Utils, "findGloballyInstalledVersion").resolves("1.16.0");
      sandbox.stub(Utils, "findLatestVersion").resolves("1.16.1");

      await PackageSelectOptionsHelper.loadOptions();
      const options = PackageSelectOptionsHelper.getOptions();
      const latestVersion = PackageSelectOptionsHelper.getLatestSpGeneratorVersion();

      chai.expect(options.length).equal(2);
      chai.expect(options[1].label.includes("v1.16.0")).equal(true);
      chai.expect(options[0].label.includes("v1.16.1")).equal(true);
      chai.expect(latestVersion).equal("1.16.1");
    });

    it("check whether pacakges installed: returns true", async () => {
      sandbox.stub(Utils, "findGloballyInstalledVersion").resolves("1.13.0");
      sandbox.stub(Utils, "findLatestVersion").resolves("1.16.1");

      await PackageSelectOptionsHelper.loadOptions();
      const res = PackageSelectOptionsHelper.checkGlobalPackages();
      const isLowerVersion = PackageSelectOptionsHelper.isLowerThanRecommendedVersion();

      chai.expect(res).equal(true);
      chai.expect(isLowerVersion).equal(true);
    });

    it("check whether pacakges installed: returns false", async () => {
      sandbox.stub(Utils, "findGloballyInstalledVersion").resolves(undefined);
      sandbox.stub(Utils, "findLatestVersion").resolves("1.16.1");

      await PackageSelectOptionsHelper.loadOptions();
      const res = PackageSelectOptionsHelper.checkGlobalPackages();

      chai.expect(res).equal(false);
    });

    it("installed beta version", async () => {
      sandbox.stub(Utils, "findGloballyInstalledVersion").resolves("1.17.0-beta.3");
      sandbox.stub(Utils, "findLatestVersion").resolves("1.16.1");

      await PackageSelectOptionsHelper.loadOptions();
      const isLowerVersion = PackageSelectOptionsHelper.isLowerThanRecommendedVersion();

      chai.expect(isLowerVersion).equal(false);
    });
  });
});
