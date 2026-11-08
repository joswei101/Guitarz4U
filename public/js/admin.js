/* Guitarz4U owner admin panel */
(() => {
  const { api, esc, zar, dateTime, date, placeholder } = G4U;
  const $ = s => document.querySelector(s);
  const view = $('#view');
  const modal = $('#modal');
  const modalForm = $('#modalForm');
  let meta = { types: [], conditions: [], repairStatuses: [] };
  let stats = {};
  const REPAIR_LABEL = s => (meta.repairStatuses.find(x => x.value === s) || {}).label || s;
  const RES_LABEL = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed (sold)', cancelled: 'Cancelled' };
  const pill = (s, map) => `<span class="pill ${map[s] || ''}">${esc(s.replace(/_/g, ' '))}</span>`;
  const G_PILL = { available: 'pill-green', reserved: 'pill-amber', sold: 'pill-rust', hidden: '' };

  // ---------- auth ----------
  async function boot() {
    const me = await api('/api/admin/me');
    if (!me.admin) { $('#login').hidden = false; $('#app').hidden = true; return; }
    $('#login').hidden = true; $('#app').hidden = false;
    meta = await api('/api/meta');
    await refreshStats();
    go(location.hash.slice(1) || 'dashboard');
  }
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    try { await api('/api/admin/login', { method: 'POST', body: { password: $('#pw').value } }); $('#pw').value = ''; boot(); }
    catch (err) { $('#loginMsg').textContent = err.message; }
  });
  $('#logout').addEventListener('click', async () => { await api('/api/admin/logout', { method: 'POST' }); location.hash = ''; boot(); });

  async function refreshStats() {
    stats = await api('/api/admin/stats');
    document.querySelectorAll('[data-count]').forEach(el => { const n = stats[el.dataset.count]; el.textContent = n ? n : ''; });
  }

  // ---------- routing ----------
  const TABS = { dashboard, inventory, reservations, repairs, services, messages, reviews, settings };
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) go(b.dataset.tab); });
  window.addEventListener('hashchange', () => go(location.hash.slice(1)));
  async function go(tab) {
    if (!TABS[tab]) tab = 'dashboard';
    if (location.hash.slice(1) !== tab) history.replaceState(null, '', '#' + tab);
    document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-current', String(b.dataset.tab === tab)));
    try { await TABS[tab](); }
    catch (err) {
      if (err.status === 401) return boot();
      view.innerHTML = `<div class="empty">${esc(err.message)}</div>`;
    }
  }
  const reload = async () => { await refreshStats(); go(location.hash.slice(1)); };

  function openModal(html, onSubmit) {
    modalForm.innerHTML = html;
    modal.showModal();
    modalForm.onsubmit = async e => {
      const submitter = e.submitter;
      if (!submitter || submitter.value === 'cancel') return;
      e.preventDefault();
      const msg = modalForm.querySelector('.form-msg');
      try {
        submitter.disabled = true;
        const close = await onSubmit(submitter.value, modalForm);
        if (close !== false) { modal.close(); await reload(); }
      } catch (err) { if (msg) { msg.className = 'form-msg error'; msg.textContent = err.message; } else G4U.toast(err.message, true); }
      finally { submitter.disabled = false; }
    };
  }
  const opts = (list, sel) => list.map(v => { const [val, lbl] = Array.isArray(v) ? v : [v, v]; return `<option value="${esc(val)}"${val === sel ? ' selected' : ''}>${esc(lbl)}</option>`; }).join('');
  const confirmDel = what => confirm(`Delete ${what}? This can't be undone.`);

  // ---------- dashboard ----------
  async function dashboard() {
    const [res, reps] = await Promise.all([api('/api/admin/reservations'), api('/api/admin/repairs')]);
    const pendingRes = res.filter(r => r.status === 'pending').slice(0, 5);
    const activeReps = reps.filter(r => !['collected', 'cancelled'].includes(r.status)).slice(0, 8);
    const card = (n, l, tab) => `<button class="stat" data-go="${tab}"><span class="n">${n}</span><span class="l">${l}</span></button>`;
    view.innerHTML = `
      <div class="admin-head"><div><h1>Dashboard</h1><p>Welcome back. Here's what needs your attention.</p></div><a class="btn btn-outline btn-sm" href="/" target="_blank">View website ↗</a></div>
      ${stats.samples ? `<div class="banner"><span><strong>${stats.samples} sample listings</strong> are showing in your shop. Remove them before going live (editing a sample keeps it as a real listing).</span><button class="btn btn-danger btn-sm" id="clearSamples">Remove sample listings</button></div>` : ''}
      ${!stats.emailEnabled ? `<div class="banner"><span>Email notifications are off. New bookings still appear here. To get emails, set the SMTP settings on your server (see README).</span></div>` : ''}
      <div class="stats">
        ${card(stats.pendingReservations, 'New reservations', 'reservations')}
        ${card(stats.newRepairs, 'New repair requests', 'repairs')}
        ${card(stats.openRepairs, 'Open repair jobs', 'repairs')}
        ${card(stats.readyRepairs, 'Ready for collection', 'repairs')}
        ${card(stats.available, 'Guitars for sale', 'inventory')}
        ${card(stats.reserved, 'Guitars reserved', 'inventory')}
        ${card(stats.unreadMessages, 'Unread messages', 'messages')}
        ${card(zar(stats.salesTotal), 'Guitar sales (completed)', 'reservations')}
        ${card(zar(stats.repairsTotal), 'Repair income (collected)', 'repairs')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:20px">
        <div><h2 style="font-size:1.2rem;margin-bottom:10px">Pending reservations</h2>
          <div class="table-wrap">${pendingRes.length ? `<table class="t"><tbody>${pendingRes.map(r => `<tr><td><strong>${esc(r.guitar_label)}</strong><br><small>${esc(r.name)} · ${esc(r.phone)}</small></td><td>${zar(r.price)}</td><td><small>${esc(dateTime(r.created_at))}</small></td></tr>`).join('')}</tbody></table>` : '<div class="empty" style="border:0">No pending reservations.</div>'}</div></div>
        <div><h2 style="font-size:1.2rem;margin-bottom:10px">Active repairs</h2>
          <div class="table-wrap">${activeReps.length ? `<table class="t"><tbody>${activeReps.map(r => `<tr class="click" data-repair="${r.id}"><td><strong>${esc(r.ref)}</strong><br><small>${esc(r.name)}</small></td><td>${esc([r.guitar_brand, r.guitar_model].filter(Boolean).join(' ') || r.guitar_type)}</td><td>${pill(r.status, { requested: 'pill-amber', ready: 'pill-green' })}</td></tr>`).join('')}</tbody></table>` : '<div class="empty" style="border:0">No active repairs.</div>'}</div></div>
      </div>`;
    view.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
    view.querySelectorAll('[data-repair]').forEach(tr => tr.addEventListener('click', () => editRepair(Number(tr.dataset.repair))));
    const cs = $('#clearSamples');
    if (cs) cs.addEventListener('click', async () => {
      if (!confirm('Remove all sample listings from the shop?')) return;
      const r = await api('/api/admin/clear-samples', { method: 'POST' });
      G4U.toast(`Removed ${r.removed} sample listings.`); reload();
    });
  }

  // ---------- inventory ----------
  let invFilter = '';
  async function inventory() {
    const list = await api('/api/admin/guitars');
    const shown = invFilter ? list.filter(g => g.status === invFilter) : list;
    view.innerHTML = `
      <div class="admin-head"><div><h1>Inventory</h1><p>${list.length} guitars in total.</p></div><button class="btn btn-primary" id="addGuitar">+ Add a guitar</button></div>
      <div class="toolbar"><label for="invF" class="label">Show</label><select id="invF">${opts([['', 'All'], ['available', 'Available'], ['reserved', 'Reserved'], ['sold', 'Sold'], ['hidden', 'Hidden']], invFilter)}</select></div>
      <div class="table-wrap">${shown.length ? `<table class="t"><thead><tr><th></th><th>Guitar</th><th>Type</th><th>Condition</th><th>Price</th><th>Status</th><th>Featured</th><th></th></tr></thead><tbody>
        ${shown.map(g => `<tr>
          <td><div class="thumb">${g.photos[0] ? `<img src="${esc(g.photos[0])}" alt="">` : placeholder(g.type)}</div></td>
          <td><strong>${esc(g.brand)} ${esc(g.model)}</strong>${g.year ? ` <small>(${esc(g.year)})</small>` : ''}${g.is_sample ? ' <span class="pill">sample</span>' : ''}</td>
          <td>${esc(g.type)}</td><td>${esc(g.condition)}</td><td>${zar(g.price)}</td>
          <td><select class="inline-select" data-status="${g.id}">${opts(['available', 'reserved', 'sold', 'hidden'], g.status)}</select></td>
          <td>${g.featured ? '★' : ''}</td>
          <td class="row-actions"><button class="btn btn-outline btn-sm" data-edit="${g.id}">Edit</button><a class="btn btn-outline btn-sm" href="/guitar?id=${g.id}" target="_blank">View</a></td>
        </tr>`).join('')}</tbody></table>` : '<div class="empty" style="border:0">No guitars here yet.</div>'}</div>`;
    $('#invF').addEventListener('change', e => { invFilter = e.target.value; inventory(); });
    $('#addGuitar').addEventListener('click', () => editGuitar(null));
    view.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editGuitar(list.find(g => g.id === Number(b.dataset.edit)))));
    view.querySelectorAll('[data-status]').forEach(sel => sel.addEventListener('change', async () => {
      const g = list.find(x => x.id === Number(sel.dataset.status));
      await api(`/api/admin/guitars/${g.id}`, { method: 'PUT', body: { ...g, status: sel.value } });
      G4U.toast('Status updated'); refreshStats();
    }));
  }

  function editGuitar(g) {
    const isNew = !g;
    g = g || { brand: '', model: '', type: 'Electric', year: '', condition: 'Excellent', price: '', description: '', specs: '', status: 'available', featured: false, photos: [] };
    let photos = [...g.photos];
    openModal(`
      <h2>${isNew ? 'Add a guitar' : `Edit ${esc(g.brand)} ${esc(g.model)}`}</h2>
      <div class="field-row">
        <div class="field"><label>Brand</label><input name="brand" required value="${esc(g.brand)}"></div>
        <div class="field"><label>Model</label><input name="model" required value="${esc(g.model)}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Type</label><select name="type">${opts(meta.types, g.type)}</select></div>
        <div class="field"><label>Condition</label><select name="condition">${opts(meta.conditions, g.condition)}</select></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Price (R)</label><input name="price" required inputmode="numeric" value="${esc(g.price)}"></div>
        <div class="field"><label>Year</label><input name="year" value="${esc(g.year)}" placeholder="e.g. 2019"></div>
      </div>
      <div class="field"><label>Description</label><textarea name="description" rows="4">${esc(g.description)}</textarea><span class="hint">Mention condition details honestly: dings, fret wear, mods, what's included.</span></div>
      <div class="field"><label>Specifications</label><textarea name="specs" rows="5" placeholder="Body: Alder&#10;Neck: Maple&#10;Pickups: …">${esc(g.specs)}</textarea><span class="hint">One per line as "Label: value".</span></div>
      <div class="field-row">
        <div class="field"><label>Status</label><select name="status">${opts(['available', 'reserved', 'sold', 'hidden'], g.status)}</select></div>
        <div class="field" style="justify-content:flex-end"><label class="checkline"><input type="checkbox" name="featured" ${g.featured ? 'checked' : ''}> Feature on home page</label></div>
      </div>
      <div class="field"><label>Photos</label>
        ${isNew ? '<span class="hint">Save the guitar first, then you can add photos.</span>' : `
        <div class="photo-grid" id="photoGrid"></div>
        <input type="file" id="photoInput" accept="image/jpeg,image/png,image/webp" multiple>
        <span class="hint">JPG, PNG or WebP up to 8MB each. The first photo is the cover.</span>`}
      </div>
      <div class="form-msg"></div>
      <div class="modal-actions">
        ${isNew ? '' : '<button class="btn btn-danger" value="delete" formnovalidate>Delete</button>'}
        <div class="right"><button class="btn btn-outline" value="cancel" formnovalidate>Cancel</button><button class="btn btn-primary" value="save">${isNew ? 'Add guitar' : 'Save changes'}</button></div>
      </div>`, async (action, f) => {
      if (action === 'delete') {
        if (!confirmDel('this guitar')) return false;
        await api(`/api/admin/guitars/${g.id}`, { method: 'DELETE' }); G4U.toast('Guitar deleted'); return;
      }
      const body = { ...G4U.formData(f), featured: f.elements.featured.checked, photos };
      if (isNew) {
        const created = await api('/api/admin/guitars', { method: 'POST', body });
        G4U.toast('Guitar added. Now add some photos.');
        modal.close(); await reload(); editGuitar(created); return false;
      }
      await api(`/api/admin/guitars/${g.id}`, { method: 'PUT', body }); G4U.toast('Saved');
    });
    if (isNew) return;
    const grid = $('#photoGrid');
    const renderPhotos = () => {
      grid.innerHTML = photos.length ? photos.map((p, i) => `<div class="ph-item"><img src="${esc(p)}" alt="">${i === 0 ? '<span class="cover">Cover</span>' : ''}<div class="acts"><button type="button" data-left="${i}" title="Move left">◀</button><button type="button" data-rm="${i}" title="Remove">✕</button><button type="button" data-right="${i}" title="Move right">▶</button></div></div>`).join('') : '<span class="hint">No photos yet.</span>';
    };
    renderPhotos();
    grid.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const d = b.dataset;
      if (d.rm !== undefined) photos.splice(Number(d.rm), 1);
      if (d.left !== undefined && d.left > 0) { const i = Number(d.left); [photos[i - 1], photos[i]] = [photos[i], photos[i - 1]]; }
      if (d.right !== undefined && Number(d.right) < photos.length - 1) { const i = Number(d.right); [photos[i + 1], photos[i]] = [photos[i], photos[i + 1]]; }
      renderPhotos();
    });
    $('#photoInput').addEventListener('change', async e => {
      const files = [...e.target.files]; if (!files.length) return;
      const fd = new FormData(); files.forEach(f => fd.append('photos', f));
      try {
        G4U.toast('Uploading…');
        const updated = await api(`/api/admin/guitars/${g.id}/photos`, { method: 'POST', body: fd });
        const added = updated.photos.filter(p => !g.photos.includes(p));
        g.photos = updated.photos; photos = photos.concat(added); renderPhotos();
        G4U.toast(`${added.length} photo${added.length === 1 ? '' : 's'} uploaded`);
      } catch (err) { G4U.toast(err.message, true); }
      e.target.value = '';
    });
  }

  // ---------- reservations ----------
  async function reservations() {
    const list = await api('/api/admin/reservations');
    view.innerHTML = `
      <div class="admin-head"><div><h1>Reservations</h1><p>Confirm to send the customer your payment details. Mark <em>Completed</em> once paid and collected/shipped; the guitar is then marked sold. Cancelling puts the guitar back on sale.</p></div></div>
      <div class="table-wrap">${list.length ? `<table class="t"><thead><tr><th>Ref</th><th>Guitar</th><th>Customer</th><th>Delivery</th><th>Received</th><th>Status</th><th></th></tr></thead><tbody>
        ${list.map(r => `<tr>
          <td><strong>${esc(r.ref)}</strong></td>
          <td>${esc(r.guitar_label)}<br><small>${zar(r.price)}</small></td>
          <td>${esc(r.name)}<br><small><a href="mailto:${esc(r.email)}">${esc(r.email)}</a> · <a href="https://wa.me/${esc(waNum(r.phone))}" target="_blank" rel="noopener">${esc(r.phone)}</a></small>${r.message ? `<br><small class="pre" style="color:var(--ink-soft)">“${esc(r.message)}”</small>` : ''}</td>
          <td>${r.fulfilment === 'courier' ? `Courier<br><small class="pre">${esc(r.address)}</small>` : 'Collection'}</td>
          <td><small>${esc(dateTime(r.created_at))}</small></td>
          <td><select class="inline-select" data-res="${r.id}">${opts(Object.entries(RES_LABEL), r.status)}</select></td>
          <td><button class="btn btn-outline btn-sm" data-del="${r.id}" title="Delete">✕</button></td>
        </tr>`).join('')}</tbody></table>` : '<div class="empty" style="border:0">No reservations yet. When a customer reserves a guitar it will appear here.</div>'}</div>`;
    view.querySelectorAll('[data-res]').forEach(sel => sel.addEventListener('change', async () => {
      await api(`/api/admin/reservations/${sel.dataset.res}`, { method: 'PUT', body: { status: sel.value } });
      G4U.toast(sel.value === 'confirmed' ? 'Confirmed. Customer has been emailed.' : 'Reservation updated'); refreshStats();
    }));
    view.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      if (!confirmDel('this reservation record')) return;
      await api(`/api/admin/reservations/${b.dataset.del}`, { method: 'DELETE' }); reload();
    }));
  }
  const waNum = p => { const d = String(p).replace(/\D/g, ''); return d.startsWith('0') ? '27' + d.slice(1) : d; };

  // ---------- repairs ----------
  let repFilter = 'open';
  async function repairs() {
    const all = await api('/api/admin/repairs');
    const list = repFilter === 'open' ? all.filter(r => !['collected', 'cancelled'].includes(r.status)) : repFilter ? all.filter(r => r.status === repFilter) : all;
    view.innerHTML = `
      <div class="admin-head"><div><h1>Repairs</h1><p>Click a job to update its status, quote and notes. Customers see status changes and the customer note on the tracking page.</p></div><button class="btn btn-primary" id="addRepair">+ Book in a walk-in</button></div>
      <div class="toolbar"><label class="label" for="repF">Show</label><select id="repF">${opts([['open', 'Open jobs'], ['', 'All jobs'], ...meta.repairStatuses.map(s => [s.value, s.label])], repFilter)}</select></div>
      <div class="table-wrap">${list.length ? `<table class="t"><thead><tr><th>Ref</th><th>Customer</th><th>Guitar</th><th>Services</th><th>Drop-off</th><th>Quote</th><th>Status</th></tr></thead><tbody>
        ${list.map(r => `<tr class="click" data-id="${r.id}">
          <td><strong>${esc(r.ref)}</strong><br><small>${esc(date(r.created_at))}</small></td>
          <td>${esc(r.name)}<br><small>${esc(r.phone)}</small></td>
          <td>${esc([r.guitar_brand, r.guitar_model].filter(Boolean).join(' ') || '-')}<br><small>${esc(r.guitar_type)}</small></td>
          <td style="max-width:260px"><small>${esc(r.service_names || r.issue.slice(0, 80))}</small></td>
          <td><small>${esc(r.dropoff_date ? date(r.dropoff_date) : 'Flexible')}</small></td>
          <td>${r.quote != null ? zar(r.quote) : '<small>-</small>'}</td>
          <td>${pill(r.status, { requested: 'pill-amber', booked: 'pill-blue', received: 'pill-blue', in_progress: 'pill-blue', awaiting_parts: 'pill-amber', ready: 'pill-green', cancelled: 'pill-rust' })}</td>
        </tr>`).join('')}</tbody></table>` : '<div class="empty" style="border:0">No repair jobs here.</div>'}</div>`;
    $('#repF').addEventListener('change', e => { repFilter = e.target.value; repairs(); });
    $('#addRepair').addEventListener('click', addWalkIn);
    view.querySelectorAll('tr[data-id]').forEach(tr => tr.addEventListener('click', () => editRepair(Number(tr.dataset.id))));
  }

  async function editRepair(id) {
    const r = await api(`/api/admin/repairs/${id}`);
    openModal(`
      <h2>${esc(r.ref)}: ${esc([r.guitar_brand, r.guitar_model].filter(Boolean).join(' ') || r.guitar_type)}</h2>
      <dl class="kv">
        <dt>Customer</dt><dd>${esc(r.name)} · <a href="mailto:${esc(r.email)}">${esc(r.email)}</a> · <a href="https://wa.me/${esc(waNum(r.phone))}" target="_blank" rel="noopener">${esc(r.phone)}</a></dd>
        <dt>Guitar</dt><dd>${esc(r.guitar_type)} ${esc(r.guitar_brand)} ${esc(r.guitar_model)}</dd>
        <dt>Services</dt><dd>${esc(r.service_names || '-')}</dd>
        <dt>Problem</dt><dd class="pre">${esc(r.issue || '-')}</dd>
        <dt>Drop-off</dt><dd>${esc(r.dropoff_date ? date(r.dropoff_date) : 'Flexible')}</dd>
      </dl>
      <div class="field-row">
        <div class="field"><label>Status</label><select name="status">${opts(meta.repairStatuses.map(s => [s.value, s.label]), r.status)}</select></div>
        <div class="field"><label>Quote (R)</label><input name="quote" inputmode="numeric" value="${r.quote ?? ''}" placeholder="Leave blank until quoted"></div>
      </div>
      <div class="field"><label>Update note for this status change (optional)</label><input name="event_note" placeholder="e.g. Frets levelled, new strings fitted. Ready Thursday."><span class="hint">Shown in the customer's tracking history and emailed to them.</span></div>
      <div class="field"><label>Note to customer (always visible on tracking page)</label><textarea name="customer_note" rows="2">${esc(r.customer_note)}</textarea></div>
      <div class="field"><label>Internal workshop notes (private)</label><textarea name="internal_note" rows="3">${esc(r.internal_note)}</textarea></div>
      <label class="checkline"><input type="checkbox" name="notify" checked> Email the customer when the status changes</label>
      <details style="margin-top:6px"><summary style="cursor:pointer;font-weight:600;font-size:.9rem">History (${r.events.length})</summary>
        <ul class="timeline">${r.events.slice().reverse().map(ev => `<li><div class="t-label">${esc(REPAIR_LABEL(ev.status))}</div><div class="t-date">${esc(dateTime(ev.created_at))}</div>${ev.note ? `<div class="t-note">${esc(ev.note)}</div>` : ''}</li>`).join('')}</ul>
      </details>
      <div class="form-msg"></div>
      <div class="modal-actions">
        <button class="btn btn-danger" value="delete" formnovalidate>Delete job</button>
        <div class="right"><button class="btn btn-outline" value="cancel" formnovalidate>Close</button><button class="btn btn-primary" value="save">Save</button></div>
      </div>`, async (action, f) => {
      if (action === 'delete') {
        if (!confirmDel(`repair ${r.ref}`)) return false;
        await api(`/api/admin/repairs/${r.id}`, { method: 'DELETE' }); return;
      }
      const b = G4U.formData(f);
      await api(`/api/admin/repairs/${r.id}`, { method: 'PUT', body: { ...b, notify: f.elements.notify.checked } });
      G4U.toast('Repair updated');
    });
  }

  function addWalkIn() {
    openModal(`
      <h2>Book in a walk-in repair</h2>
      <div class="field-row"><div class="field"><label>Customer name</label><input name="name" required></div><div class="field"><label>Phone</label><input name="phone" required></div></div>
      <div class="field"><label>Email</label><input name="email" type="email" required><span class="hint">Needed so the customer can track the repair online.</span></div>
      <div class="field-row"><div class="field"><label>Type</label><select name="guitar_type">${opts([...meta.types, 'Other'], 'Electric')}</select></div><div class="field"><label>Brand</label><input name="guitar_brand"></div></div>
      <div class="field"><label>Model</label><input name="guitar_model"></div>
      <div class="field"><label>Work required</label><input name="service_names" placeholder="e.g. Full setup, bone nut"></div>
      <div class="field"><label>Notes</label><textarea name="issue" rows="3"></textarea></div>
      <div class="field"><label>Quote (R)</label><input name="quote" inputmode="numeric"></div>
      <div class="form-msg"></div>
      <div class="modal-actions"><div class="right"><button class="btn btn-outline" value="cancel" formnovalidate>Cancel</button><button class="btn btn-primary" value="save">Create job</button></div></div>`,
    async (a, f) => { const r = await api('/api/admin/repairs', { method: 'POST', body: G4U.formData(f) }); G4U.toast(`Created ${r.ref}. Give this reference to the customer.`); });
  }

  // ---------- services ----------
  async function services() {
    const list = await api('/api/admin/services');
    view.innerHTML = `
      <div class="admin-head"><div><h1>Repair services</h1><p>These appear on the Repairs page and in the booking form. Prices are starting prices in rand.</p></div><button class="btn btn-primary" id="addSvc">+ Add a service</button></div>
      <div class="table-wrap"><table class="t"><thead><tr><th>Order</th><th>Category</th><th>Service</th><th>Price</th><th>Turnaround</th><th>Shown</th><th></th></tr></thead><tbody>
        ${list.map(s => `<tr><td>${s.sort}</td><td>${esc(s.category)}</td><td><strong>${esc(s.name)}</strong></td><td>${zar(s.price_from)} <small>${esc(s.price_note)}</small></td><td>${esc(s.turnaround)}</td><td>${s.active ? 'Yes' : 'No'}</td><td><button class="btn btn-outline btn-sm" data-edit="${s.id}">Edit</button></td></tr>`).join('')}
      </tbody></table></div>`;
    $('#addSvc').addEventListener('click', () => editService(null, list));
    view.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editService(list.find(s => s.id === Number(b.dataset.edit)), list)));
  }
  function editService(s, list) {
    const isNew = !s;
    s = s || { category: 'Setups & Restrings', name: '', description: '', price_from: '', price_note: '', turnaround: '', active: 1, sort: (Math.max(0, ...list.map(x => x.sort)) + 1) };
    const cats = [...new Set(['Setups & Restrings', 'Fretwork', 'Structural & Finish', ...list.map(x => x.category)])];
    openModal(`
      <h2>${isNew ? 'Add a service' : 'Edit service'}</h2>
      <div class="field-row"><div class="field"><label>Category</label><input name="category" list="cats" required value="${esc(s.category)}"><datalist id="cats">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist></div><div class="field"><label>Name</label><input name="name" required value="${esc(s.name)}"></div></div>
      <div class="field"><label>Description</label><textarea name="description" rows="3">${esc(s.description)}</textarea></div>
      <div class="field-row"><div class="field"><label>Price (R)</label><input name="price_from" required inputmode="numeric" value="${esc(s.price_from)}"></div><div class="field"><label>Price note</label><input name="price_note" value="${esc(s.price_note)}" placeholder='e.g. "from" or "plus strings"'><span class="hint">Include "from" to show "from R…".</span></div></div>
      <div class="field-row"><div class="field"><label>Typical turnaround</label><input name="turnaround" value="${esc(s.turnaround)}" placeholder="e.g. 2–3 days"></div><div class="field"><label>Display order</label><input name="sort" type="number" value="${esc(s.sort)}"></div></div>
      <label class="checkline"><input type="checkbox" name="active" ${s.active ? 'checked' : ''}> Show on website</label>
      <div class="form-msg"></div>
      <div class="modal-actions">${isNew ? '' : '<button class="btn btn-danger" value="delete" formnovalidate>Delete</button>'}<div class="right"><button class="btn btn-outline" value="cancel" formnovalidate>Cancel</button><button class="btn btn-primary" value="save">Save</button></div></div>`,
    async (action, f) => {
      if (action === 'delete') { if (!confirmDel('this service')) return false; await api(`/api/admin/services/${s.id}`, { method: 'DELETE' }); return; }
      const body = { ...G4U.formData(f), active: f.elements.active.checked };
      await api(isNew ? '/api/admin/services' : `/api/admin/services/${s.id}`, { method: isNew ? 'POST' : 'PUT', body });
      G4U.toast('Service saved');
    });
  }

  // ---------- messages ----------
  async function messages() {
    const list = await api('/api/admin/messages');
    view.innerHTML = `
      <div class="admin-head"><div><h1>Messages</h1><p>Enquiries sent through the contact form.</p></div></div>
      <div class="table-wrap">${list.length ? `<table class="t"><thead><tr><th>From</th><th>Topic</th><th>Message</th><th>Received</th><th></th></tr></thead><tbody>
        ${list.map(m => `<tr class="${m.is_read ? '' : 'unread'}"><td>${esc(m.name)}<br><small><a href="mailto:${esc(m.email)}?subject=${encodeURIComponent('Re: ' + (m.subject || 'Your enquiry'))}">${esc(m.email)}</a>${m.phone ? ` · <a href="https://wa.me/${esc(waNum(m.phone))}" target="_blank" rel="noopener">${esc(m.phone)}</a>` : ''}</small></td><td>${esc(m.subject)}</td><td class="pre" style="max-width:420px">${esc(m.body)}</td><td><small>${esc(dateTime(m.created_at))}</small></td>
          <td class="row-actions"><button class="btn btn-outline btn-sm" data-read="${m.id}" data-v="${m.is_read ? 0 : 1}">${m.is_read ? 'Mark unread' : 'Mark read'}</button><button class="btn btn-outline btn-sm" data-del="${m.id}">✕</button></td></tr>`).join('')}
      </tbody></table>` : '<div class="empty" style="border:0">No messages yet.</div>'}</div>`;
    view.querySelectorAll('[data-read]').forEach(b => b.addEventListener('click', async () => { await api(`/api/admin/messages/${b.dataset.read}`, { method: 'PUT', body: { is_read: b.dataset.v === '1' } }); reload(); }));
    view.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => { if (!confirmDel('this message')) return; await api(`/api/admin/messages/${b.dataset.del}`, { method: 'DELETE' }); reload(); }));
  }

  // ---------- reviews ----------
  async function reviews() {
    const list = await api('/api/admin/reviews');
    view.innerHTML = `
      <div class="admin-head"><div><h1>Reviews</h1><p>Approve reviews to show them on the home page.</p></div></div>
      <div class="table-wrap">${list.length ? `<table class="t"><thead><tr><th>Rating</th><th>Review</th><th>From</th><th>Status</th><th></th></tr></thead><tbody>
        ${list.map(r => `<tr><td class="stars">${G4U.stars(r.rating)}</td><td style="max-width:460px">${esc(r.body)}</td><td>${esc(r.name)}<br><small>${r.kind === 'repair' ? 'Repair' : 'Purchase'} · ${esc(date(r.created_at))}</small></td><td>${r.approved ? '<span class="pill pill-green">Live</span>' : '<span class="pill pill-amber">Pending</span>'}</td>
          <td class="row-actions"><button class="btn btn-outline btn-sm" data-ap="${r.id}" data-v="${r.approved ? 0 : 1}">${r.approved ? 'Hide' : 'Approve'}</button><button class="btn btn-outline btn-sm" data-del="${r.id}">✕</button></td></tr>`).join('')}
      </tbody></table>` : '<div class="empty" style="border:0">No reviews yet.</div>'}</div>`;
    view.querySelectorAll('[data-ap]').forEach(b => b.addEventListener('click', async () => { await api(`/api/admin/reviews/${b.dataset.ap}`, { method: 'PUT', body: { approved: b.dataset.v === '1' } }); reload(); }));
    view.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => { if (!confirmDel('this review')) return; await api(`/api/admin/reviews/${b.dataset.del}`, { method: 'DELETE' }); reload(); }));
  }

  // ---------- settings ----------
  async function settings() {
    const s = await api('/api/admin/settings');
    const f = (k, label, hint = '', ta = false) => `<div class="field"><label for="st-${k}">${label}</label>${ta ? `<textarea id="st-${k}" name="${k}" rows="3">${esc(s[k])}</textarea>` : `<input id="st-${k}" name="${k}" value="${esc(s[k])}">`}${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
    view.innerHTML = `
      <div class="admin-head"><div><h1>Settings</h1><p>Business details shown across the website and in customer emails.</p></div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:20px;align-items:start">
        <form class="panel" id="settingsForm">
          <h3>Business details</h3>
          <div class="field-row">${f('business_name', 'Business name')}${f('owner_name', 'Owner name')}</div>
          <div class="field-row">${f('phone', 'Phone (display)')}${f('whatsapp', 'WhatsApp number', 'International format, digits only, e.g. 27648567019')}</div>
          ${f('email', 'Email', 'Shown on the site and used for notifications unless NOTIFY_EMAIL is set.')}
          ${f('area', 'Area / location')}
          ${f('hours', 'Opening hours', 'One line per row.', true)}
          ${f('bank_details', 'Bank details (EFT)', 'Only sent to customers by email when you confirm a reservation. Never shown publicly.', true)}
          ${f('delivery_note', 'Collection & delivery note', '', true)}
          <div class="field-row">${f('instagram', 'Instagram URL')}${f('facebook', 'Facebook URL')}</div>
          ${f('announcement', 'Announcement bar', 'Optional message across the top of every page, e.g. "Closed 24–26 Dec". Leave blank to hide.')}
          <button class="btn btn-primary" type="submit">Save settings</button>
        </form>
        <form class="panel" id="pwForm">
          <h3>Change admin password</h3>
          ${stats.passwordFromEnv ? '<p class="notice">Your password is set by the ADMIN_PASSWORD environment variable on your server. Change it there.</p>' : `
          <div class="field"><label>Current password</label><input type="password" name="current" required autocomplete="current-password"></div>
          <div class="field"><label>New password</label><input type="password" name="next" required minlength="8" autocomplete="new-password"></div>
          <button class="btn btn-dark" type="submit">Update password</button>`}
          <div class="form-msg" id="pwMsg"></div>
        </form>
      </div>`;
    $('#settingsForm').addEventListener('submit', async e => { e.preventDefault(); await api('/api/admin/settings', { method: 'PUT', body: G4U.formData(e.target) }); G4U.toast('Settings saved'); });
    $('#pwForm').addEventListener('submit', async e => {
      e.preventDefault();
      const m = $('#pwMsg');
      try { await api('/api/admin/password', { method: 'PUT', body: G4U.formData(e.target) }); e.target.reset(); m.className = 'form-msg ok'; m.textContent = 'Password updated.'; }
      catch (err) { m.className = 'form-msg error'; m.textContent = err.message; }
    });
  }

  boot();
})();
