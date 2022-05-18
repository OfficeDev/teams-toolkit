// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import * as chai from "chai";
import {
  MicrosoftTunnelingError,
  MicrosoftTunnelingNeedOnboardingError,
  MicrosoftTunnelingServiceError,
  runWithMicrosoftTunnelingServiceErrorHandling,
} from "../../../src/common/local/microsoftTunnelingError";
import axios from "axios";

describe("MicrosoftTunnelingError", () => {
  describe("runWithMicrosoftTunnelingErrorHandling()", () => {
    const sandbox = sinon.createSandbox();
    beforeEach(() => {
      sandbox.stub(axios, "isAxiosError").callsFake((payload: any) => {
        return !!payload.isAxiosError;
      });
    });
    afterEach(() => {
      sandbox.restore();
    });

    it("no error", async () => {
      const result = await runWithMicrosoftTunnelingServiceErrorHandling(async () => "success");
      chai.assert.isTrue(result.isOk());
      chai.assert.equal(result._unsafeUnwrap(), "success");
    });

    it("onboarding error", async () => {
      // Arrange
      const e = Object.assign(new Error(), {
        isAxiosError: true,
        response: { status: 403 },
      });

      // Act
      const result = await runWithMicrosoftTunnelingServiceErrorHandling(async () => {
        throw e;
      });

      // Assert
      chai.assert.isTrue(result.isErr());
      chai.assert.instanceOf(result._unsafeUnwrapErr(), MicrosoftTunnelingNeedOnboardingError);
      chai.assert.deepEqual(result._unsafeUnwrapErr().innerError, e);
    });

    it("other HTTP error", async () => {
      // Arrange
      const e = Object.assign(new Error(), {
        isAxiosError: true,
        response: { status: 500 },
      });

      // Act
      const result = await runWithMicrosoftTunnelingServiceErrorHandling(async () => {
        throw e;
      });

      // Assert
      chai.assert.isTrue(result.isErr());
      chai.assert.instanceOf(result._unsafeUnwrapErr(), MicrosoftTunnelingServiceError);
      chai.assert.deepEqual(result._unsafeUnwrapErr().innerError, e);
    });

    it("unknown error", async () => {
      // Arrange
      const e = new Error("unknown error");

      // Act
      const result = await runWithMicrosoftTunnelingServiceErrorHandling(async () => {
        throw e;
      });

      // Assert
      chai.assert.isTrue(result.isErr());
      chai.assert.instanceOf(result._unsafeUnwrapErr(), MicrosoftTunnelingError);
      chai.assert.deepEqual(result._unsafeUnwrapErr().innerError, e);
    });
  });
});
