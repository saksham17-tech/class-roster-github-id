import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://nbcexupkrzbbmwbmnamr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iY2V4dXBrcnpiYm13Ym1uYW1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNjc4MTcsImV4cCI6MjA4OTg0MzgxN30.P77GBfkRU8dYUhgwz_ixrV6StZZ7543yW6BMZ2zuaJA'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

let students = [];
let isAdmin = false;
let hasSubmitted = false;
const ADMIN_PASSWORD = (() => {
  return atob("c3VtbzAxMDc=");
})();

// ── UTILITY FUNCTIONS ──
function escapeHtml(str) {
  return str?.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,"&#039;") || '';
}

function showToast(msg, type = "") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove("show"), 3500);
}

function openModal(el) { if (el) el.classList.add("open"); }
function closeModal(el) { if (el) el.classList.remove("open"); }

// ── SUPABASE FUNCTIONS ──
async function loadStudents() {
  try {
    const { data, error } = await supabase
      .from('roster')
      .select('*')
      .order('section', { ascending: true })  
      .order('roll', { ascending: true });  
    
    if (error) {
      students = [];
    } else {
      students = data?.map(row => ({
        id: row.id,
        section: row.section || '',
        roll: row.roll,
        name: row.name,
        githubId: row.github_id,
        repoName: row.repo_name,
        fullLink: row.full_link,
        date: row.date
      })) || [];
      
      // Sorting for case-insensitive section names
      students.sort((a, b) => {
        const sectionA = (a.section || '').toUpperCase();
        const sectionB = (b.section || '').toUpperCase();
        if (sectionA !== sectionB) return sectionA.localeCompare(sectionB);
        return Number(a.roll) - Number(b.roll);
      });
    }
  } catch (error) {
    students = [];
  }
}

async function saveStudent(student) {
  try {
    const payload = {
      id: student.id,
      section: student.section,
      roll: student.roll,
      name: student.name,
      github_id: student.githubId,
      repo_name: student.repoName,
      full_link: student.fullLink,
      date: student.date
    };
    
    const { data, error } = await supabase
      .from('roster')
      .insert([payload])
      .select();
    
    if (error) {
      showToast(`Save failed: ${error.message}`, "error");
      return false;
    }
    
    if (data && data.length > 0) {
      students.push(data[0]);
      students.sort((a, b) => {
        const sectionA = (a.section || '').toUpperCase();
        const sectionB = (b.section || '').toUpperCase();
        if (sectionA !== sectionB) return sectionA.localeCompare(sectionB);
        return Number(a.roll) - Number(b.roll);
      });
      return true;
    }
    return false;
  } catch (error) {
    showToast("Network error saving data", "error");
    return false;
  }
}

