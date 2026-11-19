const STORAGE_KEY = "income-expense-entries";

const form = document.querySelector("#entry-form");
const formTitle = document.querySelector("#form-title");
const submitButton = document.querySelector("#submit-button");
const cancelButton = document.querySelector("#cancel-edit");
const amountInput = document.querySelector("#amount");
const typeInput = document.querySelector("#type");
const categoryInput = document.querySelector("#category");
const dateInput = document.querySelector("#date");
const list = document.querySelector("#entries");
const empty = document.querySelector("#empty");
const count = document.querySelector("#entry-count");
const totalIncomeEl = document.querySelector("#total-income");
const totalExpensesEl = document.querySelector("#total-expenses");
const balanceEl = document.querySelector("#balance");

const money = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
});

let entries = loadEntries();
let editingId = null;

dateInput.value = today();
render();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const fields = readForm();
  if (!fields) return;

  if (editingId) {
    const entry = entries.find((item) => item.id === editingId);
    if (entry) Object.assign(entry, fields);
  } else {
    entries.push({ id: crypto.randomUUID(), ...fields });
  }

  const savedDate = fields.date;
  saveEntries();
  resetForm(savedDate);
  render();
  amountInput.focus();
});

cancelButton.addEventListener("click", () => {
  resetForm(today());
  render();
  amountInput.focus();
});

list.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button) return;

  const entry = entries.find((item) => item.id === button.dataset.id);
  if (!entry) return;

  if (button.dataset.action === "edit") {
    startEdit(entry);
    return;
  }

  if (editingId === entry.id) resetForm(today());
  entries = entries.filter((item) => item.id !== entry.id);
  saveEntries();
  render();
});

function loadEntries() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry);
  } catch {
    return [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function isEntry(entry) {
  return (
    entry &&
    typeof entry.id === "string" &&
    typeof entry.category === "string" &&
    typeof entry.date === "string" &&
    (entry.type === "income" || entry.type === "expense") &&
    Number.isFinite(entry.amount)
  );
}

function render() {
  const income = sum("income");
  const expenses = sum("expense");
  const balance = income - expenses;

  totalIncomeEl.textContent = money.format(income);
  totalExpensesEl.textContent = money.format(expenses);
  balanceEl.textContent = money.format(balance);
  balanceEl.classList.toggle("negative", balance < 0);

  const sorted = [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  });

  list.replaceChildren(...sorted.map(renderEntry));
  empty.hidden = entries.length > 0;
  count.textContent = entries.length === 1 ? "1 entry" : `${entries.length} entries`;
}

function readForm() {
  const amount = Number(amountInput.value);
  const type = typeInput.value;
  const category = categoryInput.value.trim();
  const date = dateInput.value;

  if (!Number.isFinite(amount) || amount <= 0) {
    amountInput.focus();
    return null;
  }
  if (type !== "income" && type !== "expense") return null;
  if (!category || !date) return null;

  return {
    amount: Math.round(amount * 100) / 100,
    type,
    category,
    date,
  };
}

function startEdit(entry) {
  editingId = entry.id;
  amountInput.value = entry.amount;
  typeInput.value = entry.type;
  categoryInput.value = entry.category;
  dateInput.value = entry.date;
  formTitle.textContent = "Edit entry";
  submitButton.textContent = "Save changes";
  cancelButton.hidden = false;
  form.scrollIntoView({ block: "nearest" });
  amountInput.focus();
  render();
}

function resetForm(date) {
  editingId = null;
  form.reset();
  dateInput.value = date;
  formTitle.textContent = "Add an entry";
  submitButton.textContent = "Add entry";
  cancelButton.hidden = true;
}

function renderEntry(entry) {
  const item = document.createElement("li");
  item.className = entry.id === editingId ? "entry editing" : "entry";

  const main = document.createElement("div");
  main.className = "entry-main";

  const category = document.createElement("p");
  category.className = "entry-category";
  category.textContent = entry.category;

  const meta = document.createElement("p");
  meta.className = "entry-meta";

  const badge = document.createElement("span");
  badge.className = `badge ${entry.type}`;
  badge.textContent = entry.type === "income" ? "Income" : "Expense";
  meta.append(badge, document.createTextNode(formatDate(entry.date)));

  main.append(category, meta);

  const amount = document.createElement("p");
  amount.className = `entry-amount ${entry.type}`;
  const sign = entry.type === "income" ? "+" : "−";
  amount.textContent = `${sign}${money.format(entry.amount)}`;

  const actions = document.createElement("div");
  actions.className = "entry-actions";

  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "edit";
  edit.dataset.action = "edit";
  edit.dataset.id = entry.id;
  edit.textContent = "Edit";
  edit.setAttribute("aria-label", `Edit ${entry.category}`);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "delete";
  remove.dataset.action = "delete";
  remove.dataset.id = entry.id;
  remove.textContent = "Delete";
  remove.setAttribute("aria-label", `Delete ${entry.category}`);

  actions.append(edit, remove);
  item.append(main, amount, actions);
  return item;
}

function sum(type) {
  return entries
    .filter((entry) => entry.type === type)
    .reduce((total, entry) => total + entry.amount, 0);
}

function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
