// game.js - Ядро игры SYSTEM_LEGACY
console.log('Терминал HYPERION-7 загружен.');

// ====================
// 1. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ СОСТОЯНИЯ
// ====================
let stability = 85.0;          // Текущая стабильность (в процентах)
let memory = 0.0;              // Накопленная память (в "единицах")
let knowledge = 0;             // Знания (престиж-валюта, неизменна при сбросе)
let selectedProcessId = null;  // ID выбранного процесса (для FIX, STATUS)
let scannedProcessId = null;   // ID процесса, найденного сканированием (для подсказки)
// Система дефрагментации
let defragCounter = 0;        // Счётчик выполненных дефрагментаций
let isDefragAvailable = false; // Доступна ли дефрагментация сейчас

// ====================
// 1.2. МОДЕЛЬ ПРОЦЕССОВ (СЕТКА 3X3)
// ====================
let processes = []; // Массив, где будут храниться все процессы

// ====================
// 2. ССЫЛКИ НА ЭЛЕМЕНТЫ ИНТЕРФЕЙСА
// ====================
const stabilityBar = document.getElementById('stability-bar');
const stabilityText = document.getElementById('stability-text');
const memoryText = document.getElementById('memory-text');
const scanButton = document.getElementById('scan-btn');
const fixButton = document.getElementById('fix-btn');
const analyzeButton = document.getElementById('analyze-btn');
const resetButton = document.getElementById('reset-btn');
const logContent = document.getElementById('log-content');

// ====================
// 1.1. СИСТЕМА СОХРАНЕНИЯ
// ====================
function saveGame() {
    const gameState = {
        stability: stability,
        memory: memory,
        knowledge: knowledge,
        processes: processes,
        selectedProcessId: selectedProcessId,
        defragCounter: defragCounter,
        isDefragAvailable: isDefragAvailable
    };
    localStorage.setItem('systemLegacySave', JSON.stringify(gameState));
    console.log('Игра сохранена.');
}

function loadGame() {
    const saved = localStorage.getItem('systemLegacySave');
    if (saved) {
        try {
            const gameState = JSON.parse(saved);
            stability = gameState.stability || 85.0;
            memory = gameState.memory || 0.0;
            knowledge = gameState.knowledge || 0;
            processes = gameState.processes || [];
            selectedProcessId = gameState.selectedProcessId || null;
            defragCounter = gameState.defragCounter || 0;
            isDefragAvailable = gameState.isDefragAvailable || false;
            
            // Восстанавливаем методы объектов, если они были утеряны при сериализации
            if (processes.length > 0) {
                processes.forEach(proc => {
                    proc.isBroken = proc.health <= 0;
                });
            }
            
            console.log('Игра загружена.');
            addLog('Обнаружено предыдущее состояние системы. Загрузка...');
        } catch (e) {
            console.error('Ошибка загрузки:', e);
            addLog('Ошибка загрузки сохранения. Инициализация нового сеанса.');
            initProcesses();
        }
    } else {
        console.log('Сохранение не найдено, запуск с начальными значениями.');
        addLog('Сохранений не обнаружено. Инициализация нового сеанса.');
        initProcesses();
    }
}

// ====================
// 3. ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ЛОГА
// ====================
function addLog(message) {
    const logEntry = document.createElement('p');
    logEntry.textContent = `> ${message}`;
    logContent.appendChild(logEntry);
    // Автопрокрутка лога вниз
    logContent.scrollTop = logContent.scrollHeight;
    console.log('LOG:', message);
}

// ====================
// 4. ФУНКЦИЯ ОБНОВЛЕНИЯ ИНТЕРФЕЙСА
// ====================
function updateInterface() {
    // Обновляем прогресс-бар и текст стабильности
    stabilityBar.value = stability;
    stabilityText.textContent = Math.floor(stability) + '%';

    // Обновляем отображение памяти
    memoryText.textContent = memory.toFixed(2) + ' ГБ';

    // Активируем кнопки FIX и ANALYZE, только если есть выбранный процесс
    fixButton.disabled = (selectedProcessId === null);
    analyzeButton.disabled = (selectedProcessId === null);
}

