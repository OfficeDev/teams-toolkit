import os
from azure.core.credentials import AzureKeyCredential
from azure.search.documents.indexes import SearchIndexClient

from dotenv import load_dotenv

load_dotenv(f'{os.getcwd()}/.env', override=True)

def delete_index(client: SearchIndexClient, name: str):
    client.delete_index(name)
    print(f"Index {name} deleted")

index = 'contoso-electronics'
search_api_key = os.getenv('AZURE_SEARCH_KEY')
search_api_endpoint = os.getenv('AZURE_SEARCH_ENDPOINT')
credentials = AzureKeyCredential(search_api_key)

search_index_client = SearchIndexClient(search_api_endpoint, credentials)
delete_index(search_index_client, index)