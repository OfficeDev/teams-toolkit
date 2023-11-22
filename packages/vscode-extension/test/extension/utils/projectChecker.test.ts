import { UserError, err } from "@microsoft/teamsfx-api";
import "mocha";
import * as sinon from "sinon";
import * as global from "../../../src/globalVariables";
import * as handler from "../../../src/handlers";
import { checkProjectTypeAndSendTelemetry } from "../../../src/utils/projectChecker";
import { MockCore } from "../../mocks/mockCore";

describe("checkProjectTypeAndSendTelemetry", () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  it("happy", async () => {
    sandbox.stub(global, "workspaceUri").value("./");
    const core = new MockCore();
    sandbox.stub(handler, "core").value(core);
    await checkProjectTypeAndSendTelemetry();
  });
  it("error", async () => {
    sandbox.stub(global, "workspaceUri").value("./");
    const core = new MockCore();
    sandbox.stub(handler, "core").value(core);
    sandbox.stub(core, "checkProjectType").resolves(err(new UserError({})));
    await checkProjectTypeAndSendTelemetry();
  });
  it("workspaceUri is undefined", async () => {
    sandbox.stub(global, "workspaceUri").value(undefined);
    await checkProjectTypeAndSendTelemetry();
  });
});
