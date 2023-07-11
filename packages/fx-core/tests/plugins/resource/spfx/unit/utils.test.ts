/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import {
  FuncValidation,
  getValidationFunction,
  Inputs,
  Platform,
  SingleSelectQuestion,
  Stage,
  TextInputQuestion,
} from "@microsoft/teamsfx-api";
import * as chai from "chai";
import fs from "fs-extra";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as path from "path";
import * as sinon from "sinon";
import { cpUtils } from "../../../../../src";
import { getLocalizedString } from "../../../../../src/common/localizeUtils";
import { Utils } from "../../../../../src/component/generator/spfx/utils/utils";
import {
  PackageSelectOptionsHelper,
  SPFxVersionOptionIds,
  QuestionNames,
  SPFxPackageSelectQuestion,
  SPFxWebpartNameQuestion,
  appNameQuestion,
} from "../../../../../src/question";

describe("utils", () => {
  afterEach(async () => {
    sinon.restore();
  });

  describe("webpart name", () => {
    let mockedEnvRestore: RestoreFn;
    const previousInputs: Inputs = { platform: Platform.VSCode };
    beforeEach(() => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
      previousInputs["projectPath"] = "c:\\testPath";
    });
    afterEach(() => {
      mockedEnvRestore();
    });

    it("Returns undefined when web part name not duplicated in create stage", async () => {
      previousInputs.stage = Stage.create;

      const res = await (
        (SPFxWebpartNameQuestion() as TextInputQuestion).validation! as FuncValidation<string>
      ).validFunc("helloworld", previousInputs);

      chai.expect(res).equal(undefined);
    });

    it("Returns not match pattern when web part name pattern mismatch in create stage", async () => {
      previousInputs.stage = Stage.create;
      const input = "1";

      const res = await (
        (SPFxWebpartNameQuestion() as TextInputQuestion).validation! as FuncValidation<string>
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
        (SPFxWebpartNameQuestion() as TextInputQuestion).validation! as FuncValidation<string>
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
      previousInputs["spfx-folder"] = path.join(previousInputs?.projectPath!, "SPFx");
      const res = await (
        (SPFxWebpartNameQuestion() as TextInputQuestion).validation! as FuncValidation<string>
      ).validFunc(input, previousInputs);

      chai.expect(res).equal(undefined);
      sinon.restore();
    });

    it("Returns not match pattern when web part name pattern mismatch in addFeature stage", async () => {
      previousInputs.stage = Stage.addFeature;
      const input = "1";

      const res = await (
        (SPFxWebpartNameQuestion() as TextInputQuestion).validation! as FuncValidation<string>
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
      previousInputs["spfx-folder"] = path.join(previousInputs?.projectPath!, "SPFx");
      const res = await (
        (SPFxWebpartNameQuestion() as TextInputQuestion).validation! as FuncValidation<string>
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

  describe("SPFxPackageSelectQuestion", async () => {
    afterEach(() => {
      sinon.restore();
    });

    it("return undefined if choosing to install locally", async () => {
      const func = getValidationFunction<string>(
        (SPFxPackageSelectQuestion() as SingleSelectQuestion).validation!,
        { platform: Platform.VSCode }
      );
      const res = await func(SPFxVersionOptionIds.installLocally);
      chai.expect(res).equal(undefined);
    });

    it("return undefined if package exists", async () => {
      sinon.stub(PackageSelectOptionsHelper, "checkGlobalPackages").returns(true);

      const func = getValidationFunction<string>(
        (SPFxPackageSelectQuestion() as SingleSelectQuestion).validation!,
        { platform: Platform.VSCode }
      );
      const res = await func(SPFxVersionOptionIds.globalPackage);
      chai.expect(res).equal(undefined);
    });

    it("return undefined if package exists", async () => {
      sinon.stub(PackageSelectOptionsHelper, "checkGlobalPackages").returns(false);

      const func = getValidationFunction<string>(
        (SPFxPackageSelectQuestion() as SingleSelectQuestion).validation!,
        { platform: Platform.VSCode }
      );
      let error;
      try {
        await func(SPFxVersionOptionIds.globalPackage);
      } catch (e) {
        error = e;
      }
      chai.expect(error.name).equal("DevEnvironmentSetupError");
    });
  });

  it("findLatestVersion: exeute commmand error with undefined logger", async () => {
    sinon.stub(cpUtils, "executeCommand").throws("run command error");

    const res = await Utils.findLatestVersion(undefined, "name", 0);
    chai.expect(res).to.be.undefined;
  });

  it("findGloballyInstalledVersion: exeute commmand error with undefined logger", async () => {
    sinon.stub(cpUtils, "executeCommand").throws("run command error");
    let error = undefined;

    try {
      await Utils.findGloballyInstalledVersion(undefined, "name", 0);
    } catch (e) {
      error = e;
    }
    chai.expect(error).not.undefined;
  });

  it("findGloballyInstalledVersion: exeute commmand error but not throw error", async () => {
    sinon.stub(cpUtils, "executeCommand").throws("run command error");

    const res = await Utils.findGloballyInstalledVersion(undefined, "name", 0, false);

    chai.expect(res).to.be.undefined;
  });

  it("dynamicOptions", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
    };
    sinon.stub(PackageSelectOptionsHelper, "loadOptions").resolves();
    sinon.stub(PackageSelectOptionsHelper, "getOptions").resolves([]);
    const res = await (SPFxPackageSelectQuestion() as SingleSelectQuestion).dynamicOptions!(inputs);
    chai.expect(res.length === 0).to.be.true;
  });

  it("Returns solution name as default app name", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      folder: "c:\\testApp",
      [QuestionNames.SPFxFolder]: "c:\\test",
      [QuestionNames.SPFxSolution]: "import",
    };
    sinon
      .stub(fs, "readJson")
      .resolves({ "@microsoft/generator-sharepoint": { solutionName: "fakedSolutionName" } });
    sinon.stub(fs, "pathExists").resolves(true);

    const defaultName = await (appNameQuestion() as any).default(inputs);
    chai.expect(defaultName).equal("fakedSolutionName");
  });
});
