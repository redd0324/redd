const VALUES = [
  "Salary 薪資",
  "Reputation 學術聲望",
  "Research Freedom 研究自主",
  "Teaching Impact 教學影響",
  "Work-Life Balance 生活平衡",
  "Health 身心健康",
  "Family/Care 家庭照顧",
  "Job Security 職涯穩定",
  "Social Contribution 社會貢獻",
];

const TASKS = [
  {
    title: "頂尖博後 Offer",
    text: "拿到海外名校博後，但伴侶在本地有穩定工作。",
    target: ["Research Freedom 研究自主", "Family/Care 家庭照顧", "Reputation 學術聲望"],
  },
  {
    title: "升等壓力年",
    text: "系上要求一年 3 篇 SSCI 才能續聘。",
    target: ["Job Security 職涯穩定", "Reputation 學術聲望", "Health 身心健康"],
  },
  {
    title: "高薪教學職",
    text: "高薪教學型大學邀約，研究資源普通。",
    target: ["Salary 薪資", "Teaching Impact 教學影響", "Work-Life Balance 生活平衡"],
  },
  {
    title: "大型補助案",
    text: "拿到跨校補助，行政量暴增，需經常出差。",
    target: ["Research Freedom 研究自主", "Reputation 學術聲望", "Family/Care 家庭照顧"],
  },
  {
    title: "照顧責任突增",
    text: "家人健康出狀況，你必須重新安排工作節奏。",
    target: ["Family/Care 家庭照顧", "Health 身心健康", "Job Security 職涯穩定"],
  },
  {
    title: "社會議題合作",
    text: "你的專業可協助在地政策改革，但對發表幫助有限。",
    target: ["Social Contribution 社會貢獻", "Teaching Impact 教學影響", "Reputation 學術聲望"],
  },
];

const EVENTS = [
  { name: "學校凍聘", text: "本回合 Job Security +1 分。" },
  { name: "競爭型補助加碼", text: "本回合 Research Freedom +1 分。" },
  { name: "身心健康倡議", text: "本回合 Health 或 Work-Life Balance +1 分。" },
  { name: "教學評鑑改革", text: "本回合 Teaching Impact +1 分。" },
  { name: "生活成本飆升", text: "本回合 Salary +1 分。" },
];

const ROLES = [
  {
    name: "正教授",
    desc: "每回合一次：指定一名玩家，該玩家本回合角色能力無效。",
    apply: ({ game, actor }) => {
      const target = game.players.find((p) => p.id !== actor.id && !p.blockedThisRound);
      if (target) {
        target.blockedThisRound = true;
        game.logs.push(`🎓 ${actor.name}（正教授）封鎖了 ${target.name} 的角色能力。`);
      }
    },
  },
  {
    name: "冒險症候群",
    desc: "若你本回合命中 0 個目標價值，改為 +5 分。",
    bonus: ({ matches }) => (matches === 0 ? 5 : 0),
  },
  {
    name: "教學明星",
    desc: "若你把 Teaching Impact 排第 1，本回合 +2。",
    bonus: ({ picks }) => (picks[0] === "Teaching Impact 教學影響" ? 2 : 0),
  },
  {
    name: "家庭守護者",
    desc: "若 Family/Care 或 Health 在前 2，+2。",
    bonus: ({ picks }) =>
      picks.slice(0, 2).some((v) => ["Family/Care 家庭照顧", "Health 身心健康"].includes(v)) ? 2 : 0,
  },
  {
    name: "論文機器",
    desc: "若 Reputation 或 Research Freedom 在前 2，+2。",
    bonus: ({ picks }) =>
      picks.slice(0, 2).some((v) => ["Reputation 學術聲望", "Research Freedom 研究自主"].includes(v)) ? 2 : 0,
  },
  {
    name: "佛系學者",
    desc: "不受事件卡影響（好壞都免疫）。",
    immunity: true,
  },
];

const game = {
  players: [],
  currentPlayerIndex: 0,
  round: 0,
  maxRounds: 5,
  usedTasks: [],
  usedEvents: [],
  currentTask: null,
  currentEvent: null,
  phase: "idle",
  logs: [],
};

