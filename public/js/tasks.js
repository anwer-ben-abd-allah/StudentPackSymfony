const API_URL = '/api/tasks';

const PRIORITIES = ['Haute', 'Moyenne', 'Basse'];

let tasks = [];
let editingTaskId = null;
let filters = {
  status: 'all',
  priority: 'all',
  search: ''
};

document.addEventListener('DOMContentLoaded', async () => {
  bindForm();
  bindFilters();
  await loadTasks();
});

async function apiFetch(url, options = {}) {
  const res = await fetch(url, { credentials: 'same-origin', ...options });
  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error('Réponse API non valide.');
  }

  if (!data.success) {
    throw new Error(data.error || 'Erreur serveur inconnue.');
  }
  return data;
}

async function loadTasks() {
  try {
    const data = await apiFetch(`${API_URL}?action=list`);
    tasks = data.tasks.map(task => ({
      ...task,
      is_done: Boolean(task.is_done),
    }));
    renderTaskList();
    updateStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function bindForm() {
  const form = document.getElementById('taskForm');
  const cancelButton = document.getElementById('cancelEdit');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const priority = document.getElementById('taskPriority').value;
    const due_date = document.getElementById('taskDueDate').value;
    const due_time = document.getElementById('taskDueTime').value;

    if (!title) {
      showToast('Donnez un titre à la tâche.', 'error');
      return;
    }

    try {
      if (editingTaskId) {
        await apiFetch(`${API_URL}?action=update`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingTaskId,
            title,
            description,
            priority,
            due_date: due_date || null,
            due_time: due_time || null,
          }),
        });
        showToast('Tâche mise à jour.', 'success');
      } else {
        await apiFetch(`${API_URL}?action=create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description,
            priority,
            due_date: due_date || null,
            due_time: due_time || null,
          }),
        });
        showToast('Tâche ajoutée.', 'success');
      }
      resetForm();
      await loadTasks();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  cancelButton?.addEventListener('click', (event) => {
    event.preventDefault();
    resetForm();
  });
}

function bindFilters() {
  const status = document.getElementById('filterStatus');
  const priority = document.getElementById('filterPriority');
  const search = document.getElementById('filterSearch');

  status?.addEventListener('change', (e) => {
    filters.status = e.target.value;
    renderTaskList();
  });
  priority?.addEventListener('change', (e) => {
    filters.priority = e.target.value;
    renderTaskList();
  });
  search?.addEventListener('input', (e) => {
    filters.search = e.target.value.trim().toLowerCase();
    renderTaskList();
  });
}

function renderTaskList() {
  const container = document.getElementById('taskList');
  if (!container) return;

  const visibleTasks = tasks
    .filter(task => {
      if (filters.status === 'todo' && task.is_done) return false;
      if (filters.status === 'done' && !task.is_done) return false;
      if (filters.status === 'overdue') {
        if (task.is_done) return false;
        if (!task.due_date) return false;
        return isOverdue(task);
      }
      return true;
    })
    .filter(task => {
      if (filters.priority === 'all') return true;
      return task.priority === filters.priority;
    })
    .filter(task => {
      if (!filters.search) return true;
      return task.title.toLowerCase().includes(filters.search)
        || (task.description || '').toLowerCase().includes(filters.search);
    })
    .sort(compareTasks);

  container.innerHTML = '';

  if (visibleTasks.length === 0) {
    container.innerHTML = `
      <div class="task-empty">
        <div class="empty-icon">🗒️</div>
        <p>Aucune tâche ne correspond à vos critères.</p>
      </div>`;
    return;
  }

  visibleTasks.forEach(task => {
    const card = document.createElement('article');
    card.className = 'task-card' + (task.is_done ? ' done' : '');
    card.innerHTML = `
      <div class="task-card-top">
        <label class="task-check">
          <input type="checkbox" ${task.is_done ? 'checked' : ''} onchange="toggleTaskStatus(${task.id}, this.checked)">
          <span>${escapeHtml(task.title)}</span>
        </label>
        <div class="task-tags">
          <span class="tag tag-priority tag-${task.priority.toLowerCase()}">${escapeHtml(task.priority)}</span>
        </div>
      </div>
      ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ''}
      <div class="task-card-footer">
        <div class="task-meta">
          <span class="task-due">${formatDueText(task)}</span>
          ${task.updated_at ? `<span class="task-updated">Mise à jour ${formatRelativeDate(task.updated_at)}</span>` : ''}
        </div>
        <div class="task-actions">
          <button type="button" onclick="editTask(${task.id})">Modifier</button>
          <button type="button" onclick="snoozeTask(${task.id})">Snooze</button>
          <button type="button" onclick="startFocus(${task.id})">Focus</button>
          <button type="button" class="btn-delete" onclick="deleteTask(${task.id})">Supprimer</button>
        </div>
      </div>`;
    container.appendChild(card);
  });
}

function compareTasks(a, b) {
  if (a.is_done !== b.is_done) return a.is_done ? 1 : -1;
  const aOver = isOverdue(a);
  const bOver = isOverdue(b);
  if (aOver !== bOver) return aOver ? -1 : 1;
  if (a.due_date && b.due_date) {
    if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_time && b.due_time) return a.due_time.localeCompare(b.due_time);
    if (a.priority !== b.priority) return PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority);
    return 0;
  }
  if (a.due_date) return -1;
  if (b.due_date) return 1;
  return PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority);
}

function isOverdue(task) {
  if (!task.due_date) return false;
  const now = new Date();
  const due = new Date(`${task.due_date}T${task.due_time || '23:59'}:00`);
  return due < now && !task.is_done;
}

function formatDueText(task) {
  if (!task.due_date) {
    return task.is_done ? 'Tâche complétée' : 'Aucune échéance';
  }
  const date = new Date(`${task.due_date}T${task.due_time || '23:59'}:00`);
  const formatter = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' });
  const day = formatter.format(date);
  const time = task.due_time ? ` à ${task.due_time}` : '';
  return isOverdue(task) ? `En retard · ${day}${time}` : `Échéance: ${day}${time}`;
}

function formatRelativeDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function editTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  editingTaskId = id;
  document.getElementById('taskTitle').value = task.title;
  document.getElementById('taskDescription').value = task.description || '';
  document.getElementById('taskPriority').value = task.priority || 'Moyenne';
  document.getElementById('taskDueDate').value = task.due_date || '';
  document.getElementById('taskDueTime').value = task.due_time || '';
  document.getElementById('formTitle').textContent = 'Modifier la tâche';
  document.getElementById('submitButton').textContent = 'Enregistrer';
  document.getElementById('cancelEdit').style.display = 'inline-flex';
}

async function deleteTask(id) {
  try {
    await apiFetch(`${API_URL}?action=delete&id=${id}`, { method: 'DELETE' });
    showToast('Tâche supprimée.', 'success');
    await loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function toggleTaskStatus(id, done) {
  try {
    await apiFetch(`${API_URL}?action=update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_done: done ? 1 : 0 }),
    });
    await loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function snoozeTask(id) {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    const newDate = `${yyyy}-${mm}-${dd}`;

    await apiFetch(`${API_URL}?action=update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, due_date: newDate }),
    });
    showToast('Tâche reportée à demain.', 'success');
    await loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function startFocus(id) {
  const url = '/pomodoro?task=' + encodeURIComponent(id);
  window.open(url, '_blank');
}

function resetForm() {
  editingTaskId = null;
  document.getElementById('taskForm').reset();
  document.getElementById('formTitle').textContent = 'Nouvelle tâche';
  document.getElementById('submitButton').textContent = 'Ajouter';
  document.getElementById('cancelEdit').style.display = 'none';
}

function updateStats() {
  const total = tasks.length;
  const done = tasks.filter(task => task.is_done).length;
  const overdue = tasks.filter(isOverdue).length;
  const pending = total - done;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statDone').textContent = done;
  document.getElementById('statOverdue').textContent = overdue;
  document.getElementById('statPending').textContent = pending;
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
