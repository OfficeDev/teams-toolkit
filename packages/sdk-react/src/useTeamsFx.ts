// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LogLevel, setLogLevel, setLogFunction, TeamsFx, IdentityType } from "@microsoft/teamsfx";
import { useTeams } from "msteams-react-base-component";
import { ThemePrepared } from "@fluentui/react-northstar";

export type TeamsFxContext = {
  /**
   * Instance of TeamsFx.
   */
  teamsfx?: TeamsFx;
  /**
   * Indicates that current environment is in Teams
   */
  inTeams?: boolean;
  /**
   * Teams theme.
   */
  theme: ThemePrepared;
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
  if (process.env.NODE_ENV === "development") {
    setLogLevel(LogLevel.Verbose);
    setLogFunction((level: LogLevel, message: string) => {
      console.log(message);
    });
  }
  const teamsfx = new TeamsFx(IdentityType.User, teamsfxConfig);
  return { teamsfx, ...result };
}
