/* Shared helpers, header and footer for all public pages. */
(function () {
  const G = (window.G4U = {});

  G.esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  G.zar = n => 'R' + Number(n || 0).toLocaleString('en-ZA', { maximumFractionDigits: 0 }).replace(/,/g, ' ');
  G.date = s => {
    if (!s) return '';
    const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
    return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  G.dateTime = s => {
    if (!s) return '';
    const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
    return d.toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  G.qs = (k) => new URLSearchParams(location.search).get(k);

  G.api = async (url, opts = {}) => {
    const o = { ...opts, headers: { 'X-Requested-With': 'guitarz4u', ...(opts.headers || {}) } };
    if (o.body && !(o.body instanceof FormData)) {
      o.headers['Content-Type'] = 'application/json';
      o.body = JSON.stringify(o.body);
    }
    const res = await fetch(url, o);
    let data = null;
    try { data = await res.json(); } catch { /* empty */ }
    if (!res.ok) {
      const err = new Error((data && data.error) || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return data;
  };

  G.toast = (msg, isError) => {
    const t = document.createElement('div');
    t.className = 'toast' + (isError ? ' error' : '');
    t.setAttribute('role', 'status');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3800);
  };

  G.formData = form => Object.fromEntries(new FormData(form).entries());

  G.icons = {
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3M12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4c-1-1.6-1.5-3.4-1.5-5.2 0-5.4 4.4-9.9 9.9-9.9 2.6 0 5.1 1 7 2.9 1.9 1.9 2.9 4.4 2.9 7 0 5.4-4.4 9.8-10 9.8M20.5 3.5C18.2 1.2 15.2 0 12 0 5.5 0 .1 5.3.1 11.9c0 2.1.5 4.1 1.6 5.9L0 24l6.3-1.7c1.8 1 3.7 1.5 5.7 1.5 6.6 0 11.9-5.3 11.9-11.9 0-3.2-1.2-6.2-3.4-8.4"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8.1 9.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.7.6 2.6.7a2 2 0 0 1 1.7 2Z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 6 10 7 10-7"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>',
    wrench: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9l-3.8 3.8Z"/></svg>',
    guitar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m20 2 2 2-3 3-1-1-5.5 5.5"/><path d="M12.5 11.5a3.5 3.5 0 0 0-5 0c-1 1-1 2-1.5 2.5S3 14.5 2.5 16.5s1.5 5 5 5S10 19 10 19s.5-2 1.5-3c1-1 1.5-1 2.5-1.5 0 0 0-1.5-1.5-3Z"/><circle cx="8" cy="16" r="1"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>'
  };

  // Simple line-art placeholder per guitar type, used when a listing has no photos.
  G.placeholder = type => {
    const acoustic = /acoustic|classical/i.test(type || '');
    const bass = /bass/i.test(type || '');
    if (acoustic) {
      return `<svg class="ph" viewBox="0 0 100 200" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><rect x="45" y="6" width="10" height="20" rx="2"/><rect x="46.5" y="26" width="7" height="70"/><path d="M50 92c-14 0-24 9-22 22 1 7 6 10 6 15 0 6-12 12-12 30 0 20 14 33 28 33s28-13 28-33c0-18-12-24-12-30 0-5 5-8 6-15 2-13-8-22-22-22Z"/><circle cx="50" cy="138" r="10"/><path d="M40 172h20"/></svg>`;
    }
    return `<svg class="ph" viewBox="0 0 100 200" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M44 4h12l-1 22h-10Z"/><rect x="46" y="26" width="8" height="${bass ? 82 : 72}"/><path d="M46 ${bass ? 108 : 98}c-8-6-18-4-20 6-2 9 6 14 4 22-3 10-12 14-12 30 0 18 14 32 32 32s28-12 28-28c0-14-10-18-10-28 0-8 8-12 6-22-2-8-12-10-18-6"/><rect x="40" y="134" width="20" height="6" rx="1"/><rect x="40" y="152" width="20" height="6" rx="1"/><path d="M42 172h16"/></svg>`;
  };
  G.photo = (g, cls = '') => (g.photos && g.photos[0])
    ? `<img class="${cls}" src="${G.esc(g.photos[0])}" alt="${G.esc(g.brand + ' ' + g.model)}" loading="lazy">`
    : G.placeholder(g.type);

  G.statusBadge = s => s === 'reserved' ? '<span class="badge badge-reserved">Reserved</span>' : s === 'sold' ? '<span class="badge badge-sold">Sold</span>' : '';

  G.card = g => `
    <a class="card ${g.status === 'sold' ? 'sold' : ''}" href="/guitar?id=${g.id}">
      <div class="card-media">${G.photo(g)}${G.statusBadge(g.status)}</div>
      <div class="card-body">
        <span class="card-meta">${G.esc(g.type)}${g.year ? ' · ' + G.esc(g.year) : ''}</span>
        <span class="card-title">${G.esc(g.brand)} ${G.esc(g.model)}</span>
        <div class="card-foot"><span class="price">${G.zar(g.price)}</span><span class="cond">${G.esc(g.condition)}</span></div>
      </div>
    </a>`;

  G.stars = n => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);

  G.settings = null;
  G.waLink = (text) => `https://wa.me/${(G.settings && G.settings.whatsapp) || '27648567019'}${text ? '?text=' + encodeURIComponent(text) : ''}`;

  const NAV = [
    ['/', 'Home'], ['/shop', 'Shop guitars'], ['/repairs', 'Repairs'], ['/track', 'Track a repair'], ['/about', 'About'], ['/contact', 'Contact']
  ];
  const LOGO = `<svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="31" fill="#2B1B12" stroke="#B08D57" stroke-width="2"/><circle cx="32" cy="32" r="25" fill="none" stroke="#C77C3E" stroke-width="1"/><text x="32" y="39" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="700" font-size="20" fill="#E0A868">G4U</text></svg>`;

  function current(href) {
    const p = location.pathname.replace(/\.html$/, '').replace(/\/index$/, '/') || '/';
    if (href === '/') return p === '/';
    if (href === '/shop' && p === '/guitar') return true;
    return p === href;
  }

  function renderHeader() {
    const el = document.getElementById('site-header');
    if (!el) return;
    el.outerHTML = `
      <a class="skip" href="#main">Skip to content</a>
      <div class="announce" id="announce" hidden></div>
      <header class="site-header">
        <div class="header-row">
          <a class="brand" href="/">${LOGO}<span><span class="brand-word">Guitarz<span>4U</span></span><span class="brand-tagline">Pre-owned guitars · Repairs</span></span></a>
          <button class="nav-toggle" aria-label="Menu" aria-expanded="false" aria-controls="main-nav">${G.icons.menu}</button>
          <nav class="main-nav" id="main-nav" aria-label="Main">
            ${NAV.map(([h, l]) => `<a href="${h}"${current(h) ? ' aria-current="page"' : ''}>${l}</a>`).join('')}
          </nav>
        </div>
      </header>`;
    const btn = document.querySelector('.nav-toggle');
    const nav = document.getElementById('main-nav');
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
  }

  function renderFooter(s) {
    const el = document.getElementById('site-footer');
    if (!el) return;
    const social = [s.instagram && `<li><a href="${G.esc(s.instagram)}" target="_blank" rel="noopener">Instagram</a></li>`, s.facebook && `<li><a href="${G.esc(s.facebook)}" target="_blank" rel="noopener">Facebook</a></li>`].filter(Boolean).join('');
    el.outerHTML = `
      <footer class="site-footer">
        <div class="wrap">
          <div class="foot-grid">
            <div>
              <a class="brand" href="/">${LOGO}<span><span class="brand-word">Guitarz<span>4U</span></span><span class="brand-tagline">Pre-owned guitars · Repairs</span></span></a>
              <p style="margin-top:14px;max-width:300px">Inspected, set-up second-hand guitars and honest workshop repairs, from one guitarist to another.</p>
            </div>
            <div><h4>Shop</h4><ul><li><a href="/shop">All guitars</a></li><li><a href="/shop?type=Electric">Electric</a></li><li><a href="/shop?type=Acoustic">Acoustic</a></li><li><a href="/shop?type=Bass">Bass</a></li><li><a href="/shop?status=sold">Recently sold</a></li></ul></div>
            <div><h4>Workshop</h4><ul><li><a href="/repairs">Repair services & prices</a></li><li><a href="/repairs#book">Book a repair</a></li><li><a href="/track">Track a repair</a></li><li><a href="/about#policies">Policies</a></li></ul></div>
            <div><h4>Get in touch</h4><ul>
              <li><a href="${G.waLink()}" target="_blank" rel="noopener">WhatsApp ${G.esc(s.phone)}</a></li>
              <li><a href="mailto:${G.esc(s.email)}">${G.esc(s.email)}</a></li>
              <li>${G.esc(s.area)}</li>${social}</ul></div>
          </div>
          <div class="foot-bottom"><span>© ${new Date().getFullYear()} ${G.esc(s.business_name)}. All prices in South African rand (ZAR).</span><a href="/admin">Owner login</a></div>
        </div>
      </footer>
      <a class="wa-float" href="${G.waLink('Hi Guitarz4U, ')}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">${G.icons.whatsapp}</a>`;
  }

  renderHeader();
  const fallback = { business_name: 'Guitarz4U', phone: '064 856 7019', whatsapp: '27648567019', email: 'joshuaweinfas@gmail.com', area: 'Johannesburg, Gauteng', hours: '' };
  G.ready = G.api('/api/settings').catch(() => fallback).then(s => {
    G.settings = s;
    renderFooter(s);
    if (s.announcement) { const a = document.getElementById('announce'); a.textContent = s.announcement; a.hidden = false; }
    document.querySelectorAll('[data-setting]').forEach(el => { el.textContent = s[el.dataset.setting] || ''; });
    document.querySelectorAll('[data-wa]').forEach(el => { el.href = G.waLink(el.dataset.wa); });
    document.querySelectorAll('[data-mailto]').forEach(el => { el.href = 'mailto:' + s.email; el.textContent = el.textContent || s.email; });
    return s;
  });
})();
