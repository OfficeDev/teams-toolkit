import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { createContextV3 } from "../../../../src/component/utils";
import { MockTools, randomAppName } from "../../../core/utils";
import { setTools } from "../../../../src/core/globalVars";
import sinon from "sinon";
import { ContextV3, InputsWithProjectPath, Platform } from "@microsoft/teamsfx-api";
import { newEnvInfoV3 } from "../../../../src/core/environment";
import path from "path";
import * as os from "os";
import { IdentityResource } from "../../../../src/component/resource/identity";

chai.use(chaiAsPromised);

describe("Identity Component", () => {
  const tools = new MockTools();
  const sandbox = sinon.createSandbox();
  const component = new IdentityResource();
  const appName = `unittest${randomAppName()}`;
  const projectPath = path.join(os.homedir(), "TeamsApps", appName);
  const inputs: InputsWithProjectPath = {
    projectPath: projectPath,
    platform: Platform.VSCode,
    "app-name": appName,
  };
  let context: ContextV3;
  setTools(tools);

  beforeEach(async () => {
    context = createContextV3();
    context.envInfo = newEnvInfoV3();
  });
  afterEach(() => {
    sandbox.restore();
  });

  it("generateBicep happy path", async function () {
    const generateBicepAction = await component.generateBicep(context, inputs);
    chai.assert.isTrue(generateBicepAction.isOk());
  });
});
