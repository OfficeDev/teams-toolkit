/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import { FuncValidation, Inputs, Platform, Stage, TextInputQuestion } from "@microsoft/teamsfx-api";
import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import fs from "fs-extra";
import * as path from "path";
import { getLocalizedString } from "../../../../../src/common/localizeUtils";
import { webpartNameQuestion } from "../../../../../src/plugins/resource/spfx/utils/questions";

describe("utils", () => {
  describe("webpart name", () => {
    const previousInputs: Inputs = { platform: Platform.VSCode };
    beforeEach(() => {
      previousInputs["projectPath"] = "c:\\testPath";
    });

    it("Returns undefined when web part name not duplicated in create stage", async () => {
      previousInputs.stage = Stage.create;

      const res = await (
        (webpartNameQuestion! as TextInputQuestion).validation! as FuncValidation<string>
      ).validFunc("helloworld", previousInputs);

      chai.expect(res).equal(undefined);
    });

    it("Returns not match pattern when web part name pattern mismatch in create stage", async () => {
      previousInputs.stage = Stage.create;
      const input = "1";

      const res = await (
        (webpartNameQuestion! as TextInputQuestion).validation! as FuncValidation<string>
      ).validFunc(input, previousInputs);

      chai
        .expect(res)
        .equal(
          getLocalizedString(
            "plugins.spfx.questions.webpartName.error.notMatch",
            input,
            "^[a-zA-Z_][a-zA-Z0-9_]*$"
          )
        );
    });

    it("Returns undefined when web part name pattern duplicated in create stage", async () => {
      previousInputs.stage = Stage.create;
      const input = "helloworld";
      sinon.stub(fs, "pathExists").callsFake(async (directory) => {
        if (
          directory === path.join(previousInputs?.projectPath!, "SPFx", "src", "webparts", input)
        ) {
          return true;
        }
      });

      const res = await (
        (webpartNameQuestion! as TextInputQuestion).validation! as FuncValidation<string>
      ).validFunc(input, previousInputs);

      chai.expect(res).equal(undefined);
      sinon.restore();
    });

    it("Returns undefined when web part name not duplicated in addFeature stage", async () => {
      previousInputs.stage = Stage.addFeature;
      const input = "helloworld";
      sinon.stub(fs, "pathExists").callsFake(async (directory) => {
        if (
          directory === path.join(previousInputs?.projectPath!, "SPFx", "src", "webparts", input)
        ) {
          return false;
        }
      });

      const res = await (
        (webpartNameQuestion! as TextInputQuestion).validation! as FuncValidation<string>
      ).validFunc(input, previousInputs);

      chai.expect(res).equal(undefined);
      sinon.restore();
    });

    it("Returns not match pattern when web part name pattern mismatch in addFeature stage", async () => {
      previousInputs.stage = Stage.addFeature;
      const input = "1";

      const res = await (
        (webpartNameQuestion! as TextInputQuestion).validation! as FuncValidation<string>
      ).validFunc(input, previousInputs);

      chai
        .expect(res)
        .equal(
          getLocalizedString(
            "plugins.spfx.questions.webpartName.error.notMatch",
            input,
            "^[a-zA-Z_][a-zA-Z0-9_]*$"
          )
        );
    });

    it("Returns duplicated when web part name pattern duplicated in addFeature stage", async () => {
      previousInputs.stage = Stage.addFeature;
      const input = "helloworld";
      sinon.stub(fs, "pathExists").callsFake(async (directory) => {
        if (
          directory === path.join(previousInputs?.projectPath!, "SPFx", "src", "webparts", input)
        ) {
          return true;
        }
      });

      const res = await (
        (webpartNameQuestion! as TextInputQuestion).validation! as FuncValidation<string>
      ).validFunc(input, previousInputs);

      chai
        .expect(res)
        .equal(
          getLocalizedString(
            "plugins.spfx.questions.webpartName.error.duplicate",
            path.join(previousInputs?.projectPath!, "SPFx", "src", "webparts", input)
          )
        );
      sinon.restore();
    });
  });
});
