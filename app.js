const QUESTIONS = [
  {
    id: "q1",
    prompt: "Tell me about a project you built recently and what problem it solved.",
    expectedSeconds: 45
  },
  {
    id: "q2",
    prompt: "How would you debug a website that suddenly became very slow?",
    expectedSeconds: 55
  },
  {
    id: "q3",
    prompt: "What is the difference between authentication and authorization?",
    expectedSeconds: 40
  },
  {
    id: "q4",
    prompt: "Describe a time you had to learn something quickly under pressure.",
    expectedSeconds: 50
  },
  {
    id: "q5",
    prompt: "If you were scaling a feature for 10x more users, what tradeoffs would you consider?",
    expectedSeconds: 60
  }
];

const state = {
  active: false,
  sessionId: "",
  startedAt: null,
  endedAt: null,
  riskScore: 0,
  events: [],
  questionHistory: [],
  currentIndex: -1,
  currentQuestion: null,
  consent: false,
  lastBlurAt: 0
};

const els = {};

document.addEventListener("DOMContentLoaded", init);

function init() {
  cacheElements();
  bindEvents();
  renderAll();
}

function cacheElements() {
  els.consentCheckbox = document.getElementById("consentCheckbox");
  els.startSessionBtn = document.getElementById("startSessionBtn");
  els.resetBtn = document.getElementById("resetBtn");
  els.sessionState = document.getElementById("sessionState");
  els.questionState = document.getElementById("questionState");
  els.questionCounter = document.getElementById("questionCounter");
  els.questionExpected = document.getElementById("questionExpected");
  els.questionText = document.getElementById("questionText");
  els.questionMeta = document.getElementById("questionMeta");
  els.answerForm = document.getElementById("answerForm");
  els.answerInput = document.getElementById("answerInput");
  els.submitAnswerBtn = document.getElementById("submitAnswerBtn");
  els.nextQuestionBtn = document.getElementById("nextQuestionBtn");
  els.endSessionBtn = document.getElementById("endSessionBtn");
  els.riskScore = document.getElementById("riskScore");
  els.riskLabel = document.getElementById("riskLabel");
  els.riskBarFill = document.getElementById("riskBarFill");
  els.sessionIdLabel = document.getElementById("sessionIdLabel");
  els.metricQuestionTime = document.getElementById("metricQuestionTime");
  els.metricWords = document.getElementById("metricWords");
  els.metricFocusLoss = document.getElementById("metricFocusLoss");
  els.metricVisibility = document.getElementById("metricVisibility");
  els.metricPaste = document.getElementById("metricPaste");
  els.metricTyping = document.getElementById("metricTyping");
  els.summarySignalCount = document.getElementById("summarySignalCount");
  els.summaryQuestionCount = document.getElementById("summaryQuestionCount");
  els.summaryStatus = document.getElementById("summaryStatus");
  els.eventTimeline = document.getElementById("eventTimeline");
  els.sessionSummary = document.getElementById("sessionSummary");
  els.exportBtn = document.getElementById("exportBtn");
  els.timelineHint = document.getElementById("timelineHint");
}

function bindEvents() {
  els.consentCheckbox.addEventListener("change", () => {
    state.consent = els.consentCheckbox.checked;
    els.startSessionBtn.disabled = !state.consent || state.active;
    renderAll();
  });

  els.startSessionBtn.addEventListener("click", startSession);
  els.resetBtn.addEventListener("click", () => window.location.reload());
  els.answerForm.addEventListener("submit", submitAnswer);
  els.nextQuestionBtn.addEventListener("click", goToNextQuestion);
  els.endSessionBtn.addEventListener("click", endSession);
  els.exportBtn.addEventListener("click", exportReport);

  els.answerInput.addEventListener("input", handleTyping);
  els.answerInput.addEventListener("keydown", handleKeydown);
  els.answerInput.addEventListener("paste", handlePaste);
  els.answerInput.addEventListener("copy", handleCopy);

  window.addEventListener("blur", handleBlur);
  window.addEventListener("focus", handleFocus);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  setInterval(() => {
    if (state.active) {
      renderMetrics();
      renderQuestionState();
    }
  }, 500);
}

function startSession() {
  if (!state.consent || state.active) return;

  state.active = true;
  state.sessionId = makeSessionId();
  state.startedAt = Date.now();
  state.endedAt = null;
  state.riskScore = 0;
  state.events = [];
  state.questionHistory = [];
  state.currentIndex = -1;
  state.currentQuestion = null;
  state.lastBlurAt = 0;

  pushInfo("Consent captured. Session started.");
  loadQuestion(0);
  renderAll();
}

