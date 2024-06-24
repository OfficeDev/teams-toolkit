import { err, ok, UserError } from "@microsoft/teamsfx-api";
import { CollaborationState } from "@microsoft/teamsfx-core";
import { assert } from "chai";
import * as sinon from "sinon";
import { VsCodeLogProvider } from "../../src/commonlib/log";
import * as globalVariables from "../../src/globalVariables";
import { manageCollaboratorHandler } from "../../src/handlers/permissionHandlers";
import * as vsc_ui from "../../src/qm/vsc_ui";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import { MockCore } from "../mocks/mockCore";

describe("Manifest handlers", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
  });

  afterEach(() => {
    sandbox.restore();
  });
  describe("manageCollaboratorHandler", () => {
    it("happy path: grantPermission", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        selectOption: () => Promise.resolve(ok({ type: "success", result: "grantPermission" })),
      });
      sandbox.stub(MockCore.prototype, "grantPermission").resolves(
        ok({
          state: CollaborationState.OK,
          userInfo: {
            userObjectId: "fake-user-object-id",
            userPrincipalName: "fake-user-principle-name",
          },
          permissions: [
            {
              name: "name",
              type: "type",
              resourceId: "id",
              roles: ["Owner"],
            },
          ],
        })
      );
      const result = await manageCollaboratorHandler("env");
      assert.isTrue(result.isOk());
    });

    it("happy path: list collaborator", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        selectOption: () => Promise.resolve(ok({ type: "success", result: "listCollaborator" })),
      });
      sandbox.stub(MockCore.prototype, "listCollaborator").returns(
        Promise.resolve(
          ok({
            state: CollaborationState.OK,
            collaborators: [
              {
                userPrincipalName: "userPrincipalName",
                userObjectId: "userObjectId",
                isAadOwner: true,
                teamsAppResourceId: "teamsAppResourceId",
              },
            ],
          })
        )
      );
      const vscodeLogProviderInstance = VsCodeLogProvider.getInstance();
      sandbox.stub(vscodeLogProviderInstance, "outputChannel").value({
        name: "name",
        append: (value: string) => {},
        appendLine: (value: string) => {},
        replace: (value: string) => {},
        clear: () => {},
        show: (...params: any[]) => {},
        hide: () => {},
        dispose: () => {},
      });

      const result = await manageCollaboratorHandler("env");
      assert.isTrue(result.isOk());
    });

    it("happy path: list collaborator throws error", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        selectOption: () => Promise.resolve(ok({ type: "success", result: "listCollaborator" })),
      });
      sandbox.stub(MockCore.prototype, "listCollaborator").throws(new Error("Error"));
      const vscodeLogProviderInstance = VsCodeLogProvider.getInstance();
      sandbox.stub(vscodeLogProviderInstance, "outputChannel").value({
        name: "name",
        append: (value: string) => {},
        appendLine: (value: string) => {},
        replace: (value: string) => {},
        clear: () => {},
        show: (...params: any[]) => {},
        hide: () => {},
        dispose: () => {},
      });

      const result = await manageCollaboratorHandler("env");
      assert.isTrue(result.isErr());
    });

    it("happy path: list collaborator throws login error", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        selectOption: () => Promise.resolve(ok({ type: "success", result: "listCollaborator" })),
      });
      const showErrorMessageStub = sandbox.stub(vscode.window, "showErrorMessage");
      sandbox
        .stub(MockCore.prototype, "listCollaborator")
        .throws(new Error("Cannot get user login information"));
      const vscodeLogProviderInstance = VsCodeLogProvider.getInstance();
      sandbox.stub(vscodeLogProviderInstance, "outputChannel").value({
        name: "name",
        append: (value: string) => {},
        appendLine: (value: string) => {},
        replace: (value: string) => {},
        clear: () => {},
        show: (...params: any[]) => {},
        hide: () => {},
        dispose: () => {},
      });

      const result = await manageCollaboratorHandler("env");
      assert.isTrue(result.isErr());
      assert.isTrue(showErrorMessageStub.called);
    });

    it("User Cancel", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        selectOption: () =>
          Promise.resolve(err(new UserError("source", "errorName", "errorMessage"))),
      });
      const result = await manageCollaboratorHandler();
      assert.isTrue(result.isErr());
    });
  });
});
