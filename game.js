// game.js - Ядро игры SYSTEM_LEGACY
console.log('Терминал HYPERION-7 загружен.');

// ====================
// 1. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ СОСТОЯНИЯ
// ====================
let stability = 85.0;      // Текущая стабильность (в процентах)
let memory = 0.0;          // Накопленная память (в "единицах")
let knowledge = 0;         // Знания (престиж-валюта, неизменна при сбросе)

// ====================
// 1.1. СИСТЕМА СОХРАНЕНИЯ
// ====================
function saveGame() {
    const gameState = {
        stability: stability,
        memory: memory,
        knowledge: knowledge
    };
    localStorage.setItem('systemLegacySave', JSON.stringify(gameState));
    console.log('Игра сохранена.');
}

function loadGame() {
    const saved = localStorage.getItem('systemLegacySave');
    if (saved) {
        const gameState = JSON.parse(saved);
        stability = gameState.stability || 85.0;
        memory = gameState.memory || 0.0;
        knowledge = gameState.knowledge || 0;
        console.log('Игра загружена.');
        addLog('Обнаружено предыдущее состояние системы. Загрузка...');
    } else {
        console.log('Сохранение не найдено, запуск с начальными значениями.');
        addLog('Сохранений не обнаружено. Инициализация нового сеанса.');
    }
}

// ====================
// 1.2. МОДЕЛЬ ПРОЦЕССОВ (СЕТКА 3X3)
// ====================
let processes = []; // Массив, где будут храниться все процессы

// Функция инициализации процессов (вызывается один раз при старте)
function initProcesses() {
    const processNames = [
        "LOG_CLEANER", "MEMORY_DUMP", "CACHE_AGENT",
        "ARCHIVE_TOOL", "CORE_SHIELD", "BACKUP_DAEMON",
        "NULL_PROC", "DECRYPTOR", "SCRAMBLER"
    ];

    processes = []; // Очищаем массив (на случай повторной инициализации)

    for (let i = 0; i < 9; i++) {
        processes.push({
            id: i,
            name: processNames[i],
            health: 100,          // Здоровье процесса в %
            baseGeneration: 0.5,  // Базовая генерация памяти (ГБ/тик)
            baseConsumption: 0.1, // Базовое потребление стабильности (%/тик)
            isActive: true,       // Активен ли процесс
            isBroken: false       // Сломан ли процесс (health <= 0)
        });
    }
    console.log('Инициализировано процессов:', processes.length);
}
// ====================
// 2. ССЫЛКИ НА ЭЛЕМЕНТЫ ИНТЕРФЕЙСА
// ====================
const stabilityBar = document.getElementById('stability-bar');
const stabilityText = document.getElementById('stability-text');
const memoryText = document.getElementById('memory-text');
const scanButton = document.getElementById('scan-btn');
const logContent = document.getElementById('log-content');

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
    stabilityText.textContent = Math.floor(stability) + '%'; // Округляем для красоты

    // Обновляем отображение памяти (округляем до сотых)
    memoryText.textContent = memory.toFixed(2) + ' ГБ';
}

// ====================
// 4.1. ФУНКЦИЯ ОТРИСОВКИ СЕТКИ ПРОЦЕССОВ
// ====================
function renderProcessGrid() {
    const container = document.getElementById('process-grid-container');
    container.innerHTML = ''; // Очищаем контейнер

    processes.forEach(process => {
        const processEl = document.createElement('div');
        processEl.className = 'process';
        processEl.dataset.id = process.id; // Сохраняем ID в data-атрибут

        // Цвет фона зависит от уровня здоровья
        let healthColor = '#00aa00'; // Зелёный
        if (process.health < 50) healthColor = '#ffaa00'; // Жёлтый
        if (process.health < 20) healthColor = '#ff5555'; // Красный
        if (process.isBroken) healthColor = '#333333';    // Тёмно-серый (сломан)

        processEl.style.backgroundColor = healthColor;

        // HTML содержимое элемента процесса
        processEl.innerHTML = `
            <div class="process-name">${process.name}</div>
            <div class="process-health">${Math.floor(process.health)}%</div>
        `;

        // Клик по процессу будет показывать его статус (позже)
        processEl.addEventListener('click', () => showProcessStatus(process.id));

        container.appendChild(processEl);
    });
    console.log('Сетка процессов отрисована');
}

// Вспомогательная функция (заглушка, пока не реализована)
function showProcessStatus(processId) {
    const process = processes.find(p => p.id === processId);
    addLog(`СТАТУС ${process.name}: Здоровье ${process.health}%, Активен: ${process.isActive}`);
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
    renderProcessGrid(); // Теперь перерисовываем сетку каждый тик!

    if (stability <= 0) {
        addLog('ВНИМАНИЕ: Стабильность на нуле. Требуется глубокая дефрагментация.');
        stability = 0;
    }
}
// ====================
// 6. ЗАПУСК ЦИКЛА И ПЕРВОНАЧАЛЬНАЯ НАСТРОЙКА
// ====================
loadGame(); // Загружаем сохранение

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

// ====================
// 7. ТЕСТОВЫЙ ОБРАБОТЧИК ДЛЯ КНОПКИ SCAN (пока простой)
// ====================
scanButton.addEventListener('click', function() {
    addLog('Сканирование... Обнаружено: ручное вмешательство оператора.');
    // Временный эффект: сканирование тратит 5 единиц памяти
    if (memory >= 5) {
        memory -= 5;
        updateInterface(); // Обновляем интерфейс после изменения памяти
        addLog('Память затрачена на углубленный анализ. Стабильность системы не затронута.');
    } else {
        addLog('ОШИБКА: Недостаточно памяти для выполнения операции.');
    }
});