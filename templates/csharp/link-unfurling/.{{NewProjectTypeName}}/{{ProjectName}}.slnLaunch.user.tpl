[
  {
    "Name": "Microsoft Teams (browser)",
    "Projects": [
      {
        "Path": "{{NewProjectTypeName}}\\{{NewProjectTypeName}}.{{NewProjectTypeExt}}",
        "Name": "{{NewProjectTypeName}}\\{{NewProjectTypeName}}.{{NewProjectTypeExt}}",
        "Action": "StartWithoutDebugging",
        "DebugTarget": "Microsoft Teams (browser)"
      },
      {
{{#PlaceProjectFileInSolutionDir}}
        "Path": "{{ProjectName}}.csproj",
        "Name": "{{ProjectName}}.csproj",
{{/PlaceProjectFileInSolutionDir}}
{{^PlaceProjectFileInSolutionDir}}
        "Path": "{{ProjectName}}\\{{ProjectName}}.csproj",
        "Name": "{{ProjectName}}\\{{ProjectName}}.csproj",
{{/PlaceProjectFileInSolutionDir}}
        "Action": "Start",
        "DebugTarget": "Start Project"
      }
    ]
  },
  {
    "Name": "Outlook (browser)",
    "Projects": [
      {
        "Path": "{{NewProjectTypeName}}\\{{NewProjectTypeName}}.{{NewProjectTypeExt}}",
        "Name": "{{NewProjectTypeName}}\\{{NewProjectTypeName}}.{{NewProjectTypeExt}}",
        "Action": "StartWithoutDebugging",
        "DebugTarget": "Outlook (browser)"
      },
      {
{{#PlaceProjectFileInSolutionDir}}
        "Path": "{{ProjectName}}.csproj",
        "Name": "{{ProjectName}}.csproj",
{{/PlaceProjectFileInSolutionDir}}
{{^PlaceProjectFileInSolutionDir}}
        "Path": "{{ProjectName}}\\{{ProjectName}}.csproj",
        "Name": "{{ProjectName}}\\{{ProjectName}}.csproj",
{{/PlaceProjectFileInSolutionDir}}
        "Action": "Start",
        "DebugTarget": "Start Project"
      }
    ]
  }
]