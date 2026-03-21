console.log("Терминал смены загружен.");

const SAVE_KEY = "systemLegacySaveV2";
const TOTAL_LAYERS = 9;
const TICK_MS = 1000;
const ARCHIVE_LOG_TARGET = 360;
const META_UI_UNLOCK_CYCLE = 3;
const STABILITY_DRAIN_FACTOR = 0.08;
const INCIDENT_STABILITY_PENALTY = 1.2;
const FIRST_LAYER_FAILURE_ID = 1;
const LOG_REMINDER_INTERVAL = 4;
const SLEEP_MODE_STABILITY_FLOOR = 5;
const SLEEP_MODE_LOG_INTERVAL = 3;

const PROCESS_TEMPLATES = [
    { name: "ЖУРНАЛ_КОНТУР", baseGeneration: 0.16, baseConsumption: 0.015, baseHealthDecay: 0.15 },
    { name: "БУФЕР_ПАМЯТИ", baseGeneration: 0.18, baseConsumption: 0.017, baseHealthDecay: 0.17 },
    { name: "КЭШ_СЕТКА", baseGeneration: 0.2, baseConsumption: 0.018, baseHealthDecay: 0.14 },
    { name: "АРХИВ_УЗЕЛ", baseGeneration: 0.17, baseConsumption: 0.02, baseHealthDecay: 0.16 },
    { name: "ОПОРНЫЙ_КОНТУР", baseGeneration: 0.14, baseConsumption: 0.022, baseHealthDecay: 0.11 },
    { name: "РЕЗЕРВ_ЛЕНТА", baseGeneration: 0.19, baseConsumption: 0.016, baseHealthDecay: 0.18 },
    { name: "НУЛЬ_ПРОЦЕСС", baseGeneration: 0.15, baseConsumption: 0.014, baseHealthDecay: 0.2 },
    { name: "ДЕШИФРАТОР", baseGeneration: 0.22, baseConsumption: 0.019, baseHealthDecay: 0.13 },
    { name: "ШУМОДАВ", baseGeneration: 0.21, baseConsumption: 0.021, baseHealthDecay: 0.19 }
];

const EARLY_LAYER_DEFS = [
    {
        id: 1,
        code: "ПРИЕМКА",
        startStability: 50,
        passiveDecay: 0.04,
        consumptionMultiplier: 1.25,
        healthDecayMultiplier: 1.0,
        analyzeCost: 8,
        observationGoal: 2,
        observationHealthThreshold: 86,
        defragThreshold: 40,
        memoryCap: 32
    },
    {
        id: 2,
        code: "РЕГЛАМЕНТ",
        startStability: 50,
        passiveDecay: 0.045,
        consumptionMultiplier: 0.98,
        healthDecayMultiplier: 1.05,
        analyzeCost: 10,
        observationGoal: 3,
        observationHealthThreshold: 82,
        defragThreshold: 38,
        memoryCap: 36
    },
    {
        id: 3,
        code: "ШУМ",
        startStability: 50,
        passiveDecay: 0.05,
        consumptionMultiplier: 0.82,
        healthDecayMultiplier: 1.1,
        analyzeCost: 12,
        observationGoal: 4,
        observationHealthThreshold: 78,
        defragThreshold: 36,
        memoryCap: 40
    }
];

const DEFAULT_UPGRADES = {
    stabilityBoost: 0,
    generationBoost: 0,
    repairBoost: 0
};

const UPGRADE_DEFS = {
    stabilityBoost: {
        name: "СТАБИЛИЗАТОР",
        description: "+5% к стартовой стабильности после завершения слоя.",
        baseCost: 10,
        maxLevel: 3
    },
    generationBoost: {
        name: "БУФЕР ИЗВЛЕЧЕНИЯ",
        description: "+15% к накоплению памяти всеми процессами.",
        baseCost: 12,
        maxLevel: 3
    },
    repairBoost: {
        name: "РЕМОНТНЫЙ ПАКЕТ",
        description: "-15% к стоимости починки процесса.",
        baseCost: 14,
        maxLevel: 3
    }
};

let stability = 85;
let memory = 0;
let knowledge = 0;
let observation = 0;
let selectedProcessId = null;
let scannedProcessId = null;
let defragCounter = 0;
let isDefragAvailable = false;
let upgrades = { ...DEFAULT_UPGRADES };
let processes = [];
let observedProcessIds = [];
let shiftStarted = false;
let shiftTick = 0;
let startupLogIndex = 0;
let incidentProcessId = null;
let incidentQueue = [];
let incidentCooldown = 0;
let firstIncidentRaised = false;
let passiveObservationBuffer = 0;
let hasSavedGame = false;
let resumePromptPending = false;
let sleepModeActive = false;
let lastFailureSummary = null;

const STARTUP_LOGS = [
    "Фоновая инициализация завершена. Подсистемы работают в штатном режиме.",
    "Мониторинг контуров активен. Явных отклонений пока не обнаружено.",
    "Накопление служебной памяти идёт в пределах регламента."
];

const ARCHIVE_SUBSYSTEMS = [
    "контур мониторинга",
    "буфер памяти",
    "регламентный узел",
    "архивный кеш",
    "резервная лента",
    "диспетчер ошибок",
    "служебный канал",
    "таблица слоёв",
    "шина доступа",
    "сетка синхронизации"
];

const ARCHIVE_ACTIONS = [
    "плановый пересчёт завершён",
    "регламентная проверка закрыта",
    "фоновая очистка отработала",
    "сверка контрольных сумм завершена",
    "переразметка очередей завершена",
    "служебный прогон подтверждён",
    "повторная индексация завершена",
    "маршрутизация узлов подтверждена"
];

const ARCHIVE_RESULTS = [
    "критических отклонений не выявлено",
    "ручное вмешательство не требуется",
    "остаточный шум в пределах допуска",
    "система сохранила рабочий режим",
    "архивный хвост оставлен без очистки",
    "перенос в буфер выполнен без остановки",
    "избыточная нагрузка снята частично",
    "переход в фоновый режим разрешён"
];

const LIVE_LOG_SUBSYSTEMS = [
    "контур мониторинга",
    "буфер памяти",
    "архивный кеш",
    "служебный канал",
    "диспетчер ошибок",
    "таблица слоёв",
    "сетка синхронизации"
];

