import { promises as fs } from "fs";

const path = "./data/carts.json";

export default class CartManager {
  
  async getCarts() {
    try {
      const data = await fs.readFile(path, "utf-8");
      return JSON.parse(data);
    } catch {
      return []; 
    }
  }

  async createCart() {
    const carts = await this.getCarts();
    const newId = carts.length > 0 ? carts[carts.length - 1].id + 1 : 1;
    const newCart = { id: newId, products: [] };
    carts.push(newCart);
    await fs.writeFile(path, JSON.stringify(carts, null, 2));
    return newCart;
  }

 
  async getCartById(cid) {
    const carts = await this.getCarts();
    return carts.find(c => c.id === cid);
  }

  async addProductToCart(cid, pid) {
    const carts = await this.getCarts();
    const cartIndex = carts.findIndex(c => c.id === cid);
    if (cartIndex === -1) return null;

    const cart = carts[cartIndex];
    const productIndex = cart.products.findIndex(p => p.product === pid);

    if (productIndex !== -1) {
      cart.products[productIndex].quantity++;
    } else {
      cart.products.push({ product: pid, quantity: 1 });
    }

    carts[cartIndex] = cart;
    await fs.writeFile(path, JSON.stringify(carts, null, 2));
    return cart;
  }
}