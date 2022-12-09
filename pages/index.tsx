import type { NextPage } from "next";
import Head from "next/head";
import { Game } from "../game";
import styles from "../styles/Home.module.css";

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>It's like ManyGolf</title>
        <meta name="description" content="Multiplayer side-view golf game" />
      </Head>
      <main
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Game />
      </main>
    </div>
  );
};

export default Home;
