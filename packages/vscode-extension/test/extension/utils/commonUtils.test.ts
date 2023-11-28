import * as sinon from "sinon";
import * as chai from "chai";
import { syncFeatureFlags } from "../../../src/utils/commonUtils";
import * as vscode from "vscode";
import { EventEmitter } from "events";

describe("commonUtils", () => {
  describe("syncFeatureFlags", () => {
    afterEach(async () => {
      sinon.restore();
    });

    it("set feature flag", () => {
      const eventEmitter = new EventEmitter();
      sinon.replace(vscode.workspace, "onDidChangeConfiguration", eventEmitter as any);
      const stub = sinon
        .stub(vscode.workspace, "getConfiguration")
        .callsFake(
          (
            section?: string,
            scope?: vscode.ConfigurationScope | null
          ): vscode.WorkspaceConfiguration => {
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
          }
        );

      syncFeatureFlags();

      chai.assert.isTrue(stub.called);
    });
  });
});
