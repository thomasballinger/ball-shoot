import type { NextPage } from "next";
import Head from "next/head";
import { Game } from "../game";
import styles from "../styles/Home.module.css";

const Home: NextPage = () => {
  return (
    <div
      className={styles.container}
      style={{ userSelect: "none", overflow: "hidden" }}
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
