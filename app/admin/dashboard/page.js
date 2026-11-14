"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

const BUCKET = "martha-produicts";
const ADMIN_UID = "574938b7-bcb1-44c3-b16b-5eb412c68452";

export default function DashboardPage() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Femme");

  const [imageFiles, setImageFiles] = useState([]);
  const [videoFiles, setVideoFiles] = useState([]);

  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);

  const [editingId, setEditingId] = useState(null);
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

      if (
        error ||
        !data.user ||
        data.user.id !== ADMIN_UID
      ) {
        router.replace("/admin");
        return;
      }

      setUser(data.user);
      await loadProducts();
    }

    initialize();
  }, []);

  function normalizeMedia(value) {
    if (!Array.isArray(value)) return [];

    return value
      .map((item) => {
        if (typeof item === "string") return item;
        return item?.url || null;
      })
      .filter(Boolean);
  }

  function chooseImages(e) {
    const selected = Array.from(e.target.files || []);

    if (selected.some((file) => !file.type.startsWith("image/"))) {
      setMessage("Sélectionne uniquement des photos.");
      e.target.value = "";
      return;
    }

    if (selected.some((file) => file.size > 5 * 1024 * 1024)) {
      setMessage("Chaque photo doit faire 5 Mo maximum.");
      e.target.value = "";
      return;
    }

    setImageFiles((previous) => [...previous, ...selected]);
    setMessage("");
    e.target.value = "";
  }

  function chooseVideos(e) {
    const selected = Array.from(e.target.files || []);

    if (selected.some((file) => !file.type.startsWith("video/"))) {
      setMessage("Sélectionne uniquement des vidéos.");
      e.target.value = "";
      return;
    }

    if (selected.some((file) => file.size < 3 * 1024 * 1024)) {
      setMessage("Chaque vidéo doit faire au moins 3 Mo.");
      e.target.value = "";
      return;
    }

    if (selected.some((file) => file.size > 50 * 1024 * 1024)) {
      setMessage("Chaque vidéo doit faire 50 Mo maximum.");
      e.target.value = "";
      return;
    }

    setVideoFiles((previous) => [...previous, ...selected]);
    setMessage("");
    e.target.value = "";
  }

  function removeNewImage(index) {
    setImageFiles((previous) =>
      previous.filter((_, i) => i !== index)
    );
  }

  function removeNewVideo(index) {
    setVideoFiles((previous) =>
      previous.filter((_, i) => i !== index)
    );
  }

  function getStoragePath(url) {
    if (!url) return null;

    try {
      const pathname = new URL(url).pathname;
      const marker = `/object/public/${BUCKET}/`;
      const index = pathname.indexOf(marker);

      if (index === -1) return null;

      return decodeURIComponent(
        pathname.slice(index + marker.length)
      );
    } catch {
      return null;
    }
  }

  async function uploadFiles(files, folder, uploadedFiles) {
    const urls = [];

    for (const file of files) {
      const extension = file.name.split(".").pop().toLowerCase();

      const fileName =
        `${folder}/${crypto.randomUUID()}.${extension}`;

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (error) throw error;

      uploadedFiles.push(fileName);

      const { data } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(fileName);

      urls.push(data.publicUrl);
    }

    return urls;
  }

  async function cleanupUploaded(files) {
    if (!files.length) return;

    await supabase.storage.from(BUCKET).remove(files);
  }

  function resetForm() {
    setName("");
    setPrice("");
    setDescription("");
    setCategory("Femme");

    setImageFiles([]);
    setVideoFiles([]);

    setImages([]);
    setVideos([]);

    setEditingId(null);
  }

  function editProduct(product) {
    setEditingId(product.id);

    setName(product.name || "");
    setPrice(String(product.price || ""));
    setDescription(product.description || "");
    setCategory(product.category || "Femme");

    const oldImages = normalizeMedia(
      product.images?.length ? product.images : [product.image]
    );

    setImages(oldImages);
    setVideos(normalizeMedia(product.videos));

    setImageFiles([]);
    setVideoFiles([]);

    setMessage("Modification du produit : " + product.name);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveProduct(e) {
    e.preventDefault();

    if (!name.trim() || !price) {
      setMessage("Remplis le nom et le prix.");
      return;
    }

    if (
      !Number.isSafeInteger(Number(price)) ||
      Number(price) <= 0
    ) {
      setMessage("Le prix doit être un nombre entier positif.");
      return;
    }

    if (images.length === 0 && imageFiles.length === 0) {
      setMessage("Ajoute au moins une photo.");
      return;
    }

    setLoading(true);
    setMessage("");

    const uploadedFiles = [];

    try {
      const newImages = await uploadFiles(
        imageFiles,
        "images",
        uploadedFiles
      );

      const newVideos = await uploadFiles(
        videoFiles,
        "videos",
        uploadedFiles
      );

      const finalImages = [...images, ...newImages];
      const finalVideos = [...videos, ...newVideos];

      const productData = {
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price),
        image: finalImages[0],
        images: finalImages,
        videos: finalVideos,
        category,
      };

      if (editingId) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingId);

        if (error) throw error;

        const currentProduct = products.find(
          (product) => product.id === editingId
        );

        const oldMedia = [
          ...normalizeMedia(currentProduct?.images),
          currentProduct?.image,
          ...normalizeMedia(currentProduct?.videos),
        ].filter(Boolean);

        const retainedMedia = [
          ...finalImages,
          ...finalVideos,
        ];

        const removedPaths = [
          ...new Set(
            oldMedia
              .filter((url) => !retainedMedia.includes(url))
              .map(getStoragePath)
              .filter(Boolean)
          ),
        ];

        if (removedPaths.length) {
          const { error: removeError } = await supabase.storage
            .from(BUCKET)
            .remove(removedPaths);

          if (removeError) {
            setMessage(
              "Produit modifié, mais certains anciens fichiers restent dans Storage."
            );
          }
        }

        if (!message.startsWith("Produit modifié")) {
          setMessage("Produit modifié avec succès !");
        }
      } else {
        const slug =
          name.trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") +
          "-" +
          Date.now();

        const { error } = await supabase
          .from("products")
          .insert([{
            ...productData,
            slug,
            sizes: [],
            colors: [],
            stock: 50,
            featured: false,
            tag: "NOUVEAU",
          }]);

        if (error) throw error;

        setMessage("Produit publié avec succès !");
      }

      resetForm();
      await loadProducts();

    } catch (error) {
      await cleanupUploaded(uploadedFiles);

      setMessage("Erreur : " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct(product) {
    if (
      !window.confirm(
        `Supprimer définitivement ${product.name} ?`
      )
    ) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      if (error) throw error;

      const allMedia = [
        ...normalizeMedia(product.images),
        product.image,
        ...normalizeMedia(product.videos),
      ].filter(Boolean);

      const paths = [
        ...new Set(allMedia.map(getStoragePath).filter(Boolean)),
      ];

      let warning = "";

      if (paths.length) {
        const { error: removeError } = await supabase.storage
          .from(BUCKET)
          .remove(paths);

        if (removeError) {
          warning = " Attention : certains fichiers restent dans Storage.";
        }
      }

      if (editingId === product.id) resetForm();

      setMessage("Produit supprimé." + warning);
      await loadProducts();

    } catch (error) {
      setMessage("Erreur : " + error.message);
    } finally {
      setLoading(false);
    }
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
      <h1 style={{ color: "#9B6B24" }}>
        MARTHA FASHION
      </h1>

      <h2>Administration de la boutique</h2>

      <p>{products.length} produits enregistrés</p>

      <button onClick={logout} style={logoutStyle}>
        Déconnexion
      </button>

      <form onSubmit={saveProduct} style={formStyle}>
        <h2>
          {editingId ? "Modifier le produit" : "Ajouter un produit"}
        </h2>

        <label>Photos du produit (5 Mo maximum chacune)</label>

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={chooseImages}
          style={inputStyle}
        />

        <div style={mediaGridStyle}>
          {images.map((url, index) => (
            <div key={url} style={mediaItemStyle}>
              <img src={url} alt="Photo produit" style={mediaStyle} />
              <button
                type="button"
                onClick={() =>
                  setImages((previous) =>
                    previous.filter((_, i) => i !== index)
                  )
                }
                style={smallDeleteStyle}
              >
                Retirer
              </button>
            </div>
          ))}

          {imageFiles.map((file, index) => (
            <div key={index} style={mediaItemStyle}>
              <img
                src={URL.createObjectURL(file)}
                alt="Nouvelle photo"
                style={mediaStyle}
              />
              <button
                type="button"
                onClick={() => removeNewImage(index)}
                style={smallDeleteStyle}
              >
                Retirer
              </button>
            </div>
          ))}
        </div>

        <label>
          Vidéos du produit (3 Mo minimum, 50 Mo maximum chacune)
        </label>

        <input
          type="file"
          accept="video/*"
          multiple
          onChange={chooseVideos}
          style={inputStyle}
        />

        {videos.map((url, index) => (
          <div key={url} style={videoItemStyle}>
            <video
              src={url}
              controls
              style={{ width: "100%", maxHeight: 220 }}
            />

            <button
              type="button"
              onClick={() =>
                setVideos((previous) =>
                  previous.filter((_, i) => i !== index)
                )
              }
              style={smallDeleteStyle}
            >
              Retirer cette vidéo
            </button>
          </div>
        ))}

        {videoFiles.map((file, index) => (
          <div key={index} style={videoItemStyle}>
            <p>{file.name} ({(file.size / 1024 / 1024).toFixed(1)} Mo)</p>

            <button
              type="button"
              onClick={() => removeNewVideo(index)}
              style={smallDeleteStyle}
            >
              Retirer
            </button>
          </div>
        ))}

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
          {loading
            ? "Enregistrement..."
            : editingId
              ? "Enregistrer les modifications"
              : "Publier le produit"}
        </button>

        {editingId && (
          <button
            type="button"
            onClick={resetForm}
            style={logoutStyle}
          >
            Annuler la modification
          </button>
        )}

        {message && <p>{message}</p>}
      </form>

      <h2>Mes produits</h2>

      {products.map((product) => (
        <div key={product.id} style={productStyle}>
          <img
            src={product.image}
            alt={product.name}
            style={productImageStyle}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>{product.name}</strong>
            <p>{product.price} FCFA</p>
            <p>
              {normalizeMedia(product.images).length} photos ·{" "}
              {normalizeMedia(product.videos).length} vidéos
            </p>

            <button
              onClick={() => editProduct(product)}
              style={editStyle}
            >
              Modifier
            </button>

            <button
              disabled={loading}
              onClick={() => deleteProduct(product)}
              style={deleteStyle}
            >
              Supprimer
            </button>
          </div>
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
  minHeight: "100vh",
};

const formStyle = {
  background: "white",
  padding: 20,
  borderRadius: 15,
  border: "1px solid #eadcc5",
  marginBottom: 30,
};

const inputStyle = {
  display: "block",
  width: "100%",
  padding: 13,
  margin: "12px 0",
  border: "1px solid #ddd",
  borderRadius: 8,
  boxSizing: "border-box",
  fontSize: 16,
};

const publishStyle = {
  width: "100%",
  padding: 15,
  background: "#9B6B24",
  color: "white",
  border: "none",
  borderRadius: 10,
  fontSize: 16,
  cursor: "pointer",
};

const logoutStyle = {
  padding: 10,
  marginBottom: 20,
  border: "1px solid #9B6B24",
  borderRadius: 8,
  background: "white",
};

const productStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  background: "white",
  padding: 12,
  borderRadius: 12,
  marginBottom: 12,
  flexWrap: "wrap",
};

const productImageStyle = {
  width: 75,
  height: 85,
  objectFit: "cover",
  borderRadius: 8,
};

const mediaGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
  gap: 10,
  margin: "15px 0",
};

const mediaItemStyle = {
  minWidth: 0,
};

const mediaStyle = {
  width: "100%",
  height: 130,
  objectFit: "cover",
  borderRadius: 8,
};

const videoItemStyle = {
  background: "#fffaf6",
  padding: 10,
  margin: "10px 0",
  borderRadius: 8,
};

const smallDeleteStyle = {
  width: "100%",
  padding: 8,
  marginTop: 5,
  border: "none",
  borderRadius: 6,
  background: "#ffe5e5",
  cursor: "pointer",
};

const editStyle = {
  background: "#f5e6c9",
  border: "none",
  padding: 10,
  borderRadius: 8,
  marginRight: 8,
  cursor: "pointer",
};

const deleteStyle = {
  background: "#ffe5e5",
  border: "none",
  padding: 10,
  borderRadius: 8,
  cursor: "pointer",
};