const LIVE_LOG_ACTIONS = [
    "фоновый проход завершён",
    "плановая сверка выполнена",
    "служебный пересчёт подтверждён",
    "очередь обслуживания обновлена",
    "маршрут внутреннего обмена пересобран",
    "локальная очистка завершена"
];

const LIVE_LOG_RESULTS = [
    "режим сохранён",
    "остаточный шум допустим",
    "автокоррекция не потребовалась",
    "перерасход не выявлен",
    "контрольный след сохранён",
    "данные переданы без остановки"
];

const PROCESS_PHASES = {
    normal: { id: "normal", label: "ШТАТНЫЙ РЕЖИМ", severity: 0 },
    wear: { id: "wear", label: "ИЗНОС", severity: 1 },
    preerror: { id: "preerror", label: "ПРЕДОШИБКА", severity: 2 },
    error: { id: "error", label: "ОШИБКА", severity: 3 },
    critical: { id: "critical", label: "КРИТИЧЕСКИЙ СБОЙ", severity: 4 }
};

const stabilityBar = document.getElementById("stability-bar");
const stabilityText = document.getElementById("stability-text");
const stabilityNote = document.getElementById("stability-note");
const memoryText = document.getElementById("memory-text");
const knowledgeText = document.getElementById("knowledge-text");
const cycleText = document.getElementById("cycle-text");
const observationText = document.getElementById("observation-text");
const layerText = document.getElementById("layer-text");
const observationMetric = document.getElementById("observation-metric");
const knowledgeMetric = document.getElementById("knowledge-metric");
const cycleMetric = document.getElementById("cycle-metric");
const layerMetric = document.getElementById("layer-metric");
const defragHint = document.getElementById("defrag-hint");
const selectedProcessText = document.getElementById("selected-process-text");
const scanButton = document.getElementById("scan-btn");
const analyzeButton = document.getElementById("analyze-btn");
const fixButton = document.getElementById("fix-btn");
const resetButton = document.getElementById("reset-btn");
const analyzeButtonTitle = analyzeButton.querySelector(".cmd-title");
const logContent = document.getElementById("log-content");
const sysStatusText = document.getElementById("sys-status");
const upgradeList = document.getElementById("upgrade-list");
const upgradesSection = document.getElementById("upgrades-section");
const briefingOverlay = document.getElementById("briefing-overlay");
const briefingTitle = document.getElementById("briefing-title");
const briefingGrid = document.getElementById("briefing-grid");
const briefingResult = document.getElementById("briefing-result");
const briefingResultLead = document.getElementById("briefing-result-lead");
const briefingResultStats = document.getElementById("briefing-result-stats");
const startShiftButton = document.getElementById("start-shift-btn");
const newGameButton = document.getElementById("new-game-btn");
const shareResultButton = document.getElementById("share-result-btn");
const showBriefingButton = document.getElementById("show-briefing-btn");

function readNumber(value, fallback) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function getCurrentLayerNumber() {
    return clamp(defragCounter + 1, 1, TOTAL_LAYERS);
}

function getCurrentLayerConfig() {
    const layerNumber = getCurrentLayerNumber();
    if (layerNumber <= EARLY_LAYER_DEFS.length) {
        return EARLY_LAYER_DEFS[layerNumber - 1];
    }

    const depth = layerNumber - EARLY_LAYER_DEFS.length;
    return {
        id: layerNumber,
        code: `ГЛУБИНА-${layerNumber}`,
        startStability: 50,
        passiveDecay: Math.max(0.03, 0.08 - depth * 0.006),
        consumptionMultiplier: Math.max(0.45, 0.8 - depth * 0.05),
        healthDecayMultiplier: 1.15 + depth * 0.12,
        analyzeCost: 58 + depth * 18,
        observationGoal: 4 + depth * 2,
        observationHealthThreshold: Math.max(46, 76 - depth * 4),
        defragThreshold: Math.max(18, 34 - depth * 2),
        memoryCap: 40 + depth * 6
    };
}

function getStartingStability() {
    return getCurrentLayerConfig().startStability + upgrades.stabilityBoost * 5;
}

function getMemoryCap() {
    return getCurrentLayerConfig().memoryCap || 32;
}

function getEmergencyThreshold() {
    return Math.max(10, Math.ceil(getStartingStability() * 0.36));
}

function getIncidentQueueIds() {
    incidentQueue = incidentQueue.filter(id => processes.some(process => process.id === id && process.isActive && !process.isBroken));
    incidentProcessId = incidentQueue.length > 0 ? incidentQueue[0] : null;
    return incidentQueue;
}

function getQueuedIncidentProcess() {
    const [nextId] = getIncidentQueueIds();
    return Number.isInteger(nextId) ? processes.find(process => process.id === nextId) || null : null;
}

function resolveIncident(processId) {
    incidentQueue = getIncidentQueueIds().filter(id => id !== processId);
    incidentProcessId = incidentQueue.length > 0 ? incidentQueue[0] : null;
}

function getGenerationMultiplier() {
    return 1 + upgrades.generationBoost * 0.15;
}

function getRepairCostMultiplier() {
    return Math.max(0.55, 1 - upgrades.repairBoost * 0.15);
}

function getStabilityRestore(process) {
    return Math.max(7, Math.ceil((100 - process.health) / 6));
}

function getUpgradeCost(key) {
    return UPGRADE_DEFS[key].baseCost * (upgrades[key] + 1);
}

function getProcessPhaseThresholds() {
    const layer = getCurrentLayerConfig();
    const wear = clamp(96 - (layer.id - 1) * 2, 82, 96);
    const preerror = clamp(84 - (layer.id - 1) * 3, 62, 84);
    const error = clamp(64 - (layer.id - 1) * 4, 42, 64);

    return { wear, preerror, error };
}

function getPhaseById(phaseId) {
    return PROCESS_PHASES[phaseId] || PROCESS_PHASES.normal;
}

function getProcessPhaseByHealth(health, isBroken = false) {
    const thresholds = getProcessPhaseThresholds();

    if (isBroken || health <= 0) {
        return PROCESS_PHASES.critical;
    }

    if (health <= thresholds.error) {
        return PROCESS_PHASES.error;
    }

    if (health <= thresholds.preerror) {
        return PROCESS_PHASES.preerror;
    }

    if (health <= thresholds.wear) {
        return PROCESS_PHASES.wear;
    }

    return PROCESS_PHASES.normal;
}

