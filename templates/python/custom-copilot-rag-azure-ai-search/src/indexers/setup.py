import argparse
import asyncio

from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient

from .data import get_doc_data

from azure.search.documents.indexes.models import (
    SearchIndex,
    SimpleField,
    SearchableField,
    SearchField,
    SearchFieldDataType,
    ComplexField,
    CorsOptions,
    VectorSearch,
    VectorSearchProfile,
    HnswAlgorithmConfiguration
)
from time import sleep

from ..AzureAISearchDataSource import Doc

async def upsert_documents(client: SearchClient, documents: list[Doc]):
    return client.merge_or_upload_documents(documents)

async def create_index_if_not_exists(client: SearchIndexClient, name: str):
    doc_index = SearchIndex(
        name=name,
        fields = [
            SimpleField(name="docId", type=SearchFieldDataType.String, key=True),
            SimpleField(name="docTitle", type=SearchFieldDataType.String),
            SearchableField(name="description", type=SearchFieldDataType.String, searchable=True),
            SearchField(name="descriptionVector", type=SearchFieldDataType.Collection(SearchFieldDataType.Single), searchable=True, vector_search_dimensions=1536, vector_search_profile_name='my-vector-config'),
        ],
        scoring_profiles=[],
        cors_options=CorsOptions(allowed_origins=["*"]),
        vector_search = VectorSearch(
            profiles=[VectorSearchProfile(name="my-vector-config", algorithm_configuration_name="my-algorithms-config")],
            algorithms=[HnswAlgorithmConfiguration(name="my-algorithms-config")],
        )
    )

    client.create_or_update_index(doc_index)

async def setup(search_api_key, search_api_endpoint):
    index = 'contoso-electronics'

    credentials = AzureKeyCredential(search_api_key)

    search_index_client = SearchIndexClient(search_api_endpoint, credentials)
    await create_index_if_not_exists(search_index_client, index)
    
    print("Create index succeeded. If it does not exist, wait for 5 seconds...")
    await asyncio.sleep(5)

    search_client = SearchClient(search_api_endpoint, index, credentials)

    data = await get_doc_data()
    await upsert_documents(search_client, data)

    print("Upload new documents succeeded. If they do not exist, wait for several seconds...")
    
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Setup Azure Search')
    parser.add_argument('--key', required=True, help='Azure Search API key')
    parser.add_argument('--endpoint', required=True, help='Azure Search API endpoint')
    args = parser.parse_args()

    asyncio.run(setup(args.key, args.endpoint))

    print("setup finished")

