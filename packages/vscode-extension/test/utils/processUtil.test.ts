import { expect } from "chai";
// import child_process from "child_process";
import sinon from "sinon";
import { processUtil } from "../../src/utils/processUtil";

describe("ProcessUtil", () => {
  const child_process = require("child_process");
  let execStub: any;
  const sandbox = sinon.createSandbox();
  beforeEach(() => {
    execStub = sandbox.stub(child_process, "exec");
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("killProcess", () => {
    // it("happy", async () => {
    //   sandbox.stub(process, "platform").value("win32");
    //   execStub.yields(null);
    //   await processUtil.killProcess(1234);
    //   expect(execStub.calledWith(`taskkill /PID 1234 /T /F`)).to.be.true;
    // });

    it("error", async () => {
      sandbox.stub(process, "platform").value("win32");
      const error = new Error("exec error");
      execStub.yields(error);
      try {
        await processUtil.killProcess(-1);
        throw new Error("Expected method to reject.");
      } catch (err) {}
    });
  });
});
