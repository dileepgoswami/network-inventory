// ✅ Cleaned version without autoLogout, theme, compact mode

const LS_DATA = "nim_data_v1";
const USERS_KEY = "nim_users_v1";

let data = [];
let currentEditId = null;
let currentUser = null;

const DEVICE_TYPES = [
  "Router", "Switch", "Server", "Access Point", "Firewall", "UPS", "Camera", "Patch Panel", "Fiber Cable"
];

// DOM references
const appScreen = document.getElementById("appScreen");
const settingsModal = document.getElementById("settingsModal");

const btnSettings = document.getElementById("btnSettings");
const btnCloseSettings = document.getElementById("btnCloseSettings");
const btnLogout = document.getElementById("btnLogout");

const searchBox = document.getElementById("searchBox");
const typeFilter = document.getElementById("typeFilter");
const tbody = document.querySelector("#tableInventory tbody");

const btnAdd = document.getElementById("btnAdd");
const btnExportExcel = document.getElementById("btnExportExcel");
const fileImport = document.getElementById("fileImportExcel");
const btnBackup = document.getElementById("btnBackup");
const btnSelectRestore = document.getElementById("btnSelectRestore");
const fileRestoreJSON = document.getElementById("fileRestoreJSON");
const btnResetData = document.getElementById("btnResetData");

const statTotal = document.getElementById("statTotal");
const statOnline = document.getElementById("statOnline");
const statOffline = document.getElementById("statOffline");
const statMaint = document.getElementById("statMaint");

const editModal = document.getElementById("editModal");
const btnSaveEdit = document.getElementById("btnSaveEdit");
const btnCloseEdit = document.getElementById("btnCloseEdit");

// USER / LOGIN related DOM
const btnLogin = document.getElementById("btnLogin");
const loginUserInput = document.getElementById("loginUser");
const loginPassInput = document.getElementById("loginPass");
const loginMsg = document.getElementById("loginMsg");

const btnChangePass = document.getElementById("btnChangePass");
const oldPassInput = document.getElementById("oldPass");
const newPassInput = document.getElementById("newPass");

const btnCreateUser = document.getElementById("btnCreateUser");
const newUserName = document.getElementById("newUserName");
const newUserPass = document.getElementById("newUserPass");
const newUserRole = document.getElementById("newUserRole");
const userMsg = document.getElementById("userMsg");
const userListDiv = document.getElementById("userList");
const userManagerDiv = document.getElementById("userManager");

// ---------------- Users (multi-user) ----------------
function loadUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : null;
}
function saveUsers(u) {
  localStorage.setItem(USERS_KEY, JSON.stringify(u));
}
function ensureDefaultUsers() {
  let users = loadUsers();
  if (!users) {
    users = [
      { username: "admin", password: btoa("admin"), role: "admin" },
      { username: "viewer", password: btoa("viewer"), role: "user" }
    ];
    saveUsers(users);
  }
  return users;
}

// Login & Logout
function showLogin() {
  document.getElementById("loginOverlay").classList.remove("hidden");
  appScreen.classList.add("hidden");
}
function showApp() {
  document.getElementById("loginOverlay").classList.add("hidden");
  appScreen.classList.remove("hidden");
  render();
  applyRoles();
  displayUserList();
}
btnLogin.onclick = () => {
  const user = loginUserInput.value.trim();
  const pass = loginPassInput.value.trim();
  const users = ensureDefaultUsers();
  const found = users.find(u => u.username === user && u.password === btoa(pass));
  if (found) {
    currentUser = found;
    loginMsg.textContent = "";
    showApp();
  } else {
    loginMsg.textContent = "❌ Invalid username or password";
  }
};
btnLogout.onclick = () => {
  if (confirm("Logout?")) {
    currentUser = null;
    location.reload();
  }
};

// Change Password
btnChangePass.onclick = () => {
  if (!currentUser) return alert("Login first");
  const oldP = oldPassInput.value;
  const newP = newPassInput.value;
  if (!oldP || !newP) return alert("Fill both fields");
  const users = ensureDefaultUsers();
  const u = users.find(x => x.username === currentUser.username);
  if (!u) return alert("User not found");
  if (btoa(oldP) !== u.password) return alert("Old password is incorrect");
  u.password = btoa(newP);
  saveUsers(users);
  userMsg.textContent = "✅ Password changed";
  oldPassInput.value = ""; newPassInput.value = "";
};

