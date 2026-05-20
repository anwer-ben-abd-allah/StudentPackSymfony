// ============================================
// timetable.js  –  Frontend ↔ PHP API bridge
// ============================================
// Place next to timetable.html
// Make sure api.php is at API_URL below.
// ============================================

const API_URL = '../Authentification/slots_api.php';   // adjust path if needed, e.g. '../backend/api.php'

// ── State ─────────────────────────────────────
let subjects = [];   // { id, name, description, color }
let slots    = [];   // { id, subject, color, day, time }

// ── Boot ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await loadSubjects();
    await loadSlots();
});

// ── API helpers ───────────────────────────────
async function apiFetch(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text();

    let data;
    try {
        data = JSON.parse(text);
    } catch (err) {
        // Try to parse the last valid JSON object in case of concatenated responses
        const matches = text.match(/\{[^{}]*\}/g);
        if (matches && matches.length > 0) {
            try {
                data = JSON.parse(matches[matches.length - 1]);
            } catch (parseErr) {
                throw new Error('Réponse API non valide : ' + text.trim().slice(0, 200));
            }
        } else {
            throw new Error('Réponse API non valide : ' + text.trim().slice(0, 200));
        }
    }

    if (!data.success && data.error) throw new Error(data.error);
    return data;
}

// ── Load subjects ─────────────────────────────
async function loadSubjects() {
    try {
        const data = await apiFetch(`${API_URL}?action=subjects`);
        subjects = data.subjects;
        populateSubjectSelect();
        renderSubjectCards();
    } catch (err) {
        showNotification('Erreur lors du chargement des matières: ' + err.message, 'error');
    }
}

function populateSubjectSelect() {
    const sel = document.getElementById('matiere');
    if (!sel) return;
    sel.innerHTML = '<option value="">Choisir...</option>';
    subjects.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        sel.appendChild(opt);
    });
}

/* ════════════════════════════════════════════
   SUBJECT CARDS
════════════════════════════════════════════ */
function renderSubjectCards() {
    const container = document.querySelector('.subjects-grid');
    console.log("Rendering subject cards in container:", container);
    if (!container) return;
    container.innerHTML = '';
    console.log("subjects loaded:", subjects);
    subjects.forEach((s, i) => {
        const card = document.createElement('div');
        card.className = 'sub-card';
        card.style.setProperty('--sc', s.color);
        card.style.setProperty('--sc-glow', s.color + '22');
        card.style.animationDelay = (i * 55) + 'ms';
        card.innerHTML = `<h3>${s.name}</h3><p>${s.description}</p>`;
        container.appendChild(card);
    });
}

// ── Load timetable slots ───────────────────────
async function loadSlots() {
    try {
        const data = await apiFetch(`${API_URL}?action=slots`);
        slots = data.slots;
        renderTable();
        updateStatCounter();
    } catch (err) {
        showNotification('Erreur lors du chargement du planning: ' + err.message, 'error');
    }
}

// ── Render the weekly table ────────────────────
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const DAY_CLASS = {
    Lundi: 'day-lundi',
    Mardi: 'day-mardi',
    Mercredi: 'day-mercredi',
    Jeudi: 'day-jeudi',
    Vendredi: 'day-vendredi',
};

function renderTable() {
    const tbody = document.getElementById('emploiDuTemps');
    if (!tbody) return;

    tbody.innerHTML = '';

    const statSlots = document.getElementById('statSlots');
    const slotCount = document.getElementById('slotCount');
    if (statSlots) statSlots.textContent = slots.length;
    if (slotCount) slotCount.textContent = slots.length + ' cours';

    if (slots.length === 0) {
        const tr = document.createElement('tr');
        tr.className = 'empty-row';
        tr.innerHTML = `
      <td colspan="4">
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <p>Aucun cours planifié pour l'instant.<br/>Ajoutez votre premier cours ci-dessus.</p>
        </div>
      </td>`;
        tbody.appendChild(tr);
        console.log("No slots to display, showing empty state.");
        return;
    }

    const sorted = [...slots].sort((a, b) => {
        const di = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
        return di !== 0 ? di : a.time.localeCompare(b.time);
    });

    sorted.forEach((slot, i) => {
        const c  = slot.color;
        const tr = document.createElement('tr');
        tr.className            = DAY_CLASS[slot.day] || '';
        tr.style.animationDelay = (i * 40) + 'ms';

        tr.innerHTML = `
      <td class="day-cell">${slot.day}</td>
      <td class="time-cell">${slot.time}</td>
      <td>
        <span class="subject-badge" style="
          background: ${c}18;
          color: ${c};
          border: 1px solid ${c}33;
        ">
          <span style="
            display:inline-block;
            width:6px; height:6px;
            border-radius:50%;
            background:${c};
            box-shadow:0 0 6px ${c};
            flex-shrink:0;
          "></span>
          ${slot.subject}
        </span>
      </td>
      <td>
        <button class="btn-del" onclick="deleteSlot(${slot.id})">
          ✕ Supprimer
        </button>
      </td>`;

        tbody.appendChild(tr);
        console.log(`Rendered slot: ${slot.subject} on ${slot.day} at ${slot.time}`);
    });
}

// ── Bind form submit ───────────────────────────
function bindForm() {
    const form = document.getElementById('formMatiere');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const subjectId = document.getElementById('matiere').value;
        const day       = document.getElementById('jour').value;
        const time      = document.getElementById('heure').value;

        if (!subjectId || !day || !time) {
            showNotification('Veuillez remplir tous les champs.', 'error');
            return;
        }

        try {
            await apiFetch(`${API_URL}?action=add_slot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject_id: subjectId, day, time }),
            });
            form.reset();
            showNotification('Cours ajouté avec succès !', 'success');
            await loadSlots();   // refresh table from DB
        } catch (err) {
            showNotification(err.message, 'error');
        }
    });
}

// ── Delete a slot ──────────────────────────────
async function deleteSlot(id) {
    if (!confirm('Supprimer ce cours ?')) return;
    try {
        await apiFetch(`${API_URL}?action=delete_slot&id=${id}`, { method: 'DELETE' });
        showNotification('Cours supprimé.', 'success');
        await loadSlots();
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

// ── Simple toast notification ──────────────────
function showNotification(msg, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'toast ' + type + ' show';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

// ── Update header stat counter ─────────────────
function updateStatCounter() {
    const el = document.getElementById('statSlots');
    if (el) el.textContent = slots.length;
}

// ── Mobile sidebar toggle ─────────────────────
const burger = document.getElementById('burger');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');

function openSidebar() {
    sidebar?.classList.add('open');
    overlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
}
function closeSidebar() {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('open');
    document.body.style.overflow = '';
}

burger?.addEventListener('click', openSidebar);
overlay?.addEventListener('click', closeSidebar);
