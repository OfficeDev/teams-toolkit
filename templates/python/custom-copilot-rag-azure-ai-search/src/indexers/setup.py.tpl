import asyncio, os, argparse
from dataclasses import dataclass
from typing import List, Optional

from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
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
{{#useAzureOpenAI}}
from teams.ai.embeddings import AzureOpenAIEmbeddings, AzureOpenAIEmbeddingsOptions
{{/useAzureOpenAI}}
{{#useOpenAI}}
from teams.ai.embeddings import OpenAIEmbeddings, OpenAIEmbeddingsOptions
{{/useOpenAI}}

from get_data import get_doc_data

from dotenv import load_dotenv

load_dotenv(f'{os.getcwd()}/env/.env.local.user', override=True)

@dataclass
class Doc:
    docId: Optional[str] = None
    docTitle: Optional[str] = None
    description: Optional[str] = None
    descriptionVector: Optional[List[float]] = None

async def upsert_documents(client: SearchClient, documents: list[Doc]):
    return client.merge_or_upload_documents(documents)

async def create_index_if_not_exists(client: SearchIndexClient, name: str):
    doc_index = SearchIndex(
        name=name,
        fields = [
            SimpleField(name="docId", type=SearchFieldDataType.String, key=True),
            SimpleField(name="docTitle", type=SearchFieldDataType.String),
            SearchableField(name="description", type=SearchFieldDataType.String, searchable=True),
            SearchField(name="descriptionVector", type=SearchFieldDataType.Collection(SearchFieldDataType.Single), hidden=False, searchable=True, vector_search_dimensions=1536, vector_search_profile_name='my-vector-config'),
        ],
        scoring_profiles=[],
        cors_options=CorsOptions(allowed_origins=["*"]),
        vector_search = VectorSearch(
            profiles=[VectorSearchProfile(name="my-vector-config", algorithm_configuration_name="my-algorithms-config")],
            algorithms=[HnswAlgorithmConfiguration(name="my-algorithms-config")],
        )
    )

    client.create_or_update_index(doc_index)

def load_keys_from_args():
    parser = argparse.ArgumentParser(description='Load keys from command input parameters.')
    {{#useAzureOpenAI}}
    parser.add_argument('--api-key', type=str, required=True, help='Azure OpenAI API key for authentication')
    {{/useAzureOpenAI}}
    {{#useOpenAI}}
    parser.add_argument('--api-key', type=str, required=True, help='OpenAI API key for authentication')
    {{/useOpenAI}}
    parser.add_argument('--ai-search-key', type=str, required=True, help='AI Search key for authentication')
    args = parser.parse_args()
    return args

async def setup(search_api_key, search_api_endpoint, args):
    index = 'contoso-electronics'

    credentials = AzureKeyCredential(search_api_key)

    search_index_client = SearchIndexClient(search_api_endpoint, credentials)
    await create_index_if_not_exists(search_index_client, index)
    
    print("Create index succeeded. If it does not exist, wait for 5 seconds...")
    await asyncio.sleep(5)

    search_client = SearchClient(search_api_endpoint, index, credentials)

    {{#useAzureOpenAI}}
    embeddings = AzureOpenAIEmbeddings(AzureOpenAIEmbeddingsOptions(
        azure_api_key=args.api_key,
        azure_endpoint=os.getenv('AZURE_OPENAI_ENDPOINT'),
        azure_deployment=os.getenv('AZURE_OPENAI_EMBEDDING_DEPLOYMENT')
    ))
    {{/useAzureOpenAI}}
    {{#useOpenAI}}
    embeddings=OpenAIEmbeddings(OpenAIEmbeddingsOptions(
        api_key=args.api_key,
        model='text-embedding-ada-002'
    ))
    {{/useOpenAI}}
    data = await get_doc_data(embeddings=embeddings)
    await upsert_documents(search_client, data)

    print("Upload new documents succeeded. If they do not exist, wait for several seconds...")
    
args = load_keys_from_args()
search_api_key = args.ai_search_key
search_api_endpoint = os.getenv('AZURE_SEARCH_ENDPOINT')
asyncio.run(setup(search_api_key, search_api_endpoint, args))
print("setup finished")

