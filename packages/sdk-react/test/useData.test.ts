// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { useData } from "../src/useData";

describe("useData() hook tests", () => {
  it("call function after initialized", async () => {
    const { result } = renderHook(() =>
      useData<string>(() => {
        return Promise.resolve("data");
      }),
    );
    expect(result.current.reload).toBeDefined();
    expect(result.current.data).toBe(undefined);
    expect(result.current.error).toBe(undefined);
    expect(result.current.loading).toBe(true);

    await waitFor(
      () => {
        expect(result.current.data).toBe("data");
        expect(result.current.error).toBe(undefined);
        expect(result.current.loading).toBe(false);
      },
      { interval: 1 },
    );
  });

  it("returns error when call function has error", async () => {
    const { result } = renderHook(() =>
      useData<string>(() => {
        return Promise.reject("test error");
      }),
    );
    expect(result.current.reload).toBeDefined();
    expect(result.current.data).toBe(undefined);
    expect(result.current.error).toBe(undefined);
    expect(result.current.loading).toBe(true);

    await waitFor(
      () => {
        expect(result.current.data).toBe(undefined);
        expect(result.current.error).toBe("test error");
        expect(result.current.loading).toBe(false);
      },
      { interval: 1 },
    );
  });
});
