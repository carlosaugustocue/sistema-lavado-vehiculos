/**
 * Controlador para la gestión de servicios de lavado
 * 
 * Implementa los requisitos funcionales:
 * - RF001: Registro de Vehículos
 * - RF002: Asignación de Servicios
 * - RF003: Registro de Insumos Utilizados (parcialmente)
 * - RF004: Listado de Servicios Pendientes
 * - RF005: Historial de Servicios
 */

const { query, transaction } = require('../config/db');

/**
 * Obtener todos los servicios 
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getServicios(req, res) {
  try {
    const { fecha, limite } = req.query;
    let whereClause = '';
    let params = [];
    
    // Filtrar por fecha si se proporciona
    if (fecha) {
      whereClause = 'WHERE s.fecha = ?';
      params.push(fecha);
    }
    
    // Limitar resultados si se especifica
    let limitClause = '';
    if (limite) {
      limitClause = 'LIMIT ?';
      params.push(parseInt(limite));
    }
    
    const servicios = await query(`
      SELECT 
        s.id, 
        s.fecha, 
        s.placa, 
        v.tipo AS tipo_vehiculo,
        v.tamano AS tamano_vehiculo,
        tl.nombre AS tipo_lavado,
        CONCAT(e1.nombre, ' ', e1.apellidos) AS recibido_por,
        CONCAT(e2.nombre, ' ', e2.apellidos) AS lavado_por,
        s.hora_recibe,
        s.hora_entrega,
        s.precio,
        s.estado
      FROM Servicio s
      JOIN Vehiculos v ON s.id_tipovehiculo = v.id
      JOIN Tipos_Lavado tl ON s.id_tipolavado = tl.id
      JOIN Empleados e1 ON s.id_emp_recibe = e1.id
      JOIN Empleados e2 ON s.id_emp_lava = e2.id
      ${whereClause}
      ORDER BY s.fecha DESC, s.hora_recibe DESC
      ${limitClause}
    `, params);
    
    res.json(servicios);
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    res.status(500).json({ 
      message: 'Error al obtener servicios', 
      error: error.message 
    });
  }
}

/**
 * Obtener un servicio por ID
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getServicioById(req, res) {
  try {
    const { id } = req.params;
    
    // Obtener información principal del servicio
    const servicios = await query(`
      SELECT 
        s.id, 
        s.fecha, 
        s.placa, 
        v.tipo AS tipo_vehiculo,
        v.tamano AS tamano_vehiculo,
        v.id AS id_tipovehiculo,
        tl.id AS id_tipolavado,
        tl.nombre AS tipo_lavado,
        s.id_emp_recibe,
        s.id_emp_lava,
        CONCAT(e1.nombre, ' ', e1.apellidos) AS recibido_por,
        CONCAT(e2.nombre, ' ', e2.apellidos) AS lavado_por,
        s.hora_recibe,
        s.hora_entrega,
        s.precio,
        s.observaciones,
        s.estado
      FROM Servicio s
      JOIN Vehiculos v ON s.id_tipovehiculo = v.id
      JOIN Tipos_Lavado tl ON s.id_tipolavado = tl.id
      JOIN Empleados e1 ON s.id_emp_recibe = e1.id
      JOIN Empleados e2 ON s.id_emp_lava = e2.id
      WHERE s.id = ?
    `, [id]);
    
    if (servicios.length === 0) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }
    
    const servicio = servicios[0];
    
    // Obtener insumos utilizados
    const insumos = await query(`
      SELECT 
        is_s.id,
        is_s.id_insumo,
        i.nombre,
        is_s.cantidad,
        i.precio,
        (i.precio * is_s.cantidad) AS subtotal
      FROM Insumos_Servicio is_s
      JOIN Insumos i ON is_s.id_insumo = i.id
      WHERE is_s.id_servicio = ?
    `, [id]);
    
    // Obtener checklist de entrada
    const checklists = await query(`
      SELECT * FROM Checklist_Entrada WHERE id_servicio = ?
    `, [id]);
    
    // Obtener datos del cliente (si existe)
    const clientesVehiculos = await query(`
      SELECT 
        cv.id_cliente,
        c.nombre AS nombre_cliente,
        c.telefono,
        c.email,
        cv.marca,
        cv.modelo,
        cv.color
      FROM Clientes_Vehiculos cv
      JOIN Clientes c ON cv.id_cliente = c.id
      WHERE cv.placa = ?
    `, [servicio.placa]);
    
    // Construir respuesta completa
    const servicioCompleto = {
      ...servicio,
      insumos,
      checklist: checklists.length > 0 ? checklists[0] : null,
      cliente: clientesVehiculos.length > 0 ? {
        id: clientesVehiculos[0].id_cliente,
        nombre: clientesVehiculos[0].nombre_cliente,
        telefono: clientesVehiculos[0].telefono,
        email: clientesVehiculos[0].email
      } : null,
      vehiculo: clientesVehiculos.length > 0 ? {
        placa: servicio.placa,
        marca: clientesVehiculos[0].marca,
        modelo: clientesVehiculos[0].modelo,
        color: clientesVehiculos[0].color
      } : {
        placa: servicio.placa
      }
    };
    
    res.json(servicioCompleto);
  } catch (error) {
    console.error('Error al obtener servicio:', error);
    res.status(500).json({ 
      message: 'Error al obtener servicio', 
      error: error.message 
    });
  }
}

/**
 * Obtener servicios pendientes (RF004)
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getServiciosPendientes(req, res) {
  try {
    const serviciosPendientes = await query(`
      SELECT 
        s.id, 
        s.fecha, 
        s.placa, 
        v.tipo AS tipo_vehiculo,
        v.tamano AS tamano_vehiculo,
        tl.nombre AS tipo_lavado,
        CONCAT(e1.nombre, ' ', e1.apellidos) AS recibido_por,
        CONCAT(e2.nombre, ' ', e2.apellidos) AS lavado_por,
        s.hora_recibe,
        TIMESTAMPDIFF(MINUTE, s.hora_recibe, NOW()) AS minutos_en_espera,
        s.precio,
        s.estado
      FROM Servicio s
      JOIN Vehiculos v ON s.id_tipovehiculo = v.id
      JOIN Tipos_Lavado tl ON s.id_tipolavado = tl.id
      JOIN Empleados e1 ON s.id_emp_recibe = e1.id
      JOIN Empleados e2 ON s.id_emp_lava = e2.id
      WHERE s.hora_entrega IS NULL AND s.estado = 'Recibido'
      ORDER BY s.fecha, s.hora_recibe
    `);
    
    res.json(serviciosPendientes);
  } catch (error) {
    console.error('Error al obtener servicios pendientes:', error);
    res.status(500).json({ 
      message: 'Error al obtener servicios pendientes', 
      error: error.message 
    });
  }
}

/**
 * Buscar servicios por placa (RF005)
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getServiciosPorPlaca(req, res) {
  try {
    const { placa } = req.params;
    
    // Validar que se proporcione una placa
    if (!placa) {
      return res.status(400).json({ message: 'Debe proporcionar una placa' });
    }
    
    // Buscar servicios por placa
    const servicios = await query(`
      SELECT 
        s.id, 
        s.fecha, 
        s.placa, 
        v.tipo AS tipo_vehiculo,
        tl.nombre AS tipo_lavado,
        CONCAT(e1.nombre, ' ', e1.apellidos) AS recibido_por,
        CONCAT(e2.nombre, ' ', e2.apellidos) AS lavado_por,
        s.hora_recibe,
        s.hora_entrega,
        TIMESTAMPDIFF(MINUTE, s.hora_recibe, s.hora_entrega) AS duracion_minutos,
        s.precio,
        s.estado
      FROM Servicio s
      JOIN Vehiculos v ON s.id_tipovehiculo = v.id
      JOIN Tipos_Lavado tl ON s.id_tipolavado = tl.id
      JOIN Empleados e1 ON s.id_emp_recibe = e1.id
      JOIN Empleados e2 ON s.id_emp_lava = e2.id
      WHERE s.placa = ?
      ORDER BY s.fecha DESC, s.hora_recibe DESC
    `, [placa]);
    
    // Buscar datos del cliente y vehículo
    const clientesVehiculos = await query(`
      SELECT 
        cv.id_cliente,
        c.nombre AS nombre_cliente,
        c.telefono,
        c.email,
        cv.marca,
        cv.modelo,
        cv.color
      FROM Clientes_Vehiculos cv
      JOIN Clientes c ON cv.id_cliente = c.id
      WHERE cv.placa = ?
    `, [placa]);
    
    // Construir respuesta
    const respuesta = {
      placa,
      servicios,
      cliente: clientesVehiculos.length > 0 ? {
        id: clientesVehiculos[0].id_cliente,
        nombre: clientesVehiculos[0].nombre_cliente,
        telefono: clientesVehiculos[0].telefono,
        email: clientesVehiculos[0].email
      } : null,
      vehiculo: clientesVehiculos.length > 0 ? {
        marca: clientesVehiculos[0].marca,
        modelo: clientesVehiculos[0].modelo,
        color: clientesVehiculos[0].color
      } : null,
      total_servicios: servicios.length,
      ultimo_servicio: servicios.length > 0 ? servicios[0] : null
    };
    
    res.json(respuesta);
  } catch (error) {
    console.error('Error al buscar servicios por placa:', error);
    res.status(500).json({ 
      message: 'Error al buscar servicios por placa', 
      error: error.message 
    });
  }
}

/**
 * Crear un nuevo servicio (RF001, RF002, RF003)
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function createServicio(req, res) {
  // Usar transacción para asegurar atomicidad de las operaciones
  return transaction(async (connection) => {
    try {
      const {
        fecha,
        id_emp_recibe,
        id_emp_lava,
        id_tipovehiculo,
        id_tipolavado,
        hora_recibe,
        precio,
        placa,
        observaciones,
        cliente,
        checklist,
        insumos
      } = req.body;
      
      // Validar campos requeridos
      if (!fecha || !id_emp_recibe || !id_emp_lava || !id_tipovehiculo || !id_tipolavado || !hora_recibe || !precio || !placa) {
        return res.status(400).json({ message: 'Todos los campos obligatorios son requeridos' });
      }
      
      // 1. Insertar el servicio
      const [resultServicio] = await connection.execute(
        `INSERT INTO Servicio (
          fecha, id_emp_recibe, id_emp_lava, id_tipovehiculo, id_tipolavado, 
          hora_recibe, precio, placa, observaciones, estado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Recibido')`,
        [fecha, id_emp_recibe, id_emp_lava, id_tipovehiculo, id_tipolavado, hora_recibe, precio, placa, observaciones || '']
      );
      
      const idServicio = resultServicio.insertId;
      
      // 2. Registrar el cliente y vehículo si se proporciona info
      if (cliente) {
        // Verificar si el cliente ya existe
        const [existingClientes] = await connection.execute(
          `SELECT id FROM Clientes WHERE nombre = ? AND telefono = ?`,
          [cliente.nombre, cliente.telefono]
        );
        
        let idCliente;
        
        if (existingClientes.length > 0) {
          // Usar cliente existente
          idCliente = existingClientes[0].id;
        } else {
          // Crear nuevo cliente
          const [resultCliente] = await connection.execute(
            `INSERT INTO Clientes (nombre, telefono, email) VALUES (?, ?, ?)`,
            [cliente.nombre, cliente.telefono, cliente.email || null]
          );
          
          idCliente = resultCliente.insertId;
        }
        
        // Verificar si ya existe el vehículo para este cliente
        const [existingVehiculos] = await connection.execute(
          `SELECT id FROM Clientes_Vehiculos WHERE id_cliente = ? AND placa = ?`,
          [idCliente, placa]
        );
        
        if (existingVehiculos.length === 0) {
          // Registrar vehículo para el cliente
          await connection.execute(
            `INSERT INTO Clientes_Vehiculos (id_cliente, placa, marca, modelo, color) 
             VALUES (?, ?, ?, ?, ?)`,
            [idCliente, placa, cliente.marca || null, cliente.modelo || null, cliente.color || null]
          );
        }
      }
      
      // 3. Registrar checklist de entrada si se proporciona
      if (checklist) {
        await connection.execute(
          `INSERT INTO Checklist_Entrada (
            id_servicio, rayaduras, abolladuras, objetos_valor, 
            nivel_combustible, kilometraje, otros_detalles
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            idServicio, 
            checklist.rayaduras ? 1 : 0, 
            checklist.abolladuras ? 1 : 0, 
            checklist.objetos_valor || '', 
            checklist.nivel_combustible || '', 
            checklist.kilometraje || 0, 
            checklist.otros_detalles || ''
          ]
        );
      }
      
      // 4. Registrar insumos utilizados en el servicio
      if (insumos && insumos.length > 0) {
        for (const insumo of insumos) {
          // Registrar uso de insumo
          await connection.execute(
            `INSERT INTO Insumos_Servicio (id_servicio, id_insumo, cantidad) 
             VALUES (?, ?, ?)`,
            [idServicio, insumo.id_insumo, insumo.cantidad]
          );
          
          // Descontar del inventario
          await connection.execute(
            `UPDATE Inventario SET stock = stock - ? WHERE id_insumo = ?`,
            [insumo.cantidad, insumo.id_insumo]
          );
        }
      }
      
      // 5. Registrar actividad
      await connection.execute(
        `CALL registrar_actividad(?, ?, ?, ?, ?)`,
        [req.headers['x-user'] || 'sistema', 'Crear servicio', 'Servicio', idServicio, JSON.stringify(req.body)]
      );
      
      // Devolver respuesta exitosa
      res.status(201).json({
        message: 'Servicio creado exitosamente',
        id: idServicio,
        placa
      });
    } catch (error) {
      console.error('Error al crear servicio:', error);
      res.status(500).json({ 
        message: 'Error al crear servicio', 
        error: error.message 
      });
      throw error; // Propagar error para activar rollback de la transacción
    }
  });
}

/**
 * Completar un servicio (marcar como entregado)
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function completarServicio(req, res) {
  try {
    const { id } = req.params;
    const { hora_entrega, insumos_adicionales } = req.body;
    
    // Validar que se proporcione la hora de entrega
    if (!hora_entrega) {
      return res.status(400).json({ message: 'Debe proporcionar la hora de entrega' });
    }
    
    // Verificar si el servicio existe
    const servicios = await query('SELECT * FROM Servicio WHERE id = ?', [id]);
    if (servicios.length === 0) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }
    
    // Iniciar transacción
    return transaction(async (connection) => {
      // Actualizar servicio
      await connection.execute(
        `UPDATE Servicio SET hora_entrega = ?, estado = 'Completado' WHERE id = ?`,
        [hora_entrega, id]
      );
      
      // Registrar insumos adicionales si se proporcionan
      if (insumos_adicionales && insumos_adicionales.length > 0) {
        for (const insumo of insumos_adicionales) {
          // Registrar uso de insumo
          await connection.execute(
            `INSERT INTO Insumos_Servicio (id_servicio, id_insumo, cantidad) 
             VALUES (?, ?, ?)`,
            [id, insumo.id_insumo, insumo.cantidad]
          );
          
          // Descontar del inventario
          await connection.execute(
            `UPDATE Inventario SET stock = stock - ? WHERE id_insumo = ?`,
            [insumo.cantidad, insumo.id_insumo]
          );
        }
      }
      
      // Registrar actividad
      await connection.execute(
        `CALL registrar_actividad(?, ?, ?, ?, ?)`,
        [req.headers['x-user'] || 'sistema', 'Completar servicio', 'Servicio', id, JSON.stringify(req.body)]
      );
      
      // Respuesta exitosa
      res.json({
        message: 'Servicio completado exitosamente',
        id
      });
    });
  } catch (error) {
    console.error('Error al completar servicio:', error);
    res.status(500).json({ 
      message: 'Error al completar servicio', 
      error: error.message 
    });
  }
}

/**
 * Cancelar un servicio
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function cancelarServicio(req, res) {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    
    // Verificar si el servicio existe
    const servicios = await query('SELECT * FROM Servicio WHERE id = ?', [id]);
    if (servicios.length === 0) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }
    
    // Si el servicio ya está completado, no se puede cancelar
    if (servicios[0].estado === 'Completado') {
      return res.status(400).json({ message: 'No se puede cancelar un servicio ya completado' });
    }
    
    // Iniciar transacción
    return transaction(async (connection) => {
      // Cancelar servicio
      await connection.execute(
        `UPDATE Servicio SET estado = 'Cancelado', observaciones = CONCAT(observaciones, ' | Motivo de cancelación: ', ?) WHERE id = ?`,
        [motivo || 'No especificado', id]
      );
      
      // Devolver insumos al inventario
      const insumos = await query(`
        SELECT id_insumo, cantidad FROM Insumos_Servicio WHERE id_servicio = ?
      `, [id]);
      
      for (const insumo of insumos) {
        await connection.execute(
          `UPDATE Inventario SET stock = stock + ? WHERE id_insumo = ?`,
          [insumo.cantidad, insumo.id_insumo]
        );
      }
      
      // Registrar actividad
      await connection.execute(
        `CALL registrar_actividad(?, ?, ?, ?, ?)`,
        [req.headers['x-user'] || 'sistema', 'Cancelar servicio', 'Servicio', id, JSON.stringify(req.body)]
      );
      
      // Respuesta exitosa
      res.json({
        message: 'Servicio cancelado exitosamente',
        id
      });
    });
  } catch (error) {
    console.error('Error al cancelar servicio:', error);
    res.status(500).json({ 
      message: 'Error al cancelar servicio', 
      error: error.message 
    });
  }
}

/**
 * Obtener tipos de vehículos disponibles
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getTiposVehiculos(req, res) {
  try {
    const tiposVehiculos = await query(`
      SELECT id, tipo, tamano, descripcion 
      FROM Vehiculos 
      WHERE estado = 'Activo'
      ORDER BY tipo, tamano
    `);
    
    res.json(tiposVehiculos);
  } catch (error) {
    console.error('Error al obtener tipos de vehículos:', error);
    res.status(500).json({ 
      message: 'Error al obtener tipos de vehículos', 
      error: error.message 
    });
  }
}

/**
 * Obtener tipos de lavado disponibles
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getTiposLavado(req, res) {
  try {
    const tiposLavado = await query(`
      SELECT id, nombre, costo, descripcion 
      FROM Tipos_Lavado 
      WHERE estado = 'Activo'
      ORDER BY costo
    `);
    
    res.json(tiposLavado);
  } catch (error) {
    console.error('Error al obtener tipos de lavado:', error);
    res.status(500).json({ 
      message: 'Error al obtener tipos de lavado', 
      error: error.message 
    });
  }
}

/**
 * Obtener clientes registrados
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getClientes(req, res) {
  try {
    const clientes = await query(`
      SELECT c.id, c.nombre, c.telefono, c.email, c.fecha_registro,
        COUNT(cv.id) AS total_vehiculos
      FROM Clientes c
      LEFT JOIN Clientes_Vehiculos cv ON c.id = cv.id_cliente
      WHERE c.estado = 'Activo'
      GROUP BY c.id
      ORDER BY c.nombre
    `);
    
    res.json(clientes);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({ 
      message: 'Error al obtener clientes', 
      error: error.message 
    });
  }
}

/**
 * Buscar vehículos registrados por placa
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function buscarVehiculoPorPlaca(req, res) {
  try {
    const { placa } = req.params;
    
    const vehiculosClientes = await query(`
      SELECT 
        cv.placa,
        cv.marca,
        cv.modelo,
        cv.color,
        c.id AS id_cliente,
        c.nombre AS nombre_cliente,
        c.telefono,
        c.email
      FROM Clientes_Vehiculos cv
      JOIN Clientes c ON cv.id_cliente = c.id
      WHERE cv.placa LIKE ?
    `, [`%${placa}%`]);
    
    res.json(vehiculosClientes);
  } catch (error) {
    console.error('Error al buscar vehículo por placa:', error);
    res.status(500).json({ 
      message: 'Error al buscar vehículo', 
      error: error.message 
    });
  }
}

module.exports = {
  getServicios,
  getServicioById,
  getServiciosPendientes,
  getServiciosPorPlaca,
  createServicio,
  completarServicio,
  cancelarServicio,
  getTiposVehiculos,
  getTiposLavado,
  getClientes,
  buscarVehiculoPorPlaca
};