function loadQuestion(index) {
  const question = QUESTIONS[index];

  state.currentIndex = index;
  state.currentQuestion = {
    ...question,
    index,
    startedAt: Date.now(),
    submittedAt: null,
    answer: "",
    firstInputAt: null,
    lastInputAt: null,
    lastKeyAt: null,
    chars: 0,
    words: 0,
    keyIntervals: [],
    blurEvents: 0,
    visibilityEvents: 0,
    pasteEvents: 0,
    copyEvents: 0
  };

  els.answerInput.disabled = false;
  els.answerInput.value = "";
  els.answerInput.focus();
  els.submitAnswerBtn.disabled = false;
  els.nextQuestionBtn.disabled = true;
  els.nextQuestionBtn.textContent =
    index === QUESTIONS.length - 1 ? "Finish session" : "Next question";

  pushInfo(`Loaded question ${index + 1} of ${QUESTIONS.length}.`);
  renderAll();
}

function submitAnswer(event) {
  event.preventDefault();
  if (!state.active || !state.currentQuestion) return;

  const q = state.currentQuestion;
  q.submittedAt = Date.now();
  q.answer = els.answerInput.value.trim();
  q.chars = q.answer.length;
  q.words = countWords(q.answer);

  evaluateQuestion(q);

  state.questionHistory.push(cloneQuestion(q));

  els.answerInput.disabled = true;
  els.submitAnswerBtn.disabled = true;
  els.nextQuestionBtn.disabled = false;

  pushInfo(`Submitted question ${q.index + 1}.`);
  renderAll();
}

function goToNextQuestion() {
  if (!state.active) return;

  if (state.currentIndex + 1 < QUESTIONS.length) {
    loadQuestion(state.currentIndex + 1);
    return;
  }

  endSession();
}

function endSession() {
  if (!state.active) return;

  if (state.currentQuestion && !state.currentQuestion.submittedAt) {
    pushInfo("Session ended before the current answer was submitted.");
  }

  state.active = false;
  state.endedAt = Date.now();

  els.answerInput.disabled = true;
  els.submitAnswerBtn.disabled = true;
  els.nextQuestionBtn.disabled = true;
  els.endSessionBtn.disabled = true;

  pushInfo("Session ended. Review report ready.");
  renderAll();
}

function evaluateQuestion(q) {
  const elapsedSeconds = (q.submittedAt - q.startedAt) / 1000;
  const firstDelaySeconds = q.firstInputAt ? (q.firstInputAt - q.startedAt) / 1000 : null;

  if (q.pasteEvents > 0) {
    addSignal("Paste into answer field", 25, "paste", { questionId: q.id });
  }

  if (q.copyEvents > 0) {
    addSignal("Copy action detected during interview", 5, "copy", { questionId: q.id });
  }

  if (q.blurEvents > 0) {
    addSignal(
      `${q.blurEvents} focus loss event(s) while answering`,
      Math.min(12, q.blurEvents * 6),
      "blur",
      { questionId: q.id }
    );
  }

  if (q.visibilityEvents > 0) {
    addSignal(
      `${q.visibilityEvents} hidden-tab event(s) while answering`,
      Math.min(20, q.visibilityEvents * 10),
      "visibility",
      { questionId: q.id }
    );
  }

  if (firstDelaySeconds !== null && firstDelaySeconds < 1.5 && q.words > 25) {
    addSignal("Answer started unusually fast", 8, "fast-start", { questionId: q.id });
  }

  if (elapsedSeconds < 12 && q.words > 70) {
    addSignal("Large answer delivered very quickly", 8, "fast-submit", { questionId: q.id });
  }

  if (q.blurEvents >= 2 && q.words > 40) {
    addSignal("Repeated off-screen behavior on the same question", 10, "pattern", {
      questionId: q.id
    });
  }

  if (q.pasteEvents === 0 && q.blurEvents === 0 && q.visibilityEvents === 0 && q.copyEvents === 0) {
    pushInfo("No major behavioral signals on this question.");
  }
}

function handleTyping() {
  if (!state.active || !state.currentQuestion) return;

  const q = state.currentQuestion;
  const value = els.answerInput.value;
  const now = Date.now();

  q.answer = value;
  q.chars = value.length;
  q.words = countWords(value);

  if (!q.firstInputAt && value.trim().length > 0) {
    q.firstInputAt = now;
  }

  q.lastInputAt = now;
  renderMetrics();
  renderQuestionState();
}

