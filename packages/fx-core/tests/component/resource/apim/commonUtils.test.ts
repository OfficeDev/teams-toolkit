// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import chai from "chai";
import {
  capitalizeFirstLetter,
  getFileExtension,
  RetryHandler,
} from "../../../../src/component/resource/apim/utils/commonUtils";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
chai.use(chaiAsPromised);

describe("Util", () => {
  describe("#getFileExtension()", () => {
    const testInput: { input: string; output: string }[] = [
      { input: "", output: "" },
      { input: ".", output: "" },
      { input: "./.tmp", output: "" },
      { input: "//", output: "" },
      { input: "/", output: "" },
      { input: "test/data.txt", output: "txt" },
      { input: "data", output: "" },
      { input: "data.txt/data", output: "" },
      { input: "data.txt.tmp", output: "tmp" },
    ];
    testInput.forEach((data) => {
      it(`file path: ${data.input}`, () => {
        chai.expect(getFileExtension(data.input)).to.equal(data.output);
      });
    });
  });

  describe("#capitalizeFirstLetter()", () => {
    const testInput: { input: string; output: string }[] = [
      { input: "", output: "" },
      { input: "a", output: "A" },
      { input: ".", output: "." },
      { input: "ab", output: "Ab" },
      { input: "a.", output: "A." },
      { input: " a", output: " a" },
      { input: "data", output: "Data" },
      { input: "input data", output: "Input data" },
      { input: "Data", output: "Data" },
    ];
    testInput.forEach((data) => {
      it(`file path: ${data.input}`, () => {
        chai.expect(capitalizeFirstLetter(data.input)).to.equal(data.output);
      });
    });
  });

  describe("RetryHandler#retry()", () => {
    const testData: {
      maxReties: number;
      throwErrorIndex: number[];
      result: "error" | "index";
    }[] = [
      { maxReties: 3, throwErrorIndex: [], result: "index" },
      { maxReties: 3, throwErrorIndex: [0], result: "index" },
      { maxReties: 3, throwErrorIndex: [0, 1], result: "index" },
      { maxReties: 3, throwErrorIndex: [0, 1, 2], result: "index" },
      { maxReties: 3, throwErrorIndex: [0, 1, 2, 3], result: "error" },
      { maxReties: 3, throwErrorIndex: [0, 1, 2, 3, 4], result: "error" },
      { maxReties: 0, throwErrorIndex: [], result: "index" },
      { maxReties: 0, throwErrorIndex: [0], result: "error" },
      { maxReties: 0, throwErrorIndex: [], result: "index" },
      { maxReties: 1, throwErrorIndex: [0], result: "index" },
      { maxReties: 1, throwErrorIndex: [0, 1], result: "error" },
    ];

    testData.forEach((data) => {
      const maxRetries = data.maxReties;
      it(`max retry ${maxRetries} times, throw error ${JSON.stringify(
        data.throwErrorIndex
      )}.`, async () => {
        const stub = sinon.stub<number[], Promise<number | undefined>>();
        stub.callsFake(async (retries) => {
          if (data.throwErrorIndex.includes(retries)) {
            throw new Error(`Error ${retries}`);
          }

          return retries;
        });

        if (data.result === "index") {
          const result = await RetryHandler.retry(stub, data.maxReties, 10);
          chai.assert.equal(result, data.throwErrorIndex.length);
        } else if (data.result === "error") {
          await chai
            .expect(RetryHandler.retry(stub, data.maxReties, 10))
            .to.be.rejectedWith(`Error ${maxRetries}`);
        }

        for (let i = 0; i <= Math.min(data.throwErrorIndex.length, maxRetries); ++i) {
          sinon.assert.calledWith(stub, i);
        }
      });
    });

    afterEach(() => {
      sinon.restore();
    });
  });
});