// ====================
// 5. ФУНКЦИЯ ИГРОВОГО ЦИКЛА (TICK)
// ====================
function gameTick() {
    // 5.1. СБРАСЫВАЕМ прирост/потребление за тик
    let memoryGainThisTick = 0;
    let stabilityLossThisTick = 0;

    // 5.2. ПРОХОДИМ ПО ВСЕМ ПРОЦЕССАМ
    processes.forEach(process => {
        if (process.isActive && !process.isBroken) {
            // Активный процесс генерирует память и потребляет стабильность
            memoryGainThisTick += process.baseGeneration;
            stabilityLossThisTick += process.baseConsumption;

            // Процесс медленно изнашивается (0.1% за тик)
            process.health = Math.max(0, process.health - 0.1);
            
            // Если здоровье упало до 0, процесс ломается
            if (process.health <= 0) {
                process.isBroken = true;
                addLog(`КРИТИЧЕСКИЙ СБОЙ: Процесс ${process.name} отключен.`);
            }
        }
    });

    // 5.3. ПРИМЕНЯЕМ ИТОГИ ТИКА К ОСНОВНЫМ РЕСУРСАМ
    memory += memoryGainThisTick;
    stability = Math.max(0, stability - 0.5 - stabilityLossThisTick); // 0.5 — базовая деградация

    // 5.4. ОБНОВЛЯЕМ ИНТЕРФЕЙС (включая сетку процессов)
    updateInterface();
    renderProcessGrid(); // Перерисовываем сетку каждый тик!

    // 5.5. ПРОВЕРКА КРИТИЧЕСКОГО СОСТОЯНИЯ
    if (stability <= 0) {
        addLog('ВНИМАНИЕ: Стабильность на нуле. Требуется глубокая дефрагментация.');
        stability = 0;
    }
    
    // 5.6. ПРОВЕРКА ДОСТУПНОСТИ ДЕФРАГМЕНТАЦИИ
    // Дефрагментация доступна, если стабильность ниже 10%
    isDefragAvailable = (stability < 10);
    
    // Визуальная индикация доступности кнопки DEEP_DEFRAG
    if (resetButton) {
        if (isDefragAvailable) {
            resetButton.style.borderColor = '#ff5555';
            resetButton.style.color = '#ff5555';
        } else {
            resetButton.style.borderColor = '#663333';
            resetButton.style.color = '#ff5555';
        }
    }
} // <-- ЭТА ЗАКРЫВАЮЩАЯ ФИГУРНАЯ СКОБКА ВАЖНА!
// ====================
// ИНИЦИАЛИЗАЦИЯ ПРОЦЕССОВ
// ====================
function initProcesses() {
    const processNames = [
        "LOG_CLEANER", "MEMORY_DUMP", "CACHE_AGENT",
        "ARCHIVE_TOOL", "CORE_SHIELD", "BACKUP_DAEMON",
        "NULL_PROC", "DECRYPTOR", "SCRAMBLER"
    ];

    processes = [];

    for (let i = 0; i < 9; i++) {
        processes.push({
            id: i,
            name: processNames[i],
            health: 100,
            baseGeneration: 0.5,
            baseConsumption: 0.1,
            isActive: true,
            isBroken: false
        });
    }
    console.log('Инициализировано процессов:', processes.length);
}

// ====================
// 4.1. ФУНКЦИЯ ОТРИСОВКИ СЕТКИ ПРОЦЕССОВ
// ====================
function renderProcessGrid() {
    const container = document.getElementById('process-grid-container');
    if (!container) {
        console.error('Контейнер для сетки процессов не найден!');
        return;
    }
    
    container.innerHTML = '';

    processes.forEach(process => {
        const processEl = document.createElement('div');
        processEl.className = 'process';
        processEl.dataset.id = process.id;

        // Цвет фона зависит от уровня здоровья
        let healthColor = '#00aa00';
        if (process.health < 50) healthColor = '#ffaa00';
        if (process.health < 20) healthColor = '#ff5555';
        if (process.isBroken) healthColor = '#333333';

        // ВЫДЕЛЕНИЕ: если процесс выбран или найден сканированием
        let borderStyle = '1px solid #333';
        if (process.id === selectedProcessId) {
            borderStyle = '2px solid #ffffff';
        } else if (process.id === scannedProcessId) {
            borderStyle = '2px dashed #ffff00';
        }

        processEl.style.backgroundColor = healthColor;
        processEl.style.border = borderStyle;

        processEl.innerHTML = `
            <div class="process-name">${process.name}</div>
            <div class="process-health">${Math.floor(process.health)}%</div>
        `;

        processEl.addEventListener('click', () => {
            selectedProcessId = process.id;
            scannedProcessId = null;
            renderProcessGrid();
            updateInterface();
            addLog(`Выбран процесс: ${process.name}. Готов к командам FIX или ANALYZE.`);
        });

        container.appendChild(processEl);
    });
}

