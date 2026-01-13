import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://txmvkbixfzlsumvmzoyn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4bXZrYml4Znpsc3Vtdm16b3luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMTA4ODMsImV4cCI6MjA4MjU4Njg4M30.hFW0Ndbs7STWlA294xe3lQqJ4Lj2mxFGGuQP-ncbnDY";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const root = document.getElementById("root");
root.innerHTML = "<p style='padding:20px'>Loading...</p>";

// Глобальные переменные для навигации
let currentUser = null;
let currentRole = null;

async function login(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Жёстко укажите ваш Pages URL, чтобы не улетать на корень домена
      emailRedirectTo: "https://kirilly2281.github.io/Nota_Test/"
    }
  });

  if (error) alert(error.message);
  else alert("Проверь почту — отправил ссылку для входа.");
}

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
          <button id="nav-assessment" style="padding:8px 12px">Assessment</button>
          <button id="logout">Logout</button>
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

  document.getElementById("nav-assessment").onclick = async () => {
    await renderAssessment();
  };

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

async function renderStudent() {
  const { data: subs, error: subsError } = await supabase
    .from("submissions")
    .select("id, task_id, result_url, student_comment, status, score, admin_comment, created_at")
    .eq("user_id", currentUser.id);

  if (subsError) {
    root.innerHTML = `<pre style="white-space:pre-wrap">Submissions load error:\n${subsError.message}</pre>`;
    return;
  }

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, title, description, materials, materials_url, sort_order")
    .order("sort_order", { ascending: true });

  if (tasksError) {
    root.innerHTML = `<pre style="white-space:pre-wrap">Tasks load error:\n${tasksError.message}</pre>`;
    return;
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
          <button id="nav-assessment" style="padding:8px 12px">Assessment</button>
          <button id="logout">Logout</button>
        </div>
      </div>

      <div style="margin-top:18px">
        ${(tasks || []).map(t => {
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

  document.getElementById("nav-assessment").onclick = async () => {
    await renderAssessment();
  };

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
  // Загружаем категории компетенций
  const { data: categories, error: categoriesError } = await supabase
    .from("competency_categories")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true });

  if (categoriesError) {
    root.innerHTML = `<pre style="white-space:pre-wrap">Categories load error:\n${categoriesError.message}</pre>`;
    return;
  }

  // Загружаем компетенции
  const { data: competencies, error: competenciesError } = await supabase
    .from("competencies")
    .select("id, category_id, name, description, sort_order")
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
          ${currentRole === "admin" 
            ? '<button id="nav-admin" style="padding:8px 12px">Admin review</button>' 
            : '<button id="nav-tasks" style="padding:8px 12px">Tasks</button>'}
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

  if (currentRole === "admin") {
    document.getElementById("nav-admin").onclick = async () => {
      await renderAdmin();
    };
  } else {
    document.getElementById("nav-tasks").onclick = async () => {
      await renderStudent();
    };
  }

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

// 1) Проверяем пользователя
const { data: userResp } = await supabase.auth.getUser();
const user = userResp?.user || null;
currentUser = user;

// 2) Если не залогинен — показываем форму
if (!user) {
  root.innerHTML = `
    <div style="max-width:420px;margin:60px auto;font-family:system-ui">
      <h2>Login</h2>
      <input id="email" placeholder="you@company.com" style="width:100%;padding:10px;margin:10px 0"/>
      <button id="login" style="padding:10px 14px">Send magic link</button>
    </div>
  `;

  document.getElementById("login").onclick = async () => {
    const email = document.getElementById("email").value.trim();
    if (!email) return alert("Введите email");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: "https://kirilly2281.github.io/Nota_Test/" }
    });

    if (error) alert(error.message);
    else alert("Проверь почту — отправил ссылку для входа.");
  };
} else {
  // гарантируем, что профиль есть
  await supabase.from("profiles").upsert(
    { id: user.id, email: user.email, name: user.email },
    { onConflict: "email" }
  );

  // читаем роль
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("email", user.email)
    .single();

  if (profileError) {
    root.innerHTML = `<pre style="white-space:pre-wrap">Profile load error:\n${profileError.message}</pre>`;
    throw profileError;
  }

  const role = profile.role;
  currentRole = role;

  if (role === "admin") {
    await renderAdmin();
  } else {
    await renderStudent();
  }
}
