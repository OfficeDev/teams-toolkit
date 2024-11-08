// import child_process from "child_process";
import sinon from "sinon";
import { processUtil } from "../../src/utils/processUtil";

describe("ProcessUtil", () => {
  let execStub: any;
  const sandbox = sinon.createSandbox();
  beforeEach(() => {
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("killProcess", () => {
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
