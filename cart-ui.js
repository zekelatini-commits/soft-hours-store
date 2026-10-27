(function () {
  const Cart = window.SoftHoursCart;
  if (!Cart) return;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function ensureDrawer() {
    if ($('#cart-overlay')) return;
    const overlay = document.createElement('div');
    overlay.className = 'cart-overlay';
    overlay.id = 'cart-overlay';
    const drawer = document.createElement('aside');
    drawer.className = 'cart-drawer';
    drawer.id = 'cart-drawer';
    drawer.setAttribute('aria-label', 'Shopping cart');
    drawer.innerHTML = [
      '<div class="cart-drawer-head">',
      '  <h2>Your bag</h2>',
      '  <button type="button" class="cart-close" id="cart-close" aria-label="Close cart">×</button>',
      '</div>',
      '<div class="cart-body" id="cart-body"></div>',
      '<div class="cart-footer" id="cart-footer"></div>'
    ].join('');
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
    overlay.addEventListener('click', closeCart);
    $('#cart-close').addEventListener('click', closeCart);
  }

  function openCart() {
    ensureDrawer();
    renderCart();
    $('#cart-overlay').classList.add('open');
    $('#cart-drawer').classList.add('open');
    document.body.classList.add('cart-open');
  }

  function closeCart() {
    const o = $('#cart-overlay');
    const d = $('#cart-drawer');
    if (o) o.classList.remove('open');
    if (d) d.classList.remove('open');
    document.body.classList.remove('cart-open');
  }

  function updateBadge() {
    const n = Cart.countItems();
    $all('.cart-count').forEach(function (el) { el.textContent = String(n); });
  }

  function renderCart() {
    ensureDrawer();
    const items = Cart.getItems();
    const body = $('#cart-body');
    const footer = $('#cart-footer');
    updateBadge();

    if (!items.length) {
      body.innerHTML = '<div class="cart-empty"><h3>Bag is empty</h3><p>Go grab something from the shop.</p><button type="button" class="btn" id="cart-shop">Keep shopping</button></div>';
      footer.innerHTML = '';
      const shop = $('#cart-shop');
      if (shop) shop.addEventListener('click', closeCart);
      return;
    }

    const sub = Cart.subtotal(items);
    const prog = Cart.shipProgress(sub);
    const ship = Cart.shippingFor(sub);
    const tot = sub + ship;

    let html = '';
    items.forEach(function (item) {
      html += '<div class="cart-line" data-id="' + item.id + '" data-colour="' + escapeAttr(item.colour) + '">';
      html += '<img src="' + item.image + '" alt="">';
      html += '<div><div class="cart-line-top"><div><div class="cart-line-name">' + escapeHtml(item.name) + '</div>';
      if (item.colour && item.colour !== 'Default') {
        html += '<div class="cart-line-colour">Colour: ' + escapeHtml(item.colour) + '</div>';
      }
      html += '</div><div class="cart-line-price">' + Cart.moneyFixed(item.price * item.qty) + '</div></div>';
      html += '<div class="cart-line-actions"><div class="qty">';
      html += '<button type="button" data-act="dec" aria-label="Decrease">−</button>';
      html += '<span>' + item.qty + '</span>';
      html += '<button type="button" data-act="inc" aria-label="Increase">+</button>';
      html += '</div><button type="button" class="cart-remove" data-act="rm">Remove</button></div></div></div>';
    });

    html += '<div class="ship-progress"><p>';
    if (prog.free) {
      html += 'Free shipping unlocked';
    } else {
      html += '' + Cart.moneyFixed(prog.remaining) + ' more for free shipping';
    }
    html += '</p><div class="ship-bar"><span style="width:' + prog.pct + '%"></span></div></div>';

    const ups = Cart.upsellCandidates(items);
    if (ups.length) {
      html += '<div class="cart-upsell"><h4>Add-ons</h4><div class="upsell-row">';
      ups.forEach(function (u) {
        html += '<div class="upsell-card"><img src="' + u.image + '" alt=""><div><strong>' + escapeHtml(u.name) + '</strong><span>' + Cart.money(u.price) + '</span></div>';
        html += '<button type="button" class="btn btn-sm" data-upsell="' + u.id + '">Add</button></div>';
      });
      html += '</div></div>';
    }

    body.innerHTML = html;

    footer.innerHTML = [
      '<div class="cart-totals">',
      '<div class="muted"><span>Subtotal</span><span>' + Cart.moneyFixed(sub) + '</span></div>',
      '<div class="muted"><span>Shipping</span><span>' + (ship === 0 ? 'Free' : Cart.moneyFixed(ship)) + '</span></div>',
      '<div class="grand"><span>Total</span><span>' + Cart.moneyFixed(tot) + '</span></div>',
      '</div>',
      '<a class="btn btn-block btn-lg" href="checkout.html">Checkout</a>',
      '<button type="button" class="cart-continue" id="cart-continue">Continue shopping</button>'
    ].join('');

    body.onclick = function (e) {
      const btn = e.target.closest('[data-act], [data-upsell]');
      if (!btn) return;
      if (btn.getAttribute('data-upsell')) {
        Cart.addItem({ id: btn.getAttribute('data-upsell'), colour: Cart.CATALOG[btn.getAttribute('data-upsell')].colours[0] });
        renderCart();
        return;
      }
      const line = btn.closest('.cart-line');
      if (!line) return;
      const id = line.getAttribute('data-id');
      const colour = line.getAttribute('data-colour');
      const item = items.find(function (i) { return i.id === id && i.colour === colour; });
      if (!item) return;
      const act = btn.getAttribute('data-act');
      if (act === 'inc') Cart.setQty(id, colour, item.qty + 1);
      if (act === 'dec') Cart.setQty(id, colour, item.qty - 1);
      if (act === 'rm') Cart.removeItem(id, colour);
      renderCart();
    };

    const cont = $('#cart-continue');
    if (cont) cont.addEventListener('click', closeCart);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function escapeAttr(s) { return escapeHtml(s); }

  function colourFromFeature(feature) {
    const active = feature && feature.querySelector('.swatch.active');
    return (active && active.getAttribute('title')) || 'Default';
  }

  function wireAddToCart() {
    $all('.add-to-cart').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const feature = btn.closest('.feature') || btn.closest('[data-product-id]');
        const id = btn.getAttribute('data-id') || (feature && feature.getAttribute('data-product-id'));
        if (!id || !Cart.CATALOG[id]) return;
        const colour = colourFromFeature(feature);
        Cart.addItem({ id: id, colour: colour });
        updateBadge();
        openCart();
        const toast = $('#toast');
        if (toast) {
          toast.textContent = Cart.CATALOG[id].name + ' added';
          toast.classList.add('show');
          setTimeout(function () { toast.classList.remove('show'); }, 1800);
        }
      });
    });
  }

  function wireCartButtons() {
    $all('.cart-btn, [data-open-cart]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        openCart();
      });
    });
  }

  function initCarousels() {
    $all('.carousel').forEach(function (carousel) {
      const track = carousel.querySelector('.carousel-track');
      const slides = $all('.carousel-slide', carousel);
      const dotsWrap = carousel.querySelector('.carousel-dots');
      const prev = carousel.querySelector('.carousel-btn.prev');
      const next = carousel.querySelector('.carousel-btn.next');
      if (!track || !slides.length) return;

      dotsWrap.innerHTML = '';
      slides.forEach(function (_, i) {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Go to image ' + (i + 1));
        if (i === 0) b.classList.add('on');
        b.addEventListener('click', function () {
          track.scrollTo({ left: track.clientWidth * i, behavior: 'smooth' });
        });
        dotsWrap.appendChild(b);
      });

      function sync() {
        const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        $all('button', dotsWrap).forEach(function (d, idx) {
          d.classList.toggle('on', idx === i);
        });
      }
      track.addEventListener('scroll', function () {
        window.requestAnimationFrame(sync);
      });

      if (prev) prev.addEventListener('click', function () {
        track.scrollBy({ left: -track.clientWidth, behavior: 'smooth' });
      });
      if (next) next.addEventListener('click', function () {
        track.scrollBy({ left: track.clientWidth, behavior: 'smooth' });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    ensureDrawer();
    updateBadge();
    wireAddToCart();
    wireCartButtons();
    initCarousels();
    window.addEventListener('softhours:cart', updateBadge);
  });

  window.SoftHoursCartUI = { openCart: openCart, closeCart: closeCart, renderCart: renderCart, updateBadge: updateBadge };
})();
