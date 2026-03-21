console.log("Терминал смены загружен.");

const SAVE_KEY = "systemLegacySaveV2";
const TOTAL_LAYERS = 9;
const TICK_MS = 1000;
const ARCHIVE_LOG_TARGET = 360;
const META_UI_UNLOCK_CYCLE = 3;
const STABILITY_DRAIN_FACTOR = 0.08;
const FIRST_LAYER_FAILURE_ID = 1;

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
        defragThreshold: 8,
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
        defragThreshold: 7,
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
        defragThreshold: 6,
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
let incidentCooldown = 0;
let firstIncidentRaised = false;
let passiveObservationBuffer = 0;
let hasSavedGame = false;
let resumePromptPending = false;

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
const logContent = document.getElementById("log-content");
const sysStatusText = document.getElementById("sys-status");
const upgradeList = document.getElementById("upgrade-list");
const upgradesSection = document.getElementById("upgrades-section");
const briefingOverlay = document.getElementById("briefing-overlay");
const startShiftButton = document.getElementById("start-shift-btn");
const newGameButton = document.getElementById("new-game-btn");
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
        defragThreshold: Math.max(4, 6 - Math.floor(depth / 2)),
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

function getGenerationMultiplier() {
    return 1 + upgrades.generationBoost * 0.15;
}

function getRepairCostMultiplier() {
    return Math.max(0.55, 1 - upgrades.repairBoost * 0.15);
}

function getStabilityRestore(process) {
    return Math.max(1, Math.ceil((100 - process.health) / 18));
}

function getUpgradeCost(key) {
    return UPGRADE_DEFS[key].baseCost * (upgrades[key] + 1);
}

function createProcessFromTemplate(template, index) {
    return {
        id: index,
        name: template.name,
        health: 100,
        baseGeneration: template.baseGeneration,
        baseConsumption: template.baseConsumption,
        baseHealthDecay: template.baseHealthDecay,
        isActive: true,
        isBroken: false
    };
}

