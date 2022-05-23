import "./Graph.css";
import { useGraph } from "./lib/useGraph";
import { Button } from "@fluentui/react-northstar";
import { Design } from './Design';
import { PersonCardFluentUI } from './PersonCardFluentUI';

export function Graph() {
  const { loading, error, data, reload } = useGraph(
    async (graph) => {
      // Call graph api directly to get user profile information
      const profile = await graph.api("/me").get();

      let photoUrl = "";
      try {
        const photo = await graph.api("/me/photo/$value").get();
        photoUrl = URL.createObjectURL(photo);
      } catch {
        // Could not fetch photo from user's profile, return empty string as placeholder.
      }
      return { profile, photoUrl };
    },
    { scope: ["User.Read"] }
  );

  return (
    <div>
      <Design />
      <h3>Example: Get the user's profile</h3>
      <div className="section-margin">
        <p>Click below to authorize button to grant permission to using Microsoft Graph.</p>
        <pre>{`const teamsfx = new TeamsFx(); \nawait teamsfx.login(scope);`}</pre>
        <Button primary content="Authorize" disabled={loading} onClick={reload} />

        <p>Below is the implementation of retrieving profile photo for currently signed-in user using Fluent UI component.</p>
        <h4>Display user profile using Fluent UI Component</h4>
        <PersonCardFluentUI loading={loading} data={data} error={error} />
      </div>
    </div>
  );
}
