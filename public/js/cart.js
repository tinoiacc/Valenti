(() => {
  const socket = io();

  const cid = (() => {
    const m = window.location.pathname.match(/\/carts\/([^/?#]+)/);
    return m ? m[1] : null;
  })();

  const cartSection =
    document.querySelector('section[aria-labelledby="cart-list"]') ||
    document.querySelector("main") ||
    document.body;

  function normalizeCart(rawCart) {
    const items = (rawCart?.products || []).map((p) => {
      const prod =
        typeof p.product === "object" && p.product !== null ? p.product : {};
      const id = String(prod._id || p.product || "");
      const title = prod.title || "Producto";
      const price = Number(prod.price ?? 0);
      const quantity = Number(p.quantity ?? 0);
      const subtotal = price * quantity;
      return { _id: id, title, price, quantity, subtotal };
    });
    const total = items.reduce((acc, it) => acc + it.subtotal, 0);
    return { _id: rawCart?._id || cid, products: items, total };
  }

  function tableRowHTML(item) {
    return `
      <tr data-pid="${item._id}">
        <td>${item._id}</td>
        <td>${item.title}</td>
        <td>$${item.price}</td>
        <td>
          <input type="number" min="1" step="1" value="${item.quantity}"
                 class="qty-input" aria-label="Cantidad">
        </td>
        <td>$${item.subtotal}</td>
        <td>
          <button class="update-btn" data-pid="${item._id}">Actualizar cantidad</button>
          <button class="remove-btn" data-pid="${item._id}">Eliminar</button>
        </td>
      </tr>
    `;
  }

    function renderCart(rawCart) {
    const cart = normalizeCart(rawCart);
    const hasItems = cart.products.length > 0;
    const rows = cart.products.map(tableRowHTML).join("");

    const html = `
      <h2 id="cart-list">Productos</h2>
      ${
        hasItems
          ? `
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Titulo</th>
              <th>Precio</th>
              <th>Cantidad</th>
              <th>Subtotal</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="cartItems">
            ${rows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4"><strong>Total</strong></td>
              <td colspan="2"><strong>$${cart.total}</strong></td>
            </tr>
          </tfoot>
        </table>
      `
          : `<p>El carrito esta vacio.</p>`
      }
      <div style="margin-top:12px">
        <button id="emptyCart">Vaciar carrito</button>
        <button id="deleteCart" style="margin-left:8px;">Eliminar carrito</button>
      </div>
    `;
    cartSection.innerHTML = html;
  }

  async function alertIfNotOk(res) {
    if (res.ok) return false;
    let msg = `Error ${res.status}`;
    try {
      const data = await res.json();
      msg = data?.message || data?.error || msg;
    } catch {}
    alert(msg);
    return true;
  }

  cartSection.addEventListener("click", async (e) => {
    if (!cid) return;

    const target = e.target;

    // Actualizar cantidad
    if (target.matches(".update-btn")) {
      const pid = target.getAttribute("data-pid");
      const tr = target.closest("tr");
      const qtyInput = tr?.querySelector(".qty-input");
      const quantity = Number(qtyInput?.value || 0);
      if (!(quantity > 0)) {
        alert("La cantidad debe ser un numero mayor a 0");
        return;
      }

      try {
        const res = await fetch(`/api/carts/${cid}/products/${pid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity }),
        });
        const hasError = await alertIfNotOk(res);
        if (!hasError) {
          const data = await res.json().catch(() => null);
          if (data?.cart) renderCart(data.cart);
        }
      } catch {
        alert("Error de red al actualizar cantidad");
      }
      return;
    }

    // Eliminar producto
    if (target.matches(".remove-btn")) {
      const pid = target.getAttribute("data-pid");
      try {
        const res = await fetch(`/api/carts/${cid}/products/${pid}`, {
          method: "DELETE",
        });
        const hasError = await alertIfNotOk(res);
        if (!hasError) {
          const data = await res.json().catch(() => null);
          if (data?.cart) renderCart(data.cart);
        }
      } catch {
        alert("Error de red al eliminar producto");
      }
      return;
    }

    // Vaciar carrito
    if (target.matches("#emptyCart")) {
      if (!confirm("¿Vaciar carrito completo?")) return;
      try {
        const res = await fetch(`/api/carts/${cid}`, { method: "DELETE" });
        const hasError = await alertIfNotOk(res);
        if (!hasError) {
          const data = await res.json().catch(() => null);
          if (data?.cart) renderCart(data.cart);
        }
      } catch {
        alert("Error de red al vaciar carrito");
      }
      return;
    }

    // Eliminar carrito (borrar documento)
    if (target.matches("#deleteCart")) {
      if (!confirm("Eliminar carrito definitivamente?")) return;
      try {
        const res = await fetch(`/api/carts/${cid}/hard`, { method: "DELETE" });
        const hasError = await alertIfNotOk(res);
        if (!hasError) {
          window.location.href = "/";
        }
      } catch {
        alert("Error de red al eliminar carrito");
      }
      return;
    }
  });

  // ----- Realtime: escuchar actualizacion del server 

  socket.on("cartUpdated", ({ cid: changed, cart }) => {
    if (cid && changed === cid) {
      renderCart(cart);
    }
  });

  // Primera carga: refrescar desde API para mostrar totales
  if (cid) {
    fetch(`/api/carts/${cid}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.cart && renderCart(d.cart))
      .catch(() => {});
  }
})();