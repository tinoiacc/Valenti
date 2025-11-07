(() => {
  const socket = typeof io !== 'undefined' ? io() : null;

  const productsList = document.getElementById('productsList');
  const homeCartId = document.getElementById('homeCartId');
  const loadCartBtn = document.getElementById('loadCartBtn');
  const gotoCartBtn = document.getElementById('gotoCartBtn');
  const createCartBtn = document.getElementById('createCartBtn');
  const cartItemsBody = document.getElementById('cartItemsBody');
  const cartEmptyMsg = document.getElementById('cartEmptyMsg');

  function selectedCid() {
    return homeCartId?.value?.trim();
  }

  function setSelectedCid(cid) {
    if (homeCartId) homeCartId.value = cid || '';
    try { localStorage.setItem('selectedCartId', cid || ''); } catch {}
  }

  async function loadCart(cid) {
    if (!cid) return;
    const res = await fetch(`/api/carts/${encodeURIComponent(cid)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      renderCart(null);
      alert(data.message || data.error || 'Carrito no encontrado');
      return;
    }
    renderCart(data.cart);
  }

  function renderCart(cart) {
    if (!cart || !Array.isArray(cart.products) || cart.products.length === 0) {
      if (cartItemsBody) cartItemsBody.innerHTML = '';
      if (cartEmptyMsg) cartEmptyMsg.style.display = 'block';
      return;
    }
    if (cartEmptyMsg) cartEmptyMsg.style.display = 'none';
    const rows = cart.products.map((it) => {
      const p = it.product || {};
      const pid = p._id || it.product;
      return `
        <tr data-pid="${pid}">
          <td>${pid}</td>
          <td>${p.title || ''}</td>
          <td>$${p.price ?? ''}</td>
          <td>
            <button class="qty-dec" type="button">-</button>
            <input type="number" class="qty-input" value="${it.quantity}" min="1" style="width:60px"> 
            <button class="qty-inc" type="button">+</button>
          </td>
          <td>
            <button class="item-del" type="button">Eliminar</button>
          </td>
        </tr>
      `;
    }).join('');
    if (cartItemsBody) cartItemsBody.innerHTML = rows;
  }

  async function addToCart(cid, pid) {
    const res = await fetch(`/api/carts/${encodeURIComponent(cid)}/products/${encodeURIComponent(pid)}`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'No se pudo agregar');
    }
  }

  async function updateQty(cid, pid, qty) {
    const res = await fetch(`/api/carts/${encodeURIComponent(cid)}/products/${encodeURIComponent(pid)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: Number(qty) })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'No se pudo actualizar');
    }
  }

  async function deleteItem(cid, pid) {
    const res = await fetch(`/api/carts/${encodeURIComponent(cid)}/products/${encodeURIComponent(pid)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'No se pudo eliminar');
    }
  }

  // Eventos de UI
  productsList?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.add-to-cart-btn');
    if (!btn) return;
    const li = btn.closest('li[data-pid]');
    const pid = li?.getAttribute('data-pid');
    const cid = selectedCid();
    if (!cid) { alert('Ingrese el ID del carrito a usar'); return; }
    try {
      await addToCart(cid, pid);
      if (!socket) await loadCart(cid);
    } catch (err) {
      alert(err.message);
    }
  });

  loadCartBtn?.addEventListener('click', () => {
    const cid = selectedCid();
    if (!cid) { alert('Ingrese un ID de carrito'); return; }
    loadCart(cid);
  });

  gotoCartBtn?.addEventListener('click', () => {
    const cid = selectedCid();
    if (!cid) { alert('Ingrese un ID de carrito'); return; }
    window.location.href = `/carts/${encodeURIComponent(cid)}`;
  });

  createCartBtn?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/carts', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.message || data.error || `Error (${res.status})`);
        return;
      }
      const data = await res.json();
      const cid = data?.cart?._id;
      if (!cid) { alert('No se obtuvo el ID del carrito'); return; }
      setSelectedCid(cid);
      loadCart(cid);
    } catch (err) {
      alert('Error de red al crear carrito');
    }
  });

  cartItemsBody?.addEventListener('click', async (e) => {
    const cid = selectedCid();
    if (!cid) return;
    const tr = e.target.closest('tr[data-pid]');
    if (!tr) return;
    const pid = tr.getAttribute('data-pid');
    const qtyInput = tr.querySelector('.qty-input');
    let qty = Number(qtyInput?.value || 1);

    try {
      if (e.target.matches('.qty-inc')) {
        qty = qty + 1; await updateQty(cid, pid, qty);
      } else if (e.target.matches('.qty-dec')) {
        qty = Math.max(1, qty - 1); await updateQty(cid, pid, qty);
      } else if (e.target.matches('.item-del')) {
        await deleteItem(cid, pid);
      }
      if (!socket) await loadCart(cid);
    } catch (err) {
      alert(err.message);
    }
  });

  cartItemsBody?.addEventListener('change', async (e) => {
    if (!e.target.matches?.('.qty-input')) return;
    const cid = selectedCid();
    const tr = e.target.closest('tr[data-pid]');
    const pid = tr?.getAttribute('data-pid');
    const qty = Math.max(1, Number(e.target.value || 1));
    try { await updateQty(cid, pid, qty); if (!socket) await loadCart(cid); } catch (err) { alert(err.message); }
  });

  // Socket: auto-actualiza si el carrito abierto cambia
  socket?.on?.('cartUpdated', ({ cid, cart }) => {
    const sel = selectedCid();
    if (sel && cid === sel) renderCart(cart);
  });

  // Estado inicial
  try {
    const saved = localStorage.getItem('selectedCartId');
    if (saved) { setSelectedCid(saved); loadCart(saved); }
  } catch {}
})();

