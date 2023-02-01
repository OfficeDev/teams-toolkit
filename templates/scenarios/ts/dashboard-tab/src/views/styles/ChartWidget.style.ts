import { tokens } from "@fluentui/react-components";
import { CSSProperties } from "react";

export const pieIconStyle = (): CSSProperties => ({
  height: "1.5rem",
  width: "1.5rem",
});

export const timeSpanStyle = (): CSSProperties => ({
  fontFamily: "Segoe UI",
  fontSize: "0.6875rem",
  fontWeight: "400",
  lineHeight: "0.625rem",
  fontStyle: "normal",
});

export const areaChartStyle = (): CSSProperties => ({
  position: "relative",
  height: "200px",
  width: "100%",
});

export const footerButtonStyle = (): CSSProperties => ({
  width: "fit-content",
  color: tokens.colorBrandForeground1,
});