function getProcessPhase(process) {
    return getPhaseById(process.phaseId || getProcessPhaseByHealth(process.health, process.isBroken).id);
}

function formatCycleTag(tick = shiftTick) {
    return `ЦИКЛ ${String(Math.max(0, tick)).padStart(4, "0")}`;
}

function toHex(value, width = 4) {
    return Math.max(0, value).toString(16).toUpperCase().padStart(width, "0");
}

function buildNoiseHeader(tick, seed) {
    return `${toHex((tick + 1) * 173 + seed * 37, 4)}::${toHex((tick + 3) * 89 + seed * 211, 4)}`;
}

function createProcessFromTemplate(template, index) {
    const phase = getProcessPhaseByHealth(100);

    return {
        id: index,
        name: template.name,
        health: 100,
        baseGeneration: template.baseGeneration,
        baseConsumption: template.baseConsumption,
        baseHealthDecay: template.baseHealthDecay,
        isActive: true,
        isBroken: false,
        phaseId: phase.id,
        lastPhaseChangeTick: 0,
        lastReminderTick: -LOG_REMINDER_INTERVAL
    };
}

function normalizeProcess(process, index) {
    const template = PROCESS_TEMPLATES[index] || PROCESS_TEMPLATES[0];
    const health = clamp(readNumber(process.health, 100), 0, 100);
    const isBroken = Boolean(process.isBroken) || health <= 0;
    const phase = process.phaseId && PROCESS_PHASES[process.phaseId]
        ? PROCESS_PHASES[process.phaseId]
        : getProcessPhaseByHealth(health, isBroken);

    return {
        id: readNumber(process.id, index),
        name: process.name || template.name,
        health,
        baseGeneration: readNumber(process.baseGeneration, template.baseGeneration),
        baseConsumption: readNumber(process.baseConsumption, template.baseConsumption),
        baseHealthDecay: readNumber(process.baseHealthDecay, template.baseHealthDecay),
        isActive: process.isActive !== false,
        isBroken,
        phaseId: phase.id,
        lastPhaseChangeTick: readNumber(process.lastPhaseChangeTick, 0),
        lastReminderTick: readNumber(process.lastReminderTick, -LOG_REMINDER_INTERVAL)
    };
}

function initProcesses() {
    processes = PROCESS_TEMPLATES.map((template, index) => createProcessFromTemplate(template, index));
}

function resetGameState() {
    upgrades = { ...DEFAULT_UPGRADES };
    defragCounter = 0;
    stability = getStartingStability();
    memory = 0;
    knowledge = 0;
    observation = 0;
    selectedProcessId = null;
    scannedProcessId = null;
    observedProcessIds = [];
    shiftStarted = false;
    shiftTick = 0;
    startupLogIndex = 0;
    incidentProcessId = null;
    incidentQueue = [];
    incidentCooldown = 0;
    firstIncidentRaised = false;
    passiveObservationBuffer = 0;
    sleepModeActive = false;
    initProcesses();
}

function clearSavedGame() {
    localStorage.removeItem(SAVE_KEY);
    hasSavedGame = false;
    resumePromptPending = false;
}

function saveGame() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
        stability,
        memory,
        knowledge,
        observation,
        selectedProcessId,
        defragCounter,
        upgrades,
        processes,
        observedProcessIds,
        shiftStarted,
        shiftTick,
        startupLogIndex,
        incidentProcessId,
        incidentQueue,
        incidentCooldown,
        firstIncidentRaised,
        passiveObservationBuffer,
        sleepModeActive
    }));
    hasSavedGame = true;
}

function loadGame() {
    const saved = localStorage.getItem(SAVE_KEY);
    if (!saved) {
        hasSavedGame = false;
        resumePromptPending = false;
        resetGameState();
        return false;
    }

    try {
        const gameState = JSON.parse(saved);
        upgrades = { ...DEFAULT_UPGRADES, ...(gameState.upgrades || {}) };
        defragCounter = readNumber(gameState.defragCounter, 0);
        stability = readNumber(gameState.stability, getStartingStability());
        memory = readNumber(gameState.memory, 0);
        knowledge = readNumber(gameState.knowledge, 0);
        observation = readNumber(gameState.observation, 0);
        selectedProcessId = null;
        scannedProcessId = null;
        observedProcessIds = Array.isArray(gameState.observedProcessIds)
            ? gameState.observedProcessIds.filter(id => Number.isInteger(id))
            : [];
        shiftStarted = gameState.shiftStarted === true;
        shiftTick = readNumber(gameState.shiftTick, 0);
        startupLogIndex = readNumber(gameState.startupLogIndex, 0);
        incidentProcessId = Number.isInteger(gameState.incidentProcessId) ? gameState.incidentProcessId : null;
        incidentQueue = Array.isArray(gameState.incidentQueue)
            ? gameState.incidentQueue.filter(id => Number.isInteger(id))
            : incidentProcessId !== null ? [incidentProcessId] : [];
        incidentCooldown = readNumber(gameState.incidentCooldown, 0);
        firstIncidentRaised = gameState.firstIncidentRaised === true;
        passiveObservationBuffer = readNumber(gameState.passiveObservationBuffer, 0);
        sleepModeActive = gameState.sleepModeActive === true;
        processes = Array.isArray(gameState.processes)
            ? gameState.processes.map((process, index) => normalizeProcess(process, index))
            : [];

        if (processes.length === 0) {
            initProcesses();
        }
        hasSavedGame = true;
        resumePromptPending = shiftStarted;
        return true;
    } catch (error) {
        console.error("Ошибка загрузки сохранения:", error);
        clearSavedGame();
        resetGameState();
        return false;
    }
}

function addLog(message, variant = "service") {
    const entry = document.createElement("p");
    entry.className = `log-entry log-entry-${variant}`;
    entry.textContent = `> ${message}`;
    logContent.appendChild(entry);
    logContent.scrollTop = logContent.scrollHeight;
}

function appendArchiveLog(message, extraClass = "") {
    const entry = document.createElement("p");
    entry.className = `log-entry log-entry-archive${extraClass ? ` ${extraClass}` : ""}`;
    entry.textContent = `> ${message}`;
    logContent.appendChild(entry);
}

function addStructuredLog(scope, message, variant = "service") {
    addLog(`[${formatCycleTag()}] [${scope}] ${message}`, variant);
}

function addSystemLog(scope, message, variant = "service") {
    addStructuredLog(scope, message, variant);
}

