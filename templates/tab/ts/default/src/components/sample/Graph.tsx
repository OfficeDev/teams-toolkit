import { Button } from "@fluentui/react-northstar";
import { useGraph } from "./lib/useGraph";
import { ProfileCard } from "./ProfileCard";

export function Graph() {
  const { loading, error, data, reload } = useGraph();
  return (
    <div>
      <h2>Get the user's profile photo</h2>
      <p>
        Click below to authorize this app to read your profile photo using
        Microsoft Graph.
      </p>
      <Button primary content="Authorize" disabled={loading} onClick={reload} />
      {loading && ProfileCard(true)}
      {!loading && error && <div className="error">{error.toString()}</div>}
      {!loading && data && ProfileCard(false, data)}
    </div>
  );
}
