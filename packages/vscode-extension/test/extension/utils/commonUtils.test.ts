import * as sinon from "sinon";
import * as chai from "chai";
import { syncFeatureFlags } from "../../../src/utils/commonUtils";
import { workspace } from "vscode";
import * as vscode from "vscode";
import * as commonUtils from "../../../src/utils/commonUtils";

describe.only("commonUtils", () => {
  describe("syncFeatureFlags", () => {
    const sandbox = sinon.createSandbox();

    afterEach(async () => {
      sandbox.restore();
    });

    it("set feature flag", () => {
      const stub = sandbox.stub(vscode.workspace, "getConfiguration").callsFake(() => {
        return {
          get: () => {
            return false;
          },
          has: () => {
            throw new Error("Method not implemented.");
          },
          inspect: () => {
            throw new Error("Method not implemented.");
          },
          update: () => {
            throw new Error("Method not implemented.");
          },
        };
      });

      syncFeatureFlags();

      chai.assert.isTrue(stub.called);
    });
  });
});
