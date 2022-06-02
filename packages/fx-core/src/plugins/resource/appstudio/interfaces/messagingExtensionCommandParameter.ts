import { MessagingExtensionParameterChoice } from "./messagingExtensionParameterChoice";

export interface MessagingExtensionCommandParameter {
  name: string;
  title: string;
  description: string;
  inputType: string;
  choices: MessagingExtensionParameterChoice[];
}
