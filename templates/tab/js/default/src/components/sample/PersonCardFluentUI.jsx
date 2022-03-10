import { ProfileCard } from "./ProfileCard";

export function PersonCardFluentUI(props) {
  return (
    <div className="section-margin">
      <p>This example uses Fluent UI component with user's profile photo, name and email address fetched from Graph API calls.</p>
      <pre>{`const graph = createMicrosoftGraphClient(teamsfx, scope); \nconst profile = await graph.api("/me").get(); \nconst photo = await graph.api("/me/photo/$value").get();`}</pre>

      {props.loading && ProfileCard(true)}
      {!props.loading && props.error && (
        <div className="error">
          Failed to read your profile. Please try again later. <br /> Details: {props.error.toString()}
        </div>
      )}
      {!props.loading && props.data && ProfileCard(false, props.data)}
    </div>
  )
}