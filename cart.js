/* Soft Hours cart: localStorage only, no remote storage */
(function (global) {
  const STORAGE_KEY = 'softHoursCart_v1';
  const FREE_SHIP_THRESHOLD = 60;
  const FLAT_SHIP = 8.95;

  const CATALOG = {
    'warm-glow-belt': {
      id: 'warm-glow-belt',
      name: 'Warm Glow Belt',
      price: 79,
      image: 'assets/products/heating-belt.jpg',
      colours: ['Blush', 'Lilac', 'Cream']
    },
    'cloud-briefs': {
      id: 'cloud-briefs',
      name: 'Cloud Briefs · 3-Pack',
      price: 54,
      image: 'assets/products/period-undies.jpg',
      colours: ['Dusty rose', 'Blush', 'Soft black']
    },
    'silk-eye-mask': {
      id: 'silk-eye-mask',
      name: 'Silk Soft Eye Mask',
      price: 22,
      image: 'assets/products/eye-mask.jpg',
      colours: ['Blush', 'Lilac', 'Champagne']
    },
    'warming-patches': {
      id: 'warming-patches',
      name: 'Warming Patches · 10-Pack',
      price: 16,
      image: 'assets/products/heat-patches.jpg',
      colours: ['Default']
    },
    'knit-warm-bottle': {
      id: 'knit-warm-bottle',
      name: 'Knit Warm Bottle',
      price: 36,
      image: 'assets/products/hot-water-bottle.jpg',
      colours: ['Blush', 'Cream', 'Lilac']
    }
  };

  const UPSELL_IDS = ['warming-patches', 'silk-eye-mask', 'knit-warm-bottle'];

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function save(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    global.dispatchEvent(new CustomEvent('softhours:cart', { detail: { items: items.slice() } }));
  }

  function lineKey(id, colour) {
    return id + '::' + (colour || 'Default');
  }

  function getItems() { return load(); }

  function countItems(items) {
    return (items || load()).reduce(function (n, i) { return n + (i.qty || 0); }, 0);
  }

  function subtotal(items) {
    return (items || load()).reduce(function (s, i) {
      return s + (Number(i.price) || 0) * (i.qty || 0);
    }, 0);
  }

  function shippingFor(sub) {
    if (sub <= 0) return 0;
    return sub >= FREE_SHIP_THRESHOLD ? 0 : FLAT_SHIP;
  }

  function total(items) {
    const sub = subtotal(items);
    return sub + shippingFor(sub);
  }

  function addItem(opts) {
    const id = opts.id;
    const product = CATALOG[id];
    if (!product) return load();
    const colour = opts.colour || product.colours[0] || 'Default';
    const qty = Math.max(1, parseInt(opts.qty, 10) || 1);
    const items = load();
    const key = lineKey(id, colour);
    const existing = items.find(function (i) { return lineKey(i.id, i.colour) === key; });
    if (existing) {
      existing.qty += qty;
    } else {
      items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        colour: colour,
        qty: qty
      });
    }
    save(items);
    return items;
  }

  function setQty(id, colour, qty) {
    qty = parseInt(qty, 10) || 0;
    let items = load();
    const key = lineKey(id, colour);
    if (qty <= 0) {
      items = items.filter(function (i) { return lineKey(i.id, i.colour) !== key; });
    } else {
      items.forEach(function (i) {
        if (lineKey(i.id, i.colour) === key) i.qty = qty;
      });
    }
    save(items);
    return items;
  }

  function removeItem(id, colour) {
    return setQty(id, colour, 0);
  }

  function clear() {
    save([]);
  }

  function money(n) {
    return 'A$' + Number(n).toFixed(2).replace(/\.00$/, '');
  }

  function moneyFixed(n) {
    return 'A$' + Number(n).toFixed(2);
  }

  function upsellCandidates(items) {
    const inCart = {};
    (items || load()).forEach(function (i) { inCart[i.id] = true; });
    return UPSELL_IDS.filter(function (id) { return !inCart[id]; })
      .map(function (id) { return CATALOG[id]; })
      .filter(Boolean)
      .slice(0, 2);
  }

  function shipProgress(sub) {
    const remaining = Math.max(0, FREE_SHIP_THRESHOLD - sub);
    const pct = Math.min(100, (sub / FREE_SHIP_THRESHOLD) * 100);
    return {
      threshold: FREE_SHIP_THRESHOLD,
      remaining: remaining,
      pct: pct,
      free: sub >= FREE_SHIP_THRESHOLD && sub > 0,
      flat: FLAT_SHIP
    };
  }

  global.SoftHoursCart = {
    CATALOG: CATALOG,
    FREE_SHIP_THRESHOLD: FREE_SHIP_THRESHOLD,
    FLAT_SHIP: FLAT_SHIP,
    load: load,
    getItems: getItems,
    countItems: countItems,
    subtotal: subtotal,
    shippingFor: shippingFor,
    total: total,
    addItem: addItem,
    setQty: setQty,
    removeItem: removeItem,
    clear: clear,
    money: money,
    moneyFixed: moneyFixed,
    upsellCandidates: upsellCandidates,
    shipProgress: shipProgress
  };
})(window);
