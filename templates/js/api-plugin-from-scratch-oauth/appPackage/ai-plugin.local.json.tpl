{
  "$schema": "https://developer.microsoft.com/json-schemas/copilot/plugin/v2.1/schema.json",
  "schema_version": "v2.1",
  "namespace": "repairs",
  "name_for_human": "{{appName}}${{APP_NAME_SUFFIX}}",
  "description_for_human": "Track your repair records",
  "description_for_model": "Plugin for searching a repair list, you can search by who's assigned to the repair.",
  "functions": [
    {
      "name": "listRepairs",
      "description": "Returns a list of repairs with their details and images",
      "capabilities": {
        "response_semantics": {
          "data_path": "$.results",
          "properties": {
            "title": "$.title",
            "subtitle": "$.description",
            "url": "$.image"
          },
          "static_template": {
            "type": "AdaptiveCard",
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
            "version": "1.5",
            "body": [
              {
                "type": "Container",
                "$data": "${$root}",
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "id: ${if(id, id, 'N/A')}",
                    "wrap": true
                  },
                  {
                    "type": "TextBlock",
                    "text": "title: ${if(title, title, 'N/A')}",
                    "wrap": true
                  },
                  {
                    "type": "TextBlock",
                    "text": "description: ${if(description, description, 'N/A')}",
                    "wrap": true
                  },
                  {
                    "type": "TextBlock",
                    "text": "assignedTo: ${if(assignedTo, assignedTo, 'N/A')}",
                    "wrap": true
                  },
                  {
                    "type": "TextBlock",
                    "text": "date: ${if(date, date, 'N/A')}",
                    "wrap": true
                  },
                  {
                    "type": "Image",
                    "url": "${image}",
                    "$when": "${image != null}"
                  }
                ]
              }
            ]
          }
        }
      } 
    }    
  ],
  "runtimes": [
    {
      "type": "OpenApi",
      "auth": {
        "type": "None"
      },
      "spec": {
        "url": "apiSpecificationFile/repair.local.yml",
        "progress_style": "ShowUsageWithInputAndOutput"
      },
      "run_for_functions": ["listRepairs"]
    }
  ],
  "capabilities": {
    "localization": {},
    "conversation_starters": [
      {
        "text": "List all repairs"
      }
    ]
  }
}
