require('dotenv').config();

const express = require('express');
const cors = require('cors'); 
const { Pool } = require('pg');
const app = express();
const port = 3000;

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.DB_HOST || 'localhost',
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

async function connectAndCreateTable() {
  try {
    const client = await pool.connect();
    console.log('Успешно поврзано со PostgreSQL');

    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          completed BOOLEAN DEFAULT FALSE
      );
    `);
    console.log('Табелата "tasks" е успешно креирана или веќе постои.');

    client.release();
  } catch (err) {
    console.error('Грешка при поврзување со PostgreSQL или креирање табела:', err.stack);
    process.exit(1);
  }
}

connectAndCreateTable();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// GET /api/tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY id ASC');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching tasks:', err.message);
    res.status(500).json({ message: 'Грешка на серверот при добивање задачи.' });
  }
});

// GET /api/tasks/:id
app.get('/api/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).json({ message: 'Задачата не е пронајдена.' });
    }
  } catch (err) {
    console.error('Error fetching single task:', err.message);
    res.status(500).json({ message: 'Грешка на серверот при добивање задача.' });
  }
});

// POST /api/tasks
app.post('/api/tasks', async (req, res) => {
  const { title } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ message: 'Насловот на задачата е задолжителен.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO tasks (title, completed) VALUES ($1, FALSE) RETURNING *',
      [title.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating task:', err.message);
    res.status(500).json({ message: 'Грешка на серверот при креирање задача.' });
  }
});

// PUT /api/tasks/:id
app.put('/api/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, completed } = req.body;

  try {
    const existingTask = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);

    if (existingTask.rows.length === 0) {
      return res.status(404).json({ message: 'Задачата не е пронајдена.' });
    }

    let queryParts = [];
    let queryValues = [];
    let paramIndex = 1;

    if (title !== undefined) {
      queryParts.push(`title = $${paramIndex++}`);
      queryValues.push(title.trim());
    }
    if (completed !== undefined) {
      queryParts.push(`completed = $${paramIndex++}`);
      queryValues.push(Boolean(completed));
    }

    if (queryParts.length === 0) {
      return res.status(400).json({ message: 'Нема податоци за ажурирање.' });
    }

    queryValues.push(id);

    const updateQuery = `UPDATE tasks SET ${queryParts.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(updateQuery, queryValues);

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating task:', err.message);
    res.status(500).json({ message: 'Грешка на серверот при ажурирање задача.' });
  }
});

// DELETE /api/tasks/:id
app.delete('/api/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length > 0) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'Задачата не е пронајдена.' });
    }
  } catch (err) {
    console.error('Error deleting task:', err.message);
    res.status(500).json({ message: 'Грешка на серверот при бришење задача.' });
  }
});

app.listen(port, () => {
  console.log(`Серверот е стартуван на http://localhost:${port}`);
  console.log('API Endpoints:');
  console.log(`   GET    http://localhost:${port}/api/tasks`);
  console.log(`   GET    http://localhost:${port}/api/tasks/:id`);
  console.log(`   POST   http://localhost:${port}/api/tasks`);
  console.log(`   PUT    http://localhost:${port}/api/tasks/:id`);
  console.log(`   DELETE http://localhost:${port}/api/tasks/:id`);
});