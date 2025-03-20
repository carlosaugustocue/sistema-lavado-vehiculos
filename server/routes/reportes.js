/**
 * Rutas para la generación de reportes
 * 
 * Implementa los requisitos funcionales:
 * - RF006: Cálculo de Tiempo Promedio por Tipo de Lavado
 * - RF007: Reporte de Ingresos Diarios
 * - RF009: Carga de Trabajo por Empleado (parcialmente)
 */

const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportes');

/**
 * @route   GET /api/reportes/dashboard
 * @desc    Obtener datos para el dashboard
 * @access  Public
 */
router.get('/dashboard', reportesController.getDashboard);

/**
 * @route   GET /api/reportes/ingresos-diarios
 * @desc    Generar reporte de ingresos diarios (RF007)
 * @access  Public
 */
router.get('/ingresos-diarios', reportesController.getIngresosDiarios);

/**
 * @route   GET /api/reportes/tiempo-promedio
 * @desc    Generar reporte de tiempo promedio por tipo de lavado (RF006)
 * @access  Public
 */
router.get('/tiempo-promedio', reportesController.getTiempoPromedioLavado);

/**
 * @route   GET /api/reportes/carga-trabajo
 * @desc    Generar reporte de carga de trabajo por empleado (RF009)
 * @access  Public
 */
router.get('/carga-trabajo', reportesController.getCargaTrabajoEmpleados);

/**
 * @route   GET /api/reportes/distribucion-dias
 * @desc    Generar reporte de distribución de servicios por día de la semana
 * @access  Public
 */
router.get('/distribucion-dias', reportesController.getDistribucionServiciosDias);

/**
 * @route   GET /api/reportes/eficiencia-empleados
 * @desc    Generar reporte de eficiencia de empleados
 * @access  Public
 */
router.get('/eficiencia-empleados', reportesController.getEficienciaEmpleados);

/**
 * @route   GET /api/reportes/consumo-insumos
 * @desc    Generar reporte de consumo de insumos
 * @access  Public
 */
router.get('/consumo-insumos', reportesController.getConsumoInsumos);

module.exports = router;