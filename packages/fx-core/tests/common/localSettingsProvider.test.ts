import { Json, LocalSettings } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import { LocalSettingsProvider } from "../../src/common/localSettingsProvider";

describe("LocalSettingsProvider's init() and initV2()", () => {
  it("should produce same output when given same input", () => {
    const localSettings = new LocalSettingsProvider("./");
    // init() and initV2() both have 4 bool parameters. There are 2^4 = 16 combinations
    for (let i = 0; i < 15; i++) {
      const includeFrontend = !!(i & 1);
      const includeBackend = !!((i >> 1) & 1);
      const includeBotOrMessageExtension = !!((i >> 2) & 1);
      const migrateFromV1 = !!((i >> 3) & 1);
      const initOutput = localSettings.init(
        includeFrontend,
        includeBackend,
        includeBotOrMessageExtension,
        migrateFromV1
      );
      const initV2Output = localSettings.initV2(
        includeFrontend,
        includeBackend,
        includeBotOrMessageExtension,
        migrateFromV1
      );
      assert.deepEqual(initV2Output, localSettings.convertToLocalSettingsJson(initOutput));
    }
  });
});
