import { useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import {
  contentHeightFromMessage,
  wrapVerdictHtml,
} from "./verdict-html-height";

type VerdictHtmlProps = {
  html: string;
};

export function VerdictHtml({ html }: VerdictHtmlProps) {
  const [height, setHeight] = useState(1);
  const source = useMemo(() => ({ html: wrapVerdictHtml(html) }), [html]);

  return (
    <WebView
      originWhitelist={["*"]}
      scrollEnabled={false}
      scalesPageToFit={false}
      source={source}
      onMessage={(event) => {
        const next = contentHeightFromMessage(event.nativeEvent.data);
        if (Number.isFinite(next) && next > 0) {
          setHeight(next);
        }
      }}
      style={[styles.webView, { height }]}
      containerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 0,
  },
  webView: {
    flex: 0,
    backgroundColor: "transparent",
  },
});
