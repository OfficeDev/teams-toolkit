// This file will initialize TeamsFx SDK and show `GetUserProfile` component after initialization.

import { useTeamsFx } from "@microsoft/teamsfx-react";
import { GetUserProfile } from "./GetUserProfile";

export function InitTeamsFx() {
  // For usage of useTeamsFx(), please refer to: https://github.com/OfficeDev/TeamsFx/tree/ga/packages/sdk-react#useteamsfx.
  // You need to wait until `loading == false` to use TeamsFx SDK.
  const { loading, error, teamsfx } = useTeamsFx();

  return (
    <div>
      {!loading && error && (
        <div className="error">Failed init TeamsFx. Please try again later.</div>
      )}
      {!loading && teamsfx && <GetUserProfile teamsfx={teamsfx} />}
    </div>
  );
}
