// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand } from "@microsoft/teamsfx-api";
import { m365LaunchInfoCommand } from "./m365LaunchInfo";
import { m365SideloadingCommand } from "./m365Sideloading";
import { m365UnacquireCommand } from "./m365Unacquire";

export const m365Command: CLICommand = {
  name: "m365",
  hidden: true,
  description: "M365 App Management.",
  commands: [m365SideloadingCommand, m365UnacquireCommand, m365LaunchInfoCommand],
};