// ====================
// 8. ЛОГИКА КОМАНДЫ SCAN
// ====================
scanButton.addEventListener('click', function() {
    const activeProcesses = processes.filter(p => p.isActive && !p.isBroken);
    
    if (activeProcesses.length === 0) {
        addLog('SCAN: Нет активных процессов для диагностики.');
        return;
    }

    let mostCriticalProcess = activeProcesses[0];
    for (const proc of activeProcesses) {
        if (proc.health < mostCriticalProcess.health) {
            mostCriticalProcess = proc;
        }
    }

    scannedProcessId = mostCriticalProcess.id;
    selectedProcessId = mostCriticalProcess.id;
    
    renderProcessGrid();
    updateInterface();
    
    addLog(`SCAN завершён. Критический процесс: ${mostCriticalProcess.name} (Здоровье: ${Math.floor(mostCriticalProcess.health)}%). Выделен.`);
});

// ====================
// 9. ЛОГИКА КОМАНДЫ FIX
// ====================
function fixProcess() {
    if (selectedProcessId === null) {
        addLog('ОШИБКА FIX: Не выбран процесс для починки. Используйте SCAN или кликните по процессу.');
        return;
    }

    const process = processes.find(p => p.id === selectedProcessId);
    
    if (!process) {
        addLog('ОШИБКА FIX: Выбранный процесс не найден.');
        return;
    }

    if (process.isBroken) {
        addLog(`ВНИМАНИЕ: Процесс ${process.name} полностью отключен. Требуется перезагрузка модуля.`);
        return;
    }

    if (process.health >= 100) {
        addLog(`Процесс ${process.name} не требует починки. Здоровье: 100%.`);
        return;
    }

    const healthNeeded = 100 - process.health;
    const fixCost = healthNeeded * 0.75;

    if (memory < fixCost) {
        addLog(`ОШИБКА FIX: Недостаточно памяти. Нужно: ${fixCost.toFixed(1)} ГБ, доступно: ${memory.toFixed(1)} ГБ.`);
        return;
    }

    memory -= fixCost;
    process.health = 100;
    scannedProcessId = null;
    
    addLog(`УСПЕХ: Процесс ${process.name} полностью восстановлен. Стоимость: ${fixCost.toFixed(1)} ГБ.`);
    
    updateInterface();
    renderProcessGrid();
}

fixButton.addEventListener('click', fixProcess);

// ====================
// 10. ЛОГИКА КОМАНДЫ ANALYZE (БАЗОВАЯ)
// ====================
analyzeButton.addEventListener('click', function() {
    if (selectedProcessId === null) {
        addLog('ОШИБКА ANALYZE: Не выбран процесс для анализа.');
        return;
    }

    const process = processes.find(p => p.id === selectedProcessId);
    const analysisCost = 15;

    if (memory < analysisCost) {
        addLog(`ОШИБКА ANALYZE: Недостаточно памяти. Нужно: ${analysisCost} ГБ.`);
        return;
    }

    memory -= analysisCost;
    const knowledgeGain = process.health < 30 ? 2 : 1;
    knowledge += knowledgeGain;
    
    addLog(`АНАЛИЗ ${process.name}: Структура кода изучена. Получено Знаний: +${knowledgeGain}.`);
    
    updateInterface();
});