function handleKeydown() {
  if (!state.active || !state.currentQuestion) return;

  const q = state.currentQuestion;
  const now = Date.now();

  if (q.lastKeyAt) {
    q.keyIntervals.push(now - q.lastKeyAt);
  }

  q.lastKeyAt = now;
}

function handlePaste() {
  if (!state.active || !state.currentQuestion) return;

  state.currentQuestion.pasteEvents += 1;
  addSignal("Paste into answer field", 25, "paste", { questionId: state.currentQuestion.id });
  renderMetrics();
}

function handleCopy() {
  if (!state.active || !state.currentQuestion) return;

  state.currentQuestion.copyEvents += 1;
  addSignal("Copy action detected", 5, "copy", { questionId: state.currentQuestion.id });
  renderMetrics();
}

function handleBlur() {
  if (!state.active || !state.currentQuestion) return;

  const now = Date.now();
  if (now - state.lastBlurAt < 1200) return;
  state.lastBlurAt = now;

  state.currentQuestion.blurEvents += 1;

  addSignal("Window lost focus during interview", 8, "blur", {
    questionId: state.currentQuestion.id
  });

  renderMetrics();
}

function handleFocus() {
  if (!state.active) return;
  pushInfo("Window focus returned.");
}

function handleVisibilityChange() {
  if (!state.active || !state.currentQuestion) return;

  if (document.visibilityState === "hidden") {
    state.currentQuestion.visibilityEvents += 1;
    addSignal("Tab became hidden", 15, "visibility", {
      questionId: state.currentQuestion.id
    });
    renderMetrics();
  }

  if (document.visibilityState === "visible") {
    pushInfo("Tab returned to foreground.");
  }
}

function addSignal(reason, points, key, meta = {}) {
  state.riskScore = clamp(state.riskScore + points, 0, 100);

  state.events.unshift({
    id: makeSessionId(),
    type: "signal",
    key,
    reason,
    points,
    meta,
    time: Date.now(),
    questionIndex: state.currentIndex
  });

  renderAll();
}

function pushInfo(reason, meta = {}) {
  state.events.unshift({
    id: makeSessionId(),
    type: "info",
    key: "info",
    reason,
    points: 0,
    meta,
    time: Date.now(),
    questionIndex: state.currentIndex
  });

  renderAll();
}

function renderAll() {
  renderHeader();
  renderQuestionCard();
  renderMetrics();
  renderTimeline();
  renderSummary();
  renderButtons();
}

function renderHeader() {
  els.riskScore.textContent = String(state.riskScore);
  els.riskBarFill.style.width = `${state.riskScore}%`;

  const label = getRiskLabel(state.riskScore);
  els.riskLabel.textContent = label.text;
  els.riskLabel.dataset.level = label.level;
  els.sessionIdLabel.textContent = state.sessionId
    ? `Session ID: ${state.sessionId}`
    : "Session not started";

  if (!state.active && state.startedAt) {
    els.sessionState.textContent = "Session complete";
  } else if (state.active) {
    els.sessionState.textContent = "Session active";
  } else {
    els.sessionState.textContent = state.consent ? "Ready to start" : "Waiting for consent";
  }

  els.summaryStatus.textContent = label.text;
}

function renderQuestionCard() {
  if (!state.currentQuestion) {
    els.questionCounter.textContent = "Question 0 / 0";
    els.questionExpected.textContent = "Expected time: -";
    els.questionText.textContent = "Press Start session to begin.";
    els.questionMeta.textContent = "";
    els.questionState.textContent = state.active ? "Awaiting answer" : "Idle";
    return;
  }

  const q = state.currentQuestion;
  els.questionCounter.textContent = `Question ${q.index + 1} / ${QUESTIONS.length}`;
  els.questionExpected.textContent = `Expected time: ${q.expectedSeconds}s`;
  els.questionText.textContent = q.prompt;
  els.questionMeta.textContent =
    `Focus losses: ${q.blurEvents} · Hidden-tab events: ${q.visibilityEvents} · Paste events: ${q.pasteEvents} · Copy events: ${q.copyEvents}`;
  els.questionState.textContent = q.submittedAt
    ? "Answer submitted"
    : state.active
      ? "Answer in progress"
      : "Session paused";
}

