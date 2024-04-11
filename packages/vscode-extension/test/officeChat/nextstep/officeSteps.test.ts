import * as chai from "chai";
import * as chaiPromised from "chai-as-promised";
import * as sinon from "sinon";
import { officeSteps } from "../../../src/officeChat/commands/nextStep/officeSteps";
import * as condition from "../../../src/chat/commands/nextstep/condition";
import { DescripitionFunc, WholeStatus } from "../../../src/chat/commands/nextstep/types";

describe("office steps", () => {
  const sandbox = sinon.createSandbox();
  const steps = officeSteps();

  describe('title: "Teams Toolkit"', () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("condition: selected", () => {
      sandbox.stub(condition, "isFirstInstalled").returns(true);
      const step = steps.find((s) => s.title === "Teams Toolkit");
      chai.assert.isNotEmpty(step);
      chai.assert.isTrue(step?.condition({} as WholeStatus));
    });

    it("condition: not selected", () => {
      sandbox.stub(condition, "isFirstInstalled").returns(false);
      const step = steps.find((s) => s.title === "Teams Toolkit");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });
  });

  describe('title: "New Project"', () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("condition: selected", () => {
      sandbox.stub(condition, "isProjectOpened").returns(false);
      const step = steps.find((s) => s.title === "New Project");
      chai.assert.isNotEmpty(step);
      chai.assert.isTrue(step?.condition({} as WholeStatus));
    });

    it("condition: not selected", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);
      const step = steps.find((s) => s.title === "New Project");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });
  });

  describe('title: "Summary of README"', () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("description", () => {
      const step = steps.find((s) => s.title === "Summary of README");
      chai.assert.isFalse(
        (step?.description as DescripitionFunc)({
          projectOpened: {
            readmeContent: `
            123456
            # Overview of the AI Assistant Bot template

            This app template is built on top of [Teams AI library](https://aka.ms/teams-ai-library) and [OpenAI Assistants API](https://platform.openai.com/docs/assistants/overview).
            It showcases how to build an intelligent chat bot in Teams capable of helping users accomplish a specific task using natural language right in the Teams conversations, such as solving a math problem.
            
            ## Get started with the AI Assistant Bot template

            > **Prerequisites**`,
          },
        } as WholeStatus).includes("123456")
      );
    });

    it("condition: selected", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(true);
      sandbox.stub(condition, "isHaveReadMe").returns(true);
      const step = steps.find((s) => s.title === "Summary of README");
      chai.assert.isNotEmpty(step);
      chai.assert.isTrue(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - no project opened", () => {
      sandbox.stub(condition, "isProjectOpened").returns(false);
      const step = steps.find((s) => s.title === "Summary of README");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - prerequisite check failed", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      const step = steps.find((s) => s.title === "Summary of README");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - did action before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      const step = steps.find((s) => s.title === "Summary of README");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - had no readme content", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(true);
      sandbox.stub(condition, "isHaveReadMe").returns(false);
      const step = steps.find((s) => s.title === "Summary of README");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });
  });

  describe("Install Dependencies", () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("condition: selected - project opened, did action after scaffolded, dependencies not installed", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);
      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDependenciesInstalled").returns(false);

      const step = steps.find((s) => s.title === "Install Dependencies");
      chai.assert.isTrue(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - project not opened", () => {
      sandbox.stub(condition, "isProjectOpened").returns(false);

      const step = steps.find((s) => s.title === "Install Dependencies");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - did no action after scaffolded", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);
      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(true);

      const step = steps.find((s) => s.title === "Install Dependencies");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - dependencies installed", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);
      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDependenciesInstalled").returns(true);

      const step = steps.find((s) => s.title === "Install Dependencies");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });
  });

  describe("Preview in Local Environment", () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("condition: selected - project opened, did action after scaffolded, dependencies installed, can preview in local env, debug not succeeded after source code changed", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);
      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDependenciesInstalled").returns(true);
      sandbox.stub(condition, "canOfficeAddInPreviewInLocalEnv").returns(true);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(false);

      const step = steps.find((s) => s.title === "Preview in Local Environment");
      chai.assert.isTrue(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - project not opened", () => {
      sandbox.stub(condition, "isProjectOpened").returns(false);

      const step = steps.find((s) => s.title === "Preview in Local Environment");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - did no action after scaffolded", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);
      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(true);

      const step = steps.find((s) => s.title === "Preview in Local Environment");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - dependencies not installed", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);
      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDependenciesInstalled").returns(false);

      const step = steps.find((s) => s.title === "Preview in Local Environment");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - cannot preview in local env", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);
      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDependenciesInstalled").returns(true);
      sandbox.stub(condition, "canOfficeAddInPreviewInLocalEnv").returns(false);

      const step = steps.find((s) => s.title === "Preview in Local Environment");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - debug succeeded after source code changed", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);
      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDependenciesInstalled").returns(true);
      sandbox.stub(condition, "canOfficeAddInPreviewInLocalEnv").returns(true);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);

      const step = steps.find((s) => s.title === "Preview in Local Environment");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });
  });

  describe("Publish to App Source and Deploy", () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("condition: selected - project opened, did action after scaffolded, dependencies installed, debug succeeded after source code changed", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);
      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDependenciesInstalled").returns(true);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);

      const step = steps.filter((s) => s.title === "Publish to App Source" || s.title === "Deploy");
      chai.assert.isTrue(step?.[0]?.condition({} as WholeStatus));
      chai.assert.isTrue(step?.[1]?.condition({} as WholeStatus));
    });

    it("condition: not selected - project not opened", () => {
      sandbox.stub(condition, "isProjectOpened").returns(false);

      const step = steps.filter((s) => s.title === "Publish to App Source" || s.title === "Deploy");
      chai.assert.isFalse(step?.[0]?.condition({} as WholeStatus));
      chai.assert.isFalse(step?.[1]?.condition({} as WholeStatus));
    });

    it("condition: not selected - did no action after scaffolded", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);
      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(true);

      const step = steps.filter((s) => s.title === "Publish to App Source" || s.title === "Deploy");
      chai.assert.isFalse(step?.[0]?.condition({} as WholeStatus));
      chai.assert.isFalse(step?.[1]?.condition({} as WholeStatus));
    });

    it("condition: not selected - dependencies not installed", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);
      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDependenciesInstalled").returns(false);

      const step = steps.filter((s) => s.title === "Publish to App Source" || s.title === "Deploy");
      chai.assert.isFalse(step?.[0]?.condition({} as WholeStatus));
      chai.assert.isFalse(step?.[1]?.condition({} as WholeStatus));
    });

    it("condition: not selected - debug not succeeded after source code changed", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);
      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDependenciesInstalled").returns(true);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(false);

      const step = steps.filter((s) => s.title === "Publish to App Source" || s.title === "Deploy");
      chai.assert.isFalse(step?.[0]?.condition({} as WholeStatus));
      chai.assert.isFalse(step?.[1]?.condition({} as WholeStatus));
    });
  });
});
