import { tokens } from "@fluentui/react-components";

export const bodyContentStyle = () => ({
  display: "grid",
  gap: "0.5rem",
});

export const itemLayoutStyle = () => ({
  display: "grid",
});

export const dividerStyle = () => ({
  marginBottom: "0.5rem",
  marginLeft: "-2.25rem",
  marginRight: "-2.3rem",
  height: "1px",
  background: tokens.colorNeutralStroke2,
});

export const itemTitleStyle = () => ({
  fontFamily: "Segoe UI",
  fontSize: "0.875rem",
  fontWeight: "600",
  lineHeight: "1.25rem",
});

export const itemSubtitleStyle = () => ({
  fontFamily: "Segoe UI",
  fontSize: "0.75rem",
  fontWeight: "400",
  lineHeight: "1.25rem",
});
