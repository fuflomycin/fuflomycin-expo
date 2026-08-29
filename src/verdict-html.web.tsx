type VerdictHtmlProps = {
  html: string;
};

export function VerdictHtml({ html }: VerdictHtmlProps) {
  return (
    <div
      style={{
        padding: 16,
        fontSize: 16,
        lineHeight: 1.5,
        color: "#111",
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