const $ = (id) => document.getElementById(id);
const els = {
  playerCount: $("playerCount"),
  roundCount: $("roundCount"),
  startBtn: $("startBtn"),
  roundLabel: $("roundLabel"),
  phaseLabel: $("phaseLabel"),
  taskCard: $("taskCard"),
  eventCard: $("eventCard"),
  activePlayerCard: $("activePlayerCard"),
  roleActionArea: $("roleActionArea"),
  valueSelectors: $("valueSelectors"),
  submitChoiceBtn: $("submitChoiceBtn"),
  resolveRoundBtn: $("resolveRoundBtn"),
  statusText: $("statusText"),
  scoreboard: $("scoreboard"),
  history: $("history"),
  scoreTemplate: $("scoreItemTemplate"),
};

function pickUnique(pool, used) {
  const rest = pool.filter((_, i) => !used.includes(i));
  if (!rest.length) {
    used.length = 0;
    return pickUnique(pool, used);
  }
  const item = rest[Math.floor(Math.random() * rest.length)];
  used.push(pool.indexOf(item));
  return item;
}

function startGame() {
  const count = Number(els.playerCount.value);
  game.maxRounds = Number(els.roundCount.value);
  game.players = Array.from({ length: count }, (_, idx) => ({
    id: idx + 1,
    name: `Player ${idx + 1}`,
    role: ROLES[idx % ROLES.length],
    score: 0,
    picks: null,
    usedRoleInRound: false,
    blockedThisRound: false,
  }));
  game.round = 0;
  game.logs = ["🎬 遊戲開始！"]; 
  nextRound();
}

function nextRound() {
  game.round += 1;
  if (game.round > game.maxRounds) {
    game.phase = "finished";
    els.statusText.textContent = "遊戲結束！可按開始新遊戲重開。";
    els.resolveRoundBtn.disabled = true;
    render();
    return;
  }
  game.currentPlayerIndex = 0;
  game.currentTask = pickUnique(TASKS, game.usedTasks);
  game.currentEvent = pickUnique(EVENTS, game.usedEvents);
  game.phase = "picking";
  game.players.forEach((p) => {
    p.picks = null;
    p.usedRoleInRound = false;
    p.blockedThisRound = false;
  });
  game.logs.push(`🧩 第 ${game.round} 回合：${game.currentTask.title}`);
  render();
}

function createSelectors() {
  els.valueSelectors.innerHTML = "";
  ["第一順位", "第二順位", "第三順位"].forEach((label, idx) => {
    const wrap = document.createElement("label");
    wrap.textContent = label;
    const select = document.createElement("select");
    select.dataset.slot = String(idx);
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "請選擇";
    select.append(empty);
    VALUES.forEach((v) => {
      const option = document.createElement("option");
      option.value = v;
      option.textContent = v;
      select.append(option);
    });
    wrap.append(select);
    els.valueSelectors.append(wrap);
  });
}

function submitChoice() {
  const picks = [...els.valueSelectors.querySelectorAll("select")].map((s) => s.value);
  if (new Set(picks).size !== 3 || picks.some((v) => !v)) {
    els.statusText.textContent = "請選 3 個不同價值。";
    return;
  }

  const player = game.players[game.currentPlayerIndex];
  player.picks = picks;
  els.statusText.textContent = `${player.name} 已提交。`;
  game.currentPlayerIndex += 1;

  if (game.currentPlayerIndex >= game.players.length) {
    game.phase = "review";
    els.resolveRoundBtn.disabled = false;
  }
  render();
}

function applyRoleIfChecked(player) {
  const checkbox = document.querySelector(`#useRole-${player.id}`);
  if (!checkbox || !checkbox.checked || player.blockedThisRound) return;
  player.usedRoleInRound = true;
  if (typeof player.role.apply === "function") {
    player.role.apply({ game, actor: player });
  }
}

function eventBonus(player) {
  if (player.role.immunity) return 0;
  const first3 = player.picks || [];
  const e = game.currentEvent.name;

  if (e === "學校凍聘" && first3.includes("Job Security 職涯穩定")) return 1;
  if (e === "競爭型補助加碼" && first3.includes("Research Freedom 研究自主")) return 1;
  if (e === "身心健康倡議" && first3.some((v) => ["Health 身心健康", "Work-Life Balance 生活平衡"].includes(v))) return 1;
  if (e === "教學評鑑改革" && first3.includes("Teaching Impact 教學影響")) return 1;
  if (e === "生活成本飆升" && first3.includes("Salary 薪資")) return 1;
  return 0;
}

