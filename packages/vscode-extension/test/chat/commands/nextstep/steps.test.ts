import * as chai from "chai";
import * as chaiPromised from "chai-as-promised";
import * as sinon from "sinon";
import { allSteps } from "../../../../src/chat/commands/nextstep/steps";
import * as condition from "../../../../src/chat/commands/nextstep/condition";
import { DescripitionFunc, WholeStatus } from "../../../../src/chat/commands/nextstep/types";

chai.use(chaiPromised);

describe("next steps", () => {
  const sandbox = sinon.createSandbox();
  const steps = allSteps();

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

  describe('title: "Test Tool"', () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("condition: selected", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(false);
      sandbox.stub(condition, "canPreviewInTestTool").returns(true);
      const step = steps.find((s) => s.title === "Test Tool");
      chai.assert.isNotEmpty(step);
      chai.assert.isTrue(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - no project opened", () => {
      sandbox.stub(condition, "isProjectOpened").returns(false);
      const step = steps.find((s) => s.title === "Test Tool");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - prerequisite check failed", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      const step = steps.find((s) => s.title === "Test Tool");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - did no action before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(true);
      const step = steps.find((s) => s.title === "Test Tool");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - debug succeed before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      const step = steps.find((s) => s.title === "Test Tool");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - cannot preview in Test Tool", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      sandbox.stub(condition, "canPreviewInTestTool").returns(false);
      const step = steps.find((s) => s.title === "Test Tool");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });
  });

  describe('title: "Microsoft 365 Account"', () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("condition: selected", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(false);
      sandbox.stub(condition, "isM365AccountLogin").returns(false);
      const step = steps.find((s) => s.title === "Microsoft 365 Account");
      chai.assert.isNotEmpty(step);
      chai.assert.isTrue(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - no project opened", () => {
      sandbox.stub(condition, "isProjectOpened").returns(false);
      const step = steps.find((s) => s.title === "Microsoft 365 Account");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - prerequisite check failed", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      const step = steps.find((s) => s.title === "Microsoft 365 Account");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - did no action before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(true);
      const step = steps.find((s) => s.title === "Microsoft 365 Account");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - debug succeed before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      const step = steps.find((s) => s.title === "Microsoft 365 Account");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - log into M365 account", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      sandbox.stub(condition, "isM365AccountLogin").returns(true);
      const step = steps.find((s) => s.title === "Microsoft 365 Account");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });
  });

  describe('title: "Microsoft 365 Developer Program"', () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("condition: selected", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(false);
      sandbox.stub(condition, "isM365AccountLogin").returns(false);
      const step = steps.find((s) => s.title === "Microsoft 365 Developer Program");
      chai.assert.isNotEmpty(step);
      chai.assert.isTrue(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - no project opened", () => {
      sandbox.stub(condition, "isProjectOpened").returns(false);
      const step = steps.find((s) => s.title === "Microsoft 365 Developer Program");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - prerequisite check failed", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      const step = steps.find((s) => s.title === "Microsoft 365 Developer Program");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - did no action before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(true);
      const step = steps.find((s) => s.title === "Microsoft 365 Developer Program");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - debug succeed before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      const step = steps.find((s) => s.title === "Microsoft 365 Developer Program");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - log into M365 account", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      sandbox.stub(condition, "isM365AccountLogin").returns(true);
      const step = steps.find((s) => s.title === "Microsoft 365 Developer Program");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });
  });

  describe('title: "Preview in Microsoft Teams"', () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("condition: selected", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(false);
      sandbox.stub(condition, "isM365AccountLogin").returns(true);
      const step = steps.find((s) => s.title === "Preview in Microsoft Teams");
      chai.assert.isNotEmpty(step);
      chai.assert.isTrue(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - no project opened", () => {
      sandbox.stub(condition, "isProjectOpened").returns(false);
      const step = steps.find((s) => s.title === "Preview in Microsoft Teams");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - prerequisite check failed", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      const step = steps.find((s) => s.title === "Preview in Microsoft Teams");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - did no action before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(true);
      const step = steps.find((s) => s.title === "Preview in Microsoft Teams");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - debug succeed before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      const step = steps.find((s) => s.title === "Preview in Microsoft Teams");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - not log into M365 account", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      sandbox.stub(condition, "isM365AccountLogin").returns(false);
      const step = steps.find((s) => s.title === "Preview in Microsoft Teams");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });
  });

  describe('title: "How to Extend"', () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("description", () => {
      const step = steps.find((s) => s.title === "How to Extend");
      chai.assert.isTrue(
        (step?.description as DescripitionFunc)({
          projectOpened: {
            readmeContent: `
            ### Run Teams Bot locally

            ## What's included in the template

            ## Extend the AI Assistant Bot template with more AI capabilities`,
          },
        } as WholeStatus).includes("Extend the AI Assistant Bot template with more AI capabilities")
      );
    });

    it("condition: selected", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      sandbox.stub(condition, "isHaveReadMe").returns(true);
      const step = steps.find((s) => s.title === "How to Extend");
      chai.assert.isNotEmpty(step);
      chai.assert.isTrue(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - no project opened", () => {
      sandbox.stub(condition, "isProjectOpened").returns(false);
      const step = steps.find((s) => s.title === "How to Extend");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - prerequisite check failed", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      const step = steps.find((s) => s.title === "How to Extend");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - did no action before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(true);
      const step = steps.find((s) => s.title === "How to Extend");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - debug failed before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(false);
      const step = steps.find((s) => s.title === "How to Extend");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - had no readme content", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      sandbox.stub(condition, "isHaveReadMe").returns(false);
      const step = steps.find((s) => s.title === "How to Extend");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });
  });

  describe('title: "CI/CD"', () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("condition: selected", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      const step = steps.find((s) => s.title === "CI/CD");
      chai.assert.isNotEmpty(step);
      chai.assert.isTrue(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - no project opened", () => {
      sandbox.stub(condition, "isProjectOpened").returns(false);
      const step = steps.find((s) => s.title === "CI/CD");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - prerequisite check failed", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      const step = steps.find((s) => s.title === "CI/CD");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - did no action before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(true);
      const step = steps.find((s) => s.title === "CI/CD");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - debug failed before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(false);
      const step = steps.find((s) => s.title === "CI/CD");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });
  });

  describe('title: "Azure Account"', () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("condition: selected", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      sandbox.stub(condition, "isProvisionedSucceededAfterInfraCodeChanged").returns(false);
      sandbox.stub(condition, "isAzureAccountLogin").returns(false);
      const step = steps.find((s) => s.title === "Azure Account");
      chai.assert.isNotEmpty(step);
      chai.assert.isTrue(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - no project opened", () => {
      sandbox.stub(condition, "isProjectOpened").returns(false);
      const step = steps.find((s) => s.title === "Azure Account");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - prerequisite check failed", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      const step = steps.find((s) => s.title === "Azure Account");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - did no action before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(true);
      const step = steps.find((s) => s.title === "Azure Account");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - debug failed before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(false);
      const step = steps.find((s) => s.title === "Azure Account");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - provision succeeded before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      sandbox.stub(condition, "isProvisionedSucceededAfterInfraCodeChanged").returns(true);
      const step = steps.find((s) => s.title === "Azure Account");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - not log into Azure account", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      sandbox.stub(condition, "isProvisionedSucceededAfterInfraCodeChanged").returns(false);
      sandbox.stub(condition, "isAzureAccountLogin").returns(true);
      const step = steps.find((s) => s.title === "Azure Account");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });
  });

  describe('title: "Provision Azure resources"', () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("condition: selected", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      sandbox.stub(condition, "isProvisionedSucceededAfterInfraCodeChanged").returns(false);
      sandbox.stub(condition, "isAzureAccountLogin").returns(true);
      const step = steps.find((s) => s.title === "Provision Azure resources");
      chai.assert.isNotEmpty(step);
      chai.assert.isTrue(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - no project opened", () => {
      sandbox.stub(condition, "isProjectOpened").returns(false);
      const step = steps.find((s) => s.title === "Provision Azure resources");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - prerequisite check failed", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      const step = steps.find((s) => s.title === "Provision Azure resources");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - did no action before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(true);
      const step = steps.find((s) => s.title === "Provision Azure resources");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - debug failed before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(false);
      const step = steps.find((s) => s.title === "Provision Azure resources");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - provision succeeded before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      sandbox.stub(condition, "isProvisionedSucceededAfterInfraCodeChanged").returns(true);
      const step = steps.find((s) => s.title === "Provision Azure resources");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - not log into Azure Account", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      sandbox.stub(condition, "isProvisionedSucceededAfterInfraCodeChanged").returns(false);
      sandbox.stub(condition, "isAzureAccountLogin").returns(false);
      const step = steps.find((s) => s.title === "Provision Azure resources");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });
  });

  describe('title: "Deploy to Cloud"', () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("condition: selected", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      sandbox.stub(condition, "isProvisionedSucceededAfterInfraCodeChanged").returns(true);
      sandbox.stub(condition, "isDeployedAfterSourceCodeChanged").returns(false);
      const step = steps.find((s) => s.title === "Deploy to Cloud");
      chai.assert.isNotEmpty(step);
      chai.assert.isTrue(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - no project opened", () => {
      sandbox.stub(condition, "isProjectOpened").returns(false);
      const step = steps.find((s) => s.title === "Deploy to Cloud");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - prerequisite check failed", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      const step = steps.find((s) => s.title === "Deploy to Cloud");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - did no action before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(true);
      const step = steps.find((s) => s.title === "Deploy to Cloud");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - debug failed before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(false);
      const step = steps.find((s) => s.title === "Deploy to Cloud");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - provision failed before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      sandbox.stub(condition, "isProvisionedSucceededAfterInfraCodeChanged").returns(false);
      const step = steps.find((s) => s.title === "Deploy to Cloud");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - deploy succeeded before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      sandbox.stub(condition, "isProvisionedSucceededAfterInfraCodeChanged").returns(true);
      sandbox.stub(condition, "isDeployedAfterSourceCodeChanged").returns(true);
      const step = steps.find((s) => s.title === "Deploy to Cloud");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });
  });

  describe('title: "Publish the App"', () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("condition: selected", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      sandbox.stub(condition, "isProvisionedSucceededAfterInfraCodeChanged").returns(true);
      sandbox.stub(condition, "isDeployedAfterSourceCodeChanged").returns(true);
      sandbox.stub(condition, "isPublishedSucceededBefore").returns(false);
      const step = steps.find((s) => s.title === "Publish the App");
      chai.assert.isNotEmpty(step);
      chai.assert.isTrue(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - no project opened", () => {
      sandbox.stub(condition, "isProjectOpened").returns(false);
      const step = steps.find((s) => s.title === "Publish the App");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - prerequisite check failed", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      const step = steps.find((s) => s.title === "Publish the App");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - did no action before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(true);
      const step = steps.find((s) => s.title === "Publish the App");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - debug failed before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(false);
      const step = steps.find((s) => s.title === "Publish the App");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - provision failed before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      sandbox.stub(condition, "isProvisionedSucceededAfterInfraCodeChanged").returns(false);
      const step = steps.find((s) => s.title === "Publish the App");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - deploy failed before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      sandbox.stub(condition, "isProvisionedSucceededAfterInfraCodeChanged").returns(true);
      sandbox.stub(condition, "isDeployedAfterSourceCodeChanged").returns(false);
      const step = steps.find((s) => s.title === "Publish the App");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - published before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      sandbox.stub(condition, "isProvisionedSucceededAfterInfraCodeChanged").returns(true);
      sandbox.stub(condition, "isDeployedAfterSourceCodeChanged").returns(true);
      sandbox.stub(condition, "isPublishedSucceededBefore").returns(true);
      const step = steps.find((s) => s.title === "Publish the App");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });
  });

  describe('title: "Remote Preview"', () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("condition: selected", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      sandbox.stub(condition, "isProvisionedSucceededAfterInfraCodeChanged").returns(true);
      sandbox.stub(condition, "isDeployedAfterSourceCodeChanged").returns(true);
      const step = steps.find((s) => s.title === "Remote Preview");
      chai.assert.isNotEmpty(step);
      chai.assert.isTrue(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - no project opened", () => {
      sandbox.stub(condition, "isProjectOpened").returns(false);
      const step = steps.find((s) => s.title === "Remote Preview");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - prerequisite check failed", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      const step = steps.find((s) => s.title === "Remote Preview");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - did no action before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(true);
      const step = steps.find((s) => s.title === "Remote Preview");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - debug failed before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(false);
      const step = steps.find((s) => s.title === "Remote Preview");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - provision failed before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      sandbox.stub(condition, "isProvisionedSucceededAfterInfraCodeChanged").returns(false);
      const step = steps.find((s) => s.title === "Remote Preview");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });

    it("condition: not selected - deploy failed before", () => {
      sandbox.stub(condition, "isProjectOpened").returns(true);

      sandbox.stub(condition, "isDidNoActionAfterScaffolded").returns(false);
      sandbox.stub(condition, "isDebugSucceededAfterSourceCodeChanged").returns(true);
      sandbox.stub(condition, "isProvisionedSucceededAfterInfraCodeChanged").returns(true);
      sandbox.stub(condition, "isDeployedAfterSourceCodeChanged").returns(false);
      const step = steps.find((s) => s.title === "Remote Preview");
      chai.assert.isFalse(step?.condition({} as WholeStatus));
    });
  });
});
