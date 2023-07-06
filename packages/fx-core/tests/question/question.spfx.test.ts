import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import {
  PackageSelectOptionsHelper,
  SPFxPackageSelectQuestion,
  SPFxVersionOptionIds,
  SPFxWebpartNameQuestion,
} from "../../src/question/create";
import { Utils } from "../../src/component/generator/spfx/utils/utils";
import mockedEnv, { RestoreFn } from "mocked-env";
import {
  FuncValidation,
  Inputs,
  Platform,
  SingleSelectQuestion,
  Stage,
  TextInputQuestion,
  getValidationFunction,
} from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../../src/common/localizeUtils";
import * as path from "path";
import fs from "fs-extra";
describe("SPFx question-helpers", () => {
  describe("PackageSelectOptionsHelper", () => {
    const sandbox = sinon.createSandbox();

    afterEach(async () => {
      PackageSelectOptionsHelper.clear();
      sandbox.restore();
    });

    it("loadOptions and getOptions: not find latest", async () => {
      sandbox.stub(Utils, "findGloballyInstalledVersion").resolves(undefined);
      sandbox.stub(Utils, "findLatestVersion").resolves(undefined);

      const originalOptions = PackageSelectOptionsHelper.getOptions();
      chai.expect(originalOptions.length).equal(0);
      await PackageSelectOptionsHelper.loadOptions();
      const options = PackageSelectOptionsHelper.getOptions();
      const latestVersion = PackageSelectOptionsHelper.getLatestSpGeneratorVersion();
      const isLowerVersion = PackageSelectOptionsHelper.isLowerThanRecommendedVersion();

      chai.expect(options.length).equal(2);
      chai.expect(options[0].label.includes("(")).equal(false);
      chai.expect(options[1].label.includes("(")).equal(false);
      chai.expect(latestVersion).to.be.undefined;
      chai.expect(isLowerVersion).to.be.undefined;
    });

    it("loadOptions and getOptions: find latest", async () => {
      sandbox.stub(Utils, "findGloballyInstalledVersion").resolves("1.16.0");
      sandbox.stub(Utils, "findLatestVersion").resolves("1.16.1");

      await PackageSelectOptionsHelper.loadOptions();
      const options = PackageSelectOptionsHelper.getOptions();
      const latestVersion = PackageSelectOptionsHelper.getLatestSpGeneratorVersion();

      chai.expect(options.length).equal(2);
      chai.expect(options[1].label.includes("v1.16.0")).equal(true);
      chai.expect(options[0].label.includes("v1.16.1")).equal(true);
      chai.expect(latestVersion).equal("1.16.1");
    });

    it("check whether pacakges installed: returns true", async () => {
      sandbox.stub(Utils, "findGloballyInstalledVersion").resolves("1.13.0");
      sandbox.stub(Utils, "findLatestVersion").resolves("1.16.1");

      await PackageSelectOptionsHelper.loadOptions();
      const res = PackageSelectOptionsHelper.checkGlobalPackages();
      const isLowerVersion = PackageSelectOptionsHelper.isLowerThanRecommendedVersion();

      chai.expect(res).equal(true);
      chai.expect(isLowerVersion).equal(true);
    });

    it("check whether pacakges installed: returns false", async () => {
      sandbox.stub(Utils, "findGloballyInstalledVersion").resolves(undefined);
      sandbox.stub(Utils, "findLatestVersion").resolves("1.16.1");

      await PackageSelectOptionsHelper.loadOptions();
      const res = PackageSelectOptionsHelper.checkGlobalPackages();

      chai.expect(res).equal(false);
    });

    it("installed beta version", async () => {
      sandbox.stub(Utils, "findGloballyInstalledVersion").resolves("1.17.0-beta.3");
      sandbox.stub(Utils, "findLatestVersion").resolves("1.16.1");

      await PackageSelectOptionsHelper.loadOptions();
      const isLowerVersion = PackageSelectOptionsHelper.isLowerThanRecommendedVersion();

      chai.expect(isLowerVersion).equal(false);
    });
  });
  describe("SPFxWebpartNameQuestion", () => {
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
          directory === path.join(previousInputs!.projectPath!, "SPFx", "src", "webparts", input)
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
          directory === path.join(previousInputs!.projectPath!, "SPFx", "src", "webparts", input)
        ) {
          return false;
        }
      });
      previousInputs["spfx-folder"] = path.join(previousInputs!.projectPath!, "SPFx");
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
          directory === path.join(previousInputs!.projectPath!, "SPFx", "src", "webparts", input)
        ) {
          return true;
        }
      });
      previousInputs["spfx-folder"] = path.join(previousInputs!.projectPath!, "SPFx");
      const res = await (
        (SPFxWebpartNameQuestion() as TextInputQuestion).validation! as FuncValidation<string>
      ).validFunc(input, previousInputs);

      chai
        .expect(res)
        .equal(
          getLocalizedString(
            "plugins.spfx.questions.webpartName.error.duplicate",
            path.join(previousInputs!.projectPath!, "SPFx", "src", "webparts", input)
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
});
