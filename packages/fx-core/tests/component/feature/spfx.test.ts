/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  err,
  InputsWithProjectPath,
  ok,
  Platform,
  QTreeNode,
  UserError,
} from "@microsoft/teamsfx-api";
import * as chai from "chai";
import "mocha";
import { RestoreFn } from "mocked-env";
import * as sinon from "sinon";
import { scaffoldSPFx } from "../../../src/component/code/spfxTabCode";
import { GeneratorChecker } from "../../../src/component/resource/spfx/depsChecker/generatorChecker";
import { YoChecker } from "../../../src/component/resource/spfx/depsChecker/yoChecker";
import { SPFXQuestionNames } from "../../../src/component/resource/spfx/utils/questions";
import * as utils from "../../../src/component/utils";
import { setTools } from "../../../src/core/globalVars";
import { InstallSoftwareError } from "../../../src/error/common";
import { MockTools } from "../../core/utils";
import { getSPFxScaffoldQuestion } from "../../../src/component/question";

describe("spfx", () => {
  describe("getSPFxScaffoldQuestion: isSpfxDecoupleEnabled", () => {
    const sandbox = sinon.createSandbox();
    let mockedEnvRestore: RestoreFn | undefined;

    afterEach(() => {
      sandbox.restore();
      if (mockedEnvRestore) {
        mockedEnvRestore();
      }
    });

    it("questions: SPFx Scaffolding questions", () => {
      const node: QTreeNode = getSPFxScaffoldQuestion(Platform.CLI);

      chai.expect(node.children![0].data.name).equal(SPFXQuestionNames.load_package_version);
      chai
        .expect(node.children![0].children![0].data.name)
        .equal(SPFXQuestionNames.use_global_package_or_install_local);
    });

    it("questions: new SPFx cli help", () => {
      const node: QTreeNode = getSPFxScaffoldQuestion(Platform.CLI_HELP);

      chai
        .expect(node.children![0].data.name)
        .equal(SPFXQuestionNames.use_global_package_or_install_local);
      chai.expect(node.children![1].data.name).equal(SPFXQuestionNames.framework_type);
      chai.expect(node.children![2].data.name).equal(SPFXQuestionNames.webpart_name);
    });
  });

  describe("scaffoldSPFx", () => {
    const sandbox = sinon.createSandbox();
    let mockedEnvRestore: RestoreFn | undefined;
    const tools = new MockTools();
    setTools(tools);
    afterEach(() => {
      sandbox.restore();
      if (mockedEnvRestore) {
        mockedEnvRestore();
      }
    });

    it("Error: YoChecker.ensureDependency return error", async () => {
      sandbox.stub(YoChecker.prototype, "isInstalled").resolves(false);
      sandbox.stub(GeneratorChecker.prototype, "isInstalled").resolves(false);
      sandbox.stub(YoChecker.prototype, "ensureDependency").resolves(err(new UserError({})));
      const context = utils.createContextV3();
      const inputs: InputsWithProjectPath = {
        projectPath: ".",
        platform: Platform.VSCode,
        [SPFXQuestionNames.webpart_name]: "mockWebPart",
        [SPFXQuestionNames.framework_type]: "none",
      };
      const res = await scaffoldSPFx(context, inputs, ".");
      chai.expect(res.isErr()).equal(true);
      if (res.isErr()) {
        chai.expect(res.error instanceof InstallSoftwareError).equal(true);
      }
    });
    it("Error: GeneratorChecker.ensureDependency return error", async () => {
      sandbox.stub(YoChecker.prototype, "isInstalled").resolves(false);
      sandbox.stub(GeneratorChecker.prototype, "isInstalled").resolves(false);
      sandbox.stub(YoChecker.prototype, "ensureDependency").resolves(ok(true));
      sandbox.stub(GeneratorChecker.prototype, "ensureDependency").resolves(err(new UserError({})));
      const context = utils.createContextV3();
      const inputs: InputsWithProjectPath = {
        projectPath: ".",
        platform: Platform.VSCode,
        [SPFXQuestionNames.webpart_name]: "mockWebPart",
        [SPFXQuestionNames.framework_type]: "none",
      };
      const res = await scaffoldSPFx(context, inputs, ".");
      chai.expect(res.isErr()).equal(true);
      if (res.isErr()) {
        chai.expect(res.error instanceof InstallSoftwareError).equal(true);
      }
    });
  });
});
