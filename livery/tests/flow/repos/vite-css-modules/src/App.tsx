import styles from "./Button.module.css";
export function App() {
  return (
    <main style={{ fontFamily: "Arial", padding: 40, background: "#ffffff" }}>
      <h1 style={{ color: "#111827" }}>Notes</h1>
      <button className={styles.button}>New note</button>
    </main>
  );
}