function addOperatorLog(message) {
    addStructuredLog("ОПЕРАТОР", message, "operator");
}

function buildArchiveLine(index) {
    const subsystem = ARCHIVE_SUBSYSTEMS[index % ARCHIVE_SUBSYSTEMS.length];
    const drift = toHex((index + 7) * 19, 4);
    const checksum = toHex((index + 11) * 97, 4);
    const sector = toHex(0x2300 + index, 4);
    const cycle = toHex(0x1200 + index * 3, 4);
    const marker = buildNoiseHeader(index, checksum.length + drift.length);

    return `[архив:${cycle}] ${marker} sec=${sector} bus=${subsystem} qsum=${checksum} drift=${drift} flag=hold`;
}

function buildRoutineLogLine(weakest, tick) {
    const subsystem = LIVE_LOG_SUBSYSTEMS[tick % LIVE_LOG_SUBSYSTEMS.length];
    const action = LIVE_LOG_ACTIONS[(tick * 2) % LIVE_LOG_ACTIONS.length].replace(/\s+/g, "_");
    const result = LIVE_LOG_RESULTS[(tick * 3) % LIVE_LOG_RESULTS.length].replace(/\s+/g, "_");
    const weakestName = weakest ? weakest.name : "SYS_IDLE";
    const health = weakest ? Math.floor(weakest.health) : 100;
    const checksum = toHex((tick + 5) * 101 + health * 17, 4);
    const reserve = toHex(Math.floor(memory * 8) + tick * 9, 4);
    const marker = buildNoiseHeader(tick, weakest ? weakest.id + 1 : 0);

    return `${marker} bus=${subsystem} proc=${weakestName} qsum=${checksum} mem=${reserve} hp=${health} evt=${action} ack=${result}`;
}

function logProcessPhaseChange(process, previousPhase, nextPhase) {
    if (nextPhase.id === previousPhase.id) {
        return;
    }

    const healthText = `${Math.max(0, Math.floor(process.health))}%`;

    if (nextPhase.id === PROCESS_PHASES.wear.id) {
        addSystemLog(process.name, `Рост остаточного износа. Узел вышел из штатного диапазона: ${healthText}.`, "service");
        return;
    }

    if (nextPhase.id === PROCESS_PHASES.preerror.id) {
        addSystemLog(process.name, `ПРЕДУПРЕЖДЕНИЕ. Узел приближается к ошибке. Текущее состояние: ${healthText}.`, "warning");
        return;
    }

    if (nextPhase.id === PROCESS_PHASES.error.id) {
        addSystemLog(process.name, `ОШИБКА. СРОЧНО ИСПРАВИТЬ. Автокоррекция недоступна, состояние узла: ${healthText}.`, "alert");
        return;
    }

    if (nextPhase.id === PROCESS_PHASES.critical.id) {
        addSystemLog(process.name, "КРИТИЧЕСКИЙ СБОЙ. Узел отключён, штатное восстановление недоступно.", "critical");
    }
}

function syncProcessPhase(process) {
    const previousPhase = getProcessPhase(process);
    const nextPhase = getProcessPhaseByHealth(process.health, process.isBroken);

    process.phaseId = nextPhase.id;

    if (previousPhase.id !== nextPhase.id) {
        process.lastPhaseChangeTick = shiftTick;
        logProcessPhaseChange(process, previousPhase, nextPhase);
    }

    return nextPhase;
}

function primeProcessesForShift() {
    const thresholds = getProcessPhaseThresholds();
    const primaryIndex = (defragCounter * 2) % processes.length;
    const secondaryIndex = (primaryIndex + 3) % processes.length;

    processes.forEach((process, index) => {
        if (index === primaryIndex) {
            process.health = Math.min(process.health, thresholds.error + 4);
        } else if (index === secondaryIndex) {
            process.health = Math.min(process.health, thresholds.preerror + 6);
        }

        process.isBroken = process.health <= 0;
        process.phaseId = getProcessPhaseByHealth(process.health, process.isBroken).id;
        process.lastReminderTick = -LOG_REMINDER_INTERVAL;
    });
}

function getIncidentCandidate() {
    if (incidentCooldown > 0) {
        return null;
    }

    const minSeverity = shiftTick >= 12
        ? PROCESS_PHASES.preerror.severity
        : PROCESS_PHASES.error.severity;

    return processes
        .filter(process =>
            process.isActive &&
            !process.isBroken &&
            !getIncidentQueueIds().includes(process.id) &&
            getProcessPhase(process).severity >= minSeverity
        )
        .sort((left, right) => {
            const severityDiff = getProcessPhase(right).severity - getProcessPhase(left).severity;
            if (severityDiff !== 0) {
                return severityDiff;
            }

            return left.health - right.health;
        })[0] || null;
}

function addBackgroundSystemLog(weakest) {
    if (sleepModeActive) {
        if (shiftTick % SLEEP_MODE_LOG_INTERVAL === 0) {
            addSystemLog("СИСТЕМА", "Ожидание оператора. Контур удерживается в спящем режиме.", "service");
        }
        return;
    }

    const incidentProcess = getQueuedIncidentProcess();
    if (incidentProcess) {
        if (!incidentProcess) {
            return;
        }

        if (shiftTick - incidentProcess.lastReminderTick >= LOG_REMINDER_INTERVAL) {
            addSystemLog(
                incidentProcess.name,
                `Ошибка в очереди. Ожидается ручное вмешательство. Состояние узла: ${Math.floor(incidentProcess.health)}%.`,
                getProcessPhase(incidentProcess).severity >= PROCESS_PHASES.error.severity ? "alert" : "warning"
            );
            incidentProcess.lastReminderTick = shiftTick;
        }
        return;
    }

    if (shiftTick % 3 === 0) {
        addLog(buildRoutineLogLine(weakest, shiftTick), "noise");
    }
}

function enterSleepMode() {
    if (sleepModeActive) {
        stability = Math.max(stability, SLEEP_MODE_STABILITY_FLOOR);
        return;
    }

    sleepModeActive = true;
    stability = Math.max(stability, SLEEP_MODE_STABILITY_FLOOR);
    incidentProcessId = null;
    incidentQueue = [];
    selectedProcessId = null;
    scannedProcessId = null;
    addSystemLog("СИСТЕМА", "Контур переведён в спящий режим. Ожидание оператора.", "warning");
}

