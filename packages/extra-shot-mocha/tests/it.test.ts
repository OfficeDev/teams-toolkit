// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { describe } from "mocha";
import { expect } from "chai";
import { it } from "../src/it";

describe("Advanced it tests", async () => {
  it("should run with only title");

  it("should run as normal mocha.it with sync function", function () {
    expect(1).equals(1);
  });

  it("should run as normal mocha.it with async function", async function () {
    expect(1).equals(1);
  });

  it("should run as normal mocha.it with sync arrow function", () => {
    expect(1).equals(1);
  });

  it("should run as normal mocha.it with async arrow function", async () => {
    expect(1).equals(1);
  });

  it("should inject ctx with async function", { a: 1 }, async function () {
    expect(1).equals(1);
  });

  it("should inject ctx with async arrow function", { a: 1 }, async () => {
    expect(1).equals(1);
  });

  it("should inject ctx with sync function", { a: 1 }, function () {
    expect(1).equals(1);
  });

  it("should inject ctx with sync arrow function", { a: 1 }, () => {
    expect(1).equals(1);
  });
});
