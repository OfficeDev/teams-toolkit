import { assert } from "chai";
import "mocha";
import { LocalSettingsProvider } from "../../src/common/localSettingsProvider";

describe("LocalSettingsProvider's init() and initV2()", () => {
  it("should produce same output when given same input", () => {
    const localSettings = new LocalSettingsProvider("./");
    // init() and initV2() both have 3 bool parameters. There are 2^3 = 8 combinations
    for (let i = 0; i < 8; i++) {
      const includeFrontend = !!(i & 1);
      const includeBackend = !!((i >> 1) & 1);
      const includeBotOrMessageExtension = !!((i >> 2) & 1);
      const initOutput = localSettings.init(
        includeFrontend,
        includeBackend,
        includeBotOrMessageExtension
      );
      const initV2Output = localSettings.initV2(
        includeFrontend,
        includeBackend,
        includeBotOrMessageExtension
      );
      assert.deepEqual(initV2Output, localSettings.convertToLocalSettingsJson(initOutput));
    }
  });
});