function exitSleepMode() {
    if (!sleepModeActive) {
        return;
    }

    sleepModeActive = false;
    addSystemLog("СИСТЕМА", "Спящий режим снят оператором. Разрешено ручное вмешательство.", "operator");
}

function failFirstLayer() {
    lastFailureSummary = {
        layerCode: getCurrentLayerConfig().code,
        observation,
        knowledge,
        cycles: defragCounter,
        shiftTick
    };

    clearSavedGame();
    resetGameState();
    seedArchiveLog();
    addSystemLog("КОНТУР-1", "Стабильность исчерпана. Испытательная смена завершена.", "critical");
    addSystemLog("ДОПУСК", "Решение дежурного признано неудовлетворительным. Допуск отозван.", "critical");
    briefingOverlay.classList.add("is-visible");
    renderBriefingOverlay();
}

function seedArchiveLog() {
    logContent.innerHTML = "";

    for (let index = 0; index < ARCHIVE_LOG_TARGET; index += 1) {
        appendArchiveLog(buildArchiveLine(index));
    }

    appendArchiveLog("[архив] журнал не начинается с текущей смены. ранние записи не выгружены полностью.", "log-entry-anchor");
    appendArchiveLog("[архив] old.err residual=present trunc=partial sync=deferred.");
    appendArchiveLog("[архив] tty.attach accepted. live stream follows.");

    const anchor = logContent.querySelector(".log-entry-anchor");
    if (anchor) {
        anchor.scrollIntoView({ block: "start" });
    }
}

function renderBriefingOverlay() {
    const isFailure = lastFailureSummary !== null;

    briefingGrid.classList.toggle("is-hidden", isFailure);
    briefingResult.classList.toggle("is-hidden", !isFailure);
    shareResultButton.classList.toggle("is-hidden", !isFailure);

    if (isFailure) {
        const summary = lastFailureSummary;
        briefingTitle.textContent = "СМЕНА ПРЕКРАЩЕНА";
        briefingResultLead.textContent = "Вы не справились и уволены. Допуск к контуру отозван, текущая смена аннулирована.";
        briefingResultStats.innerHTML = "";

        const lines = [
            `Контур: ${summary.layerCode}`,
            `Разобрано сбоев: ${summary.observation}`,
            `Накоплено знания: ${summary.knowledge}`,
            `Циклы: ${summary.cycles}`,
            `Длина смены: ${summary.shiftTick} тиков`
        ];

        for (const line of lines) {
            const row = document.createElement("p");
            row.className = "briefing-result-line";
            row.textContent = line;
            briefingResultStats.appendChild(row);
        }

        startShiftButton.textContent = "Начать новую смену";
        startShiftButton.classList.remove("is-hidden");
        newGameButton.classList.add("is-hidden");
        return;
    }

    briefingTitle.textContent = "ИНСТРУКЦИЯ ОПЕРАТОРА ДЕЖУРНОЙ СМЕНЫ";
    briefingResultLead.textContent = "";
    briefingResultStats.innerHTML = "";

    if (hasSavedGame) {
        startShiftButton.textContent = resumePromptPending || shiftStarted ? "Продолжить текущую смену" : "Сесть за терминал";
        newGameButton.classList.remove("is-hidden");
    } else {
        startShiftButton.textContent = "Сесть за терминал";
        newGameButton.classList.add("is-hidden");
    }
}

function showBriefing() {
    briefingOverlay.classList.add("is-visible");
    lastFailureSummary = null;
    renderBriefingOverlay();
}

function hideBriefing() {
    briefingOverlay.classList.remove("is-visible");
}

function buildFailureShareText() {
    if (!lastFailureSummary) {
        return "Смена завершена без доступной сводки.";
    }

    return [
        "SYSTEM_LEGACY — смена прекращена",
        "Вы не справились и уволены.",
        `Контур: ${lastFailureSummary.layerCode}`,
        `Разобрано сбоев: ${lastFailureSummary.observation}`,
        `Знание: ${lastFailureSummary.knowledge}`,
        `Циклы: ${lastFailureSummary.cycles}`,
        `Длина смены: ${lastFailureSummary.shiftTick} тиков`
    ].join("\n");
}

async function shareFailureResult() {
    const text = buildFailureShareText();

    try {
        if (navigator.share) {
            await navigator.share({ text });
        } else if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            window.prompt("Скопируй результат смены:", text);
            return;
        }

        shareResultButton.textContent = "Результат скопирован";
        window.setTimeout(() => {
            shareResultButton.textContent = "Поделиться результатом";
        }, 1600);
    } catch (error) {
        console.error("Не удалось поделиться результатом:", error);
    }
}

function startShift(options = {}) {
    const { forceNew = false } = options;
    const shouldResume = resumePromptPending && !forceNew;
    lastFailureSummary = null;

    if (forceNew) {
        clearSavedGame();
        resetGameState();
        seedArchiveLog();
    }

    hideBriefing();

    if (shouldResume) {
        shiftStarted = true;
        addSystemLog("СИСТЕМА", `Смена восстановлена. Текущий контур: ${getCurrentLayerConfig().code}.`, "service");
    } else {
        const alreadyStarted = shiftStarted;
        shiftStarted = true;
        selectedProcessId = null;
        scannedProcessId = null;
        incidentProcessId = null;
        incidentQueue = [];
        incidentCooldown = 0;
        shiftTick = 0;
        startupLogIndex = 0;
        firstIncidentRaised = false;
        passiveObservationBuffer = 0;
        sleepModeActive = false;

        if (!alreadyStarted) {
            primeProcessesForShift();
            addOperatorLog("Инструктаж завершён. Рабочее место занято.");
            addSystemLog("СИСТЕМА", "Смена начата. Подсистемы продолжают работу в фоновом режиме.", "service");
            addSystemLog("РЕГЛАМЕНТ", "Ориентир по журналу сохранён. Ожидается первый значимый сигнал.", "service");
        }
    }

    resumePromptPending = false;
    refreshDefragAvailability();
    updateInterface();
    saveGame();
}

function getSelectedProcess() {
    if (selectedProcessId === null) {
        return null;
    }
    return processes.find(process => process.id === selectedProcessId) || null;
}

function isProcessAnalyzed(process) {
    return !!process && observedProcessIds.includes(process.id);
}

function getRepairCost(process) {
    const baseCost = Math.max(2, Math.ceil((100 - process.health) / 12) + 1);
    return Math.ceil(baseCost * getRepairCostMultiplier());
}

