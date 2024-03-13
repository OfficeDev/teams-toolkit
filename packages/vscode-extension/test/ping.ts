import * as sinon from "sinon";

import * as pi from "../src/ping";
import * as p0 from "../src/pong";

describe("ping", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {});

  afterEach(() => {
    sandbox.restore();
  });

  it("pong", async () => {
    //const pongStub = sandbox.stub(pi, "pong").returns("this is STUBED pong");
    const pongStub = sandbox.stub(p0, "pong").returns("this is STUBED pong");

    console.log(pi.ping());

    sandbox.assert.calledOnce(pongStub);
  });
});
