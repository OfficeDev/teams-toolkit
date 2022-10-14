// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, waitFor } from "@testing-library/react";
import { useTeamsFx } from "../src/useTeamsFx";
import { app, pages } from "@microsoft/teams-js";

describe("useTeamsFx() hook tests", () => {
  let spyInitialize: jest.SpyInstance;
  let spyRegisterOnThemeChangeHandler: jest.SpyInstance;
  let spyRegisterFullScreenHandler: jest.SpyInstance;
  let spyGetContext: jest.SpyInstance;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();

    window.history.pushState({}, "", "/");
  });

  it("returns default teamsfx instance", async () => {
    spyInitialize = jest.spyOn(app, "initialize");
    spyInitialize.mockImplementation(() => {
      return Promise.resolve();
    });
    spyGetContext = jest.spyOn(app, "getContext");
    spyGetContext.mockImplementation(() => {
      return Promise.resolve({
        app: {
          theme: "default",
        },
        page: {
          isFullScreen: false,
        },
      } as Partial<app.Context>);
    });

    const App = () => {
      const result = useTeamsFx();
      return (
        <div>
          <div>{result.themeString}</div>
        </div>
      );
    };

    const { container } = await render(<App />);

    await waitFor(() => {
      expect(spyInitialize).toHaveBeenCalledTimes(1);
      expect(spyGetContext).toHaveBeenCalledTimes(1);
    });

    expect(container.textContent).toBe("default");
  });
});