async function deleteStudent(id) {
  try {
    const { error } = await supabase
      .from('roster')
      .delete()
      .eq('id', id);
    
    if (!error) {
      students = students.filter(s => s.id !== id);
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

// ── RENDER FUNCTIONS ──
function renderRoster(filter = "") {
  const rosterBody = document.getElementById("rosterBody");
  const emptyState = document.getElementById("emptyState");
  const studentCount = document.getElementById("student-count");
  
  const filtered = filter ? students.filter(s => 
    s.name.toLowerCase().includes(filter) || String(s.roll).includes(filter)
  ) : students;

  rosterBody.innerHTML = "";
  
  if (filtered.length === 0) {
    emptyState.classList.add("visible");
  } else {
    emptyState.classList.remove("visible");
    filtered.forEach(s => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><span class="roll-badge">${escapeHtml(s.roll)}</span></td>
        <td><span class="section-badge">${escapeHtml(s.section)}</span></td>
        <td>${escapeHtml(s.name)}</td>
        <td><a class="github-link" href="https://github.com/${escapeHtml(s.githubId)}" target="_blank" rel="noopener">↗ ${escapeHtml(s.githubId)}</a></td>
        <td>${escapeHtml(s.repoName)}</td>
        <td><a class="repo-link" href="${escapeHtml(s.fullLink)}" target="_blank" rel="noopener">View Repo ↗</a></td>
        <td><span class="date-text">${escapeHtml(s.date)}</span></td>
      `;
      rosterBody.appendChild(tr);
    });
  }
  
  studentCount.textContent = `${students.length} student${students.length !== 1 ? 's' : ''}`;
}

function renderAdminRoster() {
  const adminRosterBody = document.getElementById("adminRosterBody");
  if (!adminRosterBody) return;
  
  adminRosterBody.innerHTML = "";
  students.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="roll-badge">${escapeHtml(s.roll)}</span></td>
      <td><span class="section-badge">${escapeHtml(s.section)}</span></td>
      <td>${escapeHtml(s.name)}</td>
      <td><a class="github-link" href="https://github.com/${escapeHtml(s.githubId)}" target="_blank">${escapeHtml(s.githubId)}</a></td>
      <td>${escapeHtml(s.repoName)}</td>
      <td><a class="repo-link" href="${escapeHtml(s.fullLink)}" target="_blank">View ↗</a></td>
      <td>
        <button class="btn-edit" onclick="window.openEdit('${s.id}')">Edit</button>
        <button class="btn-delete" onclick="window.confirmDelete('${s.id}', '${escapeHtml(s.name)}')">Delete</button>
       </td>
    `;
    adminRosterBody.appendChild(tr);
  });
}

// ── GLOBAL FUNCTIONS FOR INLINE onclick ──
window.openEdit = function(id) {
  const student = students.find(s => s.id === id);
  if (!student) return;
  
  document.getElementById("editId").value = student.id;
  document.getElementById("editSection").value = student.section || '';
  document.getElementById("editRoll").value = student.roll;
  document.getElementById("editName").value = student.name;
  document.getElementById("editGithub").value = student.githubId;
  document.getElementById("editRepo").value = student.repoName || '';
  
  closeModal(document.getElementById("adminModal"));
  openModal(document.getElementById("editModal"));
};

window.confirmDelete = function(id, name) {
  if (confirm(`Delete "${name}"? This cannot be undone.`)) {
    deleteStudent(id).then(success => {
      if (success) {
        renderRoster();
        renderAdminRoster();
        showToast(`Deleted ${name}`, "error");
      } else {
        showToast("Delete failed", "error");
      }
    });
  }
};

// ── MAIN INITIALIZATION ──
document.addEventListener('DOMContentLoaded', async () => {
  const elements = {
    openFormBtn: document.getElementById("openFormBtn"),
    closeFormBtn: document.getElementById("closeFormBtn"),
    submitForm: document.getElementById("submitForm"),
    adminLoginForm: document.getElementById("adminLoginForm"),
    editForm: document.getElementById("editForm"),
    closeAdminBtn: document.getElementById("closeAdminBtn"),
    closeEditBtn: document.getElementById("closeEditBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    searchInput: document.getElementById("searchInput"),
    adminBtn: document.getElementById("adminBtn"),
    formModal: document.getElementById("formModal"),
    adminModal: document.getElementById("adminModal"),
    editModal: document.getElementById("editModal"),
    adminLoginSection: document.getElementById("adminLoginSection"),
    adminPanel: document.getElementById("adminPanel")
  };

  await loadStudents();
  renderRoster();

  // Submit Details Button
  if (elements.openFormBtn) {
    elements.openFormBtn.addEventListener("click", () => {
      if (hasSubmitted) {
        showToast("Already submitted this session. Reload page to submit again.", "error");
        return;
      }
      openModal(elements.formModal);
    });
  }

  // Form Close (X button)
  if (elements.closeFormBtn) {
    elements.closeFormBtn.addEventListener("click", () => {
      closeModal(elements.formModal);
    });
  }

  // Form Submission
  if (elements.submitForm) {
    elements.submitForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const roll = document.getElementById("rollNum").value.trim();
      const section = document.getElementById("section").value.trim();
      const name = document.getElementById("stuName").value.trim();
      const githubId = document.getElementById("githubId").value.trim();
      const repoUrl = document.getElementById("repoUrl").value.trim();

      if (!roll || isNaN(Number(roll)) || !name || name.length < 2 || 
          !githubId || githubId.includes(" ") || !repoUrl || 
          repoUrl.includes(" ") || repoUrl.includes("/")) {
        showToast("Please fill all fields correctly", "error");
        return;
      }      

      const student = {
        id: crypto.randomUUID(),
        section: section.toUpperCase(),
        roll,
        name,
        githubId,
        repoName: repoUrl,
        fullLink: `https://github.com/${githubId}/${repoUrl}`,
        date: new Date().toLocaleDateString("en-IN", { 
          day: "2-digit", month: "short", year: "numeric"
        })
      };

      const success = await saveStudent(student);
      if (success) {
        hasSubmitted = true;
        closeModal(elements.formModal);
        elements.submitForm.reset();
        renderRoster(elements.searchInput?.value?.toLowerCase().trim() || "");
        showToast("✅ Saved to database successfully!", "success");
      }
    });
  }

  // Search
  if (elements.searchInput) {
    elements.searchInput.addEventListener("input", () => {
      renderRoster(elements.searchInput.value.toLowerCase().trim());
    });
  }

  // Admin Button
  if (elements.adminBtn) {
    elements.adminBtn.addEventListener("click", () => {
      if (isAdmin) {
        renderAdminRoster();
        elements.adminLoginSection.style.display = "none";
        elements.adminPanel.style.display = "block";
      } else {
        elements.adminLoginSection.style.display = "block";
        elements.adminPanel.style.display = "none";
      }
      openModal(elements.adminModal);
    });
  }

  // Admin Login
  if (elements.adminLoginForm) {
    elements.adminLoginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const password = document.getElementById("adminPass").value;
      if (password === ADMIN_PASSWORD) {
        isAdmin = true;
        elements.adminBtn.textContent = "Admin ✓";
        elements.adminLoginSection.style.display = "none";
        elements.adminPanel.style.display = "block";
        renderAdminRoster();
        showToast("✅ Admin access granted", "success");
        document.getElementById("adminPass").value = "";
      } else {
        document.getElementById("adminPassErr").textContent = "Wrong password";
      }
    });
  }

  // Admin close buttons
  if (elements.closeAdminBtn) {
    elements.closeAdminBtn.addEventListener("click", () => closeModal(elements.adminModal));
  }
  
  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener("click", () => {
      isAdmin = false;
      elements.adminBtn.textContent = "Admin";
      closeModal(elements.adminModal);
    });
  }

  // Edit form
  if (elements.editForm) {
    elements.editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("editId").value;
      const student = {
        id,
        section: document.getElementById("editSection").value.trim().toUpperCase(), 
        roll: document.getElementById("editRoll").value.trim(),
        name: document.getElementById("editName").value.trim(),
        githubId: document.getElementById("editGithub").value.trim(),
        repoName: document.getElementById("editRepo").value.trim(),
        fullLink: `https://github.com/${document.getElementById("editGithub").value.trim()}/${document.getElementById("editRepo").value.trim()}`
      };
      
      // Update local array first
      const idx = students.findIndex(s => s.id === id);
      if (idx !== -1) {
        students[idx] = student;
        // CHANGED: Sort by section (case-insensitive) then roll
        students.sort((a, b) => {
          const sectionA = (a.section || '').toUpperCase();
          const sectionB = (b.section || '').toUpperCase();
          if (sectionA !== sectionB) return sectionA.localeCompare(sectionB);
          return Number(a.roll) - Number(b.roll);
        });
        renderRoster();
        renderAdminRoster();
        closeModal(elements.editModal);
        openModal(elements.adminModal);
        showToast("✅ Updated successfully", "success");
      }
    });
  }

  if (elements.closeEditBtn) {
    elements.closeEditBtn.addEventListener("click", () => {
      closeModal(elements.editModal);
      openModal(elements.adminModal);
    });
  }

  // Close modals on backdrop
  [elements.formModal, elements.adminModal, elements.editModal].forEach(modal => {
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal(modal);
      });
    }
  });
});
