document.addEventListener('DOMContentLoaded', () => {
    const topIncomeList = document.getElementById('top-income-list');
    const topRatingList = document.getElementById('top-rating-list');
    // Укажите URL вашего бэкенда. Замените на актуальный URL, если он отличается.
    const backendUrl = 'http://localhost:3000/api/users/workers-stats';

    async function fetchWorkerStats() {
        try {
            const response = await fetch(backendUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            renderList(topIncomeList, data.topByIncome, 'income');
            renderList(topRatingList, data.topByRating, 'rating');

        } catch (error) {
            console.error('Error fetching worker stats:', error);
            topIncomeList.innerHTML = '<li class="loading">Не удалось загрузить данные. Проверьте URL бэкенда и его доступность.</li>';
            topRatingList.innerHTML = '<li class="loading">Не удалось загрузить данные. Проверьте URL бэкенда и его доступность.</li>';
        }
    }

    function renderList(listElement, workers, statType) {
        listElement.innerHTML = ''; // Очистить сообщение "Загрузка..."

        if (!workers || workers.length === 0) {
            listElement.innerHTML = '<li class="loading">Нет данных для отображения.</li>';
            return;
        }

        workers.forEach(worker => {
            const listItem = document.createElement('li');

            const rankSpan = document.createElement('span');
            rankSpan.className = 'rank';
            rankSpan.textContent = `${worker.rank}.`;

            const img = document.createElement('img');
            // Предполагаем, что worker.photo содержит полный URL к фото
            img.src = worker.photo || 'placeholder.png'; // Добавьте файл placeholder.png в папку public на случай отсутствия фото
            img.alt = worker.name;
            img.onerror = () => { img.src = 'placeholder.png'; }; // Запасное изображение при ошибке

            const infoDiv = document.createElement('div');
            infoDiv.className = 'worker-info';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'name';
            nameSpan.textContent = worker.name || 'Имя не указано';

            const roleSpan = document.createElement('span');
            roleSpan.className = 'role';
            roleSpan.textContent = `Роль: ${worker.role || 'Не указана'}`;

            const statSpan = document.createElement('span');
            statSpan.className = 'stat';
            if (statType === 'income') {
                statSpan.innerHTML = `Доход: <strong>${worker.income.toFixed(2)} ₽</strong>`;
            } else if (statType === 'rating') {
                statSpan.innerHTML = `Рейтинг: <strong>${worker.rating.toFixed(1)} ⭐</strong>`;
            }
             // Дополнительно выведем кол-во задач
            const tasksSpan = document.createElement('span');
            tasksSpan.className = 'stat';
            tasksSpan.textContent = `Выполнено задач: ${worker.completedTasks}`;


            infoDiv.appendChild(nameSpan);
            infoDiv.appendChild(roleSpan);
            infoDiv.appendChild(statSpan);
            infoDiv.appendChild(tasksSpan); // Добавляем задачи

            listItem.appendChild(rankSpan);
            listItem.appendChild(img);
            listItem.appendChild(infoDiv);

            listElement.appendChild(listItem);
        });
    }

    fetchWorkerStats();
});
