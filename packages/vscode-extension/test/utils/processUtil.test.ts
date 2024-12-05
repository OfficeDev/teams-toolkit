import sinon, { SinonFakeTimers, useFakeTimers } from "sinon";
import * as chai from "chai";
import { killModule, processUtil, timeoutPromise } from "../../src/utils/processUtil";
describe("ProcessUtil", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  describe("killProcess", () => {
    it("error", async () => {
      const killStub = sandbox.stub(killModule, "killTree");
      killStub.yields(new Error());
      try {
        await processUtil.killProcess(-1, 5000, false);
        chai.assert.fail("Expected promise to reject, but it resolved.");
      } catch (error) {
        chai.assert.isTrue(error instanceof Error);
      }
    });
    it("happy", async () => {
      const killStub = sandbox.stub(killModule, "killTree");
      killStub.yields(null);
      await processUtil.killProcess(-1);
      chai.assert.isTrue(killStub.calledOnce);
    });
  });
});

describe("timeoutPromise", () => {
  let clock: SinonFakeTimers;

  beforeEach(() => {
    clock = useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  it("timeoutPromise", async () => {
    try {
      const timeout = 1000;
      const promise = timeoutPromise(timeout, false);
      clock.tick(timeout);
      await promise;
      chai.assert.fail("Expected promise to reject, but it resolved.");
    } catch (error) {
      chai.assert.isTrue(error instanceof Error);
      chai.assert.equal(error.message, "Operation timeout");
    }
  });
  it("timeoutPromise - silent", async () => {
    try {
      const timeout = 1000;
      const promise = timeoutPromise(timeout, true);
      clock.tick(timeout);
      await promise;
    } catch (error) {
      chai.assert.fail("Expected promise to resolve, but it rejected.");
    }
  });
});
