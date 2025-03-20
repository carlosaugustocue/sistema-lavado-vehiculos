/**
 * Rutas para la gestión de empleados y turnos (RF010)
 */

const express = require('express');
const router = express.Router();
const empleadosController = require('../controllers/empleados');

/**
 * @route   GET /api/empleados
 * @desc    Obtener todos los empleados activos
 * @access  Public
 */
router.get('/', empleadosController.getEmpleados);

/**
 * @route   GET /api/empleados/turnos
 * @desc    Obtener todos los turnos de todos los empleados
 * @access  Public
 */
router.get('/turnos', empleadosController.getAllTurnos);

/**
 * @route   GET /api/empleados/jornadas
 * @desc    Obtener todas las jornadas disponibles
 * @access  Public
 */
router.get('/jornadas', empleadosController.getJornadas);

/**
 * @route   GET /api/empleados/carga-trabajo
 * @desc    Obtener la carga de trabajo por empleado (RF009)
 * @access  Public
 */
router.get('/carga-trabajo', empleadosController.getCargaTrabajo);

/**
 * @route   GET /api/empleados/disponibles
 * @desc    Obtener empleados disponibles para asignar trabajo
 * @access  Public
 */
router.get('/disponibles', empleadosController.getEmpleadosDisponibles);

/**
 * @route   GET /api/empleados/:id
 * @desc    Obtener un empleado por ID
 * @access  Public
 */
router.get('/:id', empleadosController.getEmpleadoById);

/**
 * @route   GET /api/empleados/:id/turnos
 * @desc    Obtener todos los turnos de un empleado
 * @access  Public
 */
router.get('/:id/turnos', empleadosController.getEmpleadoTurnos);

/**
 * @route   POST /api/empleados
 * @desc    Crear un nuevo empleado
 * @access  Public
 */
router.post('/', empleadosController.createEmpleado);

/**
 * @route   POST /api/empleados/:id/turnos
 * @desc    Asignar un turno a un empleado
 * @access  Public
 */
router.post('/:id/turnos', empleadosController.assignTurno);

/**
 * @route   PUT /api/empleados/:id
 * @desc    Actualizar un empleado existente
 * @access  Public
 */
router.put('/:id', empleadosController.updateEmpleado);

/**
 * @route   DELETE /api/empleados/:id
 * @desc    Eliminar (desactivar) un empleado
 * @access  Public
 */
router.delete('/:id', empleadosController.deleteEmpleado);

/**
 * @route   DELETE /api/empleados/:id/turnos/:turnoId
 * @desc    Eliminar un turno de un empleado
 * @access  Public
 */
router.delete('/:id/turnos/:turnoId', empleadosController.deleteTurno);

module.exports = router;