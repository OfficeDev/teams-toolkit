{
    "$schema": "https://graphdevxdata.blob.core.windows.net/data/schemas/CopilotGPTManifestSchema-1.0.json",
    "name": "Repair-GPT${{APP_NAME_SUFFIX}}",
    "description": "This GPT helps you with finding car repair records.", 
    "conversation_starters": [
        { 
            "text": "Show repair records assigned to Karin Blair"
        }
    ],
    "actions": [
        {
            "id": "repairPlugin",
            "file": "ai-plugin.json"
        }
    ]
}