function normalizeProcess(process, index) {
    const template = PROCESS_TEMPLATES[index] || PROCESS_TEMPLATES[0];
    const health = clamp(readNumber(process.health, 100), 0, 100);

    return {
        id: readNumber(process.id, index),
        name: process.name || template.name,
        health,
        baseGeneration: readNumber(process.baseGeneration, template.baseGeneration),
        baseConsumption: readNumber(process.baseConsumption, template.baseConsumption),
        baseHealthDecay: readNumber(process.baseHealthDecay, template.baseHealthDecay),
        isActive: process.isActive !== false,
        isBroken: Boolean(process.isBroken) || health <= 0
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
    incidentCooldown = 0;
    firstIncidentRaised = false;
    passiveObservationBuffer = 0;
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
        incidentCooldown,
        firstIncidentRaised,
        passiveObservationBuffer
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
        incidentCooldown = readNumber(gameState.incidentCooldown, 0);
        firstIncidentRaised = gameState.firstIncidentRaised === true;
        passiveObservationBuffer = readNumber(gameState.passiveObservationBuffer, 0);
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

function addLog(message) {
    const entry = document.createElement("p");
    entry.className = "log-entry";
    entry.textContent = `> ${message}`;
    logContent.appendChild(entry);
    logContent.scrollTop = logContent.scrollHeight;
}

function appendArchiveLog(message, extraClass = "") {
    const entry = document.createElement("p");
    entry.className = `log-entry${extraClass ? ` ${extraClass}` : ""}`;
    entry.textContent = `> ${message}`;
    logContent.appendChild(entry);
}

function buildArchiveLine(index) {
    const subsystem = ARCHIVE_SUBSYSTEMS[index % ARCHIVE_SUBSYSTEMS.length];
    const action = ARCHIVE_ACTIONS[(index * 3) % ARCHIVE_ACTIONS.length];
    const result = ARCHIVE_RESULTS[(index * 5) % ARCHIVE_RESULTS.length];
    const sector = String(9000 + index).padStart(5, "0");
    const cycle = String(300 + (index % 700)).padStart(4, "0");

    return `[архив] цикл ${cycle} · сектор ${sector} · ${subsystem}: ${action}, ${result}.`;
}

function buildRoutineLogLine(weakest, tick) {
    const subsystem = LIVE_LOG_SUBSYSTEMS[tick % LIVE_LOG_SUBSYSTEMS.length];
    const action = LIVE_LOG_ACTIONS[(tick * 2) % LIVE_LOG_ACTIONS.length];
    const result = LIVE_LOG_RESULTS[(tick * 3) % LIVE_LOG_RESULTS.length];

    if (!weakest) {
        return `${subsystem}: ${action}, ${result}.`;
    }

    const drift = Math.max(0, Math.floor(100 - weakest.health));
    return `${subsystem}: ${action}, узел ${weakest.name}, отклонение ${drift} ед., ${result}.`;
}

function addBackgroundSystemLog(weakest) {
    if (incidentProcessId !== null) {
        const incidentProcess = processes.find(process => process.id === incidentProcessId);
        if (!incidentProcess) {
            return;
        }

        if (selectedProcessId === null && shiftTick % 2 === 0) {
            addLog(
                `Ожидание ручного вмешательства: ${incidentProcess.name}, текущее состояние ${Math.floor(incidentProcess.health)}%, автоматическая очистка недоступна.`
            );
        }
        return;
    }

    if (shiftTick % 2 === 0) {
        addLog(buildRoutineLogLine(weakest, shiftTick));
    }
}

function failFirstLayer() {
    shiftStarted = false;
    incidentProcessId = null;
    selectedProcessId = null;
    scannedProcessId = null;
    clearSavedGame();
    resetGameState();
    seedArchiveLog();
    addLog("Стабильность контура исчерпана. Испытательная смена завершена.");
    addLog("Решение дежурного признано неудовлетворительным. Допуск отозван.");
    showBriefing();
    startShiftButton.textContent = "Начать новую смену";
    newGameButton.classList.add("is-hidden");
}

function seedArchiveLog() {
    logContent.innerHTML = "";

    for (let index = 0; index < ARCHIVE_LOG_TARGET; index += 1) {
        appendArchiveLog(buildArchiveLine(index));
    }

    appendArchiveLog("[архив] журнал не начинается с текущей смены. ранние записи не выгружены полностью.", "log-entry-anchor");
    appendArchiveLog("[архив] старые ошибки очищены не полностью. система продолжает работу поверх остаточного слоя.");
    appendArchiveLog("Терминал подключён к текущей смене. Журнал продолжается.");

    const anchor = logContent.querySelector(".log-entry-anchor");
    if (anchor) {
        anchor.scrollIntoView({ block: "start" });
    }
}

function showBriefing() {
    briefingOverlay.classList.add("is-visible");
    if (hasSavedGame) {
        startShiftButton.textContent = resumePromptPending || shiftStarted ? "Продолжить текущую смену" : "Сесть за терминал";
        newGameButton.classList.remove("is-hidden");
    } else {
        startShiftButton.textContent = "Сесть за терминал";
        newGameButton.classList.add("is-hidden");
    }
}

function startShift(options = {}) {
    const { forceNew = false } = options;
    const shouldResume = resumePromptPending && !forceNew;

    if (forceNew) {
        clearSavedGame();
        resetGameState();
        seedArchiveLog();
    }

    hideBriefing();

    if (shouldResume) {
        shiftStarted = true;
        addLog(`Смена восстановлена. Текущий контур: ${getCurrentLayerConfig().code}.`);
    } else {
        const alreadyStarted = shiftStarted;
        shiftStarted = true;
        selectedProcessId = null;
        scannedProcessId = null;
        incidentProcessId = null;
        incidentCooldown = 0;
        shiftTick = 0;
        startupLogIndex = 0;
        firstIncidentRaised = false;
        passiveObservationBuffer = 0;

        if (!alreadyStarted) {
            addLog("Инструктаж завершён. Оператор занял рабочее место.");
            addLog("Смена начата. Система работает в фоновом режиме.");
            addLog("Пока просто следи за журналом и жди сигнала.");
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

function getRepairCost(process) {
    const baseCost = Math.max(2, Math.ceil((100 - process.health) / 12) + 1);
    return Math.ceil(baseCost * getRepairCostMultiplier());
}

function refreshDefragAvailability(options = {}) {
    const layer = getCurrentLayerConfig();
    const ready = stability <= layer.defragThreshold && observation >= layer.observationGoal;

    if (options.announce && ready && !isDefragAvailable) {
        addLog(`Выдан допуск к глубокой дефрагментации. Слой ${layer.id} готов к завершению.`);
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

    incidentProcessId = process.id;
    firstIncidentRaised = true;
    addLog(`ОШИБКА. СРОЧНО ИСПРАВИТЬ: ${process.name}.`);
    addLog(message || `Зафиксирована деградация узла ${process.name}. Доступна ручная диагностика.`);
    addLog("Ожидается команда: ОТКРЫТЬ ОШИБКУ.");
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
    const process = getSelectedProcess();

    if (!process) {
        selectedProcessText.classList.toggle("is-hidden", incidentProcessId === null);
        if (incidentProcessId !== null) {
            const incidentProcess = processes.find(item => item.id === incidentProcessId);
            selectedProcessText.textContent = incidentProcess
                ? `Срочный сигнал: ${incidentProcess.name}. Узел ждёт ручной диагностики.`
                : "В журнале зафиксирована срочная ошибка. Нужно найти проблемный узел.";
        } else {
            selectedProcessText.textContent = "Система работает в фоновом режиме. Узел ещё не выбран.";
        }
        return;
    }

    selectedProcessText.classList.remove("is-hidden");
    const restore = getStabilityRestore(process);
    const fixCost = getRepairCost(process);
    const analyzed = observedProcessIds.includes(process.id);
    if (analyzed) {
        selectedProcessText.textContent =
            `Выбран: ${process.name}. Сбой уже разобран. Очистка восстановит ${restore} ед. стабильности, расход резерва: ${fixCost} МБ.`;
        return;
    }

    selectedProcessText.textContent =
        `Выбран: ${process.name}. Состояние ${Math.floor(process.health)}%. Можно сначала разобрать сбой или сразу очистить его за ${fixCost} МБ.`;
}

function updateCommandVisibility() {
    const hasSelection = shiftStarted && selectedProcessId !== null;
    const showDefrag = shiftStarted && isDefragAvailable;
    const canScan = shiftStarted && selectedProcessId === null && (incidentProcessId !== null || stability <= getEmergencyThreshold());

    scanButton.classList.toggle("is-hidden", !canScan);
    analyzeButton.classList.toggle("is-hidden", !hasSelection);
    fixButton.classList.toggle("is-hidden", !hasSelection);
    resetButton.classList.toggle("is-hidden", !showDefrag);
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
    } else if (stability <= layer.defragThreshold) {
        sysStatusText.textContent = "АВАРИЙНЫЙ РИСК";
        sysStatusText.style.color = "#c97d7d";
    } else if (stability <= emergencyThreshold) {
        sysStatusText.textContent = "ПРЕДАВАРИЙНЫЙ РЕЖИМ";
        sysStatusText.style.color = "#bea46f";
    } else {
        sysStatusText.textContent = "АКТИВНА";
        sysStatusText.style.color = "#bad1a9";
    }

    sysStatusText.classList.remove("status-warning", "status-critical");
    if (shiftStarted && stability <= layer.defragThreshold) {
        sysStatusText.classList.add("status-critical");
    } else if (shiftStarted && stability <= emergencyThreshold) {
        sysStatusText.classList.add("status-warning");
    }

    stabilityNote.classList.remove("danger-note");
    if (!shiftStarted || stability >= Math.ceil(maxStability * 0.7)) {
        stabilityNote.textContent = "Контур удерживается в штатном диапазоне.";
    } else if (stability > emergencyThreshold) {
        stabilityNote.textContent = "Устойчивость снижается. Рекомендуется подготовить ручное вмешательство.";
        stabilityNote.classList.add("danger-note");
    } else if (stability > layer.defragThreshold) {
        stabilityNote.textContent = "Предаварийный уровень. Дальнейшее снижение может привести к срыву контура.";
        stabilityNote.classList.add("danger-note");
    } else {
        stabilityNote.textContent = "Критический риск срыва. Контур удерживается на пределе.";
        stabilityNote.classList.add("danger-note");
    }

    defragHint.textContent = isDefragAvailable
        ? "Выдан допуск к глубокой дефрагментации."
        : `До допуска к глубокой дефрагментации нужно разобрать ${layer.observationGoal} сбоев и снизить стабильность до ${layer.defragThreshold} / ${maxStability} или ниже.`;

    scanButton.disabled = !shiftStarted;
    analyzeButton.disabled = !shiftStarted || selectedProcessId === null;
    fixButton.disabled = !shiftStarted || selectedProcessId === null;
    resetButton.disabled = !isDefragAvailable;

    updateSelectedProcessSummary();
    updateMetricVisibility();
    updateCommandVisibility();
    renderUpgradePanel();
}

function purchaseUpgrade(key) {
    const upgrade = UPGRADE_DEFS[key];
    if (upgrades[key] >= upgrade.maxLevel) {
        addLog(`${upgrade.name}: предел улучшения уже достигнут.`);
        return;
    }

    const cost = getUpgradeCost(key);
    if (knowledge < cost) {
        addLog(`${upgrade.name}: недостаточно знания. Нужно ${cost}.`);
        return;
    }

    knowledge -= cost;
    upgrades[key] += 1;

    if (key === "stabilityBoost") {
        stability = Math.min(getStartingStability(), stability + 5);
    }

    addLog(`${upgrade.name} установлен. Новый уровень: ${upgrades[key]}/${upgrade.maxLevel}.`);
    refreshDefragAvailability();
    updateInterface();
    saveGame();
}

function scanSystem() {
    if (!shiftStarted) {
        showBriefing();
        return;
    }

    if (incidentProcessId === null && stability > getEmergencyThreshold()) {
        addLog("Сканирование пока не требуется. Система не запрашивала ручную диагностику.");
        return;
    }

    const target = processes.find(process => process.id === incidentProcessId) || getWeakestActiveProcess();
    if (!target) {
        addLog("Сканирование не дало результата: активных процессов не осталось.");
        return;
    }

    selectedProcessId = target.id;
    scannedProcessId = target.id;
    updateInterface();

    addLog(`Сканирование завершено. Самый нестабильный процесс: ${target.name} (${Math.floor(target.health)}%). Доступны команды: ДИАГНОСТИКА / ОЧИСТИТЬ СБОЙ.`);

    saveGame();
}

function fixProcess() {
    const process = getSelectedProcess();
    if (!process) {
        addLog("Сначала нужно открыть ошибку и перейти к аварийному узлу.");
        return;
    }

    if (process.isBroken) {
        addLog(`Процесс ${process.name} уже отключён и не чинится обычной процедурой.`);
        return;
    }

    if (process.health >= 100) {
        addLog(`Процесс ${process.name} уже в полном порядке.`);
        return;
    }

    const fixCost = getRepairCost(process);
    if (memory < fixCost) {
        addLog(`Для очистки нужно ${fixCost} МБ резерва. Сейчас доступно ${memory.toFixed(0)} МБ.`);
        return;
    }

    const resolvedIncident = process.id === incidentProcessId;
    const stabilityRestore = getStabilityRestore(process);

    memory -= fixCost;
    process.health = 100;
    stability = Math.min(getStartingStability(), stability + stabilityRestore);
    scannedProcessId = null;
    if (resolvedIncident) {
        incidentProcessId = null;
        incidentCooldown = stability <= getEmergencyThreshold() ? 1 : 4;
    }
    selectedProcessId = null;
    scannedProcessId = null;
    observedProcessIds = observedProcessIds.filter(id => id !== process.id);

    addLog(`Процесс ${process.name} восстановлен. Потрачено ${fixCost} МБ резерва. Стабильность +${stabilityRestore}.`);
    if (resolvedIncident) {
        addLog("Срочная ошибка снята. Сбой закрыт без подробного разбора.");
    }
    refreshDefragAvailability();
    updateInterface();
    saveGame();
}

function analyzeProcess() {
    const process = getSelectedProcess();
    if (!process) {
        addLog("Сначала нужно открыть ошибку и перейти к аварийному узлу.");
        return;
    }

    const layer = getCurrentLayerConfig();
    if (memory < layer.analyzeCost) {
        addLog(`Для диагностики нужно ${layer.analyzeCost} МБ резерва. Сейчас доступно ${memory.toFixed(0)} МБ.`);
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

    if (alreadyObserved) {
        addLog(`Диагностика ${process.name}: повторный разбор. Новый прогресс не получен, ошибка всё ещё требует очистки.`);
    } else {
        addLog(`Диагностика ${process.name}: сбой разобран (${observation}/${layer.observationGoal}). Ошибка всё ещё активна и требует очистки.`);
    }

    refreshDefragAvailability({ announce: true });
    updateInterface();
    saveGame();
}

function performDeepDefrag() {
    const layer = getCurrentLayerConfig();

    if (stability > layer.defragThreshold) {
        addLog(`Завершение слоя пока недоступно: нужна стабильность ${layer.defragThreshold}% или ниже.`);
        return;
    }

    if (observation < layer.observationGoal) {
        addLog(`Завершение слоя пока недоступно: нужно разобрать ${layer.observationGoal} сбоев, разобрано ${observation}.`);
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
        addLog("Завершение слоя отменено оператором.");
        return;
    }

    const oldLayerCode = layer.code;
    const oldMemory = memory;
    const oldStability = stability;
    const healthyProcesses = processes.filter(process => process.health > 80).length;
    const knowledgeGain = 4 + layer.id + observation + Math.floor(healthyProcesses / 2);

    addLog("==================================================");
    addLog(`Запущена глубокая дефрагментация · ${oldLayerCode}`);

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

    addLog(`Слой завершён. Цикл: ${defragCounter}.`);
    addLog(`Стабильность: ${Math.floor(oldStability)} / ${getStartingStability()} → ${Math.floor(stability)} / ${getStartingStability()}`);
    addLog(`Резерв памяти: ${oldMemory.toFixed(0)} МБ → ${memory.toFixed(0)} МБ`);
    addLog(`Получено знания: +${knowledgeGain}`);
    addLog(`Новый слой: ${getCurrentLayerNumber()} / ${TOTAL_LAYERS} · ${getCurrentLayerConfig().code}`);
    addLog("==================================================");

    updateInterface();
    saveGame();
}

function gameTick() {
    if (!shiftStarted) {
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
            addLog(`Критический сбой: процесс ${process.name} отключён.`);
        }
    });

    memory = Math.min(getMemoryCap(), memory + memoryGain);
    stability = Math.max(0, stability - layer.passiveDecay - stabilityLoss);

    if (layer.id === FIRST_LAYER_FAILURE_ID && stability <= 0) {
        failFirstLayer();
        updateInterface();
        return;
    }

    if (incidentCooldown > 0) {
        incidentCooldown -= 1;
    }

    if (startupLogIndex < STARTUP_LOGS.length && shiftTick >= (startupLogIndex + 1) * 2 && !firstIncidentRaised) {
        addLog(STARTUP_LOGS[startupLogIndex]);
        startupLogIndex += 1;
    }

    const weakest = getWeakestActiveProcess();
    addBackgroundSystemLog(weakest);
    const shouldRaiseFirstIncident = !firstIncidentRaised && shiftTick >= 5;
    const shouldRaiseCriticalIncident =
        firstIncidentRaised &&
        incidentProcessId === null &&
        selectedProcessId === null &&
        weakest &&
        stability <= getEmergencyThreshold() &&
        (incidentCooldown <= 1 || weakest.health <= 68);
    const shouldRaiseRegularIncident =
        firstIncidentRaised &&
        incidentProcessId === null &&
        incidentCooldown === 0 &&
        selectedProcessId === null &&
        weakest &&
        weakest.health <= Math.max(62, layer.observationHealthThreshold + 2);

    if (shouldRaiseFirstIncident && weakest) {
        raiseIncident(weakest, `Зафиксирована критическая деградация узла ${weakest.name}. Требуется ручная проверка.`);
    } else if (shouldRaiseCriticalIncident) {
        raiseIncident(weakest, `Аварийный режим: узел ${weakest.name} требует немедленного ручного вмешательства.`);
    } else if (shouldRaiseRegularIncident) {
        raiseIncident(weakest, `Вторичное отклонение: узел ${weakest.name} выпал из штатного диапазона.`);
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
    addLog(`Смена восстановлена. Текущий слой: ${getCurrentLayerConfig().code}.`);
}

setInterval(gameTick, TICK_MS);
