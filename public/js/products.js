(() => {
  const socket = io();
  
  // UI
  const body = document.getElementById("productsBody");
  const form = document.getElementById("productForm");
  const reloadBtn = document.getElementById("reloadBtn");
  const queryInput = document.getElementById("queryInput");
  const sortSelect = document.getElementById("sortSelect");
  const limitInput = document.getElementById("limitInput");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const pageInfo = document.getElementById("pageInfo");
  // Edit UI
  const editSection = document.getElementById("editSection");
  const editForm = document.getElementById("editForm");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const editId = document.getElementById("editProductId");
  const editTitle = document.getElementById("editTitle");
  const editDescription = document.getElementById("editDescription");
  const editCode = document.getElementById("editCode");
  const editPrice = document.getElementById("editPrice");
  const editStock = document.getElementById("editStock");
  const editCategory = document.getElementById("editCategory");
  const editThumbnails = document.getElementById("editThumbnails");

  // Cargado desde views/products.handlebars usando <script src="/js/products.js"></script>

  // Estado
  let state = {
    page: 1,
    limit: Number(limitInput.value) || 10,
    sort: "",
    query: ""
  };

  // Helpers
  function buildQuery() {
    const p = new URLSearchParams();
    p.set("page", state.page);
    p.set("limit", state.limit);
    if (state.sort) p.set("sort", state.sort);
    if (state.query) p.set("query", state.query);
    return p.toString();
  }

  async function loadProducts() {
    const qs = buildQuery();
    const res = await fetch(`/api/products?${qs}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || "Error al cargar productos");
      return;
    }
    const data = await res.json();
    renderTable(data.payload);
    renderPagination(data);
  }

  function renderTable(products) {
    body.innerHTML = products.map(p => `
      <tr data-id="${p._id}">
        <td>${p._id}</td>
        <td>${p.title}</td>
        <td>$${p.price}</td>
        <td>${p.stock}</td>
        <td>${p.category}</td>
        <td>
          <button class="editBtn">Editar</button>
          <button class="delBtn">Eliminar</button>
        </td>
      </tr>
    `).join("");
  }

  function renderPagination(meta) {
    prevBtn.disabled = !meta.hasPrevPage;
    nextBtn.disabled = !meta.hasNextPage;
    pageInfo.textContent = `Pagina ${meta.page} / ${meta.totalPages}`;
  }

  async function createProduct(payload) {
    const res = await fetch(`/api/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Error al crear");
    return data;
  }

  async function updateProduct(id, payload) {
    const res = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Error al actualizar");
    return data;
  }

  async function deleteProduct(id) {
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Error al eliminar");
    return data;
  }


  reloadBtn.addEventListener("click", () => {
    state.query = queryInput.value.trim();
    state.sort = sortSelect.value;
    state.limit = Number(limitInput.value) || 10;
    state.page = 1;
    loadProducts();
  });

  prevBtn.addEventListener("click", () => {
    if (state.page > 1) {
      state.page--;
      loadProducts();
    }
  });
  nextBtn.addEventListener("click", () => {
    state.page++;
    loadProducts();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    if (payload.thumbnails) {
      payload.thumbnails = payload.thumbnails.split(",").map(s => s.trim()).filter(Boolean);
    }
    payload.price = Number(payload.price);
    payload.stock = Number(payload.stock);

    try {
      await createProduct(payload);
      form.reset();
    } catch (err) {
      alert(err.message);
    }
  });

  body.addEventListener("click", async (e) => {
    const tr = e.target.closest("tr");
    if (!tr) return;
    const id = tr.getAttribute("data-id");

    if (e.target.matches(".delBtn")) {
      if (!confirm("¿Eliminar producto?")) return;
      try {
        await deleteProduct(id);
      } catch (err) {
        alert(err.message);
      }
    }

    if (e.target.matches(".editBtn")) {
      try {
        await openEdit(id);
      } catch (err) {
        alert(err.message || "Error al cargar producto");
      }
    }
  });
  
  async function openEdit(id) {
    const res = await fetch(`/api/products/${id}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "No se pudo cargar el producto");
    const p = data.product || data; 
    if (editId) editId.value = p._id || id;
    if (editTitle) editTitle.value = p.title || "";
    if (editDescription) editDescription.value = p.description || "";
    if (editCode) editCode.value = p.code || "";
    if (editPrice) editPrice.value = p.price ?? "";
    if (editStock) editStock.value = p.stock ?? "";
    if (editCategory) editCategory.value = p.category || "";
    if (editThumbnails) editThumbnails.value = Array.isArray(p.thumbnails) ? p.thumbnails.join(", ") : (p.thumbnails || "");
    if (editSection) {
      editSection.style.display = "block";
      editSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = editId?.value;
      const payload = {
        title: editTitle?.value,
        description: editDescription?.value,
        code: editCode?.value,
        price: Number(editPrice?.value),
        stock: Number(editStock?.value),
        category: editCategory?.value,
      };
      const thumbs = (editThumbnails?.value || "").split(",").map(s => s.trim()).filter(Boolean);
      if (thumbs.length) payload.thumbnails = thumbs;
      try {
        await updateProduct(id, payload);
        editForm.reset();
        if (editSection) editSection.style.display = "none";
      } catch (err) {
        alert(err.message || "Error al actualizar");
      }
    });
  }

  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", () => {
      if (editForm) editForm.reset();
      if (editSection) editSection.style.display = "none";
    });
  }

  // Socket: se disparan despues de POST/PUT/DELETE (en el server)
  socket.on("productsUpdated", () => {
    loadProducts();
  });

  // Primera carga
  loadProducts();
})();