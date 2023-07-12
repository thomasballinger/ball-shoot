import type { NextPage } from "next";
import Head from "next/head";
import { Game } from "../game";
import styles from "../styles/Home.module.css";

const Home: NextPage = () => {
  return (
    <div className={styles.container} style={{ userSelect: "none" }}>
      <Head>
        <title>It's like ManyGolf</title>
        <meta name="description" content="Multiplayer side-view golf game" />
      </Head>
      <main
        style={{
          width: "100vw",
          height: "100vh",
          display: "inline-flex",
          flexDirection: "column",
          overflow: "none",
        }}
      >
        <div
          className="debug"
          style={{
            position: "absolute",
            backgroundColor: " rgba(0, 0, 0, 0.2)",
            pointerEvents: "none",
            color: "white",
            overflow: "scroll",
            maxHeight: "100vh",
          }}
        ></div>
        <Game />
      </main>
    </div>
  );
};

export default Home;
