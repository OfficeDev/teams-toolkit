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
      "parameters": {
        "type": "object",
        "properties": {
          "assignedTo": {
            "type": "string",
            "description": "The person assigned to the repair"
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
        "url": "apiSpecificationFile/repair.yml",
        "progress_style": "ShowUsageWithInputAndOutput"
      },
      "run_for_functions": [
        "listRepairs"
      ]
    }
  ]
}
