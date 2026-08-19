import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  // Vercel Environment Variable for Neon
  const sql = neon(process.env.DATABASE_URL);
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
        const { category_id, name, type, unit, sort_order } = payload;
        const rows = await sql`INSERT INTO habits (category_id, name, type, unit, sort_order) VALUES (${category_id}, ${name}, ${type}, ${unit}, ${sort_order}) RETURNING *`;
        return res.status(200).json(rows[0]);
      }
      case 'updateHabit': {
        const { id, category_id, name, type, unit } = payload;
        const rows = await sql`UPDATE habits SET category_id = ${category_id}, name = ${name}, type = ${type}, unit = ${unit} WHERE id = ${id} RETURNING *`;
        return res.status(200).json(rows[0]);
      }
      case 'toggleArchiveHabit': {
        const { id, archived } = payload;
        await sql`UPDATE habits SET archived = ${archived} WHERE id = ${id}`;
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
        const { habit_id, log_date, value } = payload;
        const rows = await sql`INSERT INTO logs (habit_id, log_date, value) VALUES (${habit_id}, ${log_date}, ${value}) RETURNING *`;
        return res.status(200).json(rows[0]);
      }
      case 'updateLog': {
        const { id, value } = payload;
        const rows = await sql`UPDATE logs SET value = ${value} WHERE id = ${id} RETURNING *`;
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
}
