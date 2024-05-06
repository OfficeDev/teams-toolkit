{
  "schema_version": "v2.1",
  "name_for_human": "{{appName}}${{APP_NAME_SUFFIX}}",
  "description_for_human": "Track your repair records",
  "description_for_model": "Plugin for searching a repair list, you can search by who's assigned to the repair.",
  "functions": [
    {
      "name": "repair",
      "description": "Search for repairs"
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
      "run_for_functions": ["repair"]
    }
  ]
}
