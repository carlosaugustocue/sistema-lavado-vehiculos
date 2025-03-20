/**
 * Configuración de la conexión a la base de datos MySQL
 * 
 * Este módulo configura y expone la conexión a la base de datos MySQL
 * utilizando el paquete mysql2/promise para trabajar con promesas.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración de la conexión a la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '12345',
  database: process.env.DB_NAME || 'sistema_lavado_vehiculos',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Crear un pool de conexiones
const pool = mysql.createPool(dbConfig);

/**
 * Función para probar la conexión a la base de datos
 * @returns {Promise<boolean>} true si la conexión es exitosa, false en caso contrario
 */
async function testConnection() {
  try {
    // Intentar obtener una conexión del pool
    const connection = await pool.getConnection();
    console.log('Conexión a la base de datos MySQL establecida correctamente');
    
    // Liberar la conexión de vuelta al pool
    connection.release();
    return true;
  } catch (error) {
    console.error('Error al conectar a la base de datos MySQL:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('Compruebe que el servidor MySQL esté en ejecución y las credenciales sean correctas');
    }
    return false;
  }
}

/**
 * Ejecuta una consulta SQL y devuelve los resultados
 * @param {string} sql - Consulta SQL a ejecutar
 * @param {Array} params - Parámetros para la consulta (opcional)
 * @returns {Promise<Array>} Resultados de la consulta
 */
async function query(sql, params) {
  try {
    const [results] = await pool.execute(sql, params || []);
    return results;
  } catch (error) {
    console.error('Error ejecutando consulta SQL:', error);
    console.error('SQL:', sql);
    console.error('Parámetros:', params);
    throw error; // Re-lanzar el error para manejo en el controlador
  }
}

/**
 * Ejecuta una transacción con múltiples consultas SQL
 * @param {Function} callback - Función que recibe una conexión y ejecuta consultas
 * @returns {Promise<any>} Resultado de la transacción
 */
async function transaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Exportar las funciones para su uso en otros módulos
module.exports = {
  pool,
  testConnection,
  query,
  transaction
};