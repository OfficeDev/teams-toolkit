// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { createSandbox, SinonSandbox } from "sinon";
import dotenv from "dotenv";
import * as CLI from "../../../../src/component/resource/apim/questions/cliQuestion";
import * as VSCode from "../../../../src/component/resource/apim/questions/vscodeQuestion";
import { OpenApiProcessor } from "../../../../src/component/resource/apim/utils/openApiProcessor";
import { ApimService } from "../../../../src/component/resource/apim/services/apimService";
import { Lazy } from "../../../../src/component/resource/apim/utils/commonUtils";
import {
  CliQuestionManager,
  VscQuestionManager,
} from "../../../../src/component/resource/apim/managers/questionManager";
import { ApimPluginConfig } from "../../../../src/component/resource/apim/config";
dotenv.config();
chai.use(chaiAsPromised);

describe("QuestionManager", () => {
  describe("#VscQuestionManager()", () => {
    const sandbox = createSandbox();
    afterEach(() => {
      sandbox.restore();
    });

    it("deploy", async () => {
      const vscQuestionManager = buildVscQuestionManager(sandbox);
      const res = await vscQuestionManager.deploy("", undefined, new ApimPluginConfig({}, "dev"));
      chai.assert.isNotEmpty(res);
      chai.assert.equal(res.children?.length ?? 0, 1);
      if (res.children && res.children.length > 0) {
        chai.assert.equal(res.children[0].children?.length ?? 0, 2);
      }
    });
  });

  describe("#CliQuestionManager()", () => {
    const sandbox = createSandbox();
    afterEach(() => {
      sandbox.restore();
    });

    it("deploy", async () => {
      const cliQuestionManager = buildCliQuestionManager();
      const res = await cliQuestionManager.deploy("", undefined, new ApimPluginConfig({}, "dev"));
      chai.assert.isNotEmpty(res);
      chai.assert.equal(res.children?.length ?? 0, 3);
    });
  });
});

function buildVscQuestionManager(sandbox: SinonSandbox) {
  const openApiProcessor = sandbox.createStubInstance(OpenApiProcessor);
  const apimService = sandbox.createStubInstance(ApimService);
  const lazyApimService = new Lazy(async () => {
    return apimService as unknown as ApimService;
  });
  const openApiDocumentQuestion = new VSCode.OpenApiDocumentQuestion(
    openApiProcessor as unknown as OpenApiProcessor
  );
  const existingOpenApiDocumentFunc = new VSCode.ExistingOpenApiDocumentFunc(
    openApiProcessor as unknown as OpenApiProcessor
  );
  const apiPrefixQuestion = new VSCode.ApiPrefixQuestion();
  const apiVersionQuestion = new VSCode.ApiVersionQuestion(lazyApimService);
  const newApiVersionQuestion = new VSCode.NewApiVersionQuestion();
  return new VscQuestionManager(
    openApiDocumentQuestion,
    apiPrefixQuestion,
    apiVersionQuestion,
    newApiVersionQuestion,
    existingOpenApiDocumentFunc
  );
}

function buildCliQuestionManager() {
  const cliOpenApiDocumentQuestion = new CLI.OpenApiDocumentQuestion();
  const cliApiPrefixQuestion = new CLI.ApiPrefixQuestion();
  const cliApiVersionQuestion = new CLI.ApiVersionQuestion();

  return new CliQuestionManager(
    cliOpenApiDocumentQuestion,
    cliApiPrefixQuestion,
    cliApiVersionQuestion
  );
}
