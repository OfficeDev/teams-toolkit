// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @jest-environment jsdom
 */

import { renderHook } from "@testing-library/react-hooks";
import { useData } from "../src/useData";

describe("useData() hook tests", () => {
  it("call function after initialized", async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useData<string>(() => {
        return Promise.resolve("data");
      })
    );
    expect(result.current.reload).toBeDefined();
    expect(result.current.data).toBe(undefined);
    expect(result.current.error).toBe(undefined);
    expect(result.current.loading).toBe(true);

    await waitForNextUpdate();
    expect(result.current.data).toBe("data");
    expect(result.current.error).toBe(undefined);
    expect(result.current.loading).toBe(false);
  });

  it("returns error when call function has error", async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useData<string>(() => {
        return Promise.reject("test error");
      })
    );
    expect(result.current.reload).toBeDefined();
    expect(result.current.data).toBe(undefined);
    expect(result.current.error).toBe(undefined);
    expect(result.current.loading).toBe(true);

    await waitForNextUpdate();
    expect(result.current.data).toBe(undefined);
    expect(result.current.error).toBe("test error");
    expect(result.current.loading).toBe(false);
  });
});
