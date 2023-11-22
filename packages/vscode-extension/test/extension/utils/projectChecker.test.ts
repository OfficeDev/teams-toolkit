import { UserError, err, ok } from "@microsoft/teamsfx-api";
import "mocha";
import * as sinon from "sinon";
import * as global from "../../../src/globalVariables";
import * as handler from "../../../src/handlers";
import { checkProjectTypeAndSendTelemetry } from "../../../src/utils/projectChecker";
import { MockCore } from "../../mocks/mockCore";

describe("checkProjectTypeAndSendTelemetry", () => {
  const sandbox = sinon.createSandbox();
  const core = new MockCore();
  afterEach(() => {
    sandbox.restore();
  });
  it("happy", async () => {
    sandbox.stub(global, "workspaceUri").value(vscode.Uri.file("./"));
    sandbox.stub(handler, "core").value(core);
    sandbox.stub(core, "checkProjectType").resolves(
      ok({
        isTeamsFx: true,
        hasTeamsManifest: true,
        dependsOnTeamsJs: false,
        lauguages: ["ts"],
      })
    );
    await checkProjectTypeAndSendTelemetry();
  });
  it("error", async () => {
    sandbox.stub(global, "workspaceUri").value(vscode.Uri.file("./"));
    sandbox.stub(handler, "core").value(core);
    sandbox.stub(core, "checkProjectType").resolves(err(new UserError({})));
    await checkProjectTypeAndSendTelemetry();
  });
  it("workspaceUri is undefined", async () => {
    sandbox.stub(global, "workspaceUri").value(undefined);
    await checkProjectTypeAndSendTelemetry();
  });
});
