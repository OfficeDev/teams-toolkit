/* eslint-disable @typescript-eslint/no-non-null-assertion */
import "mocha";
import * as sinon from "sinon";
import * as chai from "chai";
import fs from "fs-extra";
import { getAddSPFxQuestionNode } from "../../../src/component/feature/spfx";

describe("spfx", () => {
  describe("getAddSPFxQuestionNode", () => {
    afterEach(() => {
      sinon.restore();
    });

    it("Ask framework when .yo-rc.json not exist", async () => {
      sinon.stub(fs, "pathExists").resolves(false);

      const res = await getAddSPFxQuestionNode("c:\\testFolder");

      chai.expect(res.isOk()).equals(true);
      if (res.isOk()) {
        chai.expect(res.value!.children![0].children!.length).equals(2);
      }
    });

    it("Ask framework when template not persisted in .yo-rc.json", async () => {
      sinon.stub(fs, "pathExists").resolves(true);
      sinon.stub(fs, "readJson").resolves({
        "@microsoft/generator-sharepoint": {
          componentType: "webpart",
        },
      });

      const res = await getAddSPFxQuestionNode("c:\\testFolder");

      chai.expect(res.isOk()).equals(true);
      if (res.isOk()) {
        chai.expect(res.value!.children![0].children!.length).equals(2);
      }
    });

    it("Don't ask framework when template persisted in .yo-rc.json", async () => {
      sinon.stub(fs, "pathExists").resolves(true);
      sinon.stub(fs, "readJson").resolves({
        "@microsoft/generator-sharepoint": {
          componentType: "webpart",
          template: "none",
        },
      });

      const res = await getAddSPFxQuestionNode("c:\\testFolder");

      chai.expect(res.isOk()).equals(true);
      if (res.isOk()) {
        chai.expect(res.value!.children![0].children!.length).equals(1);
      }
    });
  });
});
