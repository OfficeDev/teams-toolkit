// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as sinon from "sinon";
import * as chai from "chai";
import { ProgressHelper } from "../../src/debug/progressHelper";
import { ProgressHandler } from "../../src/progressHandler";

afterEach(() => {
  // Restore the default sandbox here
  sinon.restore();
});

describe("[debug > ProgressHelper]", () => {
  describe("ParallelProgressHelper", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    const testData = [
      {
        name: "empty",
        input: [],
        calledMessage: ["error key"],
        expected: [],
      },
      {
        name: "Only one message",
        input: [{ key: "key1", detail: "test1" }],
        calledMessage: ["error key", "key1", "error key"],
        expected: ["test1"],
      },
      {
        name: "Two message asc",
        input: [
          { key: "key1", detail: "test1" },
          { key: "key2", detail: "test2" },
        ],

        calledMessage: ["key1", "key2"],
        expected: ["test1", "test2"],
      },
      {
        name: "Two message desc",
        input: [
          { key: "key1", detail: "test1" },
          { key: "key2", detail: "test2" },
        ],

        calledMessage: ["key2", "key1"],
        expected: ["test1", "test2"],
      },
      {
        name: "Three message asc",
        input: [
          { key: "key1", detail: "test1" },
          { key: "key2", detail: "test2" },
          { key: "key3", detail: "test3" },
        ],

        calledMessage: ["key1", "key2", "key3"],
        expected: ["test1", "test2", "test3"],
      },
      {
        name: "Three message desc",
        input: [
          { key: "key1", detail: "test1" },
          { key: "key2", detail: "test2" },
          { key: "key3", detail: "test3" },
        ],

        calledMessage: ["key3", "key2", "key1"],
        expected: ["test1", "test2", "test3"],
      },
      {
        name: "Three message random order",
        input: [
          { key: "key1", detail: "test1" },
          { key: "key2", detail: "test2" },
          { key: "key3", detail: "test3" },
        ],

        calledMessage: ["key3", "key1", "key2"],
        expected: ["test1", "test2", "test3"],
      },
      {
        name: "Not finished",
        input: [
          { key: "key1", detail: "test1" },
          { key: "key2", detail: "test2" },
          { key: "key3", detail: "test3" },
        ],

        calledMessage: ["key2"],
        expected: ["test1"],
      },
    ];

    testData.forEach((data) => {
      it(data.name, async () => {
        const mockProgressHandler = sandbox.createStubInstance(ProgressHandler);
        const testProgressHelper = new ProgressHelper(mockProgressHandler);
        await testProgressHelper.start(data.input);
        for (const callMessage of data.calledMessage) {
          await testProgressHelper.end(callMessage);
        }
        const called = mockProgressHandler.next.getCalls().map(({ args }) => args[0]);
        chai.assert.deepEqual(called, data.expected);
        sandbox.restore();
      });
    });
  });
});
