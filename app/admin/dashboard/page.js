"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

export default function DashboardPage() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Femme");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Erreur : " + error.message);
      return;
    }

    setProducts(data || []);
  }

  useEffect(() => {
    async function initialize() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user ||
          data.user.id !== "574938b7-bcb1-44c3-b16b-5eb412c68452") {
        router.replace("/admin");
        return;
      }

      setUser(data.user);
      await loadProducts();
    }

    initialize();
  }, []);

  function chooseFile(e) {
    const selected = e.target.files?.[0];

    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      setMessage("Choisis une image.");
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      setMessage("La photo ne doit pas dépasser 5 Mo.");
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setMessage("");
  }

  async function addProduct(e) {
    e.preventDefault();

    if (!name.trim() || !price || !file) {
      setMessage("Remplis le nom, le prix et choisis une photo.");
      return;
    }

    if (!Number.isSafeInteger(Number(price)) || Number(price) <= 0) {
      setMessage("Le prix doit être un nombre entier positif.");
      return;
    }

    setLoading(true);
    setMessage("");

    let uploadedFile = null;

    try {
      const extension = file.name.split(".").pop().toLowerCase();
      const fileName = `${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("martha-produicts")
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      uploadedFile = fileName;

      const { data: publicData } = supabase.storage
        .from("martha-produicts")
        .getPublicUrl(fileName);

      const imageUrl = publicData.publicUrl;

      const slug = name.trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") + "-" + Date.now();

      const { error: insertError } = await supabase
        .from("products")
        .insert([{
          name: name.trim(),
          slug,
          description: description.trim() || null,
          price: Number(price),
          image: imageUrl,
          images: [imageUrl],
          category,
          sizes: [],
          colors: [],
          stock: 50,
          featured: false,
          tag: "NOUVEAU",
        }]);

      if (insertError) throw insertError;

      setMessage("Produit publié avec succès !");
      setName("");
      setPrice("");
      setDescription("");
      setCategory("Femme");
      setFile(null);
      setPreview("");

      await loadProducts();
    } catch (error) {
      if (uploadedFile) {
        await supabase.storage
          .from("martha-produicts")
          .remove([uploadedFile]);
      }

      setMessage("Erreur : " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct(id) {
    if (!window.confirm("Veux-tu supprimer ce produit ?")) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage("Erreur : " + error.message);
      return;
    }

    setMessage("Produit supprimé.");
    await loadProducts();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/admin");
    router.refresh();
  }

  if (!user) {
    return (
      <main style={mainStyle}>
        Vérification de la connexion...
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      <h1 style={{ color: "#9B6B24" }}>MARTHA FASHION</h1>
      <h2>Administration de la boutique</h2>

      <p>{products.length} produits enregistrés</p>

      <button onClick={logout} style={logoutStyle}>
        Déconnexion
      </button>

      <form onSubmit={addProduct} style={formStyle}>
        <h2>Ajouter un produit</h2>

        <label>Photo du produit</label>
        <input
          type="file"
          accept="image/*"
          onChange={chooseFile}
          style={inputStyle}
        />

        {preview && (
          <img
            src={preview}
            alt="Aperçu"
            style={{
              width: "100%",
              maxHeight: 250,
              objectFit: "contain"
            }}
          />
        )}

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du produit"
          style={inputStyle}
        />

        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Prix en FCFA"
          style={inputStyle}
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={inputStyle}
        >
          <option>Femme</option>
          <option>Homme</option>
          <option>Enfant</option>
          <option>Accessoires</option>
        </select>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description du produit"
          style={{ ...inputStyle, minHeight: 100 }}
        />

        <button disabled={loading} style={publishStyle}>
          {loading ? "Publication..." : "Publier le produit"}
        </button>

        {message && <p>{message}</p>}
      </form>

      <h2>Mes produits</h2>

      {products.map((product) => (
        <div key={product.id} style={productStyle}>
          <img
            src={product.image}
            alt={product.name}
            style={{
              width: 75,
              height: 85,
              objectFit: "cover",
              borderRadius: 8
            }}
          />

          <div style={{ flex: 1 }}>
            <strong>{product.name}</strong>
            <p>{product.price} FCFA</p>
          </div>

          <button
            onClick={() => deleteProduct(product.id)}
            style={deleteStyle}
          >
            Supprimer
          </button>
        </div>
      ))}
    </main>
  );
}

const mainStyle = {
  maxWidth: 750,
  margin: "auto",
  padding: 20,
  fontFamily: "Arial",
  background: "#FFFBF5",
  minHeight: "100vh"
};

const formStyle = {
  background: "white",
  padding: 20,
  borderRadius: 15,
  border: "1px solid #eadcc5",
  marginBottom: 30
};

const inputStyle = {
  display: "block",
  width: "100%",
  padding: 13,
  margin: "12px 0",
  border: "1px solid #ddd",
  borderRadius: 8,
  boxSizing: "border-box",
  fontSize: 16
};

const publishStyle = {
  width: "100%",
  padding: 15,
  background: "#9B6B24",
  color: "white",
  border: "none",
  borderRadius: 10,
  fontSize: 16
};

const logoutStyle = {
  padding: 10,
  marginBottom: 20,
  border: "1px solid #9B6B24",
  borderRadius: 8,
  background: "white"
};

const productStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  background: "white",
  padding: 12,
  borderRadius: 12,
  marginBottom: 12
};

const deleteStyle = {
  background: "#ffe5e5",
  border: "none",
  padding: 10,
  borderRadius: 8
};