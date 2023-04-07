/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import {
  err,
  FuncValidation,
  getValidationFunction,
  Inputs,
  Platform,
  SingleSelectQuestion,
  Stage,
  TextInputQuestion,
} from "@microsoft/teamsfx-api";
import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import fs from "fs-extra";
import * as path from "path";
import { getLocalizedString } from "../../../../../src/common/localizeUtils";
import {
  spfxPackageSelectQuestion,
  versionCheckQuestion,
  webpartNameQuestion,
} from "../../../../../src/component/resource/spfx/utils/questions";
import { Utils } from "../../../../../src/component/resource/spfx/utils/utils";
import { cpUtils } from "../../../../../src";
import {
  PackageSelectOptionsHelper,
  SPFxVersionOptionIds,
} from "../../../../../src/component/resource/spfx/utils/question-helper";
import mockedEnv, { RestoreFn } from "mocked-env";
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

  describe("versionCheckQuestion", async () => {
    afterEach(() => {
      sinon.restore();
    });

    it("Throw error when NPM not installed", async () => {
      sinon.stub(Utils, "getNPMMajorVersion").resolves(undefined);

      try {
        await (versionCheckQuestion as any).func({});
      } catch (e) {
        chai.expect(e.name).equal("NpmNotFound");
      }
    });

    it("Throw error when NPM version not supported", async () => {
      sinon.stub(Utils, "getNPMMajorVersion").resolves("4");

      try {
        await (versionCheckQuestion as any).func({});
      } catch (e) {
        chai.expect(e.name).equal("NpmVersionNotSupported");
      }
    });

    it("Throw error when Node version not supported", async () => {
      sinon.stub(Utils, "getNPMMajorVersion").resolves("8");
      sinon.stub(Utils, "getNodeVersion").resolves("18");

      try {
        await (versionCheckQuestion as any).func({});
      } catch (e) {
        chai.expect(e.name).equal("NodeVersionNotSupported");
      }
    });

    it("Return undefined when both Node and NPM version supported", async () => {
      sinon.stub(Utils, "getNPMMajorVersion").resolves("8");
      sinon.stub(Utils, "getNodeVersion").resolves("16");

      const res = await (versionCheckQuestion as any).func({});

      chai.expect(res).equal(undefined);
    });
  });

  describe("spfxPackageSelectQuestion", async () => {
    afterEach(() => {
      sinon.restore();
    });

    it("return undefined if choosing to install locally", async () => {
      const func = getValidationFunction<string>(
        (spfxPackageSelectQuestion as SingleSelectQuestion).validation!,
        { platform: Platform.VSCode }
      );
      const res = await func(SPFxVersionOptionIds.installLocally);
      chai.expect(res).equal(undefined);
    });

    it("return undefined if package exists", async () => {
      sinon.stub(PackageSelectOptionsHelper, "checkGlobalPackages").returns(true);

      const func = getValidationFunction<string>(
        (spfxPackageSelectQuestion as SingleSelectQuestion).validation!,
        { platform: Platform.VSCode }
      );
      const res = await func(SPFxVersionOptionIds.globalPackage);
      chai.expect(res).equal(undefined);
    });

    it("return undefined if package exists", async () => {
      sinon.stub(PackageSelectOptionsHelper, "checkGlobalPackages").returns(false);

      const func = getValidationFunction<string>(
        (spfxPackageSelectQuestion as SingleSelectQuestion).validation!,
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
});
