import { useTeamsFx } from "@microsoft/teamsfx-react";
import { GetUserProfile } from "./GetUserProfile";

export function InitTeamsFx() {
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
