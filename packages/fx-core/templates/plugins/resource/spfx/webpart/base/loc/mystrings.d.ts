declare interface I<%= componentStrings %> {
  PropertyPaneDescription: string;
  BasicGroupName: string;
  DescriptionFieldLabel: string;
}

declare module '<%= componentStrings %>' {
  const strings: I<%= componentStrings %>;
  export = strings;
}
