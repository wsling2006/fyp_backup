import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

const host = process.env.DB_HOST || 'localhost';
const port = parseInt(process.env.DB_PORT || '5432', 10); // Changed from 5433 to 5432
const username = process.env.DB_USERNAME || 'jw'; // Changed from 'postgres' to 'jw'
const password = process.env.DB_PASSWORD || '';
const database = process.env.DB_NAME || 'fyp_db';

export default new DataSource({
  type: 'postgres',
  host,
  port,
  username,
  password,
  database,
  entities: [join(__dirname, '/**/*.entity.{ts,js}')],
  migrations: [join(__dirname, '/migrations/*.{ts,js}')],
  synchronize: false,
  logging: false,
});
