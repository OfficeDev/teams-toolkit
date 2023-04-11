  - uses: azureStorage/enableStaticWebsite
    with:
      storageResourceId: ${{PROVISIONOUTPUT__AZURESTORAGETABOUTPUT__STORAGERESOURCEID}}
      indexPage: index.html
      errorPage: error.html