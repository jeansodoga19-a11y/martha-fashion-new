"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

import {
  saveOfflineProducts,
  getOfflineProducts,
} from "../lib/offline-db";

const PHONE = "22891778843";

function whatsappLink(product) {
  const message = product
    ? `Bonjour Martha Fashion, je souhaite commander : ${product.name}, au prix de ${Number(product.price).toLocaleString("fr-FR")} FCFA.`
    : "Bonjour Martha Fashion, je souhaite découvrir vos créations.";

  return `https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`;
}

function getProductMedia(product) {
  const images = Array.isArray(product.images) ? product.images : [];
  const videos = Array.isArray(product.videos) ? product.videos : [];

  const imageItems = images
    .map((item) => typeof item === "string" ? item : item?.url)
    .filter(Boolean)
    .map((url) => ({ type: "image", url }));

  const videoItems = videos
    .map((item) => typeof item === "string" ? item : item?.url)
    .filter(Boolean)
    .map((url) => ({ type: "video", url }));

  const allMedia = [...imageItems, ...videoItems];

  if (allMedia.length === 0 && product.image) {
    allMedia.push({ type: "image", url: product.image });
  }

  return allMedia;
}

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
    <div className="product-media">
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
        <div className="no-image">Photo indisponible</div>
      )}

      {product.tag && (
        <span className="product-tag">{product.tag}</span>
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
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        setIsOffline(!navigator.onLine);

        const offlineProducts = await getOfflineProducts();

        if (active && offlineProducts?.length > 0) {
          setProducts(offlineProducts);
          setLoading(false);
        }

        if (!navigator.onLine) {
          if (active && (!offlineProducts || offlineProducts.length === 0)) {
            setError("Aucun produit enregistré. Connectez-vous à Internet pour charger le catalogue.");
          }
          return;
        }

        const { data, error: supabaseError } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });

        if (supabaseError) throw supabaseError;

        if (active && data) {
          setProducts(data);
          setError("");
          await saveOfflineProducts(data);
        }
      } catch (err) {
        console.error("Erreur de chargement :", err);
        if (active && products.length === 0) {
          setError("Impossible de charger les produits. Vérifiez votre connexion Internet.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProducts();

    function handleOnline() {
      setIsOffline(false);
      loadProducts();
    }

    function handleOffline() {
      setIsOffline(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    try {
      const savedCart = JSON.parse(
        localStorage.getItem("martha-cart") || "[]"
      );
      const count = savedCart.reduce(
        (total, item) => total + Number(item.quantity || 1),
        0
      );
      setCartCount(count);
    } catch (err) {
      console.error("Erreur de lecture du panier :", err);
    }

    return () => {
      active = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  function addToCart(product) {
    try {
      const savedCart = JSON.parse(
        localStorage.getItem("martha-cart") || "[]"
      );

      const existingIndex = savedCart.findIndex(
        (item) => item.id === product.id
      );

      if (existingIndex >= 0) {
        savedCart[existingIndex].quantity =
          Number(savedCart[existingIndex].quantity || 1) + 1;
      } else {
        savedCart.push({
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: 1,
        });
      }

      localStorage.setItem("martha-cart", JSON.stringify(savedCart));

      setCartCount(
        savedCart.reduce(
          (total, item) => total + Number(item.quantity || 1),
          0
        )
      );

      alert("Produit ajouté au panier !");
    } catch (err) {
      console.error("Erreur panier :", err);
      alert("Impossible d'ajouter ce produit au panier.");
    }
  }

  return (
    <>
      <style jsx global>{styles}</style>
      <div className="site-container">
        <header className="header">
          <Link href="/" className="logo">
            <span className="logo-icon">M</span>
            <span>
              <strong>MARTHA FASHION</strong>
              <small>Mode & Créations</small>
            </span>
          </Link>

          <nav>
            <Link href="/">Accueil</Link>
            <a href="#boutique">Boutique</a>
            <a href="#contact">Contact</a>
          </nav>

          <Link href="/cart" className="header-button">
            Panier ({cartCount})
          </Link>
        </header>

        {isOffline && (
          <div className="offline-banner">
            Vous êtes hors connexion. Catalogue enregistré disponible.
          </div>
        )}

        <main>
          <section className="hero">
            <div className="hero-content">
              <span className="eyebrow">L&rsquo;élégance africaine</span>
              <h1>Votre style, notre passion.</h1>
              <p>
                Découvrez les créations Martha Fashion et affirmez votre
                élégance avec des tenues uniques.
              </p>
              <a href="#boutique" className="primary-button">
                Découvrir la boutique
              </a>
            </div>

            <div className="hero-decoration">
              <span>MF</span>
              <p>Élégance • Style • Créativité</p>
            </div>
          </section>

          <section className="intro">
            <span className="eyebrow">Bienvenue chez nous</span>
            <h2>MARTHA FASHION</h2>
            <p>
              Des créations inspirées de la richesse des tissus africains,
              pensées pour révéler votre personnalité.
            </p>
          </section>

          <section className="shop-section" id="boutique">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Notre collection</span>
                <h2>Nos créations</h2>
              </div>

              <span className="product-count">
                {products.length} produit(s)
              </span>
            </div>

            {loading && (
              <p className="status-message">Chargement des créations...</p>
            )}

            {!loading && error && (
              <p className="status-message error-message">{error}</p>
            )}

            {!loading && !error && products.length === 0 && (
              <p className="status-message">
                Aucun produit disponible pour le moment.
              </p>
            )}

            <div className="products-grid">
              {products.map((product) => (
                <article className="product-card" key={product.id}>
                  <ProductMedia product={product} />

                  <div className="product-info">
                    <span className="product-category">
                      {product.category || "Collection"}
                    </span>

                    <h3>{product.name}</h3>

                    {product.description && (
                      <p className="product-description">
                        {product.description}
                      </p>
                    )}

                    <div className="product-price">
                      {Number(product.price).toLocaleString("fr-FR")} FCFA
                    </div>

                    {product.old_price > 0 && (
                      <div className="old-price">
                        {Number(product.old_price).toLocaleString("fr-FR")} FCFA
                      </div>
                    )}

                    <button
                      className="primary-button add-cart-button"
                      onClick={() => addToCart(product)}
                    >
                      Ajouter au panier
                    </button>

                    <a
                      className="whatsapp-button"
                      href={whatsappLink(product)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Commander sur WhatsApp
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="contact-section" id="contact">
            <span className="eyebrow">Restons en contact</span>
            <h2>Une création vous intéresse ?</h2>
            <p>
              Contactez Martha Fashion pour vos commandes et renseignements.
            </p>

            <a
              href={whatsappLink(null)}
              target="_blank"
              rel="noopener noreferrer"
              className="primary-button"
            >
              Nous contacter sur WhatsApp
            </a>
          </section>
        </main>

        <footer className="footer">
          <div>
            <strong>MARTHA FASHION</strong>
            <p>Mode & Créations</p>
          </div>

          <p>Lomé - Djagblé, Togo</p>

          <p>Appel et WhatsApp : +228 91 77 88 43</p>

          <p>
            Instagram :{" "}
            <a
              href="https://www.instagram.com/martha.fashion/"
              target="_blank"
              rel="noopener noreferrer"
            >
              @martha.fashion
            </a>
          </p>

          <p className="copyright">
            © {new Date().getFullYear()} Martha Fashion. Tous droits réservés.
          </p>
        </footer>
      </div>
    </>
  );
}

const styles = `
* {
  box-sizing: border-box;
}
html {
  scroll-behavior: smooth;
}
body {
  margin: 0;
  background: #fffaf6;
  color: #33272c;
  font-family: Arial, sans-serif;
}
a {
  text-decoration: none;
  color: inherit;
}
button {
  font: inherit;
  cursor: pointer;
}
.site-container {
  width: 100%;
  overflow: hidden;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 18px 6%;
  background: white;
  border-bottom: 1px solid #f0e5e8;
}
.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}
.logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  background: #b87991;
  color: white;
  font-size: 23px;
  font-weight: bold;
}
.logo strong,
.logo small {
  display: block;
}
.logo strong {
  font-size: 15px;
  letter-spacing: 1px;
}
.logo small {
  margin-top: 4px;
  color: #987b86;
}
.header nav {
  display: flex;
  gap: 30px;
  font-size: 14px;
}
.header nav a:hover {
  color: #b87991;
}
.header-button,
.primary-button,
.whatsapp-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 7px;
  padding: 13px 20px;
  font-weight: bold;
  transition: 0.2s;
}
.header-button,
.primary-button {
  background: #b68b4c;
  color: white;
}
.header-button:hover,
.primary-button:hover {
  background: #956d36;
}
.offline-banner {
  padding: 12px;
  background: #fff0d8;
  color: #76521e;
  text-align: center;
  font-size: 13px;
}
.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  min-height: 430px;
  padding: 70px 8%;
  background: linear-gradient(120deg, #f6e9ed, #fffaf6);
}
.hero-content {
  max-width: 570px;
}
.eyebrow {
  color: #b68b4c;
  font-size: 12px;
  font-weight: bold;
  letter-spacing: 2px;
  text-transform: uppercase;
}
.hero h1 {
  margin: 18px 0;
  font-family: Georgia, serif;
  font-size: clamp(38px, 6vw, 65px);
  line-height: 1.1;
}
.hero-content p,
.intro p,
.contact-section p {
  color: #76666c;
  line-height: 1.8;
}
.hero-decoration {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 270px;
  height: 270px;
  flex-shrink: 0;
  border: 1px solid #b68b4c;
  border-radius: 50%;
  color: #b87991;
}
.hero-decoration span {
  font-family: Georgia, serif;
  font-size: 95px;
}
.hero-decoration p {
  color: #8b6d78;
  font-size: 11px;
  letter-spacing: 1px;
}
.intro,
.contact-section {
  max-width: 800px;
  margin: auto;
  padding: 75px 25px;
  text-align: center;
}
.intro h2,
.section-heading h2,
.contact-section h2 {
  margin: 12px 0;
  font-family: Georgia, serif;
  font-size: 34px;
}
.shop-section {
  padding: 50px 6% 80px;
  background: white;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 30px;
}
.product-count {
  color: #987b86;
  font-size: 13px;
}
.products-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 25px;
}
.product-card {
  overflow: hidden;
  border: 1px solid #f0e5e8;
  border-radius: 12px;
  background: white;
  box-shadow: 0 5px 20px rgba(70, 40, 50, 0.05);
}
.product-media {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  background: #f5edf0;
}
.product-media img,
.product-media video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.no-image {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 280px;
  color: #987b86;
  font-size: 14px;
}
.media-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 35px;
  height: 35px;
  border: 0;
  border-radius: 50%;
  background: white;
  color: #5a3e49;
  font-size: 20px;
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  z-index: 2;
}
.media-previous {
  left: 10px;
}
.media-next {
  right: 10px;
}
.media-counter {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 10px;
  border-radius: 20px;
  background: rgba(255,255,255,0.9);
  font-size: 12px;
}
.product-tag {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 6px 10px;
  border-radius: 20px;
  background: #b87991;
  color: white;
  font-size: 11px;
  z-index: 2;
}
.product-info {
  padding: 20px;
}
.product-category {
  color: #b68b4c;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.product-info h3 {
  margin: 9px 0;
  font-family: Georgia, serif;
  font-size: 20px;
}
.product-description {
  color: #82747a;
  font-size: 13px;
  line-height: 1.6;
}
.product-price {
  margin: 15px 0 5px;
  color: #a36f82;
  font-size: 19px;
  font-weight: bold;
}
.old-price {
  color: #999;
  font-size: 13px;
  text-decoration: line-through;
}
.add-cart-button,
.whatsapp-button {
  width: 100%;
  margin-top: 10px;
}
.whatsapp-button {
  border: 1px solid #278b58;
  background: white;
  color: #278b58;
  font-size: 13px;
}
.whatsapp-button:hover {
  background: #278b58;
  color: white;
}
.status-message {
  padding: 20px;
  color: #76666c;
  text-align: center;
}
.error-message {
  color: #b23b45;
}
.contact-section {
  padding-top: 80px;
  padding-bottom: 80px;
}
.footer {
  padding: 40px 6%;
  background: #382a31;
  color: white;
  text-align: center;
  line-height: 1.8;
}
.footer strong {
  color: #e0bd81;
  letter-spacing: 2px;
}
.footer a {
  color: #e0bd81;
}
.copyright {
  margin-top: 25px;
  color: #c6b8be;
  font-size: 12px;
}
@media (max-width: 850px) {
  .products-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .hero {
    padding: 55px 5%;
  }
  .hero-decoration {
    width: 210px;
    height: 210px;
  }
  .hero-decoration span {
    font-size: 75px;
  }
}
@media (max-width: 600px) {
  .header {
    flex-wrap: wrap;
    padding: 14px 15px;
  }
  .header nav {
    order: 3;
    width: 100%;
    justify-content: center;
    gap: 20px;
    overflow-x: auto;
  }
  .header nav a {
    font-size: 12px;
    white-space: nowrap;
  }
  .header-button {
    padding: 10px 13px;
    font-size: 12px;
  }
  .hero {
    flex-direction: column;
    text-align: center;
  }
  .hero-decoration {
    width: 180px;
    height: 180px;
  }
  .hero-decoration span {
    font-size: 65px;
  }
  .products-grid {
    grid-template-columns: 1fr;
  }
  .shop-section {
    padding: 40px 15px;
  }
  .section-heading h2 {
    font-size: 27px;
  }
  .intro h2,
  .contact-section h2 {
    font-size: 28px;
  }
}
`;