function refreshDefragAvailability(options = {}) {
    const layer = getCurrentLayerConfig();
    const ready = stability >= layer.defragThreshold && observation >= layer.observationGoal;

    if (options.announce && ready && !isDefragAvailable) {
        addSystemLog("ДОПУСК", `Выдан допуск к глубокой дефрагментации. Слой ${layer.id} готов к завершению.`, "operator");
    }

    isDefragAvailable = ready;
}

function getWeakestActiveProcess() {
    const activeProcesses = processes.filter(process => process.isActive && !process.isBroken);
    if (activeProcesses.length === 0) {
        return null;
    }

    let weakest = activeProcesses[0];
    for (const process of activeProcesses) {
        if (process.health < weakest.health) {
            weakest = process;
        }
    }

    return weakest;
}

function raiseIncident(process, message) {
    if (!process) {
        return;
    }

    observedProcessIds = observedProcessIds.filter(id => id !== process.id);
    if (!incidentQueue.includes(process.id)) {
        incidentQueue.push(process.id);
    }
    incidentProcessId = incidentQueue[0] || null;
    firstIncidentRaised = true;
    process.lastReminderTick = shiftTick;
    addSystemLog(
        process.name,
        message || "Узел переведён в очередь ручного вмешательства. Доступны команды: ДИАГНОСТИКА / ИСПРАВИТЬ.",
        getProcessPhase(process).severity >= PROCESS_PHASES.error.severity ? "alert" : "warning"
    );
    updateInterface();
    saveGame();
}

function updatePassiveObservation() {
    passiveObservationBuffer = 0;
}

function updateMetricVisibility() {
    const showObservation = shiftStarted || observation > 0;
    const showLongTerm = defragCounter >= META_UI_UNLOCK_CYCLE;
    const showLayer = defragCounter >= META_UI_UNLOCK_CYCLE;

    observationMetric.classList.toggle("is-hidden", !showObservation);
    knowledgeMetric.classList.toggle("is-hidden", !showLongTerm);
    cycleMetric.classList.toggle("is-hidden", !showLongTerm);
    layerMetric.classList.toggle("is-hidden", !showLayer);
}

function updateSelectedProcessSummary() {
    selectedProcessText.classList.add("is-hidden");
    selectedProcessText.textContent = "";
}

function updateCommandVisibility() {
    const layer = getCurrentLayerConfig();
    const showDefrag = shiftStarted && observation >= layer.observationGoal;

    scanButton.classList.add("is-hidden");
    analyzeButton.classList.toggle("is-hidden", !shiftStarted);
    fixButton.classList.toggle("is-hidden", !shiftStarted);
    resetButton.classList.toggle("is-hidden", !showDefrag);

    if (analyzeButtonTitle) {
        analyzeButtonTitle.textContent = "Диагностика";
    }
}

function renderUpgradePanel() {
    const showUpgrades = defragCounter >= META_UI_UNLOCK_CYCLE;
    upgradesSection.classList.toggle("is-hidden", !showUpgrades);
    upgradeList.innerHTML = "";

    if (!showUpgrades) {
        return;
    }

    Object.entries(UPGRADE_DEFS).forEach(([key, upgrade]) => {
        const level = upgrades[key];
        const cost = getUpgradeCost(key);
        const isMaxed = level >= upgrade.maxLevel;

        const card = document.createElement("article");
        card.className = "upgrade-card";

        const title = document.createElement("h4");
        title.textContent = upgrade.name;

        const description = document.createElement("p");
        description.textContent = upgrade.description;

        const meta = document.createElement("div");
        meta.className = "upgrade-meta";
        meta.textContent = isMaxed
            ? `Уровень: ${level}/${upgrade.maxLevel} · максимум`
            : `Уровень: ${level}/${upgrade.maxLevel} · цена: ${cost} знания`;

        const button = document.createElement("button");
        button.className = "cmd-btn";
        button.textContent = isMaxed ? "Установлено" : "Установить";
        button.disabled = isMaxed || knowledge < cost;
        button.addEventListener("click", () => purchaseUpgrade(key));

        card.appendChild(title);
        card.appendChild(description);
        card.appendChild(meta);
        card.appendChild(button);
        upgradeList.appendChild(card);
    });
}

function updateInterface() {
    const layer = getCurrentLayerConfig();

    const maxStability = getStartingStability();
    const emergencyThreshold = getEmergencyThreshold();

    stabilityBar.max = maxStability;
    stabilityBar.value = clamp(stability, 0, maxStability);
    stabilityText.textContent = `${Math.floor(stability)} / ${maxStability}`;
    memoryText.textContent = `${memory.toFixed(0)} / ${getMemoryCap()} МБ`;
    observationText.textContent = `${observation} / ${layer.observationGoal}`;
    knowledgeText.textContent = String(knowledge);
    cycleText.textContent = String(defragCounter);
    layerText.textContent = `${layer.id} / ${TOTAL_LAYERS} · ${layer.code}`;

    if (!shiftStarted) {
        sysStatusText.textContent = "ОЖИДАНИЕ";
        sysStatusText.style.color = "#c4cfc0";
    } else if (sleepModeActive) {
        sysStatusText.textContent = "СПЯЩИЙ РЕЖИМ";
        sysStatusText.style.color = "#bad1a9";
    } else if (stability <= emergencyThreshold) {
        sysStatusText.textContent = "ПРЕДАВАРИЙНЫЙ РЕЖИМ";
        sysStatusText.style.color = "#bea46f";
    } else {
        sysStatusText.textContent = "АКТИВНА";
        sysStatusText.style.color = "#bad1a9";
    }

    sysStatusText.classList.remove("status-warning", "status-critical");
    if (shiftStarted && !sleepModeActive && stability <= Math.max(5, Math.floor(emergencyThreshold * 0.5))) {
        sysStatusText.classList.add("status-critical");
    } else if (shiftStarted && !sleepModeActive && stability <= emergencyThreshold) {
        sysStatusText.classList.add("status-warning");
    }

    stabilityNote.classList.remove("danger-note");
    if (sleepModeActive) {
        stabilityNote.textContent = "Контур удерживается на минимальной стабильности. Ожидается ручное вмешательство оператора.";
    } else if (!shiftStarted || stability >= Math.ceil(maxStability * 0.7)) {
        stabilityNote.textContent = "Контур удерживается в штатном диапазоне.";
    } else if (stability > emergencyThreshold) {
        stabilityNote.textContent = "Устойчивость снижается. Рекомендуется подготовить ручное вмешательство.";
        stabilityNote.classList.add("danger-note");
    } else {
        stabilityNote.textContent = "Предаварийный уровень. Дальнейшее снижение может привести к срыву контура.";
        stabilityNote.classList.add("danger-note");
    }

    defragHint.textContent = isDefragAvailable
        ? "Выдан допуск к глубокой дефрагментации."
        : observation >= layer.observationGoal
            ? `Разбор завершён. Для допуска нужно удерживать стабильность не ниже ${layer.defragThreshold} / ${maxStability}.`
            : `До допуска к глубокой дефрагментации нужно разобрать ${layer.observationGoal} сбоев и удерживать стабильность не ниже ${layer.defragThreshold} / ${maxStability}.`;

    scanButton.disabled = true;
    analyzeButton.disabled = !shiftStarted;
    fixButton.disabled = !shiftStarted;
    resetButton.disabled = !isDefragAvailable;

    updateSelectedProcessSummary();
    updateMetricVisibility();
    updateCommandVisibility();
    renderUpgradePanel();
}

