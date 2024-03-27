import argparse
from azure.core.credentials import AzureKeyCredential
from azure.search.documents.indexes import SearchIndexClient

def delete_index(client: SearchIndexClient, name: str):
    client.delete_index(name)
    print(f"Index {name} deleted")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Delete Azure Search Index')
    parser.add_argument('--key', required=True, help='Azure Search API key')
    parser.add_argument('--endpoint', required=True, help='Azure Search API endpoint')
    args = parser.parse_args()

    index = 'contoso-electronics'
    search_api_key = args.key
    search_api_endpoint = args.endpoint
    credentials = AzureKeyCredential(search_api_key)

    search_index_client = SearchIndexClient(search_api_endpoint, credentials)
    delete_index(search_index_client, index)