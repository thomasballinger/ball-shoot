import "../styles/globals.css";
import type { AppProps } from "next/app";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import convexConfig from "../convex/_generated/clientConfig";
const convex = new ConvexReactClient(convexConfig);

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ConvexProvider client={convex}>
      <Component {...pageProps} />
    </ConvexProvider>
  );
}

export default MyApp;
