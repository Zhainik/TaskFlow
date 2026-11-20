const STORAGE_KEY = 'taskflow_tasks_v1';

const defaultTasks = [
  {
    id: 't-1',
    title: 'Настроить базовую структуру проекта',
    desc: 'Разделить разметку, стили и логику по отдельным файлам.',
    priority: 'low',
    status: 'done',
    createdAt: '18.11.2026'
  },
  {
    id: 't-2',
    title: 'Реализовать Drag & Drop между колонками',
    desc: 'Добавить визуальную подсветку зоны сброса и сохранение позиции.',
    priority: 'high',
    status: 'inprogress',
    createdAt: '19.11.2026'
  },
  {
    id: 't-3',
    title: 'Добавить фильтрацию по приоритету',
    desc: 'Связать селект и строку поиска в единый рендер списка.',
    priority: 'medium',
    status: 'todo',
    createdAt: '20.11.2026'
  }
];

let tasks = loadTasks();
let draggedTaskId = null;

const lists = {
  todo: document.getElementById('list-todo'),
  inprogress: document.getElementById('list-inprogress'),
  done: document.getElementById('list-done')
};

const counters = {
  todo: document.getElementById('count-todo'),
  inprogress: document.getElementById('count-inprogress'),
  done: document.getElementById('count-done')
};

const searchInput = document.getElementById('searchInput');
const priorityFilter = document.getElementById('priorityFilter');
const modal = document.getElementById('taskModal');
const taskForm = document.getElementById('taskForm');
const modalTitle = document.getElementById('modalTitle');

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultTasks;
  } catch {
    return defaultTasks;
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function formatPriority(priority) {
  const map = { high: 'Высокий', medium: 'Средний', low: 'Низкий' };
  return map[priority] || 'Средний';
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedPriority = priorityFilter.value;

  Object.values(lists).forEach((el) => {
    el.innerHTML = '';
  });

  const filtered = tasks.filter((task) => {
    const matchesText =
      task.title.toLowerCase().includes(query) ||
      task.desc.toLowerCase().includes(query);
    const matchesPriority =
      selectedPriority === 'all' || task.priority === selectedPriority;
    return matchesText && matchesPriority;
  });

  const counts = { todo: 0, inprogress: 0, done: 0 };

  filtered.forEach((task) => {
    counts[task.status] += 1;
    const card = createCardElement(task);
    lists[task.status].appendChild(card);
  });

  Object.keys(counters).forEach((key) => {
    counters[key].textContent = counts[key];
  });
}

function createCardElement(task) {
  const card = document.createElement('article');
  card.className = 'card';
  card.draggable = true;
  card.dataset.id = task.id;

  card.innerHTML = `
    <div class="card-top">
      <span class="badge ${task.priority}">${formatPriority(task.priority)}</span>
      <div class="card-actions">
        <button type="button" class="icon-btn edit-btn" title="Редактировать">✎</button>
        <button type="button" class="icon-btn delete-btn" title="Удалить">✕</button>
      </div>
    </div>
    <h3>${escapeHTML(task.title)}</h3>
    ${task.desc ? `<p>${escapeHTML(task.desc)}</p>` : ''}
    <div class="card-footer">
      <span>${task.createdAt}</span>
      <select class="move-select" aria-label="Переместить задачу">
        <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>К выполнению</option>
        <option value="inprogress" ${task.status === 'inprogress' ? 'selected' : ''}>В работе</option>
        <option value="done" ${task.status === 'done' ? 'selected' : ''}>Готово</option>
      </select>
    </div>
  `;

  card.addEventListener('dragstart', () => {
    draggedTaskId = task.id;
    card.classList.add('dragging');
  });

  card.addEventListener('dragend', () => {
    draggedTaskId = null;
    card.classList.remove('dragging');
  });

  card.querySelector('.edit-btn').addEventListener('click', () => openEditModal(task));
  card.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));
  card.querySelector('.move-select').addEventListener('change', (e) => {
    updateTaskStatus(task.id, e.target.value);
  });

  return card;
}

function updateTaskStatus(id, newStatus) {
  tasks = tasks.map((t) => (t.id === id ? { ...t, status: newStatus } : t));
  saveTasks();
  render();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  render();
}

function openCreateModal() {
  modalTitle.textContent = 'Новая задача';
  taskForm.reset();
  document.getElementById('taskId').value = '';
  modal.hidden = false;
  document.getElementById('taskTitle').focus();
}

function openEditModal(task) {
  modalTitle.textContent = 'Редактировать задачу';
  document.getElementById('taskId').value = task.id;
  document.getElementById('taskTitle').value = task.title;
  document.getElementById('taskDesc').value = task.desc;
  document.getElementById('taskPriority').value = task.priority;
  document.getElementById('taskStatus').value = task.status;
  modal.hidden = false;
}

function closeModal() {
  modal.hidden = true;
}

Object.values(lists).forEach((listEl) => {
  listEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    listEl.classList.add('drag-over');
  });

  listEl.addEventListener('dragleave', () => {
    listEl.classList.remove('drag-over');
  });

  listEl.addEventListener('drop', (e) => {
    e.preventDefault();
    listEl.classList.remove('drag-over');
    if (draggedTaskId) {
      updateTaskStatus(draggedTaskId, listEl.dataset.status);
    }
  });
});

taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('taskId').value;
  const title = document.getElementById('taskTitle').value.trim();
  const desc = document.getElementById('taskDesc').value.trim();
  const priority = document.getElementById('taskPriority').value;
  const status = document.getElementById('taskStatus').value;

  if (!title) return;

  if (id) {
    tasks = tasks.map((t) =>
      t.id === id ? { ...t, title, desc, priority, status } : t
    );
  } else {
    const today = new Date().toLocaleDateString('ru-RU');
    tasks.unshift({
      id: 't-' + Date.now(),
      title,
      desc,
      priority,
      status,
      createdAt: today
    });
  }

  saveTasks();
  closeModal();
  render();
});

document.getElementById('openModalBtn').addEventListener('click', openCreateModal);
document.getElementById('closeModalBtn').addEventListener('click', closeModal);
document.getElementById('cancelModalBtn').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

searchInput.addEventListener('input', render);
priorityFilter.addEventListener('change', render);

render();
