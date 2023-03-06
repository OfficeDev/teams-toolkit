import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import { Utils } from "../../../../../src/component/resource/spfx/utils/utils";
import { PackageSelectOptionsHelper } from "../../../../../src/component/resource/spfx/utils/question-helper";

describe("question-helpers", () => {
  describe("PackageSelectOptionsHelper", () => {
    const sandbox = sinon.createSandbox();

    afterEach(async () => {
      sandbox.restore();
    });

    it("loadOptions and getOptions", async () => {
      sandbox.stub(Utils, "findGloballyInstalledVersion").resolves("1.16.1");
      sandbox.stub(Utils, "findLatestVersion").resolves("latest");

      const originalOptions = PackageSelectOptionsHelper.getOptions();
      chai.expect(originalOptions.length).equal(0);
      await PackageSelectOptionsHelper.loadOptions();
      const options = PackageSelectOptionsHelper.getOptions();
      chai.expect(options.length).equal(2);
    });
  });
});
