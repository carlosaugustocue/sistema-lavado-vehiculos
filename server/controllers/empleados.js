/**
 * Controlador para la gestión de empleados y turnos
 * 
 * Implementa los requisitos funcionales:
 * - RF010: Registro de Empleados y Turnos
 * - RF009: Carga de Trabajo por Empleado (parcialmente)
 */

const { query, transaction } = require('../config/db');

/**
 * Obtiene todos los empleados activos
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getEmpleados(req, res) {
  try {
    const empleados = await query('SELECT * FROM Empleados WHERE estado = "Activo"');
    res.json(empleados);
  } catch (error) {
    console.error('Error al obtener empleados:', error);
    res.status(500).json({ 
      message: 'Error al obtener empleados', 
      error: error.message 
    });
  }
}

/**
 * Obtiene un empleado por su ID
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getEmpleadoById(req, res) {
  try {
    const { id } = req.params;
    const empleados = await query('SELECT * FROM Empleados WHERE id = ?', [id]);
    
    if (empleados.length === 0) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }
    
    res.json(empleados[0]);
  } catch (error) {
    console.error('Error al obtener empleado:', error);
    res.status(500).json({ 
      message: 'Error al obtener empleado', 
      error: error.message 
    });
  }
}

/**
 * Crea un nuevo empleado
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function createEmpleado(req, res) {
  try {
    const { id, nombre, apellidos, fecha_nacimiento } = req.body;
    
    // Validar campos requeridos
    if (!id || !nombre || !apellidos || !fecha_nacimiento) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }
    
    // Verificar si ya existe un empleado con ese ID
    const existingEmpleados = await query('SELECT * FROM Empleados WHERE id = ?', [id]);
    if (existingEmpleados.length > 0) {
      return res.status(400).json({ message: 'Ya existe un empleado con ese ID' });
    }
    
    // Insertar el nuevo empleado
    await query(
      'INSERT INTO Empleados (id, nombre, apellidos, fecha_nacimiento) VALUES (?, ?, ?, ?)',
      [id, nombre, apellidos, fecha_nacimiento]
    );
    
    // Registrar actividad
    await query(
      'CALL registrar_actividad(?, ?, ?, ?, ?)',
      [req.headers['x-user'] || 'sistema', 'Crear empleado', 'Empleados', id, JSON.stringify(req.body)]
    );
    
    res.status(201).json({
      message: 'Empleado creado exitosamente',
      empleadoId: id
    });
  } catch (error) {
    console.error('Error al crear empleado:', error);
    res.status(500).json({ 
      message: 'Error al crear empleado', 
      error: error.message 
    });
  }
}

/**
 * Actualiza un empleado existente
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function updateEmpleado(req, res) {
  try {
    const { id } = req.params;
    const { nombre, apellidos, fecha_nacimiento, estado } = req.body;
    
    // Validar campos requeridos
    if (!nombre || !apellidos || !fecha_nacimiento || !estado) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }
    
    // Verificar si el empleado existe
    const existingEmpleados = await query('SELECT * FROM Empleados WHERE id = ?', [id]);
    if (existingEmpleados.length === 0) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }
    
    // Actualizar empleado
    const result = await query(
      'UPDATE Empleados SET nombre = ?, apellidos = ?, fecha_nacimiento = ?, estado = ? WHERE id = ?',
      [nombre, apellidos, fecha_nacimiento, estado, id]
    );
    
    // Registrar actividad
    await query(
      'CALL registrar_actividad(?, ?, ?, ?, ?)',
      [req.headers['x-user'] || 'sistema', 'Actualizar empleado', 'Empleados', id, JSON.stringify(req.body)]
    );
    
    res.json({
      message: 'Empleado actualizado exitosamente',
      affectedRows: result.affectedRows
    });
  } catch (error) {
    console.error('Error al actualizar empleado:', error);
    res.status(500).json({ 
      message: 'Error al actualizar empleado', 
      error: error.message 
    });
  }
}

/**
 * Elimina (desactiva) un empleado
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function deleteEmpleado(req, res) {
  try {
    const { id } = req.params;
    
    // Verificar si el empleado existe
    const existingEmpleados = await query('SELECT * FROM Empleados WHERE id = ?', [id]);
    if (existingEmpleados.length === 0) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }
    
    // Desactivar el empleado (no borrar físicamente)
    const result = await query(
      'UPDATE Empleados SET estado = "Inactivo" WHERE id = ?',
      [id]
    );
    
    // Registrar actividad
    await query(
      'CALL registrar_actividad(?, ?, ?, ?, ?)',
      [req.headers['x-user'] || 'sistema', 'Desactivar empleado', 'Empleados', id, '']
    );
    
    res.json({
      message: 'Empleado desactivado exitosamente',
      affectedRows: result.affectedRows
    });
  } catch (error) {
    console.error('Error al desactivar empleado:', error);
    res.status(500).json({ 
      message: 'Error al desactivar empleado', 
      error: error.message 
    });
  }
}

/**
 * Obtiene todos los turnos de un empleado
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getEmpleadoTurnos(req, res) {
  try {
    const { id } = req.params;
    
    // Verificar si el empleado existe
    const existingEmpleados = await query('SELECT * FROM Empleados WHERE id = ?', [id]);
    if (existingEmpleados.length === 0) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }
    
    // Obtener los turnos del empleado
    const turnos = await query(`
      SELECT 
        te.id, 
        te.dia, 
        j.hora_inicio, 
        j.hora_final 
      FROM Turnos_Empleados te
      JOIN Jornadas j ON te.id_jornada = j.id
      WHERE te.id_empleado = ?
      ORDER BY FIELD(te.dia, 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo')
    `, [id]);
    
    res.json(turnos);
  } catch (error) {
    console.error('Error al obtener turnos del empleado:', error);
    res.status(500).json({ 
      message: 'Error al obtener turnos', 
      error: error.message 
    });
  }
}

/**
 * Asigna un turno a un empleado
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function assignTurno(req, res) {
  try {
    const { id } = req.params;
    const { id_jornada, dia } = req.body;
    
    // Validar campos requeridos
    if (!id_jornada || !dia) {
      return res.status(400).json({ message: 'La jornada y el día son requeridos' });
    }
    
    // Verificar si el empleado existe
    const existingEmpleados = await query('SELECT * FROM Empleados WHERE id = ?', [id]);
    if (existingEmpleados.length === 0) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }
    
    // Verificar si la jornada existe
    const existingJornadas = await query('SELECT * FROM Jornadas WHERE id = ?', [id_jornada]);
    if (existingJornadas.length === 0) {
      return res.status(404).json({ message: 'Jornada no encontrada' });
    }
    
    // Verificar si ya existe un turno para ese empleado y día
    const existingTurnos = await query(
      'SELECT * FROM Turnos_Empleados WHERE id_empleado = ? AND dia = ?',
      [id, dia]
    );
    
    let result;
    
    if (existingTurnos.length > 0) {
      // Actualizar el turno existente
      result = await query(
        'UPDATE Turnos_Empleados SET id_jornada = ? WHERE id_empleado = ? AND dia = ?',
        [id_jornada, id, dia]
      );
      
      // Registrar actividad
      await query(
        'CALL registrar_actividad(?, ?, ?, ?, ?)',
        [req.headers['x-user'] || 'sistema', 'Actualizar turno', 'Turnos_Empleados', existingTurnos[0].id, JSON.stringify(req.body)]
      );
      
      res.json({
        message: 'Turno actualizado exitosamente',
        turnoId: existingTurnos[0].id,
        affectedRows: result.affectedRows
      });
    } else {
      // Crear un nuevo turno
      result = await query(
        'INSERT INTO Turnos_Empleados (id_empleado, id_jornada, dia) VALUES (?, ?, ?)',
        [id, id_jornada, dia]
      );
      
      // Registrar actividad
      await query(
        'CALL registrar_actividad(?, ?, ?, ?, ?)',
        [req.headers['x-user'] || 'sistema', 'Asignar turno', 'Turnos_Empleados', result.insertId, JSON.stringify(req.body)]
      );
      
      res.status(201).json({
        message: 'Turno asignado exitosamente',
        turnoId: result.insertId
      });
    }
  } catch (error) {
    console.error('Error al asignar turno:', error);
    res.status(500).json({ 
      message: 'Error al asignar turno', 
      error: error.message 
    });
  }
}

/**
 * Elimina un turno de un empleado
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function deleteTurno(req, res) {
  try {
    const { id, turnoId } = req.params;
    
    // Verificar si el turno existe y pertenece al empleado
    const existingTurnos = await query(
      'SELECT * FROM Turnos_Empleados WHERE id = ? AND id_empleado = ?',
      [turnoId, id]
    );
    
    if (existingTurnos.length === 0) {
      return res.status(404).json({ message: 'Turno no encontrado para este empleado' });
    }
    
    // Eliminar el turno
    const result = await query('DELETE FROM Turnos_Empleados WHERE id = ?', [turnoId]);
    
    // Registrar actividad
    await query(
      'CALL registrar_actividad(?, ?, ?, ?, ?)',
      [req.headers['x-user'] || 'sistema', 'Eliminar turno', 'Turnos_Empleados', turnoId, '']
    );
    
    res.json({
      message: 'Turno eliminado exitosamente',
      affectedRows: result.affectedRows
    });
  } catch (error) {
    console.error('Error al eliminar turno:', error);
    res.status(500).json({ 
      message: 'Error al eliminar turno', 
      error: error.message 
    });
  }
}

/**
 * Obtiene los turnos de todos los empleados
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getAllTurnos(req, res) {
  try {
    const turnos = await query(`
      SELECT 
        te.id,
        e.id AS id_empleado,
        CONCAT(e.nombre, ' ', e.apellidos) AS empleado,
        te.dia,
        j.hora_inicio,
        j.hora_final
      FROM Turnos_Empleados te
      JOIN Empleados e ON te.id_empleado = e.id
      JOIN Jornadas j ON te.id_jornada = j.id
      WHERE e.estado = 'Activo'
      ORDER BY FIELD(te.dia, 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'), j.hora_inicio
    `);
    
    res.json(turnos);
  } catch (error) {
    console.error('Error al obtener todos los turnos:', error);
    res.status(500).json({ 
      message: 'Error al obtener turnos', 
      error: error.message 
    });
  }
}

/**
 * Obtiene todas las jornadas disponibles
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getJornadas(req, res) {
  try {
    const jornadas = await query('SELECT * FROM Jornadas WHERE estado = "Activo"');
    res.json(jornadas);
  } catch (error) {
    console.error('Error al obtener jornadas:', error);
    res.status(500).json({ 
      message: 'Error al obtener jornadas', 
      error: error.message 
    });
  }
}

/**
 * Obtiene la carga de trabajo actual por empleado (RF009)
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getCargaTrabajo(req, res) {
  try {
    const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
    
    const cargaTrabajo = await query(`
      SELECT 
        e.id,
        CONCAT(e.nombre, ' ', e.apellidos) AS empleado,
        COUNT(s.id) AS total_asignados,
        SUM(CASE WHEN s.hora_entrega IS NULL THEN 1 ELSE 0 END) AS pendientes,
        SUM(CASE WHEN s.hora_entrega IS NOT NULL THEN 1 ELSE 0 END) AS completados
      FROM Empleados e
      LEFT JOIN Servicio s ON e.id = s.id_emp_lava AND s.fecha = ?
      WHERE e.estado = 'Activo'
      GROUP BY e.id, e.nombre, e.apellidos
      ORDER BY pendientes DESC, total_asignados DESC
    `, [fecha]);
    
    res.json(cargaTrabajo);
  } catch (error) {
    console.error('Error al obtener carga de trabajo:', error);
    res.status(500).json({ 
      message: 'Error al obtener carga de trabajo', 
      error: error.message 
    });
  }
}

/**
 * Obtiene los empleados disponibles para asignar trabajo en este momento
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getEmpleadosDisponibles(req, res) {
  try {
    // Obtener día y hora actual
    const now = new Date();
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const diaActual = diasSemana[now.getDay()];
    const horaActual = now.toTimeString().slice(0, 8);
    
    // Buscar empleados que tienen turno en este momento
    const empleadosDisponibles = await query(`
      SELECT 
        e.id,
        CONCAT(e.nombre, ' ', e.apellidos) AS empleado,
        j.hora_inicio,
        j.hora_final,
        (
          SELECT COUNT(s.id) 
          FROM Servicio s 
          WHERE s.id_emp_lava = e.id 
            AND s.fecha = CURRENT_DATE 
            AND s.hora_entrega IS NULL
        ) AS servicios_pendientes
      FROM Empleados e
      JOIN Turnos_Empleados te ON e.id = te.id_empleado
      JOIN Jornadas j ON te.id_jornada = j.id
      WHERE e.estado = 'Activo'
        AND te.dia = ?
        AND ? BETWEEN j.hora_inicio AND j.hora_final
      ORDER BY servicios_pendientes ASC
    `, [diaActual, horaActual]);
    
    res.json(empleadosDisponibles);
  } catch (error) {
    console.error('Error al obtener empleados disponibles:', error);
    res.status(500).json({ 
      message: 'Error al obtener empleados disponibles', 
      error: error.message 
    });
  }
}

module.exports = {
  getEmpleados,
  getEmpleadoById,
  createEmpleado,
  updateEmpleado,
  deleteEmpleado,
  getEmpleadoTurnos,
  assignTurno,
  deleteTurno,
  getAllTurnos,
  getJornadas,
  getCargaTrabajo,
  getEmpleadosDisponibles
};