"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

const PHONE = "22891778843";

function whatsappLink(product) {
  const message = product
    ? `Bonjour Martha Fashion, je souhaite commander : ${product.name}, au prix de ${Number(product.price).toLocaleString("fr-FR")} FCFA.`
    : "Bonjour Martha Fashion, je souhaite découvrir vos créations.";

  return `https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`;
}

// Récupération des photos et vidéos d'un produit
function getProductMedia(product) {
  const images = Array.isArray(product.images)
    ? product.images
    : [];

  const videos = Array.isArray(product.videos)
    ? product.videos
    : [];

  const imageItems = images
    .map((item) =>
      typeof item === "string" ? item : item?.url
    )
    .filter(Boolean)
    .map((url) => ({ type: "image", url }));

  const videoItems = videos
    .map((item) =>
      typeof item === "string" ? item : item?.url
    )
    .filter(Boolean)
    .map((url) => ({ type: "video", url }));

  const allMedia = [...imageItems, ...videoItems];

  // Compatibilité avec les anciens produits
  if (allMedia.length === 0 && product.image) {
    allMedia.push({
      type: "image",
      url: product.image,
    });
  }

  return allMedia;
}

// Galerie photos et vidéos
function ProductMedia({ product }) {
  const media = getProductMedia(product);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [product.id]);

  const currentMedia = media[activeIndex];

  function previousMedia(event) {
    event.preventDefault();
    event.stopPropagation();

    setActiveIndex((current) =>
      current === 0 ? media.length - 1 : current - 1
    );
  }

  function nextMedia(event) {
    event.preventDefault();
    event.stopPropagation();

    setActiveIndex((current) =>
      current === media.length - 1 ? 0 : current + 1
    );
  }

  return (
    <div className="product-image">
      {currentMedia ? (
        currentMedia.type === "video" ? (
          <video
            key={currentMedia.url}
            src={currentMedia.url}
            controls
            playsInline
            preload="metadata"
            aria-label={`Vidéo de ${product.name}`}
          />
        ) : (
          <img
            src={currentMedia.url}
            alt={product.name}
            loading="lazy"
          />
        )
      ) : (
        <div className="no-image">
          Photo indisponible
        </div>
      )}

      {product.tag && (
        <span className="product-tag">
          {product.tag}
        </span>
      )}

      {media.length > 1 && (
        <>
          <button
            type="button"
            className="media-arrow media-previous"
            onClick={previousMedia}
            aria-label="Média précédent"
          >
            ‹
          </button>

          <button
            type="button"
            className="media-arrow media-next"
            onClick={nextMedia}
            aria-label="Média suivant"
          >
            ›
          </button>

          <span className="media-counter">
            {activeIndex + 1} / {media.length}
          </span>
        </>
      )}
    </div>
  );
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    async function loadProducts() {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur produits :", error);
        setError("Impossible de charger les produits.");
      } else {
        setProducts(data || []);
      }

      setLoading(false);
    }

    loadProducts();

    try {
      const saved = JSON.parse(
        localStorage.getItem("martha-cart") || "[]"
      );

      setCartCount(
        saved.reduce(
          (sum, item) => sum + Number(item.quantity || 1),
          0
        )
      );
    } catch {
      setCartCount(0);
    }
  }, []);

  function addToCart(product) {
    try {
      const cart = JSON.parse(
        localStorage.getItem("martha-cart") || "[]"
      );

      const existing = cart.find(
        (item) => item.id === product.id
      );

      if (existing) {
        existing.quantity =
          Number(existing.quantity || 1) + 1;
      } else {
        cart.push({
          id: product.id,
          name: product.name,
          price: Number(product.price),
          image: product.image,
          quantity: 1,
        });
      }

      localStorage.setItem(
        "martha-cart",
        JSON.stringify(cart)
      );

      setCartCount(
        cart.reduce(
          (sum, item) => sum + Number(item.quantity || 1),
          0
        )
      );

      alert("Produit ajouté au panier !");
    } catch {
      alert("Impossible d'ajouter ce produit au panier.");
    }
  }

  return (
    <main>
      <header className="header">
        <a href="#accueil" className="logo">
          <span className="logo-mark">M</span>
          <span>
            MARTHA <strong>FASHION</strong>
            <small>MODE & CRÉATIONS</small>
          </span>
        </a>

        <nav>
          <a href="#accueil">Accueil</a>
          <a href="#boutique">Boutique</a>
          <a href="#apropos">À propos</a>
          <a href="#contact">Contact</a>
        </nav>

        <Link className="header-button" href="/cart">
          🛒 Panier ({cartCount})
        </Link>
      </header>

      <section className="hero" id="accueil">
        <div className="hero-content">
          <span className="eyebrow">
            L&apos;ÉLÉGANCE AFRICAINE
          </span>

          <h1>
            Votre style,
            <br />
            notre <span>passion.</span>
          </h1>

          <p>
            Découvrez des créations africaines uniques,
            pensées pour révéler votre beauté et votre élégance.
          </p>

          <a className="gold-button" href="#boutique">
            Découvrir la boutique →
          </a>

          <div className="hero-note">
            <span>✦</span> Mode africaine • Créations originales
          </div>
        </div>

        <div className="hero-decoration">
          <div className="hero-circle">
            <span>MARTHA</span>
            <strong>FASHION</strong>
            <small>BEAUTÉ • STYLE • ÉLÉGANCE</small>
          </div>
        </div>
      </section>

      <section className="intro" id="apropos">
        <span className="section-label">
          BIENVENUE CHEZ MARTHA
        </span>

        <h2>L&apos;élégance au cœur de la tradition</h2>

        <p>
          Des tenues modernes inspirées de la richesse des tissus
          africains. Exprimez votre personnalité avec Martha Fashion.
        </p>
      </section>

      <section className="shop" id="boutique">
        <div className="section-heading">
          <div>
            <span className="section-label">
              NOTRE SÉLECTION
            </span>

            <h2>Nos créations</h2>
          </div>

          <span className="product-count">
            {products.length.toString().padStart(2, "0")} ARTICLES
          </span>
        </div>

        {loading && (
          <p className="message">
            Chargement des créations...
          </p>
        )}

        {!loading && error && (
          <p className="message error">{error}</p>
        )}

        {!loading && !error && products.length === 0 && (
          <p className="message">
            Aucun produit disponible pour le moment.
          </p>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="products-grid">
            {products.map((product) => (
              <article
                className="product-card"
                key={product.id}
              >
                <ProductMedia product={product} />

                <Link
                  href={
                    product.slug
                      ? `/product/${encodeURIComponent(product.slug)}`
                      : "#boutique"
                  }
                  className="product-link"
                  aria-label={`Voir ${product.name}`}
                >
                  <div className="product-info">
                    <h3>{product.name}</h3>

                    <p className="price">
                      {Number(product.price).toLocaleString("fr-FR")} FCFA
                    </p>

                    <span className="view-product">
                      Voir le produit →
                    </span>
                  </div>
                </Link>

                <div className="product-actions">
                  <button
                    className="add-cart-button"
                    onClick={() => addToCart(product)}
                  >
                    Ajouter au panier 🛒
                  </button>

                  <a
                    className="order-button"
                    href={whatsappLink(product)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Commander sur WhatsApp <span>↗</span>
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="contact" id="contact">
        <span className="section-label">
          UNE COMMANDE ?
        </span>

        <h2>Votre prochaine tenue vous attend.</h2>

        <p>
          Contactez-nous directement pour commander vos créations.
        </p>

        <a
          className="gold-button"
          href={whatsappLink()}
          target="_blank"
          rel="noopener noreferrer"
        >
          ✆ Appel et WhatsApp
        </a>

        <p className="phone">+228 91 77 88 43</p>
      </section>

      <footer className="footer">
        <div className="footer-logo">
          MARTHA FASHION
        </div>

        <p>Mode & Créations • Lomé - Djagblé, Togo</p>
        <p>Instagram : @martha.fashion</p>

        <div className="copyright">
          © {new Date().getFullYear()} Martha Fashion.
          Tous droits réservés.
        </div>
      </footer>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        main {
          background: #fffaf6;
          color: #29201f;
          font-family: Arial, sans-serif;
          min-height: 100vh;
        }

        a {
          text-decoration: none;
        }

        .header {
          min-height: 82px;
          padding: 15px 6%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          background: white;
          border-bottom: 1px solid #f1e4dc;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #34201f;
          font-weight: bold;
          letter-spacing: 1px;
        }

        .logo-mark {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          background: #b87991;
          color: white;
          border-radius: 50%;
          font-family: Georgia, serif;
          font-size: 27px;
        }

        .logo small {
          display: block;
          color: #b18a47;
          font-size: 9px;
          margin-top: 5px;
          letter-spacing: 2px;
        }

        nav {
          display: flex;
          gap: 28px;
        }

        nav a {
          color: #493a36;
          font-size: 14px;
        }

        .header-button {
          background: #30201f;
          color: white;
          padding: 13px 22px;
          border-radius: 25px;
          font-size: 13px;
          white-space: nowrap;
        }

        .hero {
          min-height: 470px;
          padding: 65px 9%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
          background: linear-gradient(120deg, #f5e3e8, #fff4e7);
        }

        .hero-content {
          max-width: 550px;
        }

        .eyebrow,
        .section-label {
          color: #a77b39;
          font-size: 11px;
          font-weight: bold;
          letter-spacing: 3px;
        }

        h1 {
          font-family: Georgia, serif;
          font-size: clamp(42px, 6vw, 70px);
          line-height: 1.08;
          margin: 20px 0;
        }

        h1 span {
          color: #b87991;
          font-style: italic;
        }

        .hero-content > p {
          color: #665854;
          line-height: 1.8;
          max-width: 440px;
          font-size: 15px;
        }

        .gold-button {
          display: inline-block;
          background: #b68b4c;
          color: white;
          padding: 16px 26px;
          border-radius: 30px;
          margin-top: 18px;
          font-weight: bold;
          font-size: 14px;
        }

        .hero-note {
          margin-top: 25px;
          font-size: 12px;
          color: #806d64;
        }

        .hero-note span {
          color: #b68b4c;
        }

        .hero-decoration {
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: #b87991;
          display: grid;
          place-items: center;
          border: 10px solid white;
          box-shadow: 0 15px 40px #8d526033;
          flex-shrink: 0;
        }

        .hero-circle {
          text-align: center;
          color: white;
          font-family: Georgia, serif;
        }

        .hero-circle span,
        .hero-circle strong,
        .hero-circle small {
          display: block;
        }

        .hero-circle span {
          letter-spacing: 5px;
          font-size: 17px;
        }

        .hero-circle strong {
          font-size: 32px;
          margin: 8px 0;
        }

        .hero-circle small {
          font-family: Arial, sans-serif;
          font-size: 9px;
          letter-spacing: 2px;
        }

        .intro {
          text-align: center;
          padding: 65px 20px 35px;
          max-width: 700px;
          margin: auto;
        }

        h2 {
          font-family: Georgia, serif;
          font-size: clamp(27px, 4vw, 38px);
          margin: 15px 0;
        }

        .intro p,
        .contact > p {
          color: #786b66;
          line-height: 1.8;
          font-size: 14px;
        }

        .shop {
          max-width: 1200px;
          margin: auto;
          padding: 40px 25px 80px;
        }

        .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 30px;
        }

        .product-count {
          color: #a77b39;
          font-size: 11px;
          letter-spacing: 2px;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 25px;
        }

        .product-card {
          background: white;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 5px 22px #40241b0d;
          transition: transform 0.2s;
        }

        .product-card:hover {
          transform: translateY(-5px);
        }

        .product-link {
          display: block;
          color: inherit;
          text-decoration: none;
        }

        .product-image {
          height: 290px;
          position: relative;
          background: #f0e6e1;
          overflow: hidden;
        }

        .product-image img,
        .product-image video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .product-image video {
          background: #000;
        }

        .no-image {
          height: 100%;
          display: grid;
          place-items: center;
          color: #806d64;
          font-size: 13px;
        }

        .product-tag {
          position: absolute;
          top: 13px;
          left: 13px;
          background: white;
          color: #9b713c;
          padding: 7px 10px;
          font-size: 9px;
          letter-spacing: 1px;
          border-radius: 20px;
          font-weight: bold;
          z-index: 2;
        }

        .media-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 50%;
          background: #ffffffdf;
          color: #30201f;
          font-size: 27px;
          line-height: 1;
          cursor: pointer;
          z-index: 3;
        }

        .media-previous {
          left: 10px;
        }

        .media-next {
          right: 10px;
        }

        .media-counter {
          position: absolute;
          right: 10px;
          bottom: 10px;
          background: #30201fdd;
          color: white;
          border-radius: 20px;
          padding: 5px 10px;
          font-size: 11px;
          z-index: 2;
        }

        .product-info {
          padding: 19px;
        }

        .product-info h3 {
          font-family: Georgia, serif;
          font-size: 19px;
          margin: 0 0 10px;
        }

        .price {
          color: #aa8044;
          font-weight: bold;
          font-size: 17px;
          margin: 0 0 12px;
        }

        .view-product {
          display: inline-block;
          color: #b87991;
          font-size: 13px;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .product-actions {
          padding: 0 19px 19px;
        }

        .add-cart-button {
          width: 100%;
          margin-bottom: 10px;
          padding: 13px;
          background: #b87991;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: bold;
          cursor: pointer;
        }

        .order-button {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #30201f;
          color: white;
          padding: 13px 15px;
          border-radius: 8px;
          font-size: 12px;
        }

        .message {
          text-align: center;
          padding: 30px;
          color: #786b66;
        }

        .error {
          color: #b42318;
        }

        .contact {
          text-align: center;
          padding: 65px 20px;
          background: #f4e4e9;
        }

        .phone {
          color: #60464d !important;
          font-weight: bold;
        }

        .footer {
          background: #291e1d;
          color: white;
          text-align: center;
          padding: 40px 15px 20px;
          font-size: 13px;
        }

        .footer-logo {
          color: #d8b77d;
          font-family: Georgia, serif;
          font-size: 22px;
          letter-spacing: 3px;
        }

        .footer p {
          color: #e1d2cc;
        }

        .copyright {
          border-top: 1px solid #594743;
          margin-top: 25px;
          padding-top: 18px;
          color: #bbaaa4;
          font-size: 11px;
        }

        @media (max-width: 750px) {
          .header {
            padding: 13px 15px;
            flex-wrap: wrap;
          }

          nav {
            order: 3;
            width: 100%;
            justify-content: center;
            gap: 20px;
            overflow-x: auto;
          }

          nav a {
            font-size: 12px;
            white-space: nowrap;
          }

          .header-button {
            padding: 11px 15px;
            font-size: 12px;
          }

          .hero {
            padding: 55px 22px;
            flex-direction: column;
            text-align: center;        }
      `}</style>
    </main>
  );
}