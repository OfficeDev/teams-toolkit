import { Button } from "@fluentui/react-northstar";
import { useGraph } from "@microsoft/teamsfx-react";

export function GetUserProfile(props) {
  const { teamsfx } = {
    teamsfx: undefined,
    ...props,
  };
  const { loading, error, data, reload } = useGraph(
    async (graph, teamsfx, scope) => {
      // Call graph api directly to get user profile information
      const profile = await graph.api("/me").get();
      return { profile };
    },
    { scope: ["User.Read"], teamsfx: teamsfx }
  );

  return (
    <div>
      <h2>GetUserProfile</h2>
      <p>Click below to authorize button to grant permission to using Microsoft Graph.</p>
      <Button primary content="Authorize" disabled={loading} onClick={reload} />
      {!loading && error && (
        <div className="error">Failed to read your profile. Please try again later.</div>
      )}
      {!loading && data && <div>Hello {data.profile.displayName}</div>}
    </div>
  );
}
