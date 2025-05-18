// src/lib/db.ts
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.getConnection()
  .then(conn => {
    console.log('[DB] Successfully connected to MySQL database.');
    conn.release();
  })
  .catch(err => {
    console.error('[DB] Error connecting to MySQL database:', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('[DB] Database connection was closed.');
    }
    if (err.code === 'ER_CON_COUNT_ERROR') {
      console.error('[DB] Database has too many connections.');
    }
    if (err.code === 'ECONNREFUSED') {
      console.error('[DB] Database connection was refused.');
    }
    // You might want to throw an error here or handle it gracefully
    // depending on how critical the DB connection is at startup.
  });

export default pool;
