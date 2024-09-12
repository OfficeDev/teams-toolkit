Object.defineProperty(exports, "__esModule", { value: true });
exports.sayCommand = void 0;
const botbuilder = require("botbuilder");
const Utilities = require("@microsoft/teams-ai");
/**
 * @private
 * @param {boolean} feedbackLoopEnabled - If true, the feedback loop UI for Teams will be enabled.
 * @returns {''} - An empty string.
 */
function sayCommand(feedbackLoopEnabled = false) {
  return async (context, _state, data) => {
    if (!data.response?.content) {
      return "";
    }
    let content = "";
    let result = JSON.parse(data.response.content);
    const isTeamsChannel = context.activity.channelId === botbuilder.Channels.Msteams;
    // If the response from AI includes citations, those citations will be parsed and added to the SAY command.
    let citations = [];
    let position = 1;
    if (result.results && result.results.length > 0) {
      result.results.forEach((contentItem) => {
        if (contentItem.citationTitle.length > 0) {
          const clientCitation = {
            "@type": "Claim",
            position: `${position}`,
            appearance: {
              "@type": "DigitalDocument",
              name: contentItem.citationTitle || `Document #${position}`,
              url: contentItem.citationUrl,
              abstract: Utilities.Utilities.snippet(contentItem.citationContent, 500),
            },
          };
          content += `${contentItem.answer}[${position}]<br>`;
          position++;
          citations.push(clientCitation);
        } else {
          content += `${contentItem.answer}<br>`;
        }
      });
    }
    if (isTeamsChannel) {
      content = content.split("\n").join("<br>");
    }
    // If there are citations, modify the content so that the sources are numbers instead of [doc1], [doc2], etc.
    const contentText =
      citations.length < 1 ? content : Utilities.Utilities.formatCitationsResponse(content);
    // If there are citations, filter out the citations unused in content.
    const referencedCitations =
      citations.length > 0
        ? Utilities.Utilities.getUsedCitations(contentText, citations)
        : undefined;
    await context.sendActivity({
      type: botbuilder.ActivityTypes.Message,
      text: contentText,
      ...(isTeamsChannel ? { channelData: { feedbackLoopEnabled } } : {}),
      entities: [
        {
          type: "https://schema.org/Message",
          "@type": "Message",
          "@context": "https://schema.org",
          "@id": "",
          additionalType: ["AIGeneratedContent"],
          ...(referencedCitations ? { citation: referencedCitations } : {}),
        },
      ],
    });
    return "";
  };
}
exports.sayCommand = sayCommand;
