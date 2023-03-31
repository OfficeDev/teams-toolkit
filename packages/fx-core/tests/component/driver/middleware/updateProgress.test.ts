// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ning Tang <ning.tang@microsoft.com>
 */
import "mocha";

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";

import { ok } from "@microsoft/teamsfx-api";

import { updateProgress } from "../../../../src/component/driver/middleware/updateProgress";

chai.use(chaiAsPromised);

describe("updateProgress middleware", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("updates progress bar", async () => {
    const progressBarMock = {
      next: sinon.mock(),
    };
    const middleware = updateProgress("test");
    const ctx: any = {
      arguments: [
        {},
        {
          progressBar: progressBarMock,
        },
      ],
    };

    await middleware(ctx, () => Promise.resolve(ok(undefined)));

    chai.assert.isTrue(progressBarMock.next.calledOnce);
  });
});