function purchaseUpgrade(key) {
    const upgrade = UPGRADE_DEFS[key];
    if (upgrades[key] >= upgrade.maxLevel) {
        addSystemLog(upgrade.name, "Предел улучшения уже достигнут.", "service");
        return;
    }

    const cost = getUpgradeCost(key);
    if (knowledge < cost) {
        addSystemLog(upgrade.name, `Недостаточно знания. Требуется: ${cost}.`, "warning");
        return;
    }

    knowledge -= cost;
    upgrades[key] += 1;

    if (key === "stabilityBoost") {
        stability = Math.min(getStartingStability(), stability + 5);
    }

    addSystemLog(upgrade.name, `Установлен. Новый уровень: ${upgrades[key]}/${upgrade.maxLevel}.`, "operator");
    refreshDefragAvailability();
    updateInterface();
    saveGame();
}

function scanSystem() {
    addSystemLog("СИСТЕМА", "Промежуточное открытие ошибки отключено. Используй команды ДИАГНОСТИКА или ИСПРАВИТЬ прямо по очереди сбоев.", "service");
}

function fixProcess() {
    if (!shiftStarted) {
        showBriefing();
        return;
    }

    if (sleepModeActive) {
        exitSleepMode();
    }

    const process = getQueuedIncidentProcess();
    if (!process) {
        addSystemLog("СИСТЕМА", "В очереди нет активных ошибок. Новое действие подскажет системный журнал.", "service");
        return;
    }

    if (process.isBroken) {
        addSystemLog(process.name, "Узел уже отключён и не чинится обычной процедурой.", "critical");
        return;
    }

    if (process.health >= 100) {
        addSystemLog(process.name, "Узел уже находится в штатном диапазоне.", "service");
        return;
    }

    const fixCost = getRepairCost(process);
    if (memory < fixCost) {
        addSystemLog(process.name, `Для очистки нужно ${fixCost} МБ резерва. Сейчас доступно ${memory.toFixed(0)} МБ.`, "warning");
        return;
    }

    const stabilityRestore = getStabilityRestore(process);

    memory -= fixCost;
    process.health = 100;
    stability = Math.min(getStartingStability(), stability + stabilityRestore);
    scannedProcessId = null;
    resolveIncident(process.id);
    incidentCooldown = stability <= getEmergencyThreshold() ? 1 : 4;
    selectedProcessId = null;
    scannedProcessId = null;
    process.phaseId = getProcessPhaseByHealth(process.health, process.isBroken).id;

    addOperatorLog(`Запущено исправление узла ${process.name}. Расход резерва: ${fixCost} МБ.`);
    addSystemLog(process.name, `Сбой исправлен. Устойчивость контура +${stabilityRestore}.`, "operator");
    refreshDefragAvailability();
    updateInterface();
    saveGame();
}

function analyzeProcess() {
    if (!shiftStarted) {
        showBriefing();
        return;
    }

    if (sleepModeActive) {
        exitSleepMode();
    }

    const process = getQueuedIncidentProcess();
    if (!process) {
        addSystemLog("СИСТЕМА", "В очереди нет активных ошибок. Новое действие подскажет системный журнал.", "service");
        return;
    }

    const layer = getCurrentLayerConfig();
    if (memory < layer.analyzeCost) {
        addSystemLog(process.name, `Для диагностики нужно ${layer.analyzeCost} МБ резерва. Сейчас доступно ${memory.toFixed(0)} МБ.`, "warning");
        return;
    }

    memory -= layer.analyzeCost;
    const alreadyObserved = observedProcessIds.includes(process.id);
    knowledge += process.health <= getEmergencyThreshold() ? 2 : 1;
    passiveObservationBuffer = Math.max(0, passiveObservationBuffer - 0.1);
    if (!alreadyObserved) {
        observation += 1;
        observedProcessIds.push(process.id);
    }
    resolveIncident(process.id);
    incidentCooldown = stability <= getEmergencyThreshold() ? 1 : 3;

    addOperatorLog(`Запущена диагностика узла ${process.name}.`);
    if (alreadyObserved) {
        addSystemLog(process.name, "Повторный разбор завершён. Новый прогресс не получен.", "service");
    } else {
        addSystemLog(process.name, `Сбой разобран (${observation}/${layer.observationGoal}). Узел переведён в режим наблюдения.`, "operator");
    }
    selectedProcessId = null;
    scannedProcessId = null;

    refreshDefragAvailability({ announce: true });
    updateInterface();
    saveGame();
}

