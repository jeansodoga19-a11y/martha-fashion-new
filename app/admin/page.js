"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

const ADMIN_UID = "574938b7-bcb1-44c3-b16b-5eb412c68452";

export default function AdminPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("admin@marthafashion.tg");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function login(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage("Connexion impossible : " + error.message);
      setLoading(false);
      return;
    }

    if (data.user?.id !== ADMIN_UID) {
      await supabase.auth.signOut();
      setMessage("Ce compte n'est pas autorisé.");
      setLoading(false);
      return;
    }

    router.replace("/admin/dashboard");
    router.refresh();
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#FFFBF5",
      display: "grid",
      placeItems: "center",
      padding: 20,
      fontFamily: "Arial"
    }}>
      <form onSubmit={login} style={{
        background: "white",
        padding: 25,
        borderRadius: 16,
        width: "100%",
        maxWidth: 400
      }}>
        <h1 style={{ color: "#9B6B24", textAlign: "center" }}>
          MARTHA FASHION
        </h1>

        <h2 style={{ textAlign: "center" }}>
          Espace administrateur
        </h2>

        <label>Adresse email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <label>Mot de passe</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Ton mot de passe"
          style={inputStyle}
        />

        <button disabled={loading} style={buttonStyle}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>

        {message && (
          <p style={{ color: "#b00020" }}>{message}</p>
        )}
      </form>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: 13,
  margin: "8px 0 18px",
  border: "1px solid #ddd",
  borderRadius: 8,
  fontSize: 16
};

const buttonStyle = {
  width: "100%",
  padding: 14,
  background: "#9B6B24",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontSize: 16
};