// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "../../../src/component/resource/appManifest/appManifest";
import { ContextV3 } from "@microsoft/teamsfx-api";
import * as sinon from "sinon";

import * as tools from "../../../src/common/tools";
import "mocha";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
import { ArmErrorHandle } from "../../../src/component/driver/arm/util/handleError";

describe("formattedDeploymentError Status", () => {
  const mocker = sinon.createSandbox();
  let mockedCtx: ContextV3;
  let mockedDeployCtx: any;

  beforeEach(async () => {
    // mockedCtx = TestHelper.mockContextV3();
    // mockedDeployCtx = TestHelper.getMockedDeployCtx(mockedCtx);
    mocker.stub(tools, "waitSeconds").resolves();
  });

  afterEach(async () => {
    mocker.restore();
  });

  it("formattedDeploymentError OK", async () => {
    const errors = {
      error: {
        code: "OutsideError",
        message: "out side error",
      },
      subErrors: {
        botProvision: {
          error: {
            code: "BotError",
            message: "bot error",
          },
          inner: {
            error: {
              code: "BotInnerError",
              message: "bot inner error",
            },
            subErrors: {
              skuError: {
                error: {
                  code: "MaxNumberOfServerFarmsInSkuPerSubscription",
                  message: "The maximum number of Free ServerFarms allowed in a Subscription is 10",
                },
              },
              evaluationError: {
                error: {
                  code: "DeploymentOperationFailed",
                  message:
                    "Template output evaluation skipped: at least one resource deployment operation failed. Please list deployment operations for details. Please see https://aka.ms/DeployOperations for usage details.",
                },
              },
            },
          },
        },
      },
    };
    const res = ArmErrorHandle.formattedDeploymentError(errors);
    chai.assert.deepEqual(res, {
      botProvision: {
        skuError: {
          code: "MaxNumberOfServerFarmsInSkuPerSubscription",
          message: "The maximum number of Free ServerFarms allowed in a Subscription is 10",
        },
      },
    });
  });
});