function performDeepDefrag() {
    const layer = getCurrentLayerConfig();

    if (stability < layer.defragThreshold) {
        addSystemLog("ДОПУСК", `Завершение слоя пока недоступно. Нужно удерживать стабильность не ниже ${layer.defragThreshold} / ${getStartingStability()}.`, "warning");
        return;
    }

    if (observation < layer.observationGoal) {
        addSystemLog("ДОПУСК", `Завершение слоя пока недоступно. Нужно разобрать ${layer.observationGoal} сбоев, разобрано ${observation}.`, "warning");
        return;
    }

    const confirmed = confirm(
        `ГЛУБОКАЯ ДЕФРАГМЕНТАЦИЯ · СЛОЙ ${layer.id} / ${TOTAL_LAYERS}\n\n` +
        `Разобрано сбоев: ${observation}/${layer.observationGoal}\n` +
        `Стабильность: ${Math.floor(stability)} / ${getStartingStability()}\n\n` +
        `Резерв памяти и состояние процессов будут сброшены, но знание сохранится.\n` +
        `Продолжить?`
    );

    if (!confirmed) {
        addOperatorLog("Глубокая дефрагментация отменена оператором.");
        return;
    }

    const oldLayerCode = layer.code;
    const oldMemory = memory;
    const oldStability = stability;
    const healthyProcesses = processes.filter(process => process.health > 80).length;
    const knowledgeGain = 4 + layer.id + observation + Math.floor(healthyProcesses / 2);

    addOperatorLog(`Запущена глубокая дефрагментация слоя ${oldLayerCode}.`);

    defragCounter += 1;
    knowledge += knowledgeGain;
    memory = 0;
    observation = 0;
    selectedProcessId = null;
    scannedProcessId = null;
    observedProcessIds = [];

    processes.forEach(process => {
        process.health = 100;
        process.isBroken = false;
        process.isActive = true;
    });

    stability = getStartingStability();
    refreshDefragAvailability();

    processes.forEach(process => {
        process.phaseId = getProcessPhaseByHealth(process.health, process.isBroken).id;
        process.lastReminderTick = -LOG_REMINDER_INTERVAL;
    });

    addSystemLog("ДЕФРАГ", `Слой завершён. Цикл: ${defragCounter}.`, "operator");
    addSystemLog("ДЕФРАГ", `Стабильность: ${Math.floor(oldStability)} / ${getStartingStability()} -> ${Math.floor(stability)} / ${getStartingStability()}.`, "service");
    addSystemLog("ДЕФРАГ", `Резерв памяти: ${oldMemory.toFixed(0)} МБ -> ${memory.toFixed(0)} МБ.`, "service");
    addSystemLog("ДЕФРАГ", `Получено знания: +${knowledgeGain}.`, "service");
    addSystemLog("ДЕФРАГ", `Новый слой: ${getCurrentLayerNumber()} / ${TOTAL_LAYERS} · ${getCurrentLayerConfig().code}.`, "operator");

    updateInterface();
    saveGame();
}

function gameTick() {
    if (!shiftStarted) {
        return;
    }

    if (sleepModeActive) {
        shiftTick += 1;
        stability = Math.max(stability, SLEEP_MODE_STABILITY_FLOOR);
        addBackgroundSystemLog(null);
        refreshDefragAvailability({ announce: true });
        updateInterface();
        saveGame();
        return;
    }

    const layer = getCurrentLayerConfig();
    let memoryGain = 0;
    let stabilityLoss = 0;
    shiftTick += 1;

    processes.forEach(process => {
        if (!process.isActive || process.isBroken) {
            return;
        }

        memoryGain += process.baseGeneration * 0.3 * getGenerationMultiplier();
        stabilityLoss += process.baseConsumption * layer.consumptionMultiplier * STABILITY_DRAIN_FACTOR;
        process.health = Math.max(0, process.health - process.baseHealthDecay * layer.healthDecayMultiplier);

        if (process.health <= 0) {
            process.isBroken = true;
        }

        syncProcessPhase(process);
    });

    memory = Math.min(getMemoryCap(), memory + memoryGain);
    stability = Math.max(0, stability - layer.passiveDecay - stabilityLoss);

    if (layer.id === FIRST_LAYER_FAILURE_ID && stability <= 0) {
        failFirstLayer();
        updateInterface();
        return;
    }

    if (layer.id > FIRST_LAYER_FAILURE_ID && stability <= SLEEP_MODE_STABILITY_FLOOR && getIncidentQueueIds().length === 0) {
        enterSleepMode();
        refreshDefragAvailability({ announce: true });
        updateInterface();
        saveGame();
        return;
    }

    if (incidentCooldown > 0) {
        incidentCooldown -= 1;
    }

    if (startupLogIndex < STARTUP_LOGS.length && shiftTick >= (startupLogIndex + 1) * 2 && !firstIncidentRaised) {
        addSystemLog("СИСТЕМА", STARTUP_LOGS[startupLogIndex], "service");
        startupLogIndex += 1;
    }

    const weakest = getWeakestActiveProcess();
    addBackgroundSystemLog(weakest);
    const incidentCandidate = getIncidentCandidate();

    if (incidentCandidate) {
        const candidatePhase = getProcessPhase(incidentCandidate);
        const queueMessage = candidatePhase.severity >= PROCESS_PHASES.error.severity
            ? "Ошибка переведена в очередь ручного вмешательства. Автокоррекция недоступна."
            : "Узел переведён в очередь ручной проверки. Ошибка может сформироваться без вмешательства.";
        raiseIncident(incidentCandidate, queueMessage);
    }

    if (getIncidentQueueIds().length > 0) {
        stability = Math.max(0, stability - INCIDENT_STABILITY_PENALTY * getIncidentQueueIds().length);
    }

    updatePassiveObservation();

    refreshDefragAvailability({ announce: true });
    updateInterface();
    saveGame();
}

scanButton.addEventListener("click", scanSystem);
analyzeButton.addEventListener("click", analyzeProcess);
fixButton.addEventListener("click", fixProcess);
resetButton.addEventListener("click", performDeepDefrag);
startShiftButton.addEventListener("click", () => {
    if (shiftStarted && !resumePromptPending) {
        hideBriefing();
    } else {
        startShift();
    }
});
newGameButton.addEventListener("click", () => {
    const confirmed = !hasSavedGame || confirm("Текущая сохранённая смена будет удалена. Начать новую смену?");
    if (!confirmed) {
        return;
    }

    startShift({ forceNew: true });
});
shareResultButton.addEventListener("click", shareFailureResult);
showBriefingButton.addEventListener("click", showBriefing);

loadGame();
seedArchiveLog();

if (processes.length === 0) {
    initProcesses();
}

stability = clamp(stability, 0, getStartingStability());
refreshDefragAvailability();
updateInterface();
showBriefing();

if (shiftStarted && !resumePromptPending) {
    addSystemLog("СИСТЕМА", `Смена восстановлена. Текущий слой: ${getCurrentLayerConfig().code}.`, "service");
}

setInterval(gameTick, TICK_MS);
