"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

const PHONE = "22891778843";

function formatPrice(price) {
  return Number(price || 0).toLocaleString("fr-FR") + " FCFA";
}

function normalizeOptions(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {}

    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function whatsappLink(product) {
  const message = `Bonjour Martha Fashion, je souhaite commander : ${product.name}, au prix de ${formatPrice(product.price)}.`;

  return `https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`;
}

export default function ProductPage() {
  const params = useParams();
  const slug = params?.slug;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState("");

  useEffect(() => {
    async function loadProduct() {
      if (!slug) return;

      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error) {
        console.error("Erreur produit :", error);
        setError("Impossible de charger ce produit.");
        setProduct(null);
      } else {
        setProduct(data);
        setSelectedImage(data.image || "");
      }

      setLoading(false);
    }

    loadProduct();
  }, [slug]);

  async function addToCart() {
    if (!product) return;

    try {
      const cart = JSON.parse(localStorage.getItem("martha-cart") || "[]");

      const existingIndex = cart.findIndex(
        (item) => item.id === product.id
      );

      if (existingIndex >= 0) {
        cart[existingIndex].quantity =
          (cart[existingIndex].quantity || 1) + 1;
      } else {
        cart.push({
          ...product,
          quantity: 1,
        });
      }

      localStorage.setItem("martha-cart", JSON.stringify(cart));
      alert("Produit ajouté au panier !");
    } catch (err) {
      console.error(err);
      alert("Impossible d'ajouter ce produit au panier.");
    }
  }

  if (loading) {
    return <main className="message">Chargement du produit...</main>;
  }

  if (error || !product) {
    return (
      <main className="message">
        <h2>Produit introuvable</h2>
        <p>{error}</p>
        <Link href="/">Retour à la boutique</Link>
      </main>
    );
  }

  const images = [
    product.image,
    ...normalizeOptions(product.images),
  ].filter(Boolean);

  const sizes = normalizeOptions(product.size);
  const colors = normalizeOptions(product.color);

  return (
    <main className="product-page">
      <Link href="/" className="back-link">
        ← Retour à la boutique
      </Link>

      <div className="product-container">
        <section className="gallery">
          <img
            src={selectedImage || product.image}
            alt={product.name}
            className="main-image"
          />

          {images.length > 1 && (
            <div className="thumbnail-list">
              {images.map((image, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => setSelectedImage(image)}
                  className={`thumbnail ${
                    selectedImage === image ? "active" : ""
                  }`}
                >
                  <img src={image} alt={`${product.name} ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="product-info">
          <p className="category">{product.category || "Mode"}</p>

          <h1>{product.name}</h1>

          <div className="prices">
            <strong>{formatPrice(product.price)}</strong>

            {product.old_price && (
              <del>{formatPrice(product.old_price)}</del>
            )}
          </div>

          <div className="description">
            <h3>Description</h3>
            <p>{product.description || "Découvrez cette création Martha Fashion."}</p>
          </div>

          {sizes.length > 0 && (
            <div className="product-options">
              <h3>Tailles disponibles</h3>
              <div className="option-list">
                {sizes.map((size, index) => (
                  <span className="option-item" key={index}>
                    {size}
                  </span>
                ))}
              </div>
            </div>
          )}

          {colors.length > 0 && (
            <div className="product-options">
              <h3>Couleurs disponibles</h3>
              <div className="option-list">
                {colors.map((color, index) => (
                  <span className="option-item" key={index}>
                    {color}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="stock">
            {Number(product.stock) > 0
              ? `En stock : ${product.stock}`
              : "Stock non disponible"}
          </p>

          <div className="actions">
            <button type="button" onClick={addToCart} className="cart-button">
              Ajouter au panier
            </button>

            <a
              href={whatsappLink(product)}
              target="_blank"
              rel="noopener noreferrer"
              className="whatsapp-button"
            >
              Commander sur WhatsApp
            </a>
          </div>
        </section>
      </div>

      <style jsx>{`
        .product-page {
          max-width: 1100px;
          margin: auto;
          padding: 24px 16px 50px;
          color: #29231f;
        }

        .back-link {
          display: inline-block;
          margin-bottom: 24px;
          color: #8a642e;
          text-decoration: none;
          font-weight: 600;
        }

        .product-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          align-items: start;
        }

        .main-image {
          width: 100%;
          aspect-ratio: 4 / 5;
          object-fit: contain;
          background: #fffaf5;
          border-radius: 12px;
        }

        .thumbnail-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 12px;
        }

        .thumbnail {
          width: 70px;
          height: 80px;
          padding: 2px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: white;
          overflow: hidden;
        }

        .thumbnail.active {
          border: 2px solid #b58a45;
        }

        .thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .category {
          color: #9b743a;
          text-transform: uppercase;
          font-size: 13px;
        }

        h1 {
          font-size: 28px;
          margin: 10px 0;
        }

        .prices {
          display: flex;
          gap: 14px;
          align-items: center;
          margin: 18px 0;
        }

        .prices strong {
          color: #a27635;
          font-size: 24px;
        }

        .prices del {
          color: #999;
        }

        .description {
          line-height: 1.7;
          margin: 24px 0;
        }

        .product-options {
          margin: 22px 0;
        }

        .product-options h3 {
          font-size: 16px;
          margin-bottom: 10px;
        }

        .option-list {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }

        .option-item {
          display: inline-block;
          padding: 9px 15px;
          border: 1px solid #d9c5a4;
          border-radius: 7px;
          background: #fffaf3;
          font-size: 14px;
        }

        .stock {
          margin: 20px 0;
          color: #527044;
        }

        .actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 25px;
        }

        .cart-button,
        .whatsapp-button {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 8px;
          text-align: center;
          text-decoration: none;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
        }

        .cart-button {
          background: #a77b3d;
          color: white;
        }

        .whatsapp-button {
          background: #168b48;
          color: white;
        }

        .message {
          padding: 60px 20px;
          text-align: center;
        }

        @media (max-width: 700px) {
          .product-container {
            grid-template-columns: 1fr;
            gap: 24px;
          }

          h1 {
            font-size: 23px;
          }
        }
      `}</style>
    </main>
  );
}