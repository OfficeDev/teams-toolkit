namespace {{ProjectName}}
{
    using Newtonsoft.Json;

    public class CardModel
    {
        [JsonProperty("title")]
        public string Title { get; set; }

        [JsonProperty("body")]
        public string Body { get; set; }
    }
}
