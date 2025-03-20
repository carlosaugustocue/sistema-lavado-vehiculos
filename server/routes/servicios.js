/**
 * Rutas para la gestión de servicios de lavado de vehículos
 * 
 * Implementa los requisitos funcionales:
 * - RF001: Registro de Vehículos
 * - RF002: Asignación de Servicios
 * - RF004: Listado de Servicios Pendientes
 * - RF005: Historial de Servicios
 */

const express = require('express');
const router = express.Router();
const serviciosController = require('../controllers/servicios');

/**
 * @route   GET /api/servicios
 * @desc    Obtener todos los servicios o filtrados por fecha
 * @access  Public
 */
router.get('/', serviciosController.getServicios);

/**
 * @route   GET /api/servicios/pendientes
 * @desc    Obtener servicios pendientes (RF004)
 * @access  Public
 */
router.get('/pendientes', serviciosController.getServiciosPendientes);

/**
 * @route   GET /api/servicios/tipos-vehiculos
 * @desc    Obtener tipos de vehículos disponibles
 * @access  Public
 */
router.get('/tipos-vehiculos', serviciosController.getTiposVehiculos);

/**
 * @route   GET /api/servicios/tipos-lavado
 * @desc    Obtener tipos de lavado disponibles
 * @access  Public
 */
router.get('/tipos-lavado', serviciosController.getTiposLavado);

/**
 * @route   GET /api/servicios/clientes
 * @desc    Obtener clientes registrados
 * @access  Public
 */
router.get('/clientes', serviciosController.getClientes);

/**
 * @route   GET /api/servicios/vehiculo/:placa
 * @desc    Buscar vehículo por placa
 * @access  Public
 */
router.get('/vehiculo/:placa', serviciosController.buscarVehiculoPorPlaca);

/**
 * @route   GET /api/servicios/placa/:placa
 * @desc    Obtener historial de servicios por placa (RF005)
 * @access  Public
 */
router.get('/placa/:placa', serviciosController.getServiciosPorPlaca);

/**
 * @route   GET /api/servicios/:id
 * @desc    Obtener un servicio por ID
 * @access  Public
 */
router.get('/:id', serviciosController.getServicioById);

/**
 * @route   POST /api/servicios
 * @desc    Crear un nuevo servicio (RF001, RF002)
 * @access  Public
 */
router.post('/', serviciosController.createServicio);

/**
 * @route   PUT /api/servicios/:id/completar
 * @desc    Completar un servicio (marcar como entregado)
 * @access  Public
 */
router.put('/:id/completar', serviciosController.completarServicio);

/**
 * @route   PUT /api/servicios/:id/cancelar
 * @desc    Cancelar un servicio
 * @access  Public
 */
router.put('/:id/cancelar', serviciosController.cancelarServicio);

module.exports = router;