// Create new user (admin only)
btnCreateUser.onclick = () => {
  if (!currentUser || currentUser.role !== "admin") return alert("Only admin can create users");
  const uname = newUserName.value.trim();
  const upass = newUserPass.value.trim();
  const urole = newUserRole.value;
  if (!uname || !upass) return alert("Fill username & password");
  const users = ensureDefaultUsers();
  if (users.find(u => u.username === uname)) return alert("User exists");
  users.push({ username: uname, password: btoa(upass), role: urole });
  saveUsers(users);
  newUserName.value = ""; newUserPass.value = "";
  userMsg.textContent = `✅ User ${uname} created (${urole})`;
  displayUserList();
};
function displayUserList() {
  const users = ensureDefaultUsers();
  userListDiv.innerHTML = users.map(u => `<div>${u.username} — <b>${u.role}</b></div>`).join("");
}
function applyRoles() {
  const isViewer = currentUser && currentUser.role === "user";
  ["btnAdd","btnExportExcel","btnBackup","btnResetData","btnSelectRestore","btnSaveEdit"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = !!isViewer;
  });
  if (userManagerDiv) userManagerDiv.style.display = isViewer ? "none" : "block";
}

// ---------------- Load & Save ----------------
function load() {
  const d = localStorage.getItem(LS_DATA);
  if (d) data = JSON.parse(d);
}
function save() {
  localStorage.setItem(LS_DATA, JSON.stringify(data));
}

// ---------------- Settings ----------------
btnSettings.onclick = () => {
  settingsModal.classList.remove("hidden");
  if (!currentUser) userManagerDiv.style.display = "none";
  else userManagerDiv.style.display = currentUser.role === "admin" ? "block" : "none";
};
btnCloseSettings.onclick = () => settingsModal.classList.add("hidden");

// ---------------- Render ----------------
function render() {
  tbody.innerHTML = "";
  const q = (searchBox.value || "").toLowerCase();
  const filterType = typeFilter.value;
  const isViewer = currentUser && currentUser.role === "user";

  let filtered = data.filter(d =>
    (!filterType || d.type === filterType) &&
    (!q ||
      (d.name && d.name.toLowerCase().includes(q)) ||
      (d.type && d.type.toLowerCase().includes(q)) ||
      (d.status && d.status.toLowerCase().includes(q)) ||
      (d.site && d.site.toLowerCase().includes(q)) ||
      (d.serial && d.serial.toLowerCase().includes(q)) ||
      (d.mac && d.mac.toLowerCase().includes(q)) ||
      (d.po && d.po.toLowerCase().includes(q)) ||
      (d.vendor && d.vendor.toLowerCase().includes(q)))
  );

  filtered.forEach(d => {
    const tr = document.createElement("tr");
    const editDisabled = isViewer ? "disabled" : "";
    const delDisabled = isViewer ? "disabled" : "";
    tr.innerHTML = `
      <td>${d.id}</td>
      <td>${d.name}</td>
      <td>${d.type}</td>
      <td>${d.status}</td>
      <td>${d.site}</td>
      <td>${d.sap}</td>
      <td>${d.curr}</td>
      <td>${d.old}</td>
      <td>${d.desc}</td>
      <td>${d.model}</td>
      <td>${d.brand}</td>
      <td>${d.serial}</td>
      <td>${d.mac}</td>
      <td>${d.po}</td>
      <td>${d.date}</td>
      <td>${d.vendor}</td>
      <td>
        <button ${editDisabled} onclick="editRow(${d.id})">✏️</button>
        <button ${delDisabled} onclick="deleteRow(${d.id})">🗑️</button>
      </td>`;
    tbody.appendChild(tr);
  });

  statTotal.textContent = filtered.length;
  statOnline.textContent = filtered.filter(x => x.status === "Online").length;
  statOffline.textContent = filtered.filter(x => x.status === "Offline").length;
  statMaint.textContent = filtered.filter(x => x.status === "Maintenance").length;
}

// ---------------- Add / Edit / Delete ----------------
btnAdd.onclick = function () {
  if (currentUser && currentUser.role === "user") return alert("Read-only user: cannot add ❌");
  const name = document.getElementById("f_name").value.trim();
  const type = document.getElementById("f_type").value.trim();
  const status = document.getElementById("f_status").value.trim();
  const site = document.getElementById("f_site").value.trim();
  const sap = document.getElementById("f_sap").value.trim();
  const curr = document.getElementById("f_curr").value.trim();
  const old = document.getElementById("f_old").value.trim();
  const desc = document.getElementById("f_desc").value.trim();
  const model = document.getElementById("f_model").value.trim();
  const brand = document.getElementById("f_brand").value.trim();
  const serial = document.getElementById("f_serial").value.trim();
  const mac = document.getElementById("f_mac").value.trim();
  const po = document.getElementById("f_po").value.trim();
  const date = document.getElementById("f_date").value.trim();
  const vendor = document.getElementById("f_vendor").value.trim();
  const qty = parseInt(document.getElementById("f_qty").value) || 1;

  if (!name || !type) return alert("Please fill required fields (Name, Type)");

  const nextId = data.length ? Math.max(...data.map(x => x.id || 0)) + 1 : 1;
  for (let i = 0; i < qty; i++) {
    data.push({ id: nextId + i, name, type, status, site, sap, curr, old, desc, model, brand, serial, mac, po, date, vendor });
  }
  save();
  render();
  alert(`✅ ${qty} record(s) added successfully!`);
  document.querySelectorAll("#f_name,#f_type,#f_status,#f_site,#f_sap,#f_curr,#f_old,#f_desc,#f_model,#f_brand,#f_serial,#f_mac,#f_po,#f_date,#f_vendor").forEach(el => el.value = "");
  document.getElementById("f_qty").value = 1;
};
btnCloseEdit.onclick = () => editModal.classList.add("hidden");
btnSaveEdit.onclick = () => {
  if (currentUser && currentUser.role === "user") return alert("Viewer cannot edit");
  const d = data.find(x => x.id === currentEditId);
  if (!d) return;
  for (const k in d) {
    const el = document.getElementById("e_" + k);
    if (el) d[k] = el.value;
  }
  save();
  render();
  editModal.classList.add("hidden");
};
function editRow(id) {
  if (currentUser && currentUser.role === "user") return alert("Viewer cannot edit");
  const d = data.find(x => x.id === id);
  if (!d) return;
  currentEditId = id;
  for (const k in d) {
    const el = document.getElementById("e_" + k);
    if (el) el.value = d[k];
  }
  editModal.classList.remove("hidden");
}
function deleteRow(id) {
  if (currentUser && currentUser.role === "user") return alert("Viewer cannot delete");
  if (!confirm("Delete this record?")) return;
  data = data.filter(x => x.id !== id);
  save();
  render();
}