function resolveRound() {
  if (game.phase !== "review") return;

  game.players.forEach((player) => applyRoleIfChecked(player));

  game.players.forEach((player) => {
    const picks = player.picks || [];
    let score = 0;
    let matches = 0;

    picks.forEach((value, idx) => {
      if (game.currentTask.target.includes(value)) {
        matches += 1;
        score += 3 - idx;
      }
    });

    if (matches === 3) score += 2;
    score += eventBonus(player);

    if (!player.blockedThisRound && typeof player.role.bonus === "function") {
      score += player.role.bonus({ picks, matches, task: game.currentTask });
    }

    player.score += score;
    game.logs.push(`📝 ${player.name} 得 ${score} 分（累積 ${player.score}）。`);
  });

  const reveal = game.players
    .map((p) => `${p.name}: ${p.picks.join(" / ")}`)
    .join("<br>");
  game.logs.push(`🔍 本回合排序公開：<br>${reveal}`);

  nextRound();
}

function renderRoleAction() {
  els.roleActionArea.innerHTML = "";
  game.players.forEach((p) => {
    const row = document.createElement("label");
    const disabled = p.blockedThisRound ? "disabled" : "";
    row.innerHTML = `<input type="checkbox" id="useRole-${p.id}" ${disabled}/> ${p.name} 使用角色：${p.role.name}`;
    row.title = p.role.desc;
    els.roleActionArea.append(row);
  });
}

function renderScoreboard() {
  els.scoreboard.innerHTML = "";
  [...game.players]
    .sort((a, b) => b.score - a.score)
    .forEach((p) => {
      const node = els.scoreTemplate.content.cloneNode(true);
      node.querySelector(".name").textContent = p.name;
      node.querySelector(".role").textContent = p.role.name;
      node.querySelector(".score").textContent = `${p.score} 分`;
      els.scoreboard.append(node);
    });
}

function renderHistory() {
  els.history.innerHTML = "";
  game.logs.slice(-7).reverse().forEach((log) => {
    const div = document.createElement("div");
    div.className = "log";
    div.innerHTML = log;
    els.history.append(div);
  });
}

function render() {
  els.roundLabel.textContent = `回合 ${Math.min(game.round, game.maxRounds)} / ${game.maxRounds}`;
  els.phaseLabel.textContent = `階段：${game.phase}`;

  if (game.currentTask) {
    els.taskCard.innerHTML = `<h3>${game.currentTask.title}</h3><p>${game.currentTask.text}</p><small>任務卡前三參考：${game.currentTask.target.join("、")}</small>`;
  } else {
    els.taskCard.innerHTML = "<h3>任務卡</h3><p>尚未開始。</p>";
  }

  if (game.currentEvent) {
    els.eventCard.innerHTML = `<h3>事件：${game.currentEvent.name}</h3><p>${game.currentEvent.text}</p>`;
  } else {
    els.eventCard.innerHTML = "<h3>事件卡</h3><p>尚未翻開。</p>";
  }

  const player = game.players[game.currentPlayerIndex];
  if (game.phase === "picking" && player) {
    els.activePlayerCard.innerHTML = `<h3>輪到 ${player.name}</h3><p>角色：${player.role.name}</p><small>${player.role.desc}</small>`;
    els.submitChoiceBtn.disabled = false;
    createSelectors();
    els.resolveRoundBtn.disabled = true;
    els.statusText.textContent = "請由當前玩家秘密選擇前三價值。";
  } else if (game.phase === "review") {
    els.activePlayerCard.innerHTML = `<h3>全員已提交</h3><p>可勾選要發動的角色能力，再按結算。</p>`;
    els.submitChoiceBtn.disabled = true;
    renderRoleAction();
  } else if (game.phase === "finished") {
    els.activePlayerCard.innerHTML = "<h3>🎉 遊戲結束</h3><p>查看排行榜與歷史紀錄。</p>";
    els.submitChoiceBtn.disabled = true;
  }

  renderScoreboard();
  renderHistory();
}

els.startBtn.addEventListener("click", startGame);
els.submitChoiceBtn.addEventListener("click", submitChoice);
els.resolveRoundBtn.addEventListener("click", resolveRound);

render();
