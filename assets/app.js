import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://txmvkbixfzlsumvmzoyn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4bXZrYml4Znpsc3Vtdm16b3luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMTA4ODMsImV4cCI6MjA4MjU4Njg4M30.hFW0Ndbs7STWlA294xe3lQqJ4Lj2mxFGGuQP-ncbnDY";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const MAGIC_LINK_REDIRECT_URL = "https://kirilly2281.github.io/Nota_Test/";

const root = document.getElementById("root");
root.innerHTML = "<p style='padding:20px'>Loading...</p>";

// Глобальные переменные для навигации
let currentUser = null;
let currentRole = null;

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(str) {
  return escapeHtml(str);
}

function isBlank(value) {
  return !value || String(value).trim().length === 0;
}

async function renderAdmin() {
  const { data: allSubs, error } = await supabase
    .from("submissions")
    .select("id, task_id, user_id, result_url, student_comment, status, score, admin_comment, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    root.innerHTML = `<pre style="white-space:pre-wrap">Admin load error:\n${error.message}</pre>`;
    return;
  }

  root.innerHTML = `
    <div style="max-width:1000px;margin:50px auto;font-family:system-ui">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <h2 style="margin:0">Admin review</h2>
          <div style="opacity:.8;margin-top:6px">Total submissions: ${(allSubs || []).length}</div>
        </div>
        <div style="display:flex;gap:10px;align-items:center">
          <button id="nav-students" style="padding:8px 16px;background:#111;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:500">Students</button>
          <button id="nav-manage-competencies" style="padding:8px 16px;background:#0066cc;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:500">Manage competencies</button>
          <button id="logout" style="padding:8px 12px">Logout</button>
        </div>
      </div>

      <div style="margin-top:18px">
        ${(allSubs || []).map(s => `
          <div style="border:1px solid #ddd;padding:14px;border-radius:12px;margin:12px 0">
            <div style="font-weight:700">#${s.id} — ${s.status}</div>
            <div style="opacity:.8;margin:6px 0">task_id: ${s.task_id} · user_id: ${s.user_id}</div>
            ${s.result_url ? `<div><a href="${s.result_url}" target="_blank">Result link</a></div>` : ""}
            ${s.student_comment ? `<div style="margin-top:6px">Student: ${escapeHtml(s.student_comment)}</div>` : ""}

            <div style="margin-top:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
              <input class="score" data-id="${s.id}" placeholder="Score (0-100)" value="${s.score ?? ""}" style="width:140px;padding:8px"/>
              <input class="acomment" data-id="${s.id}" placeholder="Admin comment" value="${escapeAttr(s.admin_comment ?? "")}" style="min-width:280px;flex:1;padding:8px"/>
              <button class="mark-reviewed" data-id="${s.id}">Mark reviewed</button>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  document.getElementById("logout").onclick = async () => {
    await supabase.auth.signOut();
    location.reload();
  };

  const navStudentsBtn = document.getElementById("nav-students");
  if (navStudentsBtn) {
    navStudentsBtn.onclick = async () => {
      await renderAdminStudents();
    };
  }

  const navManageCompetenciesBtn = document.getElementById("nav-manage-competencies");
  if (navManageCompetenciesBtn) {
    navManageCompetenciesBtn.onclick = async () => {
      await renderAdminCompetencyManager();
    };
  }

  document.querySelectorAll(".mark-reviewed").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.getAttribute("data-id"));
      const score = document.querySelector(`.score[data-id="${id}"]`).value.trim();
      const adminComment = document.querySelector(`.acomment[data-id="${id}"]`).value.trim();

      const payload = {
        status: "reviewed",
        score: score ? Number(score) : null,
        admin_comment: adminComment || null
      };

      const { error } = await supabase
        .from("submissions")
        .update(payload)
        .eq("id", id);

      if (error) alert("Ошибка обновления: " + error.message);
      else {
        alert("Проверено");
        location.reload();
      }
    });
  });
}

async function renderProfileCompletion(profile) {
  root.innerHTML = `
    <div style="max-width:420px;margin:60px auto;font-family:system-ui">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="margin:0">Complete profile</h2>
        <button id="logout" style="padding:6px 10px">Logout</button>
      </div>
      <div style="opacity:.75;margin-bottom:12px">Please add your name to continue.</div>
      <label style="display:block;font-size:14px;margin-bottom:6px">Name</label>
      <input id="profile-name" placeholder="Your name" style="width:100%;padding:10px;margin-bottom:12px"/>
      <button id="save-profile" style="padding:10px 14px">Save</button>
    </div>
  `;

  document.getElementById("logout").onclick = async () => {
    await supabase.auth.signOut();
    location.reload();
  };

  document.getElementById("save-profile").onclick = async () => {
    const button = document.getElementById("save-profile");
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Saving...";
    const nameInput = document.getElementById("profile-name");
    const name = nameInput.value.trim();
    if (!name) {
      alert("Введите имя.");
      button.disabled = false;
      button.textContent = originalText;
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ name })
      .eq("id", profile.id);

    if (error) {
      alert("Ошибка сохранения: " + error.message);
      button.disabled = false;
      button.textContent = originalText;
      return;
    }

    await renderStudent();
  };
}

