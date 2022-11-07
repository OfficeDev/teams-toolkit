import "mocha";
import {
  ContextV3,
  FxError,
  InputsWithProjectPath,
  Void,
  ok,
  Result,
  Platform,
} from "@microsoft/teamsfx-api";
import { hooks } from "@feathersjs/hooks/lib";
import { ProcessEnvRestorerMW } from "../../../src/component/middleware/processEnvRestorerMW";
import { createContextV3 } from "../../../src/component/utils";
import * as chai from "chai";
import { MockTools } from "../../core/utils";
import { setTools } from "../../../src/core/globalVars";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
class MockActionThatModifiesProcessEnv {
  @hooks([ProcessEnvRestorerMW])
  async execute(context: ContextV3, inputs: InputsWithProjectPath): Promise<Result<Void, FxError>> {
    process.env["TEST_VAR"] = "TEST_VALUE";
    return ok(Void);
  }
}

class MockActionThatModifiesProcessEnvThenThrows {
  @hooks([ProcessEnvRestorerMW])
  async execute(context: ContextV3, inputs: InputsWithProjectPath): Promise<Result<Void, FxError>> {
    process.env["TEST_VAR"] = "TEST_VALUE";
    throw new Error("mocked error");
  }
}

describe("ProcessEnvRestorerMW", async () => {
  const tools = new MockTools();
  setTools(tools);

  beforeEach(() => {
    process.env.TEST_VAR = undefined;
  });

  it("should restore process.env when decorated action returns", async () => {
    const ctx = createContextV3();
    const inputs = {
      platform: Platform.VSCode,
      projectPath: "./",
    };
    const action = new MockActionThatModifiesProcessEnv();
    const result = await action.execute(ctx, inputs);
    chai.expect(result.isOk()).to.be.true;
    chai.expect(process.env["TEST_VAR"]).to.be.undefined;
  });

  it("should restore process.env when decorated action throws", async () => {
    const ctx = createContextV3();
    const inputs = {
      platform: Platform.VSCode,
      projectPath: "./",
    };
    const action = new MockActionThatModifiesProcessEnvThenThrows();
    chai.expect(action.execute(ctx, inputs)).to.be.rejected.then(() => {
      chai.expect(process.env["TEST_VAR"]).to.be.undefined;
    });
  });
});
