param (
    [Parameter(Mandatory=$true)]
    [string]$OPENAI_API_KEY
)

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $OPENAI_API_KEY"
    "OpenAI-Beta" = "assistants=v1"
}

$body = @{
    instructions = "You are a personal math tutor. Write and run code to answer math questions."
    name = "Math Tutor"
    tools = @(@{type = "code_interpreter"})
    model = "gpt-3.5-turbo"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://api.openai.com/v1/assistants" -Method Post -Body $body -Headers $headers