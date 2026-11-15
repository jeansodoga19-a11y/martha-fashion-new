"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

const BUCKET = "martha-produicts";
const ADMIN_UID = "574938b7-bcb1-44c3-b16b-5eb412c68452";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MIN_VIDEO_SIZE = 3 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const CATEGORIES = ["Femme", "Homme", "Enfant", "Accessoires"];

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

  const [imagePreviews, setImagePreviews] = useState([]);
  const [videoPreviews, setVideoPreviews] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Charger les produits depuis Supabase
  const loadProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Erreur de chargement : " + error.message);
      return false;
    }

    setProducts(data || []);
    return true;
  }, [supabase]);

  // Vérifier l'administrateur
  useEffect(() => {
    let active = true;

    async function initialize() {
      const { data, error } = await supabase.auth.getUser();

      if (!active) return;

      if (error || !data.user || data.user.id !== ADMIN_UID) {
        router.replace("/admin");
        return;
      }

      setUser(data.user);
      await loadProducts();
    }

    initialize();

    return () => {
      active = false;
    };
  }, [supabase, router, loadProducts]);

  // Normaliser les anciennes et nouvelles données média
  function normalizeMedia(value) {
    if (!Array.isArray(value)) return [];

    return value
      .map((item) => {
        if (typeof item === "string") return item;
        return item?.url || null;
      })
      .filter(Boolean);
  }

  // Prévisualiser les nouveaux fichiers sans créer de liens à chaque rendu
  useEffect(() => {
    const urls = imageFiles.map((file) =>
      URL.createObjectURL(file)
    );

    setImagePreviews(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageFiles]);

  useEffect(() => {
    const urls = videoFiles.map((file) =>
      URL.createObjectURL(file)
    );

    setVideoPreviews(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [videoFiles]);

  // Sélection des photos
  function chooseImages(e) {
    const selected = Array.from(e.target.files || []);

    if (selected.some((file) => !file.type.startsWith("image/"))) {
      setMessage("Sélectionne uniquement des photos.");
      e.target.value = "";
      return;
    }

    if (selected.some((file) => file.size > MAX_IMAGE_SIZE)) {
      setMessage("Chaque photo doit faire 5 Mo maximum.");
      e.target.value = "";
      return;
    }

    setImageFiles((previous) => [...previous, ...selected]);
    setMessage("");
    e.target.value = "";
  }

  // Sélection des vidéos
  function chooseVideos(e) {
    const selected = Array.from(e.target.files || []);

    if (selected.some((file) => !file.type.startsWith("video/"))) {
      setMessage("Sélectionne uniquement des vidéos.");
      e.target.value = "";
      return;
    }

    if (selected.some((file) => file.size < MIN_VIDEO_SIZE)) {
      setMessage("Chaque vidéo doit faire au moins 3 Mo.");
      e.target.value = "";
      return;
    }

    if (selected.some((file) => file.size > MAX_VIDEO_SIZE)) {
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

  // Retrouver le chemin d'un fichier dans Supabase Storage
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

  // Envoyer les fichiers dans Supabase Storage
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
          cacheControl: "3600",
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

  // Nettoyer uniquement les fichiers nouvellement envoyés
  async function cleanupUploaded(files) {
    if (!files.length) return;

    const { error } = await supabase.storage
      .from(BUCKET)
      .remove(files);

    if (error) {
      console.error("Nettoyage Storage impossible :", error);
    }
  }

  // Réinitialiser le formulaire
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
    setMessage("");
  }

  // Préparer la modification d'un produit
  function editProduct(product) {
    setEditingId(product.id);

    setName(product.name || "");
    setPrice(String(product.price ?? ""));
    setDescription(product.description || "");
    setCategory(
      CATEGORIES.includes(product.category)
        ? product.category
        : "Femme"
    );

    const oldImages = normalizeMedia(
      product.images?.length
        ? product.images
        : [product.image]
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

  // Enregistrer ou modifier un produit
  async function saveProduct(e) {
    e.preventDefault();

    if (loading) return;

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
    setMessage("Enregistrement en cours...");

    const uploadedFiles = [];
    let databaseSaved = false;

    try {
      // Envoyer les nouvelles photos
      const newImages = await uploadFiles(
        imageFiles,
        "images",
        uploadedFiles
      );

      // Envoyer les nouvelles vidéos
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
        category,
        image: finalImages[0],
        images: finalImages,
        videos: finalVideos,
      };

      if (editingId) {
        const currentProduct = products.find(
          (product) => product.id === editingId
        );

        if (!currentProduct) {
          throw new Error("Produit introuvable.");
        }

        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingId);

        if (error) throw error;

        databaseSaved = true;

        // Identifier les anciens fichiers qui ne sont plus utilisés
        const oldMedia = [
          ...normalizeMedia(currentProduct.images),
          currentProduct.image,
          ...normalizeMedia(currentProduct.videos),
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

        let warning = "";

        if (removedPaths.length) {
          const { error: removeError } = await supabase.storage
            .from(BUCKET)
            .remove(removedPaths);

          if (removeError) {
            console.error(removeError);
            warning =
              " Attention : certains anciens médias n'ont pas été supprimés.";
          }
        }

        resetForm();
        await loadProducts();

        setMessage(
          "Produit modifié avec succès !" + warning
        );

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

        databaseSaved = true;

        resetForm();
        await loadProducts();

        setMessage("Produit publié avec succès !");
      }

    } catch (error) {
      // Ne jamais supprimer les fichiers déjà associés
      // à un produit enregistré avec succès
      if (!databaseSaved) {
        await cleanupUploaded(uploadedFiles);
      }

      setMessage("Erreur : " + error.message);

    } finally {
      setLoading(false);
    }
  }

  // Supprimer un produit
  async function deleteProduct(product) {
    if (loading) return;

    const confirmed = window.confirm(
      `Supprimer définitivement ${product.name} ?`
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage("Suppression en cours...");

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      if (error) throw error;

      // Le produit est supprimé de la base.
      // On nettoie ensuite ses fichiers.
      const allMedia = [
        ...normalizeMedia(product.images),
        product.image,
        ...normalizeMedia(product.videos),
      ].filter(Boolean);

      const paths = [
        ...new Set(
          allMedia.map(getStoragePath).filter(Boolean)
        ),
      ];

      let warning = "";

      if (paths.length) {
        const { error: removeError } = await supabase.storage
          .from(BUCKET)
          .remove(paths);

        if (removeError) {
          console.error(removeError);
          warning =
            " Attention : certains fichiers restent dans Storage.";
        }
      }

      if (editingId === product.id) {
        resetForm();
      }

      await loadProducts();

      setMessage("Produit supprimé." + warning);

    } catch (error) {
      setMessage("Erreur : " + error.message);

    } finally {
      setLoading(false);
    }
  }

  // Déconnexion
  async function logout() {
    if (loading) return;

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

      <button
        type="button"
        onClick={logout}
        disabled={loading}
        style={logoutStyle}
      >
        Déconnexion
      </button>

      <form onSubmit={saveProduct} style={formStyle}>
        <h2>
          {editingId
            ? "Modifier le produit"
            : "Ajouter un produit"}
        </h2>

        <label>
          Photos du produit (5 Mo maximum chacune)
        </label>

        <input
          type="file"
          accept="image/*"
          multiple
          disabled={loading}
          onChange={chooseImages}
          style={inputStyle}
        />

        <div style={mediaGridStyle}>
          {images.map((url, index) => (
            <div key={url} style={mediaItemStyle}>
              <img
                src={url}
                alt="Photo produit"
                style={mediaStyle}
              />

              <button
                type="button"
                disabled={loading}
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
            <div key={`${file.name}-${index}`} style={mediaItemStyle}>
              <img
                src={imagePreviews[index]}
                alt="Nouvelle photo"
                style={mediaStyle}
              />

              <button
                type="button"
                disabled={loading}
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
          disabled={loading}
          onChange={chooseVideos}
          style={inputStyle}
        />

        {videos.map((url, index) => (
          <div key={url} style={videoItemStyle}>
            <video
              src={url}
              controls
              preload="metadata"
              style={{
                width: "100%",
                maxHeight: 220,
              }}
            />

            <button
              type="button"
              disabled={loading}
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
          <div key={`${file.name}-${index}`} style={videoItemStyle}>
            <video
              src={videoPreviews[index]}
              controls
              preload="metadata"
              style={{
                width: "100%",
                maxHeight: 220,
              }}
            />

            <p>
              {file.name} (
              {(file.size / 1024 / 1024).toFixed(1)} Mo)
            </p>

            <button
              type="button"
              disabled={loading}
              onClick={() => removeNewVideo(index)}
              style={smallDeleteStyle}
            >
              Retirer
            </button>
          </div>
        ))}

        <label>Nom du produit</label>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du produit"
          disabled={loading}
          style={inputStyle}
        />

        <label>Prix en FCFA</label>

        <input
          type="number"
          min="1"
          step="1"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Prix en FCFA"
          disabled={loading}
          style={inputStyle}
        />

        <label>Catégorie</label>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={loading}
          style={inputStyle}
        >
          {CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <label>Description</label>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description du produit"
          disabled={loading}
          style={{
            ...inputStyle,
            minHeight: 100,
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            ...publishStyle,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading
            ? "Enregistrement..."
            : editingId
              ? "Enregistrer les modifications"
              : "Publier le produit"}
        </button>

        {editingId && (
          <button
            type="button"
            disabled={loading}
            onClick={resetForm}
            style={logoutStyle}
          >
            Annuler la modification
          </button>
        )}

        {message && (
          <p
            role="status"
            style={{
              padding: 10,
              background: "#fff4e5",
              borderRadius: 8,
              overflowWrap: "anywhere",
            }}
          >
            {message}
          </p>
        )}
      </form>

      <h2>Mes produits</h2>

      {products.length === 0 && (
        <p>Aucun produit enregistré.</p>
      )}

      {products.map((product) => (
        <div key={product.id} style={productStyle}>
          <img
            src={product.image}
            alt={product.name}
            style={productImageStyle}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>{product.name}</strong>

            <p>
              {Number(product.price).toLocaleString("fr-FR")} FCFA
            </p>

            <p>
              {normalizeMedia(
                product.images?.length
                  ? product.images
                  : [product.image]
              ).length}{" "}
              photos ·{" "}
              {normalizeMedia(product.videos).length} vidéos
            </p>

            <button
              type="button"
              disabled={loading}
              onClick={() => editProduct(product)}
              style={editStyle}
            >
              Modifier
            </button>

            <button
              type="button"
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

// STYLES


const mainStyle = {
  maxWidth: 750,
  margin: "auto",
  padding: 20,
  fontFamily: "Arial, sans-serif",
  background: "#FFFBF5",
  minHeight: "100vh",
  boxSizing: "border-box",
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
  cursor: "pointer",
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
  overflow: "hidden",
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