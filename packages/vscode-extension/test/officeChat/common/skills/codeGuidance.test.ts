import * as chai from "chai";
import sinon from "ts-sinon";

import { getCodeGenerateGuidance } from "../../../../src/officeChat/common/skills/codeGuidance";

describe("CodeGuidance", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("constructor", () => {
    const codeGenerateGuidance = getCodeGenerateGuidance("some code");

    chai.assert.isNotNull(codeGenerateGuidance);
  });
});
