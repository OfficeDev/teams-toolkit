import * as sinon from "sinon";
import * as chai from "chai";
import { isM365CopilotChatDebugSession } from "../../src/debug/teamsfxTaskHandler";

describe("isM365CopilotChatDebugSession", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {});

  afterEach(() => {
    sandbox.restore();
  });

  it("true", async () => {
    const event: any = {
      configuration: {
        request: "launch",
        url: "https://www.office.com/chat?auth=2&developerMode=Basic",
        runtimeArgs: ["--remote-debugging-port=9222"],
      },
    };
    const res = isM365CopilotChatDebugSession(event);
    chai.assert.isTrue(res);
  });

  it("false", async () => {
    const event: any = {
      configuration: {
        request: "launch",
        url: "https://abc.com",
        runtimeArgs: ["--remote-debugging-port=9222"],
      },
    };
    const res = isM365CopilotChatDebugSession(event);
    chai.assert.isFalse(res);
  });
});