// ====================
// 11. ЛОГИКА СИСТЕМЫ ДЕФРАГМЕНТАЦИИ (DEEP_DEFRAG)
// ====================
function performDeepDefrag() {
    // Проверяем условия для дефрагментации
    if (!isDefragAvailable) {
        addLog('ОТКАЗ: Дефрагментация доступна только при стабильности < 10%.');
        return;
    }
    
    if (stability >= 10) {
        addLog('ОТКАЗ: Стабильность слишком высока для безопасной дефрагментации.');
        return;
    }
    
    // ПОДТВЕРЖДЕНИЕ ДЕЙСТВИЯ (можно закомментировать на время тестов)
    const userConfirmed = confirm(
        `ГЛУБОКАЯ ДЕФРАГМЕНТАЦИЯ #${defragCounter + 1}\n\n` +
        `Это сбросит стабильность и память, но сохранит Знания.\n` +
        `Вы уверены?`
    );
    
    if (!userConfirmed) {
        addLog('Дефрагментация отменена оператором.');
        return;
    }
    
    addLog('='.repeat(50));
    addLog(`ИНИЦИИРОВАНА ГЛУБОКАЯ ДЕФРАГМЕНТАЦИЯ #${defragCounter + 1}`);
    
    // РАСЧЁТ НАГРАДЫ ЗА ЦИКЛ
    const baseReward = 5; // Базовое количество знаний за цикл
    let bonusReward = 0;
    
    // Бонусы за эффективность цикла
    const maxMemoryBonus = Math.floor(memory / 100); // +1 знание за каждые 100 ГБ
    const processBonus = processes.filter(p => p.health > 80).length; // +1 за каждый здоровый процесс
    
    bonusReward = maxMemoryBonus + processBonus;
    const totalKnowledgeGain = baseReward + bonusReward;
    
    // ПРИМЕНЕНИЕ ИЗМЕНЕНИЙ
    // 1. Увеличиваем счётчик дефрагментаций
    defragCounter++;
    
    // 2. Начисляем знания
    knowledge += totalKnowledgeGain;
    
    // 3. Сохраняем для отчёта старые значения
    const oldMemory = memory;
    const oldStability = stability;
    
    // 4. СБРОС СОСТОЯНИЯ СИСТЕМЫ К НАЧАЛЬНОМУ
    stability = 85.0; // Возвращаем к начальному значению
    memory = 0.0;     // Обнуляем память
    
    // 5. СБРОС ВСЕХ ПРОЦЕССОВ (восстанавливаем здоровье)
    processes.forEach(process => {
        process.health = 100;
        process.isBroken = false;
        process.isActive = true;
    });
    
    // 6. Сброс выделений
    selectedProcessId = null;
    scannedProcessId = null;
    
    // 7. ОТЧЁТ О РЕЗУЛЬТАТАХ
    addLog(`ЗАВЕРШЕНО. ЦИКЛ #${defragCounter}`);
    addLog(`─ Стабильность: ${oldStability.toFixed(1)}% → ${stability}%`);
    addLog(`─ Память: ${oldMemory.toFixed(1)} ГБ → ${memory} ГБ`);
    addLog(`─ Здоровых процессов: ${processBonus}/9`);
    addLog(`─ Получено Знаний: +${totalKnowledgeGain} (база: ${baseReward}, бонус: ${bonusReward})`);
    addLog(`─ Всего Знаний: ${knowledge}`);
    addLog('='.repeat(50));
    
    // 8. ОБНОВЛЕНИЕ ИНТЕРФЕЙСА
    updateInterface();
    renderProcessGrid();
    
    // 9. ОБНОВЛЕНИЕ СОСТОЯНИЯ КНОПКИ (дефрагментация снова недоступна)
    isDefragAvailable = false;
    if (resetButton) {
        resetButton.style.borderColor = '#663333';
    }
    
    // 10. Сохранение нового состояния
    saveGame();
}

// Связываем функцию с кнопкой DEEP_DEFRAG
resetButton.addEventListener('click', performDeepDefrag);

// ====================
// 6. ЗАПУСК ЦИКЛА И ПЕРВОНАЧАЛЬНАЯ НАСТРОЙКА
// ====================
// Загружаем сохранение (ДО запуска цикла!)
loadGame();

// Если процессов нет (первый запуск) — инициализируем
if (processes.length === 0) {
    initProcesses();
    addLog('Первичная инициализация процессов завершена.');
}

// Отрисовываем сетку первый раз
renderProcessGrid();

// Запускаем игровой тик
const gameInterval = setInterval(function() {
    gameTick();
    saveGame();
}, 1000);

updateInterface();
addLog('Игровой цикл активирован. Все системы в норме.');