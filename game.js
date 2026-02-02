// game.js - ядро игры SYSTEM_LEGACY
// Этот код выполнится, когда страница полностью загрузится

document.addEventListener('DOMContentLoaded', function() {
    console.log('Терминал HYPERION-7 загружен.');

    // Получаем ссылки на ключевые элементы интерфейса
    const stabilityBar = document.getElementById('stability-bar');
    const stabilityText = document.getElementById('stability-text');
    const memoryText = document.getElementById('memory-text');
    const scanButton = document.getElementById('scan-btn');
    const logContent = document.getElementById('log-content');

    // Пример функции для добавления записей в лог
    function addLog(message) {
        const logEntry = document.createElement('p');
        logEntry.textContent = `> ${message}`;
        logContent.appendChild(logEntry);
        // Автопрокрутка вниз
        logContent.scrollTop = logContent.scrollHeight;
        console.log('LOG:', message); // Также выводим в консоль браузера
    }

    // Простейший обработчик для кнопки SCAN (для демонстрации)
    scanButton.addEventListener('click', function() {
        addLog('Запуск сканирования узлов...');
        // Временный эффект: сканирование немного тратит стабильность
        let currentStability = parseInt(stabilityBar.value);
        currentStability = Math.max(0, currentStability - 1); // Уменьшаем на 1%, но не ниже 0
        stabilityBar.value = currentStability;
        stabilityText.textContent = currentStability + '%';
        addLog('Сканирование завершено. Стабильность понижена на 1%.');
    });

    // Приветственное сообщение
    addLog('Инициализация игрового ядра... ВСЕ СИСТЕМЫ В НОРМЕ.');
});