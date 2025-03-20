/**
 * Servidor principal para la aplicación de Gestión de Lavado de Vehículos
 * 
 * Este archivo configura y arranca el servidor Express que sirve tanto
 * el frontend como la API REST para la aplicación.
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const { testConnection } = require('./server/config/db');

// Importar rutas
const empleadosRoutes = require('./server/routes/empleados');
const serviciosRoutes = require('./server/routes/servicios');
const inventarioRoutes = require('./server/routes/inventario');
const reportesRoutes = require('./server/routes/reportes');

// Crear aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;

// Configurar middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// Configurar rutas de la API
app.use('/api/empleados', empleadosRoutes);
app.use('/api/servicios', serviciosRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/reportes', reportesRoutes);

// Ruta para probar la conexión a la base de datos
app.get('/api/status', async (req, res) => {
  try {
    const connectionSuccess = await testConnection();
    res.json({
      status: connectionSuccess ? 'ok' : 'error',
      message: connectionSuccess ? 'Conexión a la base de datos exitosa' : 'Error al conectar a la base de datos',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error al verificar el estado del sistema',
      error: error.message
    });
  }
});

// Ruta para servir las vistas HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/servicios.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'servicios.html'));
});

app.get('/empleados.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'empleados.html'));
});

app.get('/inventario.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'inventario.html'));
});

app.get('/reportes.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'reportes.html'));
});

// Middleware para manejar rutas no encontradas
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Middleware para manejar errores
app.use((err, req, res, next) => {
  console.error('Error en la aplicación:', err.stack);
  res.status(500).json({
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// Iniciar el servidor
app.listen(PORT, async () => {
  console.log(`\n==========================================`);
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
  console.log(`==========================================\n`);
  
  // Verificar la conexión a la base de datos al iniciar
  try {
    const connectionSuccess = await testConnection();
    if (connectionSuccess) {
      console.log('✅ Conexión a la base de datos establecida correctamente.');
    } else {
      console.error('❌ No se pudo conectar a la base de datos.');
    }
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos:', error.message);
  }
  
  console.log('\nEndpoints disponibles:');
  console.log('- API: http://localhost:' + PORT + '/api');
  console.log('- Estado del sistema: http://localhost:' + PORT + '/api/status');
  console.log('\nVisualización de la aplicación:');
  console.log('- Dashboard: http://localhost:' + PORT);
  console.log('- Servicios: http://localhost:' + PORT + '/servicios.html');
  console.log('- Empleados: http://localhost:' + PORT + '/empleados.html');
  console.log('- Inventario: http://localhost:' + PORT + '/inventario.html');
  console.log('- Reportes: http://localhost:' + PORT + '/reportes.html');
  console.log('\n==========================================\n');
});

module.exports = app; // Para pruebas unitarias