import * as chai from "chai";
import * as sinon from "sinon";
import * as featureFlags from "../../src/featureFlags";

describe("Feature Flags", () => {
  const sandbox = sinon.createSandbox();
  describe("Get All Feature Flags", () => {
    afterEach(async () => {
      sandbox.restore();
    });
    it("Should get one feature flag", () => {
      process.env["__TEAMSFX_INSIDER_PREVIEW"] = "1";
      const result = featureFlags.getAllFeatureFlags();
      chai.expect(result).to.have.lengthOf(1);
      process.env["__TEAMSFX_INSIDER_PREVIEW"] = undefined;
    });
  });
});
