{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "excludedTypes": "Request"
      }
    },
    "logLevel": {
      "{{ProjectName}}": "Information"
    }
  },
  "extensions": {
    "http": {
      "routePrefix": ""
    }
  }
}
