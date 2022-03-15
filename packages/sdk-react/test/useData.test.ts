// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import { assert, expect } from "chai";
import { renderHook } from "@testing-library/react-hooks";
import { useData } from "../src/useData";

describe("useData() hook tests", () => {
  it("call function after initialized", async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useData<string>(() => {
        return Promise.resolve("data");
      })
    );
    assert.isDefined(result.current.reload);
    expect(result.current.data).equals(undefined);
    expect(result.current.error).equals(undefined);
    expect(result.current.loading).equals(true);

    await waitForNextUpdate();
    expect(result.current.data).equals("data");
    expect(result.current.error).equals(undefined);
    expect(result.current.loading).equals(false);
  });

  it("returns error when call function has error", async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useData<string>(() => {
        return Promise.reject("test error");
      })
    );
    assert.isDefined(result.current.reload);
    expect(result.current.data).equals(undefined);
    expect(result.current.error).equals(undefined);
    expect(result.current.loading).equals(true);

    await waitForNextUpdate();
    expect(result.current.data).equals(undefined);
    expect(result.current.error).equals("test error");
    expect(result.current.loading).equals(false);
  });
});