// ---------------- Import / Export / Backup ----------------
btnExportExcel.onclick = () => {
  if (!data.length) return alert("No data!");
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventory");
  XLSX.writeFile(wb, "inventory.xlsx");
};
fileImport.onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    const wb = XLSX.read(evt.target.result, { type: "binary" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    data = rows.map((r, i) => ({
  id: r["id"] || i + 1,
  name: r["name"] || "",
  type: r["type"] || "",
  status: r["status"] || "",
  site: r["site"] || "",
  sap: r["sap"] || "",
  curr: r["curr"] || "",
  old: r["old"] || "",
  desc: r["desc"] || "",
  model: r["model"] || "",
  brand: r["brand"] || "",
  serial: r["serial"] || "",
  mac: r["mac"] || "",
  po: r["po"] || "",
  date: r["date"] || "",
  vendor: r["vendor"] || ""
}));

    save();
    render();
  };
  reader.readAsBinaryString(file);
};
btnBackup.onclick = () => {
  if (currentUser && currentUser.role === "user") return alert("Viewer cannot backup");
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "inventory_backup.json";
  a.click();
  URL.revokeObjectURL(url);
};
btnSelectRestore.onclick = () => fileRestoreJSON.click();
fileRestoreJSON.onchange = e => {
  if (currentUser && currentUser.role === "user") return alert("Viewer cannot restore");
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    data = JSON.parse(evt.target.result);
    save();
    render();
  };
  reader.readAsText(file);
};
btnResetData.onclick = () => {
  if (currentUser && currentUser.role === "user") return alert("Viewer cannot reset data");
  if (!confirm("Reset all data?")) return;
  data = [];
  save();
  render();
};

// ---------------- Search ----------------
searchBox.addEventListener("input", render);
typeFilter.addEventListener("change", render);

// ---------------- Init ----------------
function init() {
  ensureDefaultUsers();
  load();
  render();
  typeFilter.innerHTML = "<option value=''>All Types</option>" + DEVICE_TYPES.map(t => `<option>${t}</option>`).join("");
  const f_type = document.getElementById("f_type");
  if (f_type) f_type.innerHTML = DEVICE_TYPES.map(t => `<option>${t}</option>`).join("");
  settingsModal.classList.add("hidden");
  showLogin();
}
window.onload = init;


// ❄️ Snowfall Animation
function createSnowflakes() {
  for (let i = 0; i < 40; i++) {
    const snow = document.createElement("div");
    snow.classList.add("snowflake");
    snow.textContent = "❅";
    snow.style.left = Math.random() * 100 + "vw";
    snow.style.animationDuration = 6 + Math.random() * 6 + "s";
    snow.style.fontSize = 8 + Math.random() * 10 + "px";
    snow.style.opacity = 0.4 + Math.random() * 0.6;
    document.body.appendChild(snow);
    setTimeout(() => snow.remove(), 12000);
  }
}
setInterval(createSnowflakes, 1500);
















// ❄️ Snow for Login Screen
function createLoginSnow() {
  const loginOverlay = document.querySelector(".login-overlay");
  if (!loginOverlay) return;
  for (let i = 0; i < 25; i++) {
    const snow = document.createElement("div");
    snow.classList.add("login-snowflake");
    snow.textContent = "❅";
    snow.style.left = Math.random() * 100 + "vw";
    snow.style.animationDuration = 6 + Math.random() * 6 + "s";
    snow.style.fontSize = 6 + Math.random() * 8 + "px";
    snow.style.opacity = 0.3 + Math.random() * 0.6;
    loginOverlay.appendChild(snow);
    setTimeout(() => snow.remove(), 12000);
  }
}
setInterval(createLoginSnow, 1800);


