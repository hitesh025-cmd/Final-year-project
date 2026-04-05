import pg from 'pg';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Render provides DATABASE_URL for PostgreSQL automatically
const connectionString = process.env.DATABASE_URL;

let pool;
let db;

const isProduction = !!connectionString;

if (isProduction) {
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
}

export async function initDb() {
  if (isProduction) {
    try {
      const client = await pool.connect();
      await client.query(`
        CREATE TABLE IF NOT EXISTS donors (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          "bloodGroup" VARCHAR(10) NOT NULL,
          city VARCHAR(255) NOT NULL,
          contact VARCHAR(50) NOT NULL,
          "lastDonationDate" DATE,
          available BOOLEAN DEFAULT TRUE
        );
        CREATE TABLE IF NOT EXISTS requests (
          id SERIAL PRIMARY KEY,
          "patientName" VARCHAR(255) NOT NULL,
          "bloodGroup" VARCHAR(10) NOT NULL,
          "hospitalName" VARCHAR(255) NOT NULL,
          units INT NOT NULL,
          urgency VARCHAR(50) NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          "assignedDonorId" INT,
          "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS inventory (
          "bloodGroup" VARCHAR(10) PRIMARY KEY,
          units INT DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS hospitals (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          city VARCHAR(255) NOT NULL,
          address TEXT,
          contact VARCHAR(50) NOT NULL,
          email VARCHAR(255)
        );
      `);
      client.release();
      console.log('PostgreSQL Database Initialized ✅');
    } catch (e) {
      console.error('Postgres init error:', e.message);
    }
  } else {
    db = await open({ filename: './database.sqlite', driver: sqlite3.Database });
    await db.exec(`
      CREATE TABLE IF NOT EXISTS donors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, bloodGroup TEXT, city TEXT, contact TEXT, lastDonationDate TEXT, available BOOLEAN DEFAULT 1);
      CREATE TABLE IF NOT EXISTS requests (id INTEGER PRIMARY KEY AUTOINCREMENT, patientName TEXT, bloodGroup TEXT, hospitalName TEXT, units INTEGER, urgency TEXT, status TEXT DEFAULT 'pending', assignedDonorId INTEGER);
      CREATE TABLE IF NOT EXISTS inventory (bloodGroup TEXT PRIMARY KEY, units INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS hospitals (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, city TEXT, address TEXT, contact TEXT, email TEXT);
    `);
    console.log('Local SQLite Database Initialized ✅');
  }
}

export default {
  query: async (text, params) => {
    if (isProduction) return pool.query(text, params);
    const sqliteText = text.replace(/\$\d+/g, '?').replace(/"/g, '');
    const isSelect = sqliteText.trim().toUpperCase().startsWith('SELECT');
    if (isSelect) return { rows: await db.all(sqliteText, params) };
    const result = await db.run(sqliteText, params);
    return { rows: [{ id: result.lastID }], rowCount: result.changes };
  }
};
