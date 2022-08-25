import "mocha";
import sinon from "sinon";
import { expect } from "chai";
import { MockContext } from "./utils";
import { ApiConnectorImpl } from "../../../../src/component/feature/apiconnector/ApiConnectorImpl";
import { Inputs, ok, Platform, UserError } from "@microsoft/teamsfx-api";
import { DepsHandler } from "../../../../src/component/feature/apiconnector/depsHandler";
import { ComponentNames } from "../../../../src/component/constants";

describe("generateQuestions", () => {
  const sandbox = sinon.createSandbox();
  const inputs: Inputs = { platform: Platform.VSCode, projectPath: "test" };

  afterEach(() => {
    sandbox.restore();
  });

  it("generate questions", async () => {
    const expectInputs = {
      component: ["api"],
      alias: "test",
      endpoint: "test.endpoint",
      "auth-type": "basic",
      "user-name": "test account",
    };
    const fakeInputs: Inputs = { ...inputs, ...expectInputs };
    const context = MockContext();
    const apiConnector: ApiConnectorImpl = new ApiConnectorImpl();
    sandbox.stub(DepsHandler, "checkDepsVerSupport").callsFake((projectPath, component) => {
      return Promise.resolve(true);
    });
    const res = await apiConnector.generateQuestion(context, fakeInputs);
    expect(res.isOk()).equal(true);
    if (res.isOk()) {
      expect(res.value!.children!.length).equals(4);

      const children = res.value!.children!;
      expect(children[0].data.name).equal("endpoint");
      expect(children[1].data.name).equal("component");
      expect(children[2].data.name).equal("alias");
      expect(children[3].data.name).equal("auth-type");
      expect((children[1].data as any).staticOptions.length).equal(2);
    }
  });

  it("generate questions cli help", async () => {
    const expectInputs = {
      component: ["api"],
      alias: "test",
      endpoint: "test.endpoint",
      "auth-type": "basic",
      "user-name": "test account",
    };
    const fakeInputs: Inputs = { ...inputs, ...expectInputs, platform: Platform.CLI_HELP };
    const context = MockContext();
    const apiConnector: ApiConnectorImpl = new ApiConnectorImpl();
    sandbox.stub(DepsHandler, "checkDepsVerSupport").callsFake((projectPath, component) => {
      return Promise.resolve(true);
    });
    const res = await apiConnector.generateQuestion(context, fakeInputs);
    expect(res.isOk()).equal(true);
    if (res.isOk()) {
      expect(res.value!.children!.length).equals(4);

      const children = res.value!.children!;
      expect(children[0].data.name).equal("endpoint");
      expect(children[1].data.name).equal("component");
      expect(children[2].data.name).equal("alias");
      expect(children[3].data.name).equal("auth-type");
      expect((children[1].data as any).staticOptions.length).equal(2);
    }
  });

  it("generate questions bot only", async () => {
    const expectInputs = {
      component: ["bot"],
      alias: "test",
      endpoint: "test.endpoint",
      "auth-type": "basic",
      "user-name": "test account",
    };
    const fakeInputs: Inputs = { ...inputs, ...expectInputs };
    const context = MockContext();
    context.projectSetting.components = [{ name: ComponentNames.TeamsBot }];
    const apiConnector: ApiConnectorImpl = new ApiConnectorImpl();
    sandbox.stub(DepsHandler, "checkDepsVerSupport").callsFake((projectPath, component) => {
      return Promise.resolve(true);
    });
    const res = await apiConnector.generateQuestion(context, fakeInputs);
    expect(res.isOk()).equal(true);
    if (res.isOk()) {
      expect(res.value!.children!.length).equals(4);

      const children = res.value!.children!;
      expect(children[0].data.name).equal("endpoint");
      expect(children[1].data.name).equal("component");
      expect((children[1].data as any).staticOptions.length).equal(1);
      expect(children[2].data.name).equal("alias");
      expect(children[3].data.name).equal("auth-type");
    }
  });

  it("generate questions api only", async () => {
    const expectInputs = {
      component: ["api"],
      alias: "test",
      endpoint: "test.endpoint",
      "auth-type": "basic",
      "user-name": "test account",
    };
    const fakeInputs: Inputs = { ...inputs, ...expectInputs };
    const context = MockContext();
    context.projectSetting.components = [{ name: ComponentNames.TeamsApi }];
    const apiConnector: ApiConnectorImpl = new ApiConnectorImpl();
    sandbox.stub(DepsHandler, "checkDepsVerSupport").callsFake((projectPath, component) => {
      return Promise.resolve(true);
    });
    const res = await apiConnector.generateQuestion(context, fakeInputs);
    expect(res.isOk()).equal(true);
    if (res.isOk()) {
      expect(res.value!.children!.length).equals(4);

      const children = res.value!.children!;
      expect(children[0].data.name).equal("endpoint");
      expect(children[1].data.name).equal("component");

      expect((children[1].data as any).staticOptions.length).equal(1);
      expect(children[2].data.name).equal("alias");
      expect(children[3].data.name).equal("auth-type");
    }
  });

  it("error when empty components", async () => {
    const expectInputs = {
      component: ["api"],
      alias: "test",
      endpoint: "test.endpoint",
      "auth-type": "basic",
      "user-name": "test account",
    };
    const fakeInputs: Inputs = { ...inputs, ...expectInputs };
    const context = MockContext();
    context.projectSetting.components = [];
    const apiConnector: ApiConnectorImpl = new ApiConnectorImpl();
    sandbox.stub(DepsHandler, "checkDepsVerSupport").callsFake((projectPath, component) => {
      return Promise.resolve(true);
    });

    try {
      await apiConnector.generateQuestion(context, fakeInputs);
    } catch (err) {
      expect(err instanceof UserError).to.be.true;
      expect(err.name).equal("NoBotOrFunctionExistError");
    }
  });
});
