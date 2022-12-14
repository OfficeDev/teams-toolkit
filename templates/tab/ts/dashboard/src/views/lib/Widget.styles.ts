import { CSSProperties } from "react";
import { tokens } from "@fluentui/react-components";

export const widgetStyles = (): CSSProperties => ({
  display: "grid",
  paddingLeft: "2.3rem",
  paddingRight: "2.3rem",
  paddingTop: "1rem",
  paddingBottom: "1.25rem",
  backgroundColor: tokens.colorNeutralBackground1,
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: tokens.colorTransparentStroke,
  boxShadow: tokens.shadow4,
  borderRadius: tokens.borderRadiusMedium,
  gap: "1rem",
  gridTemplateRows: "max-content 1fr max-content",
});

export const headerStyles = (): CSSProperties => ({
  display: "grid",
  alignItems: "center",
  height: "max-content",
});

export const headerContentStyle = (): CSSProperties => ({
  display: "grid",
  gap: "8px",
  gridTemplateColumns: "min-content 1fr min-content",
  alignItems: "center",
});

export const headerTextStyle = (): CSSProperties => ({
  fontWeight: "600",
  lineHeight: "1rem",
  fontStyle: "normal",
  fontSize: "0.75rem",
  fontFamily: "Segoe UI",
});
