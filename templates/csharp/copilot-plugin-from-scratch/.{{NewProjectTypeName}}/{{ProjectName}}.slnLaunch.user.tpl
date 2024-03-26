[
  {
    "Name": "Microsoft Teams (browser)",
    "Projects": [
      {
        "Name": "{{NewProjectTypeName}}\\{{NewProjectTypeName}}.{{NewProjectTypeExt}}",
        "Action": "StartWithoutDebugging",
        "DebugTarget": "Microsoft Teams (browser)"
      },
      {
{{#PlaceProjectFileInSolutionDir}}
        "Name": "{{ProjectName}}.csproj",
{{/PlaceProjectFileInSolutionDir}}
{{^PlaceProjectFileInSolutionDir}}
        "Name": "{{ProjectName}}\\{{ProjectName}}.csproj",
{{/PlaceProjectFileInSolutionDir}}
        "Action": "Start",
        "DebugTarget": "Start Project"
      }
    ]
  }
]