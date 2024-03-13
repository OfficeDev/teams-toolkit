[
{{#enableTestToolByDefault}}
  {
    "Name": "Teams App Test Tool (browser)",
    "Projects": [
      {
        "Name": "{{NewProjectTypeName}}\\{{NewProjectTypeName}}.{{NewProjectTypeExt}}",
        "Action": "StartWithoutDebugging",
        "DebugTarget": "Teams App Test Tool (browser)"
      },
      {
{{#PlaceProjectFileInSolutionDir}}
        "Name": "{{ProjectName}}.csproj",
{{/PlaceProjectFileInSolutionDir}}
{{^PlaceProjectFileInSolutionDir}}
        "Name": "{{ProjectName}}\\{{ProjectName}}.csproj",
{{/PlaceProjectFileInSolutionDir}}
        "Action": "Start",
        "DebugTarget": "Teams App Test Tool"
      }
    ]
  },
{{/enableTestToolByDefault}}
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
{{#enableTestToolByDefault}}
  }
{{/enableTestToolByDefault}}
{{^enableTestToolByDefault}}
  },
  {
    "Name": "Teams App Test Tool (browser)",
    "Projects": [
      {
        "Name": "{{NewProjectTypeName}}\\{{NewProjectTypeName}}.{{NewProjectTypeExt}}",
        "Action": "StartWithoutDebugging",
        "DebugTarget": "Teams App Test Tool (browser)"
      },
      {
{{#PlaceProjectFileInSolutionDir}}
        "Name": "{{ProjectName}}.csproj",
{{/PlaceProjectFileInSolutionDir}}
{{^PlaceProjectFileInSolutionDir}}
        "Name": "{{ProjectName}}\\{{ProjectName}}.csproj",
{{/PlaceProjectFileInSolutionDir}}
        "Action": "Start",
        "DebugTarget": "Teams App Test Tool"
      }
    ]
  }
{{/enableTestToolByDefault}}
]