const STORAGE_KEY = 'fintrack_transactions_v1';

const CATEGORIES = {
  expense: ['Продукты', 'Транспорт', 'Кафе и еда', 'Подписки', 'Здоровье', 'Другое'],
  income: ['Зарплата', 'Фриланс', 'Подарок', 'Кэшбэк']
};

const initialData = [
  { id: 1, type: 'income', amount: 180000, category: 'Зарплата', note: 'Аванс за месяц', date: '2026-11-15' },
  { id: 2, type: 'expense', amount: 14500, category: 'Продукты', note: 'Супермаркет на неделю', date: '2026-11-17' },
  { id: 3, type: 'expense', amount: 4200, category: 'Транспорт', note: 'Пополнение карты и такси', date: '2026-11-18' },
  { id: 4, type: 'expense', amount: 6800, category: 'Кафе и еда', note: 'Кофе и обед', date: '2026-11-19' }
];

let transactions = loadTransactions();

const txForm = document.getElementById('txForm');
const txCategory = document.getElementById('txCategory');
const txDate = document.getElementById('txDate');
const txList = document.getElementById('txList');
const typeFilter = document.getElementById('typeFilter');
const categoryBars = document.getElementById('categoryBars');

function loadTransactions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : initialData;
  } catch {
    return initialData;
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function formatMoney(num) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(num)) + ' ₸';
}

function populateCategories(type) {
  txCategory.innerHTML = CATEGORIES[type]
    .map((cat) => `<option value="${cat}">${cat}</option>`)
    .join('');
}

function updateSummary() {
  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = income - expense;

  document.getElementById('balanceValue').textContent = formatMoney(balance);
  document.getElementById('incomeValue').textContent = '+' + formatMoney(income);
  document.getElementById('expenseValue').textContent = '-' + formatMoney(expense);
}

function renderCategoryBreakdown() {
  const expenses = transactions.filter((t) => t.type === 'expense');
  const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);

  if (!totalExpense) {
    categoryBars.innerHTML = '<p class="tx-meta">Нет данных о расходах</p>';
    return;
  }

  const grouped = {};
  expenses.forEach((t) => {
    grouped[t.category] = (grouped[t.category] || 0) + t.amount;
  });

  const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]);

  categoryBars.innerHTML = sorted
    .map(([category, amount]) => {
      const percent = Math.round((amount / totalExpense) * 100);
      return `
        <div class="bar-item">
          <div class="bar-top">
            <span>${category}</span>
            <span>${formatMoney(amount)} (${percent}%)</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${percent}%"></div>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderList() {
  const filter = typeFilter.value;
  const visible = transactions
    .filter((t) => filter === 'all' || t.type === filter)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (!visible.length) {
    txList.innerHTML = '<div class="empty-state">Операций пока нет</div>';
    return;
  }

  txList.innerHTML = '';
  visible.forEach((tx) => {
    const item = document.createElement('div');
    item.className = 'tx-item';

    const info = document.createElement('div');
    info.className = 'tx-info';

    const title = document.createElement('strong');
    title.textContent = tx.note || tx.category;

    const meta = document.createElement('span');
    meta.className = 'tx-meta';
    meta.textContent = `${tx.category} • ${tx.date}`;

    info.append(title, meta);

    const right = document.createElement('div');
    right.className = 'tx-right';

    const amount = document.createElement('span');
    amount.className = `tx-amount ${tx.type}`;
    amount.textContent = `${tx.type === 'income' ? '+' : '-'}${formatMoney(tx.amount)}`;

    const delBtn = document.createElement('button');
    delBtn.className = 'del-btn';
    delBtn.type = 'button';
    delBtn.title = 'Удалить';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', () => {
      transactions = transactions.filter((itemTx) => itemTx.id !== tx.id);
      saveTransactions();
      renderAll();
    });

    right.append(amount, delBtn);
    item.append(info, right);
    txList.appendChild(item);
  });
}

function renderAll() {
  updateSummary();
  renderCategoryBreakdown();
  renderList();
}

document.querySelectorAll('input[name="txType"]').forEach((radio) => {
  radio.addEventListener('change', (e) => {
    populateCategories(e.target.value);
  });
});

txForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const type = document.querySelector('input[name="txType"]:checked').value;
  const amount = parseFloat(document.getElementById('txAmount').value);
  const category = txCategory.value;
  const note = document.getElementById('txNote').value.trim();
  const date = txDate.value;

  if (!amount || amount <= 0 || !date) return;

  transactions.unshift({
    id: Date.now(),
    type,
    amount,
    category,
    note,
    date
  });

  saveTransactions();
  txForm.reset();
  txDate.valueAsDate = new Date();
  populateCategories('expense');
  renderAll();
});

document.getElementById('exportCsvBtn').addEventListener('click', () => {
  const headers = ['Дата', 'Тип', 'Категория', 'Комментарий', 'Сумма'];
  const rows = transactions.map((t) => [
    t.date,
    t.type === 'income' ? 'Доход' : 'Расход',
    t.category,
    `"${(t.note || '').replace(/"/g, '""')}"`,
    t.amount
  ]);

  const csvContent = '﻿' + [headers, ...rows].map((r) => r.join(';')).join('
');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'fintrack-export.csv';
  link.click();
  URL.revokeObjectURL(url);
});

typeFilter.addEventListener('change', renderList);

txDate.valueAsDate = new Date();
populateCategories('expense');
renderAll();
