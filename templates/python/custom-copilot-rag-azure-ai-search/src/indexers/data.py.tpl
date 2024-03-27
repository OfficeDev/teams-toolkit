import os

{{#useAzureOpenAI}}
from teams.ai.embeddings import AzureOpenAIEmbeddings, AzureOpenAIEmbeddingsOptions
{{/useAzureOpenAI}}
{{#useOpenAI}}
from teams.ai.embeddings import OpenAIEmbeddings, OpenAIEmbeddingsOptions
{{/useOpenAI}}

async def get_doc_data(embeddings: OpenAIEmbeddings = None):
    with open(f'{os.getcwd()}/src/files/Contoso_Electronics_PerkPlus_Program.md', 'r') as file:
        raw_description1 = file.read()
    doc1 = {
        "docId": "1",
        "docTitle": "Contoso_Electronics_PerkPlus_Program",
        "description": raw_description1,
        "descriptionVector": await get_embedding_vector(raw_description1, embeddings=embeddings),
    }
    
    with open(f'{os.getcwd()}/src/files/Contoso_Electronics_Company_Overview.md', 'r') as file:
        raw_description2 = file.read()
    doc2 = {
        "docId": "2",
        "docTitle": "Contoso_Electronics_Company_Overview",
        "description": raw_description2,
        "descriptionVector": await get_embedding_vector(raw_description2, embeddings=embeddings),
    }
    
    with open(f'{os.getcwd()}/src/files/Contoso_Electronics_Plan_Benefits.md', 'r') as file:
        raw_description3 = file.read()
    doc3 = {
        "docId": "3",
        "docTitle": "Contoso_Electronics_Plan_Benefits",
        "description": raw_description3,
        "descriptionVector": await get_embedding_vector(raw_description3, embeddings=embeddings),
    }

    return [doc1, doc2, doc3]


async def get_embedding_vector(text: str, embeddings: OpenAIEmbeddings = None):
    if not embeddings:
        from ..config import Config
        {{#useAzureOpenAI}}
        embeddings = AzureOpenAIEmbeddings(AzureOpenAIEmbeddingsOptions(
            azure_api_key=Config.AZURE_OPENAI_API_KEY,
            azure_endpoint=Config.AZURE_OPENAI_ENDPOINT,
            azure_deployment=Config.AZURE_OPENAI_EMBEDDING_DEPLOYMENT
        ))
        {{/useAzureOpenAI}}
        {{#useOpenAI}}
        embedding=OpenAIEmbeddings(OpenAIEmbeddingsOptions(
            api_key=Config.OPENAI_API_KEY,
            model=Config.OPENAI_EMBEDDING_DEPLOYMENT,
        ))
        {{/useOpenAI}}
    
    result = await embeddings.create_embeddings(text)
    if (result.status != 'success' or not result.output):
        raise Exception(f"Failed to generate embeddings for description: {text}")
    
    return result.output[0]