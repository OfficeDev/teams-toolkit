export class LogMessage {
  // All of log messages are started with component name.
  // Example: [fx-resource-dotnet] Start generating resource template.
  static readonly startGenerateResourceTemplate = "Start generating Bicep templates";
  static readonly endGenerateResourceTemplate = (capabilities: string[]): string =>
    `Successfully generated Bicep templates for ${capabilities.join(", ")}.`;
  static readonly startUpdateResourceTemplate = "Start updating Bicep templates.";
  static readonly endUpdateResourceTemplate = "Successfully updated Bicep templates.";
  static readonly startDeploy = "Start deploying";
  static readonly endDeploy = "Successfully deployed";
}

export class ProgressMessage {
  static readonly startProgress = "Preparing";
  static readonly deployProgressTitle = "Deploy";
  static readonly building = "Building publish artifact";
  static readonly uploading = "Uploading artifact to Azure Web App";
}
