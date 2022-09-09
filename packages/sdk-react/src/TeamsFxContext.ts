// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TeamsFx } from "@microsoft/teamsfx";
import { ThemePrepared, teamsTheme } from "@fluentui/react-northstar";
import { createContext } from "react";

export interface TeamsFxContextConfig {
  /**
   * Instance of TeamsFx.
   */
  teamsfx?: TeamsFx;
  /**
   * Status of data loading.
   */
  loading: boolean;
  /**
   * Error information.
   */
  error: unknown;
  /**
   * Indicates that current environment is in Teams
   */
  inTeams?: boolean;
  /**
   * Teams theme.
   */
  theme: ThemePrepared;
  /**
   * Teams theme string.
   */
  themeString: string;
  /**
   * Teams context object.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context?: any;
}

/*
 * Stubbed context implementation
 * Only used when there is no provider, which is an unsupported scenario
 */
const defaultTeamsFxContext: TeamsFxContextConfig = {
  teamsfx: undefined,
  loading: false,
  error: undefined,
  inTeams: undefined,
  theme: teamsTheme,
  themeString: "default",
  context: undefined,
};

export const TeamsFxContext = createContext<TeamsFxContextConfig>(defaultTeamsFxContext);

export const TeamsFxConsumer = TeamsFxContext.Consumer;
