import sinon from "sinon";
import { processUtil } from "../../src/utils/processUtil";

describe("ProcessUtil", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  describe("killProcess", () => {
    it("error", async () => {
      sandbox.stub(process, "platform").value("win32");
      try {
        await processUtil.killProcess(-1);
        throw new Error("Expected method to reject.");
      } catch (err) {}
    });
  });
});
