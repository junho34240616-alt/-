import type { ReactNode } from "react";

export default function root_layout(props: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ fontFamily: "system-ui", margin: 0, padding: 16 }}>{props.children}</body>
    </html>
  );
}
