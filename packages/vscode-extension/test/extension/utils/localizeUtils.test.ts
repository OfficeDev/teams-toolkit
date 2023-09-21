import * as chai from "chai";
import * as fs from "fs-extra";
import sinon from "ts-sinon";
import VsCodeLogInstance from "../../../src/commonlib/log";
import * as globalVariables from "../../../src/globalVariables";
import {
  _resetCollections,
  loadLocalizedStrings,
  parseLocale,
} from "../../../src/utils/localizeUtils";

describe("localizeUtils", () => {
  afterEach(() => {
    _resetCollections();
    sinon.restore();
  });
  describe("loadLocalizedStrings", () => {
    it("should log error if no default string collection", () => {
      sinon.stub(fs, "pathExistsSync").callsFake((directory: string) => {
        if (directory.includes("package.nls.json")) {
          return false;
        }
        return true;
      });
      sinon.stub(fs, "readJsonSync").returns({});
      sinon.stub(globalVariables, "context").value({ extensionPath: "" });
      const vscodeLogStub = sinon.stub(VsCodeLogInstance, "error");
      _resetCollections();

      loadLocalizedStrings();

      chai.expect(vscodeLogStub.calledOnce).to.be.true;
    });
  });

  describe("parseLocale", () => {
    it("should return current locale", () => {
      sinon.stub(process, "env").value({ VSCODE_NLS_CONFIG: '{ "locale": "zh-cn" }' });

      const locale = parseLocale();

      chai.expect(locale).to.equal("zh-cn");
    });
  });
});