function renderMetrics() {
  if (!state.currentQuestion) {
    els.metricQuestionTime.textContent = "00:00";
    els.metricWords.textContent = "0";
    els.metricFocusLoss.textContent = "0";
    els.metricVisibility.textContent = "0";
    els.metricPaste.textContent = "0";
    els.metricTyping.textContent = "0";
    return;
  }

  const q = state.currentQuestion;
  const elapsedMs = q.submittedAt
    ? q.submittedAt - q.startedAt
    : Date.now() - q.startedAt;

  const charsPerMin = elapsedMs > 0 ? Math.round(q.chars / Math.max(elapsedMs / 60000, 0.1)) : 0;

  els.metricQuestionTime.textContent = formatDuration(elapsedMs);
  els.metricWords.textContent = String(q.words);
  els.metricFocusLoss.textContent = String(q.blurEvents);
  els.metricVisibility.textContent = String(q.visibilityEvents);
  els.metricPaste.textContent = String(q.pasteEvents);
  els.metricTyping.textContent = String(charsPerMin);
}

function renderTimeline() {
  if (!state.events.length) {
    els.eventTimeline.innerHTML = "";
    els.timelineHint.textContent = "Waiting for events";
    return;
  }

  const scored = state.events.filter((e) => e.points > 0).length;
  els.timelineHint.textContent = `${scored} scored event(s) captured`;

  els.eventTimeline.innerHTML = state.events
    .slice(0, 20)
    .map((entry) => {
      const time = new Date(entry.time).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });

      const pointsText = entry.points > 0 ? `+${entry.points} risk points` : "info";
      const itemClass = entry.type === "signal" ? "signal" : "info";
      const questionText = entry.questionIndex >= 0 ? `Q${entry.questionIndex + 1}` : "Session";

      return `
        <li class="${itemClass}">
          <div class="timeline-time">${time}</div>
          <div>
            <div class="timeline-reason">${escapeHtml(entry.reason)}</div>
            <div class="timeline-detail">${pointsText} · ${questionText}</div>
          </div>
        </li>
      `;
    })
    .join("");
}

function renderSummary() {
  const scoredEvents = state.events.filter((e) => e.points > 0);
  const questionCount = state.questionHistory.length;

  els.summarySignalCount.textContent = String(scoredEvents.length);
  els.summaryQuestionCount.textContent = String(questionCount);

  if (!state.startedAt) {
    els.sessionSummary.textContent = "No session yet. Start the demo to generate a reviewable report.";
    return;
  }

  const label = getRiskLabel(state.riskScore).text;
  const topSignals = scoredEvents.slice(0, 4);

  const lines = [
    `Session ${state.sessionId || "draft"} is currently labeled ${label}.`,
    questionCount > 0
      ? `Answered questions: ${questionCount} of ${QUESTIONS.length}.`
      : "No questions have been submitted yet.",
    scoredEvents.length > 0
      ? `Top evidence: ${topSignals.map((e) => e.reason).join("; ")}.`
      : "No scored evidence yet, which is consistent with a clean session.",
    "This is a human-review signal, not an automatic verdict.",
    "Strongest coverage: tab switching, paste behavior, copy activity, and suspicious timing."
  ];

  els.sessionSummary.textContent = lines.join(" ");
}

function renderButtons() {
  els.startSessionBtn.disabled = !state.consent || state.active;
  els.endSessionBtn.disabled = !state.active;
}

function getRiskLabel(score) {
  if (score >= 60) return { text: "High-risk", level: "high" };
  if (score >= 25) return { text: "Suspicious", level: "suspicious" };
  return { text: "Clean", level: "clean" };
}

function makeSessionId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `S-${stamp}-${suffix}`;
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function countWords(text) {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function cloneQuestion(q) {
  return {
    id: q.id,
    index: q.index,
    prompt: q.prompt,
    expectedSeconds: q.expectedSeconds,
    startedAt: q.startedAt,
    submittedAt: q.submittedAt,
    answer: q.answer,
    firstInputAt: q.firstInputAt,
    lastInputAt: q.lastInputAt,
    lastKeyAt: q.lastKeyAt,
    chars: q.chars,
    words: q.words,
    keyIntervals: [...q.keyIntervals],
    blurEvents: q.blurEvents,
    visibilityEvents: q.visibilityEvents,
    pasteEvents: q.pasteEvents,
    copyEvents: q.copyEvents
  };
}

function exportReport() {
  if (!state.startedAt) return;

  const report = {
    sessionId: state.sessionId,
    startedAt: state.startedAt,
    endedAt: state.endedAt,
    riskScore: state.riskScore,
    riskLabel: getRiskLabel(state.riskScore).text,
    events: state.events,
    questions: state.questionHistory,
    summary: els.sessionSummary.textContent,
    limitations: [
      "This prototype is browser-only and does not directly see a hidden overlay.",
      "It is strongest against tab switching, paste-heavy answers, and suspicious timing.",
      "It never auto-rejects; a human reviewer must inspect the evidence."
    ]
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `interview-integrity-report-${state.sessionId || "session"}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}