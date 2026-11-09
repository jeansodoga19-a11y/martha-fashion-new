"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const PHONE = "22891778843";

export default function CartPage() {
  const [cart, setCart] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("martha-cart");
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        setCart(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      setCart([]);
    }
    setLoaded(true);
  }, []);

  function updateCart(updatedCart) {
    setCart(updatedCart);
    localStorage.setItem(
      "martha-cart",
      JSON.stringify(updatedCart)
    );
  }

  function changeQuantity(index, amount) {
    const updated = [...cart];

    updated[index].quantity = Math.max(
      1,
      (Number(updated[index].quantity) || 1) + amount
    );

    updateCart(updated);
  }

  function removeItem(index) {
    updateCart(cart.filter((_, i) => i !== index));
  }

  const total = cart.reduce(
    (sum, product) =>
      sum +
      Number(product.price || 0) *
      Number(product.quantity || 1),
    0
  );

  function orderWhatsApp() {
    const message = [
      "Bonjour Martha Fashion !",
      "",
      "Je souhaite commander :",
      ...cart.map(
        (product) =>
          `${product.name} - Quantité : ${product.quantity || 1} - ${(
            Number(product.price || 0) *
            Number(product.quantity || 1)
          ).toLocaleString("fr-FR")} FCFA`
      ),
      "",
      `TOTAL : ${total.toLocaleString("fr-FR")} FCFA`,
      "",
      "Merci !"
    ].join("\n");

    window.open(
      `https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  }

  if (!loaded) {
    return <p style={{ padding: 30 }}>Chargement du panier...</p>;
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#FFFBF5",
      padding: "25px 15px",
      color: "#333"
    }}>
      <div style={{ maxWidth: 750, margin: "auto" }}>
        <h1 style={{
          textAlign: "center",
          color: "#A77B32",
          fontSize: 28
        }}>
          Mon panier
        </h1>

        {cart.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <p>Votre panier est vide.</p>
            <Link href="/" style={{
              display: "inline-block",
              background: "#A77B32",
              color: "white",
              padding: "12px 25px",
              borderRadius: 8,
              textDecoration: "none"
            }}>
              Découvrir la boutique
            </Link>
          </div>
        ) : (
          <>
            {cart.map((product, index) => (
              <div key={product.id || index} style={{
                display: "flex",
                gap: 15,
                alignItems: "center",
                background: "white",
                padding: 15,
                marginBottom: 15,
                borderRadius: 12,
                boxShadow: "0 2px 8px #00000010"
              }}>
                <div style={{ flex: 1 }}>
                  <h3>{product.name}</h3>

                  <p>
                    {Number(product.price).toLocaleString("fr-FR")} FCFA
                  </p>

                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12
                  }}>
                    <button
                      onClick={() => changeQuantity(index, -1)}
                      style={{ padding: "5px 12px" }}
                    >
                      -
                    </button>

                    <strong>{product.quantity || 1}</strong>

                    <button
                      onClick={() => changeQuantity(index, 1)}
                      style={{ padding: "5px 12px" }}
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(index)}
                    style={{
                      marginTop: 10,
                      border: "none",
                      background: "none",
                      color: "red",
                      cursor: "pointer"
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}

            <div style={{
              background: "white",
              padding: 20,
              borderRadius: 12,
              marginTop: 20
            }}>
              <h2>
                Total : {total.toLocaleString("fr-FR")} FCFA
              </h2>

              <button
                onClick={orderWhatsApp}
                style={{
                  width: "100%",
                  padding: 16,
                  background: "#25D366",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 17,
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                Commander sur WhatsApp
              </button>

              <button
                onClick={() => updateCart([])}
                style={{
                  width: "100%",
                  marginTop: 12,
                  padding: 12,
                  background: "#eee",
                  border: "none",
                  borderRadius: 8
                }}
              >
                Vider le panier
              </button>
            </div>
          </>
        )}

        <p style={{ textAlign: "center", marginTop: 25 }}>
          <Link href="/" style={{ color: "#A77B32" }}>
            ← Retour à la boutique
          </Link>
        </p>
      </div>
    </main>
  );
}