async function renderStudent() {
  const { data: subs, error: subsError } = await supabase
    .from("submissions")
    .select("id, task_id, result_url, student_comment, status, score, admin_comment, created_at")
    .eq("user_id", currentUser.id);

  if (subsError) {
    root.innerHTML = `<pre style="white-space:pre-wrap">Submissions load error:\n${subsError.message}</pre>`;
    return;
  }

  let assignedTaskIds = [];
  let assignmentsErrorMessage = null;
  const { data: assignments, error: assignmentsError } = await supabase
    .from("assignments")
    .select("task_id")
    .eq("user_id", currentUser.id);

  if (assignmentsError) {
    assignmentsErrorMessage = assignmentsError.message;
    assignedTaskIds = [];
  } else {
    assignedTaskIds = (assignments || []).map(assignment => assignment.task_id);
  }

  let tasks = [];
  if (assignedTaskIds.length > 0) {
    const { data: tasksData, error: tasksError } = await supabase
      .from("tasks")
      .select("id, title, description, materials, materials_url, sort_order")
      .in("id", assignedTaskIds)
      .order("sort_order", { ascending: true });

    if (tasksError) {
      root.innerHTML = `<pre style="white-space:pre-wrap">Tasks load error:\n${tasksError.message}</pre>`;
      return;
    }

    tasks = tasksData || [];
  }

  const subByTaskId = new Map((subs || []).map(s => [s.task_id, s]));

  const totalTasks = (tasks || []).length;
  const reviewedTaskIds = new Set((subs || []).filter(s => s.status === "reviewed").map(s => s.task_id));
  const reviewedCount = [...reviewedTaskIds].filter(id => (tasks || []).some(t => t.id === id)).length;
  const progressPct = totalTasks === 0 ? 0 : Math.round((reviewedCount / totalTasks) * 100);

  root.innerHTML = `
    <div style="max-width:900px;margin:50px auto;font-family:system-ui">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px">
        <div>
          <h2 style="margin:0">Tasks</h2>
          <div style="margin-top:8px;opacity:.85">
            Reviewed: <b>${reviewedCount}</b> / <b>${totalTasks}</b> (${progressPct}%)
          </div>
          <div style="margin-top:8px;width:340px;max-width:60vw;background:#eee;border-radius:999px;height:10px;overflow:hidden">
            <div style="height:10px;width:${progressPct}%;background:#111"></div>
          </div>
        </div>
        <div style="display:flex;gap:10px;align-items:center">
          <button id="nav-tasks" style="padding:8px 16px;background:#111;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:500">Tasks</button>
          <button id="nav-assessment" style="padding:8px 16px;background:#111;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:500">Assessment</button>
          <button id="logout" style="padding:8px 12px">Logout</button>
        </div>
      </div>

      <div id="message" style="margin-top:12px"></div>

      <div style="margin-top:18px">
        ${tasks.length === 0
          ? `
            <div style="border:1px solid #ddd;padding:16px;border-radius:12px">
              <div style="font-weight:600">No tasks assigned yet</div>
              <div style="margin-top:6px;opacity:.8">Ask your admin to assign tasks</div>
            </div>
          `
          : tasks.map(t => {
          const s = subByTaskId.get(t.id);

          const statusPill = !s
            ? `<span style="display:inline-block;padding:2px 8px;border:1px solid #bbb;border-radius:999px;font-size:12px;opacity:.8">Not submitted</span>`
            : (s.status === "reviewed"
                ? `<span style="display:inline-block;padding:2px 8px;border:1px solid #111;border-radius:999px;font-size:12px">Reviewed</span>`
                : `<span style="display:inline-block;padding:2px 8px;border:1px solid #bbb;border-radius:999px;font-size:12px">Submitted</span>`);

          const resultLink = s?.result_url
            ? `<div><a href="${escapeAttr(s.result_url)}" target="_blank">Your result link</a></div>`
            : "";
          const commentLine = s?.student_comment
            ? `<div style="opacity:.85;margin-top:6px">Comment: ${escapeHtml(s.student_comment)}</div>`
            : "";
          const adminCommentLine = s?.admin_comment
            ? `<div style="opacity:.85;margin-top:6px">Admin comment: ${escapeHtml(s.admin_comment)}</div>`
            : "";
          const scoreLine = s?.score !== null && s?.score !== undefined
            ? `<div style="opacity:.85;margin-top:6px">Score: ${s.score}</div>`
            : "";

          const materialsHtml = Array.isArray(t.materials) && t.materials.length > 0
            ? `<div style="margin-top:8px">
                 <div style="font-weight:600">Materials</div>
                 <ul style="margin:6px 0 0 18px;padding:0">
                   ${t.materials.map(item => {
                     const title = escapeHtml(item?.title ?? "");
                     const url = item?.url ? escapeAttr(item.url) : "";
                     return url
                       ? `<li><a href="${url}" target="_blank">${title}</a></li>`
                       : `<li>${title}</li>`;
                   }).join("")}
                 </ul>
               </div>`
            : (t.materials_url ? `<a href="${t.materials_url}" target="_blank">Materials</a>` : "");

          const actionBlock = !s
            ? `<div style="margin-top:10px;padding:10px;border:1px dashed #bbb;border-radius:10px">
                 <div style="display:flex;flex-direction:column;gap:8px">
                   <input class="submit-url" data-task="${t.id}" type="url" placeholder="Result link" required style="padding:8px"/>
                   <textarea class="submit-comment" data-task="${t.id}" placeholder="Comment (optional)" style="padding:8px;min-height:80px"></textarea>
                   <button class="submit-btn" data-task="${t.id}">Submit</button>
                 </div>
               </div>`
            : `<div style="margin-top:10px;padding:10px;border:1px dashed #bbb;border-radius:10px">
                 ${resultLink}
                 ${commentLine}
                 ${s.status === "reviewed"
                    ? `<div style="margin-top:8px;opacity:.85">Checked by admin</div>
                       ${adminCommentLine}
                       ${scoreLine}`
                    : `<div style="margin-top:10px;display:flex;flex-direction:column;gap:8px">
                         <input class="edit-url" data-sub="${s.id}" type="url" placeholder="Result link" value="${escapeAttr(s.result_url ?? "")}" required style="padding:8px"/>
                         <textarea class="edit-comment" data-sub="${s.id}" placeholder="Comment (optional)" style="padding:8px;min-height:80px">${escapeHtml(s.student_comment ?? "")}</textarea>
                         <button class="save-btn" data-sub="${s.id}">Save</button>
                       </div>`
                  }
               </div>`;

          return `
            <div style="border:1px solid #ddd;padding:14px;border-radius:12px;margin:12px 0">
              <div style="margin-bottom:8px">${statusPill}</div>
              <div style="font-weight:700">${t.title}</div>
              <div style="opacity:.85;margin:6px 0">${t.description ?? ""}</div>
              ${materialsHtml}
              ${actionBlock}
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;

  document.getElementById("logout").onclick = async () => {
    await supabase.auth.signOut();
    location.reload();
  };

  if (assignmentsErrorMessage) {
    showMessage(`Assignments load error: ${assignmentsErrorMessage}`, "error");
  }

  const navAssessmentBtn = document.getElementById("nav-assessment");
  if (navAssessmentBtn) {
    navAssessmentBtn.onclick = async () => {
      await renderAssessment();
    };
  }

  // submit
  document.querySelectorAll(".submit-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const originalLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Submitting...";
      const taskId = Number(btn.getAttribute("data-task"));
      const resultInput = document.querySelector(`.submit-url[data-task="${taskId}"]`);
      const commentInput = document.querySelector(`.submit-comment[data-task="${taskId}"]`);
      const resultUrl = resultInput?.value.trim() || "";
      const comment = commentInput?.value.trim() || "";
      if (!resultUrl) {
        alert("Добавьте ссылку на результат.");
        btn.disabled = false;
        btn.textContent = originalLabel;
        return;
      }

      const { error } = await supabase.from("submissions").insert({
        task_id: taskId,
        user_id: currentUser.id,
        result_url: resultUrl,
        student_comment: comment,
        status: "submitted"
      });

      if (error) {
        if (error.code === "23505" || /unique|duplicate/i.test(error.message)) {
          alert("You already submitted this task. Please use Save to update your submission.");
        } else {
          alert("Ошибка отправки: " + error.message);
        }
        btn.disabled = false;
        btn.textContent = originalLabel;
      } else {
        location.reload();
      }
    });
  });

  // edit (только для submitted; для reviewed мы выше убрали кнопку)
  document.querySelectorAll(".save-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const originalLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Saving...";
      const subId = Number(btn.getAttribute("data-sub"));
      const resultInput = document.querySelector(`.edit-url[data-sub="${subId}"]`);
      const commentInput = document.querySelector(`.edit-comment[data-sub="${subId}"]`);
      const newUrl = resultInput?.value.trim() || "";
      const newComment = commentInput?.value.trim() || "";
      if (!newUrl) {
        alert("Добавьте ссылку на результат.");
        btn.disabled = false;
        btn.textContent = originalLabel;
        return;
      }

      const { error } = await supabase
        .from("submissions")
        .update({ result_url: newUrl, student_comment: newComment })
        .eq("id", subId);

      if (error) {
        alert("Ошибка обновления: " + error.message);
        btn.disabled = false;
        btn.textContent = originalLabel;
      } else {
        location.reload();
      }
    });
  });
}

