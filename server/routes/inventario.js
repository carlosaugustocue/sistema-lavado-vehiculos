/**
 * Rutas para la gestión de inventario
 * 
 * Implementa los requisitos funcionales:
 * - RF003: Registro de Insumos Utilizados
 * - RF008: Identificación de Insumos con Stock Bajo
 */

const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventario');

/**
 * @route   GET /api/inventario
 * @desc    Obtener todos los insumos en inventario
 * @access  Public
 */
router.get('/', inventarioController.getInventario);

/**
 * @route   GET /api/inventario/stock-bajo
 * @desc    Obtener insumos con stock bajo (RF008)
 * @access  Public
 */
router.get('/stock-bajo', inventarioController.getInsumosStockBajo);

/**
 * @route   GET /api/inventario/tipos
 * @desc    Obtener tipos de insumos
 * @access  Public
 */
router.get('/tipos', inventarioController.getTiposInsumos);

/**
 * @route   GET /api/inventario/valor
 * @desc    Obtener el valor total del inventario
 * @access  Public
 */
router.get('/valor', inventarioController.getValorInventario);

/**
 * @route   GET /api/inventario/historial
 * @desc    Obtener historial de consumo de insumos
 * @access  Public
 */
router.get('/historial', inventarioController.getHistorialConsumo);

/**
 * @route   GET /api/inventario/:id
 * @desc    Obtener un insumo específico por ID
 * @access  Public
 */
router.get('/:id', inventarioController.getInsumoById);

/**
 * @route   POST /api/inventario
 * @desc    Crear un nuevo insumo
 * @access  Public
 */
router.post('/', inventarioController.createInsumo);

/**
 * @route   PUT /api/inventario/:id
 * @desc    Actualizar un insumo existente
 * @access  Public
 */
router.put('/:id', inventarioController.updateInsumo);

/**
 * @route   PUT /api/inventario/:id/stock
 * @desc    Actualizar el stock de un insumo (RF003)
 * @access  Public
 */
router.put('/:id/stock', inventarioController.updateStock);

module.exports = router;