export interface IBotRegistration {
    botId?: string;
    name: string;
    description: string;
    iconUrl: string;
    messagingEndpoint: string;
    callingEndpoint: string;
}