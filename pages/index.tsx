import type { NextPage } from "next";
import Head from "next/head";
import { Game } from "../game";

const Home: NextPage = () => {
  return (
    <div
      style={{
        userSelect: "none",
        overflow: "hidden",
        backgroundColor: "lightblue",
        minHeight: "100dvh",
        overscrollBehavior: "none",
      }}
    >
      <Head>
        <title>It's like ManyGolf</title>
        <meta name="description" content="Multiplayer side-view golf game" />
      </Head>
      <main>
        <Game />
      </main>
    </div>
  );
};

export default Home;
