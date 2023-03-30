// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LogLevel, setLogLevel, setLogFunction, TeamsFx, IdentityType } from "@microsoft/teamsfx";
import { useTeams } from "./useTeams";
import { Theme } from "@fluentui/react-components";
import { useData } from "./useData";

export type TeamsFxContext = {
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
  theme: Theme;
  /**
   * Teams theme string.
   */
  themeString: string;
  /**
   * Teams context object.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context?: any;
};

/**
 * Initialize TeamsFx SDK with customized configuration.
 *
 * @param teamsfxConfig - custom configuration to override default ones.
 * @returns TeamsFxContext object
 *
 * @beta
 */
export function useTeamsFx(teamsfxConfig?: Record<string, string>): TeamsFxContext {
  const [result] = useTeams({});
  const { data, error, loading } = useData(async () => {
    if (process.env.NODE_ENV === "development") {
      setLogLevel(LogLevel.Verbose);
      setLogFunction((level: LogLevel, message: string) => {
        console.log(message);
      });
    }
    return new TeamsFx(IdentityType.User, teamsfxConfig);
  });
  return { teamsfx: data, error, loading, ...result };
}