async function renderAssessment() {
  // Редирект для админов
  if (currentRole === "admin") {
    await renderAdminStudents();
    return;
  }

  // Загружаем категории компетенций (только активные)
  const { data: categories, error: categoriesError } = await supabase
    .from("competency_categories")
    .select("id, name, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (categoriesError) {
    root.innerHTML = `<pre style="white-space:pre-wrap">Categories load error:\n${categoriesError.message}</pre>`;
    return;
  }

  // Загружаем компетенции (только активные)
  const { data: competencies, error: competenciesError } = await supabase
    .from("competencies")
    .select("id, category_id, name, description, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (competenciesError) {
    root.innerHTML = `<pre style="white-space:pre-wrap">Competencies load error:\n${competenciesError.message}</pre>`;
    return;
  }

  // Загружаем рейтинги текущего пользователя
  const { data: ratings, error: ratingsError } = await supabase
    .from("competency_ratings")
    .select("competency_id, self_score, self_comment, admin_score, admin_comment")
    .eq("user_id", currentUser.id);

  if (ratingsError) {
    root.innerHTML = `<pre style="white-space:pre-wrap">Ratings load error:\n${ratingsError.message}</pre>`;
    return;
  }

  // Создаем Map для быстрого доступа к рейтингам
  const ratingsMap = new Map((ratings || []).map(r => [r.competency_id, r]));

  // Группируем компетенции по категориям
  const competenciesByCategory = new Map();
  (competencies || []).forEach(comp => {
    if (!competenciesByCategory.has(comp.category_id)) {
      competenciesByCategory.set(comp.category_id, []);
    }
    competenciesByCategory.get(comp.category_id).push(comp);
  });

  // Генерируем HTML таблицы
  let tableHtml = "";
  (categories || []).forEach(cat => {
    const catCompetencies = competenciesByCategory.get(cat.id) || [];
    if (catCompetencies.length === 0) return;

    tableHtml += `
      <div style="margin-bottom:32px">
        <h3 style="margin:0 0 16px 0;font-size:18px;font-weight:600">${escapeHtml(cat.name)}</h3>
        <table style="width:100%;border-collapse:collapse;border:1px solid #ddd">
          <thead>
            <tr style="background:#f5f5f5">
              <th style="padding:12px;text-align:left;border:1px solid #ddd;font-weight:600">Competency</th>
              <th style="padding:12px;text-align:left;border:1px solid #ddd;font-weight:600">Description</th>
              <th style="padding:12px;text-align:left;border:1px solid #ddd;font-weight:600">Self score</th>
              <th style="padding:12px;text-align:left;border:1px solid #ddd;font-weight:600">Self comment</th>
              <th style="padding:12px;text-align:left;border:1px solid #ddd;font-weight:600">Admin score</th>
              <th style="padding:12px;text-align:left;border:1px solid #ddd;font-weight:600">Admin comment</th>
              <th style="padding:12px;text-align:left;border:1px solid #ddd;font-weight:600">Action</th>
            </tr>
          </thead>
          <tbody>
            ${catCompetencies.map(comp => {
              const rating = ratingsMap.get(comp.id);
              const selfScore = rating?.self_score ?? "";
              const selfComment = rating?.self_comment ?? "";
              const adminScore = rating?.admin_score ?? "";
              const adminComment = rating?.admin_comment ?? "";

              return `
                <tr>
                  <td style="padding:12px;border:1px solid #ddd;font-weight:500">${escapeHtml(comp.name)}</td>
                  <td style="padding:12px;border:1px solid #ddd;opacity:.85">${escapeHtml(comp.description ?? "")}</td>
                  <td style="padding:12px;border:1px solid #ddd">
                    <input type="number" class="self-score" data-competency="${comp.id}" 
                           value="${selfScore}" min="0" max="100" 
                           style="width:80px;padding:6px;border:1px solid #ccc;border-radius:4px" />
                  </td>
                  <td style="padding:12px;border:1px solid #ddd">
                    <textarea class="self-comment" data-competency="${comp.id}" 
                              style="width:100%;min-width:200px;padding:6px;border:1px solid #ccc;border-radius:4px;min-height:60px;resize:vertical">${escapeHtml(selfComment)}</textarea>
                  </td>
                  <td style="padding:12px;border:1px solid #ddd;opacity:.7">${adminScore || "-"}</td>
                  <td style="padding:12px;border:1px solid #ddd;opacity:.7">${adminComment ? escapeHtml(adminComment) : "-"}</td>
                  <td style="padding:12px;border:1px solid #ddd">
                    <button class="save-competency" data-competency="${comp.id}" 
                            style="padding:6px 12px;background:#111;color:#fff;border:none;border-radius:4px;cursor:pointer">Save</button>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  });

  root.innerHTML = `
    <div style="max-width:1400px;margin:50px auto;font-family:system-ui">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
        <h2 style="margin:0">Competency Assessment</h2>
        <div style="display:flex;gap:10px;align-items:center">
          <button id="nav-tasks" style="padding:8px 12px">Tasks</button>
          <button id="logout">Logout</button>
        </div>
      </div>

      ${tableHtml || "<p>No competencies found.</p>"}
    </div>
  `;

  document.getElementById("logout").onclick = async () => {
    await supabase.auth.signOut();
    location.reload();
  };

  document.getElementById("nav-tasks").onclick = async () => {
    await renderStudent();
  };

  // Обработчики сохранения для каждой компетенции
  document.querySelectorAll(".save-competency").forEach(btn => {
    btn.addEventListener("click", async () => {
      const originalLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Saving...";

      const competencyId = Number(btn.getAttribute("data-competency"));
      const scoreInput = document.querySelector(`.self-score[data-competency="${competencyId}"]`);
      const commentInput = document.querySelector(`.self-comment[data-competency="${competencyId}"]`);

      const selfScore = scoreInput?.value.trim() ? Number(scoreInput.value.trim()) : null;
      const selfComment = commentInput?.value.trim() || null;

      // Валидация score
      if (selfScore !== null && (selfScore < 0 || selfScore > 100)) {
        alert("Score must be between 0 and 100");
        btn.disabled = false;
        btn.textContent = originalLabel;
        return;
      }

      const payload = {
        user_id: currentUser.id,
        competency_id: competencyId,
        self_score: selfScore,
        self_comment: selfComment,
        self_updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("competency_ratings")
        .upsert(payload, { onConflict: "user_id,competency_id" });

      if (error) {
        alert("Ошибка сохранения: " + error.message);
        btn.disabled = false;
        btn.textContent = originalLabel;
      } else {
        alert("Сохранено");
        btn.disabled = false;
        btn.textContent = originalLabel;
        // Перезагружаем данные для обновления отображения
        await renderAssessment();
      }
    });
  });
}

async function renderAdminStudents() {
  // Загружаем всех студентов (не админов)
  const { data: students, error: studentsError } = await supabase
    .from("profiles")
    .select("id, email, name, role")
    .eq("role", "student")
    .order("email", { ascending: true });

  if (studentsError) {
    root.innerHTML = `<pre style="white-space:pre-wrap">Students load error:\n${studentsError.message}</pre>`;
    return;
  }

  root.innerHTML = `
    <div style="max-width:1200px;margin:50px auto;font-family:system-ui">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
        <h2 style="margin:0">Students</h2>
        <div style="display:flex;gap:10px;align-items:center">
          <button id="nav-manage-competencies" style="padding:8px 16px;background:#0066cc;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:500">Manage competencies</button>
          <button id="logout" style="padding:8px 12px">Logout</button>
        </div>
      </div>

      <div style="margin-top:18px">
        ${(students || []).length === 0 
          ? "<p>No students found.</p>"
          : (students || []).map(s => `
            <div style="border:1px solid #ddd;padding:14px;border-radius:12px;margin:12px 0;cursor:pointer" 
                 class="student-row" data-student-id="${s.id}">
              <div style="font-weight:700">${escapeHtml(s.name || s.email)}</div>
              <div style="opacity:.8;margin-top:4px;font-size:14px">${escapeHtml(s.email)}</div>
            </div>
          `).join("")}
      </div>
    </div>
  `;

  document.getElementById("logout").onclick = async () => {
    await supabase.auth.signOut();
    location.reload();
  };

  document.getElementById("nav-manage-competencies").onclick = async () => {
    await renderAdminCompetencyManager();
  };

  // Обработчики клика на студента
  document.querySelectorAll(".student-row").forEach(row => {
    row.addEventListener("click", async () => {
      const studentId = row.getAttribute("data-student-id");
      await renderAdminStudentDetail(studentId);
    });
  });
}

async function renderAdminStudentDetail(studentId) {
  // Загружаем данные студента
  const { data: student, error: studentError } = await supabase
    .from("profiles")
    .select("id, email, name")
    .eq("id", studentId)
    .single();

  if (studentError) {
    root.innerHTML = `<pre style="white-space:pre-wrap">Student load error:\n${studentError.message}</pre>`;
    return;
  }

  // Загружаем рейтинги компетенций студента
  const { data: ratings, error: ratingsError } = await supabase
    .from("competency_ratings")
    .select("competency_id, self_score, self_comment, admin_score, admin_comment")
    .eq("user_id", studentId);

  if (ratingsError) {
    root.innerHTML = `<pre style="white-space:pre-wrap">Ratings load error:\n${ratingsError.message}</pre>`;
    return;
  }

  // Загружаем категории и компетенции
  const { data: categories, error: categoriesError } = await supabase
    .from("competency_categories")
    .select("id, name, title, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (categoriesError) {
    root.innerHTML = `<pre style="white-space:pre-wrap">Categories load error:\n${categoriesError.message}</pre>`;
    return;
  }

  const { data: competencies, error: competenciesError } = await supabase
    .from("competencies")
    .select("id, category_id, name, title, description, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (competenciesError) {
    root.innerHTML = `<pre style="white-space:pre-wrap">Competencies load error:\n${competenciesError.message}</pre>`;
    return;
  }

  // Загружаем задачи
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, title, description, sort_order")
    .order("sort_order", { ascending: true });

  if (tasksError) {
    root.innerHTML = `<pre style="white-space:pre-wrap">Tasks load error:\n${tasksError.message}</pre>`;
    return;
  }

  // Загружаем назначенные задачи студенту
  const { data: assignments, error: assignmentsError } = await supabase
    .from("assignments")
    .select("task_id")
    .eq("user_id", studentId);

  if (assignmentsError) {
    root.innerHTML = `<pre style="white-space:pre-wrap">Assignments load error:\n${assignmentsError.message}</pre>`;
    return;
  }

  const assignedTaskIds = new Set((assignments || []).map(a => a.task_id));

  // Группируем компетенции по категориям
  const competenciesByCategory = new Map();
  (competencies || []).forEach(comp => {
    if (!competenciesByCategory.has(comp.category_id)) {
      competenciesByCategory.set(comp.category_id, []);
    }
    competenciesByCategory.get(comp.category_id).push(comp);
  });

  const ratingsMap = new Map((ratings || []).map(r => [r.competency_id, r]));

  // Генерируем HTML для компетенций
  let competenciesHtml = "";
  (categories || []).forEach(cat => {
    const catCompetencies = competenciesByCategory.get(cat.id) || [];
    if (catCompetencies.length === 0) return;

    const catName = cat.name || cat.title || "";
    competenciesHtml += `
      <div style="margin-bottom:24px">
        <h3 style="margin:0 0 12px 0;font-size:16px;font-weight:600">${escapeHtml(catName)}</h3>
        <table style="width:100%;border-collapse:collapse;border:1px solid #ddd">
          <thead>
            <tr style="background:#f5f5f5">
              <th style="padding:10px;text-align:left;border:1px solid #ddd;font-weight:600">Competency</th>
              <th style="padding:10px;text-align:left;border:1px solid #ddd;font-weight:600">Self score</th>
              <th style="padding:10px;text-align:left;border:1px solid #ddd;font-weight:600">Self comment</th>
              <th style="padding:10px;text-align:left;border:1px solid #ddd;font-weight:600">Admin score</th>
              <th style="padding:10px;text-align:left;border:1px solid #ddd;font-weight:600">Admin comment</th>
              <th style="padding:10px;text-align:left;border:1px solid #ddd;font-weight:600">Action</th>
            </tr>
          </thead>
          <tbody>
            ${catCompetencies.map(comp => {
              const rating = ratingsMap.get(comp.id);
              const compName = comp.name || comp.title || "";
              return `
                <tr>
                  <td style="padding:10px;border:1px solid #ddd">${escapeHtml(compName)}</td>
                  <td style="padding:10px;border:1px solid #ddd;opacity:.7">${rating?.self_score ?? "-"}</td>
                  <td style="padding:10px;border:1px solid #ddd;opacity:.7;max-width:200px">${rating?.self_comment ? escapeHtml(rating.self_comment) : "-"}</td>
                  <td style="padding:10px;border:1px solid #ddd">
                    <input type="number" class="admin-score" data-competency="${comp.id}" 
                           value="${rating?.admin_score ?? ""}" min="0" max="100" 
                           style="width:80px;padding:6px;border:1px solid #ccc;border-radius:4px" />
                  </td>
                  <td style="padding:10px;border:1px solid #ddd">
                    <textarea class="admin-comment" data-competency="${comp.id}" 
                              style="width:100%;min-width:200px;padding:6px;border:1px solid #ccc;border-radius:4px;min-height:50px;resize:vertical">${escapeHtml(rating?.admin_comment ?? "")}</textarea>
                  </td>
                  <td style="padding:10px;border:1px solid #ddd">
                    <button class="save-rating" data-competency="${comp.id}" 
                            style="padding:6px 12px;background:#111;color:#fff;border:none;border-radius:4px;cursor:pointer">Save</button>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  });

  const assignedTasks = (tasks || []).filter(task => assignedTaskIds.has(task.id));

  // Генерируем HTML для задач
  let tasksHtml = "";
  if ((tasks || []).length > 0) {
    tasksHtml = `
      <div style="margin-top:32px;padding-top:32px;border-top:2px solid #ddd">
        <h3 style="margin:0 0 16px 0;font-size:18px;font-weight:600">Assigned Tasks</h3>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${assignedTasks.length === 0
            ? `<div style="border:1px dashed #ccc;padding:12px;border-radius:6px;opacity:.8">No tasks assigned yet.</div>`
            : assignedTasks.map(t => `
                <div style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid #ddd;border-radius:6px">
                  <div style="flex:1">
                    <div style="font-weight:600">${escapeHtml(t.title)}</div>
                    ${t.description ? `<div style="opacity:.8;font-size:14px;margin-top:4px">${escapeHtml(t.description)}</div>` : ""}
                  </div>
                  <button class="unassign-task" data-task="${t.id}" style="padding:6px 12px;background:#fff;border:1px solid #ccc;border-radius:4px;cursor:pointer">Unassign</button>
                </div>
              `).join("")}
        </div>

        <div style="margin-top:20px;padding-top:16px;border-top:1px solid #eee">
          <h4 style="margin:0 0 10px 0;font-size:16px;font-weight:600">Assign a task</h4>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <select id="assign-task-select" style="padding:8px;border:1px solid #ccc;border-radius:4px;min-width:240px">
              <option value="">Select a task...</option>
              ${(tasks || []).map(t => `
                <option value="${t.id}">${escapeHtml(t.title)}</option>
              `).join("")}
            </select>
            <button id="assign-task-btn" style="padding:8px 16px;background:#0066cc;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:500">
              Assign
            </button>
          </div>
        </div>
      </div>
    `;
  }

  root.innerHTML = `
    <div style="max-width:1400px;margin:50px auto;font-family:system-ui">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
        <div>
          <button id="back-to-students" style="padding:6px 12px;background:#f0f0f0;border:1px solid #ccc;border-radius:4px;cursor:pointer;margin-bottom:12px">← Back to Students</button>
          <h2 style="margin:0">${escapeHtml(student.name || student.email)}</h2>
          <div style="opacity:.8;margin-top:4px;font-size:14px">${escapeHtml(student.email)}</div>
        </div>
        <div style="display:flex;gap:10px;align-items:center">
          <button id="nav-students" style="padding:8px 16px;background:#111;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:500">Students</button>
          <button id="nav-manage-competencies" style="padding:8px 16px;background:#0066cc;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:500">Manage competencies</button>
          <button id="logout" style="padding:8px 12px">Logout</button>
        </div>
      </div>

      <div id="message" style="margin-bottom:16px"></div>

      <div>
        <h3 style="margin:0 0 16px 0;font-size:18px;font-weight:600">Competency Assessment</h3>
        ${competenciesHtml || "<p>No competencies found.</p>"}
      </div>

      ${tasksHtml}
    </div>
  `;

  document.getElementById("logout").onclick = async () => {
    await supabase.auth.signOut();
    location.reload();
  };

  document.getElementById("back-to-students").onclick = async () => {
    await renderAdminStudents();
  };

  document.getElementById("nav-students").onclick = async () => {
    await renderAdminStudents();
  };

  document.getElementById("nav-manage-competencies").onclick = async () => {
    await renderAdminCompetencyManager();
  };

  // Сохранение рейтингов компетенций
  document.querySelectorAll(".save-rating").forEach(btn => {
    btn.addEventListener("click", async () => {
      const competencyId = Number(btn.getAttribute("data-competency"));
      const scoreInput = document.querySelector(`.admin-score[data-competency="${competencyId}"]`);
      const commentInput = document.querySelector(`.admin-comment[data-competency="${competencyId}"]`);

      const adminScore = scoreInput?.value.trim() ? Number(scoreInput.value.trim()) : null;
      const adminComment = commentInput?.value.trim() || null;

      if (adminScore !== null && (adminScore < 0 || adminScore > 100)) {
        showMessage("Score must be between 0 and 100", "error");
        return;
      }

      // Получаем текущий рейтинг или создаем новый
      const existingRating = ratingsMap.get(competencyId);
      const payload = {
        user_id: studentId,
        competency_id: competencyId,
        admin_score: adminScore,
        admin_comment: adminComment,
        admin_updated_at: new Date().toISOString()
      };

      // Если есть self_score или self_comment, сохраняем их тоже
      if (existingRating) {
        payload.self_score = existingRating.self_score;
        payload.self_comment = existingRating.self_comment;
      }

      const { error } = await supabase
        .from("competency_ratings")
        .upsert(payload, { onConflict: "user_id,competency_id" });

      if (error) {
        showMessage("Error: " + error.message, "error");
      } else {
        showMessage("Saved", "success");
        await renderAdminStudentDetail(studentId);
      }
    });
  });

  document.querySelectorAll(".unassign-task").forEach(btn => {
    btn.addEventListener("click", async () => {
      const taskId = Number(btn.getAttribute("data-task"));
      const { error } = await supabase
        .from("assignments")
        .delete()
        .eq("user_id", studentId)
        .eq("task_id", taskId);

      if (error) {
        showMessage("Error: " + error.message, "error");
        return;
      }

      showMessage("Task unassigned", "success");
      await renderAdminStudentDetail(studentId);
    });
  });

  const assignTaskBtn = document.getElementById("assign-task-btn");
  if (assignTaskBtn) {
    assignTaskBtn.onclick = async () => {
      const selectEl = document.getElementById("assign-task-select");
      const selectedValue = selectEl?.value || "";
      if (!selectedValue) {
        showMessage("Select a task to assign", "error");
        return;
      }

      const taskId = Number(selectedValue);
      if (assignedTaskIds.has(taskId)) {
        showMessage("Already assigned", "error");
        return;
      }

      const { error } = await supabase
        .from("assignments")
        .insert(
          {
            user_id: studentId,
            task_id: taskId,
            assigned_by: currentUser?.id ?? null
          },
          { onConflict: "user_id,task_id", ignoreDuplicates: true }
        );

      if (error) {
        if (error.code === "23505" || /unique|duplicate/i.test(error.message)) {
          showMessage("Already assigned", "error");
        } else {
          showMessage("Error: " + error.message, "error");
        }
        return;
      }

      showMessage("Task assigned", "success");
      await renderAdminStudentDetail(studentId);
    };
  }
}

async function renderAdminCompetencyManager() {
  // Загружаем категории
  const { data: categories, error: categoriesError } = await supabase
    .from("competency_categories")
    .select("id, title, name, sort_order, is_active, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (categoriesError) {
    root.innerHTML = `<pre style="white-space:pre-wrap">Categories load error:\n${categoriesError.message}</pre>`;
    return;
  }

  // Загружаем компетенции
  const { data: competencies, error: competenciesError } = await supabase
    .from("competencies")
    .select("id, category_id, title, name, description, sort_order, is_active, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (competenciesError) {
    root.innerHTML = `<pre style="white-space:pre-wrap">Competencies load error:\n${competenciesError.message}</pre>`;
    return;
  }

  // Группируем компетенции по категориям
  const competenciesByCategory = new Map();
  (competencies || []).forEach(comp => {
    if (!competenciesByCategory.has(comp.category_id)) {
      competenciesByCategory.set(comp.category_id, []);
    }
    competenciesByCategory.get(comp.category_id).push(comp);
  });

  // Генерируем HTML для категорий
  let categoriesHtml = "";
  (categories || []).forEach((cat, catIndex) => {
    const catCompetencies = competenciesByCategory.get(cat.id) || [];
    const catTitle = cat.title || cat.name || "";
    const isActive = cat.is_active !== false;

    categoriesHtml += `
      <div style="border:1px solid #ddd;padding:16px;border-radius:8px;margin-bottom:24px;background:${isActive ? "#fff" : "#f5f5f5"}">
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">
          <div style="flex:1">
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <input type="text" class="cat-title" data-id="${cat.id}" value="${escapeAttr(catTitle)}" 
                     placeholder="Category title" required 
                     style="padding:8px;border:1px solid #ccc;border-radius:4px;min-width:200px;flex:1"/>
              <input type="number" class="cat-sort" data-id="${cat.id}" value="${cat.sort_order ?? 0}" 
                     placeholder="Sort order" 
                     style="padding:8px;border:1px solid #ccc;border-radius:4px;width:120px"/>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="checkbox" class="cat-active" data-id="${cat.id}" ${isActive ? "checked" : ""} 
                     style="cursor:pointer"/>
              <span style="font-size:14px">Active</span>
            </label>
            <button class="cat-save" data-id="${cat.id}" 
                    style="padding:6px 12px;background:#111;color:#fff;border:none;border-radius:4px;cursor:pointer">Save</button>
          </div>
        </div>

        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #eee">
          <div style="font-weight:600;margin-bottom:12px">Competencies</div>
          ${catCompetencies.map(comp => {
            const compTitle = comp.title || comp.name || "";
            const compIsActive = comp.is_active !== false;
            return `
              <div style="padding:12px;background:${compIsActive ? "#fafafa" : "#f0f0f0"};border:1px solid #ddd;border-radius:6px;margin-bottom:8px">
                <div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap">
                  <div style="flex:1;min-width:200px">
                    <input type="text" class="comp-title" data-id="${comp.id}" value="${escapeAttr(compTitle)}" 
                           placeholder="Competency title" required 
                           style="padding:6px;border:1px solid #ccc;border-radius:4px;width:100%;margin-bottom:8px"/>
                    <textarea class="comp-desc" data-id="${comp.id}" placeholder="Description (optional)" 
                              style="padding:6px;border:1px solid #ccc;border-radius:4px;width:100%;min-height:60px;resize:vertical">${escapeHtml(comp.description ?? "")}</textarea>
                  </div>
                  <div style="display:flex;flex-direction:column;gap:8px;min-width:140px">
                    <input type="number" class="comp-sort" data-id="${comp.id}" value="${comp.sort_order ?? 0}" 
                           placeholder="Sort order" 
                           style="padding:6px;border:1px solid #ccc;border-radius:4px;width:100%"/>
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                      <input type="checkbox" class="comp-active" data-id="${comp.id}" ${compIsActive ? "checked" : ""} 
                             style="cursor:pointer"/>
                      <span style="font-size:13px">Active</span>
                    </label>
                    <button class="comp-save" data-id="${comp.id}" 
                            style="padding:6px 12px;background:#111;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px">Save</button>
                  </div>
                </div>
              </div>
            `;
          }).join("")}

          <div style="margin-top:12px;padding:12px;background:#f9f9f9;border:1px dashed #ccc;border-radius:6px">
            <div style="font-weight:600;margin-bottom:8px">Add Competency</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start">
              <input type="text" class="new-comp-title" data-category="${cat.id}" placeholder="Title (required)" required 
                     style="padding:6px;border:1px solid #ccc;border-radius:4px;min-width:200px;flex:1"/>
              <textarea class="new-comp-desc" data-category="${cat.id}" placeholder="Description (optional)" 
                        style="padding:6px;border:1px solid #ccc;border-radius:4px;min-width:200px;flex:1;min-height:60px;resize:vertical"></textarea>
              <input type="number" class="new-comp-sort" data-category="${cat.id}" value="0" placeholder="Sort order" 
                     style="padding:6px;border:1px solid #ccc;border-radius:4px;width:120px"/>
              <button class="new-comp-add" data-category="${cat.id}" 
                      style="padding:6px 12px;background:#0066cc;color:#fff;border:none;border-radius:4px;cursor:pointer">Add</button>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  root.innerHTML = `
    <div style="max-width:1400px;margin:50px auto;font-family:system-ui">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
        <h2 style="margin:0">Manage Competencies</h2>
        <div style="display:flex;gap:10px;align-items:center">
          <button id="nav-students" style="padding:8px 16px;background:#111;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:500">Students</button>
          <button id="nav-manage-competencies" style="padding:8px 16px;background:#0066cc;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:500">Manage competencies</button>
          <button id="logout">Logout</button>
        </div>
      </div>

      <div id="message" style="margin-bottom:16px"></div>

      <div style="margin-bottom:24px;padding:16px;background:#f0f7ff;border:1px solid #b3d9ff;border-radius:8px">
        <div style="font-weight:600;margin-bottom:8px">Add Category</div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <input type="text" id="new-cat-title" placeholder="Category title (required)" required 
                 style="padding:8px;border:1px solid #ccc;border-radius:4px;min-width:200px;flex:1"/>
          <input type="number" id="new-cat-sort" value="0" placeholder="Sort order" 
                 style="padding:8px;border:1px solid #ccc;border-radius:4px;width:120px"/>
          <button id="new-cat-add" 
                  style="padding:8px 16px;background:#0066cc;color:#fff;border:none;border-radius:4px;cursor:pointer">Add Category</button>
        </div>
      </div>

      ${categoriesHtml || "<p>No categories found.</p>"}
    </div>
  `;

  // Навигация
  document.getElementById("logout").onclick = async () => {
    await supabase.auth.signOut();
    location.reload();
  };

  document.getElementById("nav-students").onclick = async () => {
    await renderAdminStudents();
  };

  document.getElementById("nav-manage-competencies").onclick = async () => {
    await renderAdminCompetencyManager();
  };

  // Добавление категории
  document.getElementById("new-cat-add").onclick = async () => {
    const titleInput = document.getElementById("new-cat-title");
    const sortInput = document.getElementById("new-cat-sort");
    const title = titleInput.value.trim();
    const sortOrder = parseInt(sortInput.value) || 0;

    if (!title) {
      showMessage("Title is required", "error");
      return;
    }

    const payload = {
      title: title,
      name: title,
      sort_order: sortOrder,
      is_active: true
    };

    const { error } = await supabase
      .from("competency_categories")
      .insert(payload);

    if (error) {
      showMessage("Error: " + error.message, "error");
    } else {
      showMessage("Category added", "success");
      titleInput.value = "";
      sortInput.value = "0";
      await renderAdminCompetencyManager();
    }
  };

  // Сохранение категории
  document.querySelectorAll(".cat-save").forEach(btn => {
    btn.addEventListener("click", async () => {
      const catId = Number(btn.getAttribute("data-id"));
      const titleInput = document.querySelector(`.cat-title[data-id="${catId}"]`);
      const sortInput = document.querySelector(`.cat-sort[data-id="${catId}"]`);
      const activeCheckbox = document.querySelector(`.cat-active[data-id="${catId}"]`);

      const title = titleInput.value.trim();
      const sortOrder = parseInt(sortInput.value) || 0;
      const isActive = activeCheckbox.checked;

      if (!title) {
        showMessage("Title is required", "error");
        return;
      }

      const payload = {
        title: title,
        name: title,
        sort_order: sortOrder,
        is_active: isActive
      };

      const { error } = await supabase
        .from("competency_categories")
        .update(payload)
        .eq("id", catId);

      if (error) {
        showMessage("Error: " + error.message, "error");
      } else {
        showMessage("Saved", "success");
        await renderAdminCompetencyManager();
      }
    });
  });

  // Добавление компетенции
  document.querySelectorAll(".new-comp-add").forEach(btn => {
    btn.addEventListener("click", async () => {
      const categoryId = Number(btn.getAttribute("data-category"));
      const titleInput = document.querySelector(`.new-comp-title[data-category="${categoryId}"]`);
      const descInput = document.querySelector(`.new-comp-desc[data-category="${categoryId}"]`);
      const sortInput = document.querySelector(`.new-comp-sort[data-category="${categoryId}"]`);

      const title = titleInput.value.trim();
      const description = descInput.value.trim() || null;
      const sortOrder = parseInt(sortInput.value) || 0;

      if (!title) {
        showMessage("Title is required", "error");
        return;
      }

      const payload = {
        category_id: categoryId,
        title: title,
        name: title,
        description: description,
        sort_order: sortOrder,
        is_active: true
      };

      const { error } = await supabase
        .from("competencies")
        .insert(payload);

      if (error) {
        showMessage("Error: " + error.message, "error");
      } else {
        showMessage("Competency added", "success");
        titleInput.value = "";
        descInput.value = "";
        sortInput.value = "0";
        await renderAdminCompetencyManager();
      }
    });
  });

  // Сохранение компетенции
  document.querySelectorAll(".comp-save").forEach(btn => {
    btn.addEventListener("click", async () => {
      const compId = Number(btn.getAttribute("data-id"));
      const titleInput = document.querySelector(`.comp-title[data-id="${compId}"]`);
      const descInput = document.querySelector(`.comp-desc[data-id="${compId}"]`);
      const sortInput = document.querySelector(`.comp-sort[data-id="${compId}"]`);
      const activeCheckbox = document.querySelector(`.comp-active[data-id="${compId}"]`);

      const title = titleInput.value.trim();
      const description = descInput.value.trim() || null;
      const sortOrder = parseInt(sortInput.value) || 0;
      const isActive = activeCheckbox.checked;

      if (!title) {
        showMessage("Title is required", "error");
        return;
      }

      const payload = {
        title: title,
        name: title,
        description: description,
        sort_order: sortOrder,
        is_active: isActive
      };

      const { error } = await supabase
        .from("competencies")
        .update(payload)
        .eq("id", compId);

      if (error) {
        showMessage("Error: " + error.message, "error");
      } else {
        showMessage("Saved", "success");
        await renderAdminCompetencyManager();
      }
    });
  });
}

function showMessage(text, type) {
  const messageEl = document.getElementById("message");
  if (!messageEl) return;
  
  const bgColor = type === "error" ? "#fee" : "#efe";
  const borderColor = type === "error" ? "#fcc" : "#cfc";
  const textColor = type === "error" ? "#c00" : "#060";
  
  messageEl.innerHTML = `<div style="padding:12px;background:${bgColor};border:1px solid ${borderColor};border-radius:4px;color:${textColor}">${escapeHtml(text)}</div>`;
  
  setTimeout(() => {
    messageEl.innerHTML = "";
  }, 3000);
}

function setAuthMessage(text, type = "info") {
  const messageEl = document.getElementById("auth-message");
  if (!messageEl) return;

  const palette = {
    error: { bg: "#fee", border: "#fcc", text: "#c00" },
    success: { bg: "#efe", border: "#cfc", text: "#060" },
    info: { bg: "#eef5ff", border: "#cfe3ff", text: "#114488" }
  };
  const colors = palette[type] || palette.info;
  messageEl.innerHTML = `<div style="padding:12px;background:${colors.bg};border:1px solid ${colors.border};border-radius:4px;color:${colors.text}">${escapeHtml(text)}</div>`;
}

async function renderLogin() {
  root.innerHTML = `
    <div style="max-width:420px;margin:60px auto;font-family:system-ui">
      <h2>Login</h2>
      <label style="display:block;font-size:14px;margin:10px 0 6px">Email</label>
      <input id="email" type="email" placeholder="you@company.com" style="width:100%;padding:10px;margin-bottom:10px"/>
      <div style="display:flex;gap:10px;align-items:center">
        <button id="send-link" style="padding:10px 14px;background:#111;color:#fff;border:none;border-radius:4px;cursor:pointer">Send login link</button>
      </div>
      <div id="auth-message" style="margin-top:14px"></div>
    </div>
  `;

  const sendMagicLink = async () => {
    const email = document.getElementById("email").value.trim();
    if (!email) {
      setAuthMessage("Введите email", "error");
      return;
    }

    const button = document.getElementById("send-link");
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Sending...";

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: MAGIC_LINK_REDIRECT_URL
      }
    });

    if (error) {
      setAuthMessage(error.message || "Authentication failed.", "error");
      button.disabled = false;
      button.textContent = originalText;
      return;
    }

    setAuthMessage("Check your email for the login link.", "success");
    button.disabled = false;
    button.textContent = originalText;
  };

  document.getElementById("send-link").onclick = async () => {
    await sendMagicLink();
  };
}

async function route() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    root.innerHTML = `<pre style="white-space:pre-wrap">Session load error:\n${sessionError.message}</pre>`;
    return;
  }

  const session = sessionData?.session || null;
  const user = session?.user || null;
  currentUser = user;

  // 2) Если не залогинен — показываем форму
  if (!user) {
    await renderLogin();
    return;
  }

  const { data: existingProfile, error: profileLookupError } = await supabase
    .from("profiles")
    .select("id, role, name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (profileLookupError) {
    root.innerHTML = `<pre style="white-space:pre-wrap">Profile lookup error:\n${profileLookupError.message}</pre>`;
    return;
  }

  const role = existingProfile?.role || "student";
  const name = existingProfile?.name || user.email || "";
  const email = existingProfile?.email || user.email || "";

  const { error: profileUpsertError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email,
      name,
      role
    },
    { onConflict: "id" }
  );

  if (profileUpsertError) {
    root.innerHTML = `<pre style="white-space:pre-wrap">Profile upsert error:\n${profileUpsertError.message}</pre>`;
    return;
  }

  // читаем роль
  const profile = {
    id: user.id,
    role,
    name
  };
  currentRole = role;

  if (role === "admin") {
    await renderAdminStudents();
  } else if (isBlank(profile.name)) {
    await renderProfileCompletion(profile);
  } else {
    await renderStudent();
  }
}

await route();
