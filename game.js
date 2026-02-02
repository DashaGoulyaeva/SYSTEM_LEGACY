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
// 5. ФУНКЦИЯ ИГРОВОГО ЦИКЛА (TICK)
// ====================
function gameTick() {
    // 5.1. Уменьшаем стабильность на 0.5% за тик
    stability = Math.max(0, stability - 0.5); // Math.max не даст уйти ниже 0

    // 5.2. Увеличиваем память на 1.2 единицы за тик (базовая генерация)
    memory += 1.2;

    // 5.3. Обновляем цифры на экране
    updateInterface();

    // 5.4. (Дополнительно) Если стабильность упала до 0, пишем в лог
    if (stability <= 0) {
        addLog('ВНИМАНИЕ: Стабильность на нуле. Требуется глубокая дефрагментация.');
        stability = 0; // Фиксируем на нуле
    }
}
// ====================
// 6. ЗАПУСК ЦИКЛА И ПЕРВОНАЧАЛЬНАЯ НАСТРОЙКА
// ====================
// Загружаем сохранение (ДО запуска цикла!)
loadGame();

// Запускаем игровой тик каждую секунду
const gameInterval = setInterval(function() {
    gameTick();   // Выполняем логику тика
    saveGame();   // Сохраняем состояние после каждого тика
}, 1000);

// Сразу обновляем интерфейс
updateInterface();
addLog('Игровой цикл активирован. Система активна.');

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