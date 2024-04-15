{
  "schema_version": "v2",
  "name_for_human": "{{appName}}${{APP_NAME_SUFFIX}}",
  "description_for_human": "Track your repair records",
  "description_for_model": "Plugin for searching a repair list, you can search by who's assigned to the repair.",
  "functions": [
    {
      "name": "repair",
      "description": "Search for repairs",
      "parameters": {
        "type": "object",
        "properties": {
          "assignedTo": {
            "type": "string",
            "description": "The person assigned to the repair"
          }
        },
        "required": [
          "assignedTo"
        ]
      }
    }    
  ],
  "runtimes": [
    {
      "type": "OpenApi",
      "auth": {
        "type": "none"
      },
      "spec": {
        "url": "apiSpecificationFile/repair.yml",
        "progress_style": "ShowUsageWithInputAndOutput"
      },
      "run_for_functions": ["repair"]
    }
  ]
}
