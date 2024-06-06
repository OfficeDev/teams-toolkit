import * as chai from "chai";
import * as sinon from "sinon";
import * as vscode from "vscode";
import * as environmentUtils from "../../src/utils/environmentUtils";
import { Inputs, Platform, VsCodeEnv } from "@microsoft/teamsfx-api";

describe("EnvironmentUtils", () => {
  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore();
  });

  describe("detectVsCodeEnv()", function () {
    const sandbox = sinon.createSandbox();

    this.afterEach(() => {
      sandbox.restore();
    });

    it("locally run", () => {
      const expectedResult = {
        extensionKind: vscode.ExtensionKind.UI,
        id: "",
        extensionUri: vscode.Uri.file(""),
        extensionPath: "",
        isActive: true,
        packageJSON: {},
        exports: undefined,
        activate: sandbox.spy(),
      };
      const getExtension = sandbox
        .stub(vscode.extensions, "getExtension")
        .callsFake((name: string) => {
          return expectedResult;
        });

      chai.expect(environmentUtils.detectVsCodeEnv()).equals(VsCodeEnv.local);
      getExtension.restore();
    });

    it("Remotely run", () => {
      const expectedResult = {
        extensionKind: vscode.ExtensionKind.Workspace,
        id: "",
        extensionUri: vscode.Uri.file(""),
        extensionPath: "",
        isActive: true,
        packageJSON: {},
        exports: undefined,
        activate: sandbox.spy(),
      };
      const getExtension = sandbox
        .stub(vscode.extensions, "getExtension")
        .callsFake((name: string) => {
          return expectedResult;
        });

      chai
        .expect(environmentUtils.detectVsCodeEnv())
        .oneOf([VsCodeEnv.remote, VsCodeEnv.codespaceVsCode, VsCodeEnv.codespaceBrowser]);
      getExtension.restore();
    });
  });

  describe("getSystemInputs()", function () {
    const sandbox = sinon.createSandbox();

    this.afterEach(() => {
      sandbox.restore();
    });

    it("getSystemInputs()", () => {
      const input: Inputs = environmentUtils.getSystemInputs();

      chai.expect(input.platform).equals(Platform.VSCode);
    });
  });
});
