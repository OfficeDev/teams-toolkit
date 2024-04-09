const { AzureKeyCredential, SearchIndexClient } = require("@azure/search-documents");
const { deleteIndex } = require("./utils");

const index = "my-documents";
const searchApiKey = process.env.SECRET_AZURE_SEARCH_KEY;
const searchApiEndpoint = process.env.AZURE_SEARCH_ENDPOINT;
const credentials = new AzureKeyCredential(searchApiKey);

const searchIndexClient = new SearchIndexClient(searchApiEndpoint, credentials);
deleteIndex(searchIndexClient, index);
