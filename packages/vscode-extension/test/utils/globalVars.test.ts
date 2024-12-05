import * as chai from "chai";
import * as sinon from "sinon";
import { LocalDebugPorts, resetLocalDebugPorts } from "../../src/globalVariables";

describe("GlobalVariables", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("resetLocalDebugPorts", async () => {
    resetLocalDebugPorts();
    chai.assert.deepEqual(LocalDebugPorts, {
      checkPorts: [],
      conflictPorts: [],
      terminateButton: "",
      process2conflictPorts: {},
      terminateProcesses: [],
    });
  });
});
