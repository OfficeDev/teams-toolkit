// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import { RetryHandler } from "../../../src/core/util/retryHandler";
chai.use(chaiAsPromised);

describe("RetryHandler", () => {
    describe("#retry()", () => {
        const testData: { maxReties?: number, failure: number }[] = [
            { failure: 0 },
            { failure: 1 },
            { failure: 2 },
            { failure: 3 },
            { failure: 4 },
            { maxReties: 0, failure: 0 },
            { maxReties: 0, failure: 1 },
            { maxReties: 1, failure: 0 },
            { maxReties: 1, failure: 1 },
            { maxReties: 1, failure: 2 },
        ];

        testData.forEach((data) => {
            const maxRetries = data.maxReties ?? RetryHandler.defaultMaxRetries;
            it(`max retry ${maxRetries} times, failed ${data.failure} times.`, async () => {
                const stub = sinon.stub<number[], Promise<number>>();
                stub.callsFake(async (retries) => {
                    if (retries < data.failure) {
                        throw new Error(`Error ${retries}`);
                    }

                    return retries;
                });

                if (data.failure <= maxRetries) {
                    const result = await RetryHandler.retry(stub, data.maxReties);
                    chai.assert.equal(result, data.failure);
                }
                else {
                    await chai.expect(RetryHandler.retry(stub, data.maxReties)).to.be.rejectedWith(`Error ${maxRetries}`);
                }

                for (let i = 0; i <= Math.min(data.failure, maxRetries); ++i) {
                    sinon.assert.calledWith(stub, i);
                }
            });
        });
    });

    afterEach(() => {
        sinon.restore();
    });
});
