import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env.local' });

const app = express();
app.use(cors());
app.use(express.json());

const sql = neon(process.env.DATABASE_URL);

app.post('/api/db', async (req, res) => {
  const { action, payload } = req.body;

  try {
    switch (action) {
      case 'getCategories': {
        const rows = await sql`SELECT * FROM categories ORDER BY sort_order`;
        return res.status(200).json(rows);
      }
      case 'addCategory': {
        const { name, color, sort_order } = payload;
        const rows = await sql`INSERT INTO categories (name, color, sort_order) VALUES (${name}, ${color}, ${sort_order}) RETURNING *`;
        return res.status(200).json(rows[0]);
      }
      case 'deleteCategory': {
        await sql`DELETE FROM categories WHERE id = ${payload.id}`;
        return res.status(200).json({ success: true });
      }
      case 'getHabits': {
        let rows;
        if (payload?.archived === false) {
          rows = await sql`SELECT * FROM habits WHERE archived = false ORDER BY sort_order`;
        } else {
          rows = await sql`SELECT * FROM habits ORDER BY sort_order`;
        }
        return res.status(200).json(rows);
      }
      case 'addHabit': {
        const { category_id, name, type, unit, sort_order, goal_target, goal_period, scale_min, scale_max } = payload;
        const rows = await sql`INSERT INTO habits (category_id, name, type, unit, sort_order, goal_target, goal_period, scale_min, scale_max) VALUES (${category_id}, ${name}, ${type}, ${unit}, ${sort_order}, ${goal_target ?? null}, ${goal_period ?? null}, ${scale_min ?? null}, ${scale_max ?? null}) RETURNING *`;
        return res.status(200).json(rows[0]);      }
      case 'updateHabit': {
        const { id, category_id, name, type, unit, goal_target, goal_period, scale_min, scale_max } = payload;
        const rows = await sql`UPDATE habits SET category_id = ${category_id}, name = ${name}, type = ${type}, unit = ${unit}, goal_target = ${goal_target ?? null}, goal_period = ${goal_period ?? null}, scale_min = ${scale_min ?? null}, scale_max = ${scale_max ?? null} WHERE id = ${id} RETURNING *`;
        return res.status(200).json(rows[0]);
      }
      case 'toggleArchiveHabit': {
        const { id, archived } = payload;
        await sql`UPDATE habits SET archived = ${archived} WHERE id = ${id}`;
        return res.status(200).json({ success: true });
      }
      case 'getHabitOptions': {
        const rows = await sql`SELECT * FROM habit_options ORDER BY sort_order`;
        return res.status(200).json(rows);
      }
      case 'addHabitOption': {
        const { habit_id, label, value, sort_order } = payload;
        const rows = await sql`INSERT INTO habit_options (habit_id, label, value, sort_order) VALUES (${habit_id}, ${label}, ${value ?? null}, ${sort_order ?? 0}) RETURNING *`;
        return res.status(200).json(rows[0]);
      }
      case 'updateHabitOption': {
        const { id, label, value } = payload;
        const rows = await sql`UPDATE habit_options SET label = ${label}, value = ${value ?? null} WHERE id = ${id} RETURNING *`;
        return res.status(200).json(rows[0]);
      }
      case 'deleteHabitOption': {
        await sql`DELETE FROM habit_options WHERE id = ${payload.id}`;
        return res.status(200).json({ success: true });
      }
      case 'getLogsByDate': {
        const rows = await sql`SELECT * FROM logs WHERE log_date = ${payload.date}`;
        return res.status(200).json(rows);
      }
      case 'getLogsByDateRange': {
        const rows = await sql`SELECT * FROM logs WHERE log_date >= ${payload.startStr} AND log_date <= ${payload.endStr}`;
        return res.status(200).json(rows);
      }
      case 'addLog': {
        const { habit_id, log_date, value, note } = payload;
        const rows = await sql`INSERT INTO logs (habit_id, log_date, value, note) VALUES (${habit_id}, ${log_date}, ${value}, ${note ?? null}) RETURNING *`;
        return res.status(200).json(rows[0]);
      }
      case 'updateLog': {
        const { id, value, note } = payload;
        const rows = await sql`UPDATE logs SET value = ${value}, note = ${note ?? null} WHERE id = ${id} RETURNING *`;
        return res.status(200).json(rows[0]);
      }
      case 'deleteLog': {
        await sql`DELETE FROM logs WHERE id = ${payload.id}`;
        return res.status(200).json({ success: true });
      }
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Database Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});
