import { useState } from "react";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

type VerdictHtmlProps = {
  html: string;
};

export function VerdictHtml({ html }: VerdictHtmlProps) {
  const [height, setHeight] = useState(1);

  return (
    <WebView
      originWhitelist={["*"]}
      scrollEnabled={false}
      source={{
        html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:16px;font:16px/1.5 sans-serif;color:#111}a{color:#1976d2}</style></head><body>${html}<script>window.ReactNativeWebView.postMessage(String(document.body.scrollHeight))</script></body></html>`,
      }}
      onMessage={(event) => {
        const next = Number(event.nativeEvent.data);
        if (Number.isFinite(next) && next > 0) {
          setHeight(next);
        }
      }}
      style={[styles.webView, { height }]}
    />
  );
}

const styles = StyleSheet.create({
  webView: {
    backgroundColor: "transparent",
  },
});
