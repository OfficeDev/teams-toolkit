// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as sinon from "sinon";
import { listFilePaths } from "../../../src/component/utils/fileOperation";

describe("File operation tests", () => {
  it("list file path happy path", function () {
    listFilePaths("test");
  });
});
