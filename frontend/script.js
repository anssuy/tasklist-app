document.addEventListener('DOMContentLoaded', () => {
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');

    async function fetchTasks() {
        try {
            const response = await fetch('/api/tasks');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const tasks = await response.json();
            displayTasks(tasks);
        } catch (error) {
            console.error('Грешка при вчитување задачи:', error);
            alert('Грешка при вчитување задачи. Проверете ја конекцијата со серверот.');
        }
    }

    function displayTasks(tasks) {
        taskList.innerHTML = '';
        tasks.forEach(task => {
            const listItem = document.createElement('li');
            listItem.classList.add('task-item');
            if (task.completed) {
                listItem.classList.add('completed');
            }
            listItem.dataset.id = task.id;

            listItem.innerHTML = `
                <input type="checkbox" ${task.completed ? 'checked' : ''}>
                <span>${task.title}</span>
                <button class="delete-btn">Избриши</button>
            `;

            const checkbox = listItem.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', () => toggleTaskStatus(task.id, checkbox.checked));

            const taskTitleSpan = listItem.querySelector('span');
            taskTitleSpan.addEventListener('click', () => toggleTaskStatus(task.id, !task.completed));


            const deleteButton = listItem.querySelector('.delete-btn');
            deleteButton.addEventListener('click', () => deleteTask(task.id));

            taskList.appendChild(listItem);
        });
    }

    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = taskInput.value.trim();

        if (!title) {
            alert('Ве молиме внесете наслов за задачата.');
            return;
        }

        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title: title })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const newTask = await response.json();
            console.log('Додадена задача:', newTask);
            taskInput.value = '';
            fetchTasks();
        } catch (error) {
            console.error('Грешка при додавање задача:', error);
            alert(`Неуспешно додавање задача: ${error.message}`);
        }
    });

    async function toggleTaskStatus(id, completed) {
        try {
            const response = await fetch(`/api/tasks/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ completed: completed })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            console.log(`Задача со ID ${id} ажурирана на completed: ${completed}`);
            fetchTasks();
        } catch (error) {
            console.error('Грешка при ажурирање статус:', error);
            alert(`Неуспешно ажурирање статус: ${error.message}`);
        }
    }

    async function deleteTask(id) {
        if (!confirm('Дали сте сигурни дека сакате да ја избришете оваа задача?')) {
            return; // Откажи бришење
        }
        try {
            const response = await fetch(`/api/tasks/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            console.log(`Задача со ID ${id} избришана.`);
            fetchTasks();
        } catch (error) {
            console.error('Грешка при бришење задача:', error);
            alert(`Неуспешно бришење задача: ${error.message}`);
        }
    }

    fetchTasks();
});