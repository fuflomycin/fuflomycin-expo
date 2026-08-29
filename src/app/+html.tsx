import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";
import { DIRECTORY_DESCRIPTION, DIRECTORY_NAME } from "../site";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ru">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <title>{DIRECTORY_NAME}</title>
        <meta name="description" content={DIRECTORY_DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={DIRECTORY_NAME} />
        <meta property="og:description" content={DIRECTORY_DESCRIPTION} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={DIRECTORY_NAME} />
        <meta name="twitter:description" content={DIRECTORY_DESCRIPTION} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
