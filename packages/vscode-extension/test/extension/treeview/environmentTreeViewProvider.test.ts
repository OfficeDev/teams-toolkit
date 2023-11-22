import * as chai from "chai";
import * as sinon from "sinon";

import { ok } from "@microsoft/teamsfx-api";
import { environmentManager } from "@microsoft/teamsfx-core";

import * as globalVariables from "../../../src/globalVariables";
import EnvironmentTreeViewProvider from "../../../src/treeview/environmentTreeViewProvider";

describe("EnvironmentTreeViewProvider", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("reloadEnvironments", async () => {
    sandbox.stub(globalVariables, "isTeamsFxProject").returns(true);
    sandbox.stub(globalVariables, "getWorkspacePath").returns("test");

    const result = await EnvironmentTreeViewProvider.reloadEnvironments();

    chai.assert.isTrue(result.isOk());
  });

  it("getChildren", async () => {
    sandbox.stub(globalVariables, "getWorkspacePath").returns("test");
    sandbox.stub(environmentManager, "listRemoteEnvConfigs").returns(Promise.resolve(ok(["test"])));
    sandbox.stub(environmentManager, "getExistingNonRemoteEnvs").returns(Promise.resolve(["test"]));

    const children = await EnvironmentTreeViewProvider.getChildren();

    chai.assert.equal(children?.length, 2);
  });
});
