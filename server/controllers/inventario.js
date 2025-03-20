/**
 * Controlador para la gestión de inventario
 * 
 * Implementa los requisitos funcionales:
 * - RF003: Registro de Insumos Utilizados
 * - RF008: Identificación de Insumos con Stock Bajo
 */

const { query, transaction } = require('../config/db');

/**
 * Obtener todos los insumos en inventario
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getInventario(req, res) {
  try {
    const inventario = await query(`
      SELECT 
        i.id,
        i.nombre,
        i.precio,
        ti.id AS id_tipo,
        ti.nombre AS tipo,
        inv.stock,
        inv.umbral_minimo,
        (i.precio * inv.stock) AS valor_total,
        inv.fecha_actualizacion,
        i.estado,
        CASE WHEN inv.stock < inv.umbral_minimo THEN 1 ELSE 0 END AS es_stock_bajo
      FROM Inventario inv
      JOIN Insumos i ON inv.id_insumo = i.id
      JOIN Tipos_Insumos ti ON i.id_tipo = ti.id
      WHERE i.estado = 'Activo'
      ORDER BY i.nombre
    `);
    
    res.json(inventario);
  } catch (error) {
    console.error('Error al obtener inventario:', error);
    res.status(500).json({ 
      message: 'Error al obtener inventario', 
      error: error.message 
    });
  }
}

/**
 * Obtener un insumo específico por ID
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getInsumoById(req, res) {
  try {
    const { id } = req.params;
    
    const insumos = await query(`
      SELECT 
        i.id,
        i.nombre,
        i.precio,
        ti.id AS id_tipo,
        ti.nombre AS tipo,
        inv.stock,
        inv.umbral_minimo,
        (i.precio * inv.stock) AS valor_total,
        inv.fecha_actualizacion,
        i.estado
      FROM Insumos i
      JOIN Tipos_Insumos ti ON i.id_tipo = ti.id
      JOIN Inventario inv ON i.id = inv.id_insumo
      WHERE i.id = ?
    `, [id]);
    
    if (insumos.length === 0) {
      return res.status(404).json({ message: 'Insumo no encontrado' });
    }
    
    // Obtener historial de uso del insumo
    const historialUso = await query(`
      SELECT 
        is_s.id_servicio,
        s.fecha,
        is_s.cantidad,
        s.placa,
        tl.nombre AS tipo_lavado
      FROM Insumos_Servicio is_s
      JOIN Servicio s ON is_s.id_servicio = s.id
      JOIN Tipos_Lavado tl ON s.id_tipolavado = tl.id
      WHERE is_s.id_insumo = ?
      ORDER BY s.fecha DESC, s.hora_recibe DESC
      LIMIT 10
    `, [id]);
    
    // Construir respuesta completa
    const insumoCompleto = {
      ...insumos[0],
      historial_uso: historialUso,
      total_usos: historialUso.length
    };
    
    res.json(insumoCompleto);
  } catch (error) {
    console.error('Error al obtener insumo:', error);
    res.status(500).json({ 
      message: 'Error al obtener insumo', 
      error: error.message 
    });
  }
}

/**
 * Obtener insumos con stock bajo (RF008)
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getInsumosStockBajo(req, res) {
  try {
    const insumosStockBajo = await query(`
      SELECT 
        i.id,
        i.nombre,
        i.precio,
        ti.nombre AS tipo,
        inv.stock,
        inv.umbral_minimo,
        (inv.umbral_minimo - inv.stock) AS faltante,
        (i.precio * inv.stock) AS valor_actual,
        (i.precio * (inv.umbral_minimo - inv.stock)) AS valor_faltante
      FROM Inventario inv
      JOIN Insumos i ON inv.id_insumo = i.id
      JOIN Tipos_Insumos ti ON i.id_tipo = ti.id
      WHERE inv.stock < inv.umbral_minimo
        AND i.estado = 'Activo'
      ORDER BY (inv.stock / inv.umbral_minimo) ASC
    `);
    
    res.json(insumosStockBajo);
  } catch (error) {
    console.error('Error al obtener insumos con stock bajo:', error);
    res.status(500).json({ 
      message: 'Error al obtener insumos con stock bajo', 
      error: error.message 
    });
  }
}

/**
 * Obtener tipos de insumos
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getTiposInsumos(req, res) {
  try {
    const tiposInsumos = await query(`
      SELECT id, nombre, descripcion
      FROM Tipos_Insumos
      WHERE estado = 'Activo'
      ORDER BY nombre
    `);
    
    res.json(tiposInsumos);
  } catch (error) {
    console.error('Error al obtener tipos de insumos:', error);
    res.status(500).json({ 
      message: 'Error al obtener tipos de insumos', 
      error: error.message 
    });
  }
}

/**
 * Crear un nuevo insumo
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function createInsumo(req, res) {
  try {
    const { nombre, precio, id_tipo, stock, umbral_minimo } = req.body;
    
    // Validar campos requeridos
    if (!nombre || !precio || !id_tipo || stock === undefined) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }
    
    // Validar que el tipo de insumo exista
    const tiposInsumos = await query('SELECT * FROM Tipos_Insumos WHERE id = ?', [id_tipo]);
    if (tiposInsumos.length === 0) {
      return res.status(404).json({ message: 'Tipo de insumo no encontrado' });
    }
    
    // Iniciar transacción
    return transaction(async (connection) => {
      // Crear insumo
      const [resultInsumo] = await connection.execute(
        'INSERT INTO Insumos (nombre, precio, id_tipo) VALUES (?, ?, ?)',
        [nombre, precio, id_tipo]
      );
      
      const insumoId = resultInsumo.insertId;
      
      // Crear registro en inventario
      await connection.execute(
        'INSERT INTO Inventario (id_insumo, stock, umbral_minimo) VALUES (?, ?, ?)',
        [insumoId, stock, umbral_minimo || 10] // Valor por defecto para umbral_minimo
      );
      
      // Registrar actividad
      await connection.execute(
        'CALL registrar_actividad(?, ?, ?, ?, ?)',
        [req.headers['x-user'] || 'sistema', 'Crear insumo', 'Insumos', insumoId, JSON.stringify(req.body)]
      );
      
      // Respuesta exitosa
      res.status(201).json({
        message: 'Insumo creado exitosamente',
        id: insumoId
      });
    });
  } catch (error) {
    console.error('Error al crear insumo:', error);
    res.status(500).json({ 
      message: 'Error al crear insumo', 
      error: error.message 
    });
  }
}

/**
 * Actualizar un insumo existente
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function updateInsumo(req, res) {
  try {
    const { id } = req.params;
    const { nombre, precio, id_tipo, estado, umbral_minimo } = req.body;
    
    // Validar campos requeridos
    if (!nombre || !precio || !id_tipo || !estado) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }
    
    // Verificar que el insumo exista
    const insumos = await query('SELECT * FROM Insumos WHERE id = ?', [id]);
    if (insumos.length === 0) {
      return res.status(404).json({ message: 'Insumo no encontrado' });
    }
    
    // Iniciar transacción
    return transaction(async (connection) => {
      // Actualizar insumo
      await connection.execute(
        'UPDATE Insumos SET nombre = ?, precio = ?, id_tipo = ?, estado = ? WHERE id = ?',
        [nombre, precio, id_tipo, estado, id]
      );
      
      // Actualizar umbral mínimo si se proporciona
      if (umbral_minimo !== undefined) {
        await connection.execute(
          'UPDATE Inventario SET umbral_minimo = ? WHERE id_insumo = ?',
          [umbral_minimo, id]
        );
      }
      
      // Registrar actividad
      await connection.execute(
        'CALL registrar_actividad(?, ?, ?, ?, ?)',
        [req.headers['x-user'] || 'sistema', 'Actualizar insumo', 'Insumos', id, JSON.stringify(req.body)]
      );
      
      // Respuesta exitosa
      res.json({
        message: 'Insumo actualizado exitosamente',
        id
      });
    });
  } catch (error) {
    console.error('Error al actualizar insumo:', error);
    res.status(500).json({ 
      message: 'Error al actualizar insumo', 
      error: error.message 
    });
  }
}

/**
 * Actualizar el stock de un insumo (RF003)
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function updateStock(req, res) {
  try {
    const { id } = req.params;
    const { cantidad, tipo_operacion, justificacion } = req.body;
    
    // Validar campos requeridos
    if (!cantidad || !tipo_operacion) {
      return res.status(400).json({ message: 'La cantidad y el tipo de operación son requeridos' });
    }
    
    // Validar que la operación sea válida
    if (tipo_operacion !== 'agregar' && tipo_operacion !== 'restar') {
      return res.status(400).json({ message: 'El tipo de operación debe ser "agregar" o "restar"' });
    }
    
    // Verificar que el insumo exista
    const insumos = await query('SELECT * FROM Insumos WHERE id = ?', [id]);
    if (insumos.length === 0) {
      return res.status(404).json({ message: 'Insumo no encontrado' });
    }
    
    // Verificar que exista en inventario
    const inventario = await query('SELECT * FROM Inventario WHERE id_insumo = ?', [id]);
    if (inventario.length === 0) {
      return res.status(404).json({ message: 'Insumo no encontrado en inventario' });
    }
    
    // Calcular nuevo stock
    let nuevoStock;
    if (tipo_operacion === 'agregar') {
      nuevoStock = inventario[0].stock + parseInt(cantidad);
    } else {
      nuevoStock = inventario[0].stock - parseInt(cantidad);
      if (nuevoStock < 0) {
        return res.status(400).json({ message: 'No se puede restar más stock del disponible' });
      }
    }
    
    // Iniciar transacción
    return transaction(async (connection) => {
      // Actualizar stock
      await connection.execute(
        'UPDATE Inventario SET stock = ?, fecha_actualizacion = NOW() WHERE id_insumo = ?',
        [nuevoStock, id]
      );
      
      // Registrar actividad
      const detalles = {
        cantidad,
        tipo_operacion,
        justificacion: justificacion || '',
        stock_anterior: inventario[0].stock,
        nuevo_stock: nuevoStock
      };
      
      await connection.execute(
        'CALL registrar_actividad(?, ?, ?, ?, ?)',
        [req.headers['x-user'] || 'sistema', 'Actualizar stock', 'Inventario', id, JSON.stringify(detalles)]
      );
      
      // Respuesta exitosa
      res.json({
        message: 'Stock actualizado exitosamente',
        id,
        nuevo_stock: nuevoStock,
        tipo_operacion,
        es_stock_bajo: nuevoStock < inventario[0].umbral_minimo
      });
    });
  } catch (error) {
    console.error('Error al actualizar stock:', error);
    res.status(500).json({ 
      message: 'Error al actualizar stock', 
      error: error.message 
    });
  }
}

/**
 * Obtener el valor total del inventario
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getValorInventario(req, res) {
  try {
    const valorInventario = await query(`
      SELECT 
        SUM(i.precio * inv.stock) AS valor_total,
        COUNT(DISTINCT i.id) AS total_insumos,
        COUNT(CASE WHEN inv.stock < inv.umbral_minimo THEN 1 END) AS insumos_stock_bajo
      FROM Inventario inv
      JOIN Insumos i ON inv.id_insumo = i.id
      WHERE i.estado = 'Activo'
    `);
    
    res.json(valorInventario[0]);
  } catch (error) {
    console.error('Error al obtener valor del inventario:', error);
    res.status(500).json({ 
      message: 'Error al obtener valor del inventario', 
      error: error.message 
    });
  }
}

/**
 * Obtener el historial de consumo de insumos
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getHistorialConsumo(req, res) {
  try {
    const { dias } = req.query;
    const diasFiltro = parseInt(dias) || 30;
    
    const historial = await query(`
      SELECT 
        i.id,
        i.nombre,
        SUM(is_s.cantidad) AS cantidad_total,
        COUNT(DISTINCT s.id) AS total_servicios,
        MIN(s.fecha) AS fecha_inicio,
        MAX(s.fecha) AS fecha_fin,
        ROUND(SUM(is_s.cantidad * i.precio), 2) AS valor_total
      FROM Insumos_Servicio is_s
      JOIN Insumos i ON is_s.id_insumo = i.id
      JOIN Servicio s ON is_s.id_servicio = s.id
      WHERE s.fecha >= DATE_SUB(CURRENT_DATE, INTERVAL ? DAY)
      GROUP BY i.id, i.nombre
      ORDER BY cantidad_total DESC
    `, [diasFiltro]);
    
    res.json(historial);
  } catch (error) {
    console.error('Error al obtener historial de consumo:', error);
    res.status(500).json({ 
      message: 'Error al obtener historial de consumo', 
      error: error.message 
    });
  }
}

module.exports = {
  getInventario,
  getInsumoById,
  getInsumosStockBajo,
  getTiposInsumos,
  createInsumo,
  updateInsumo,
  updateStock,
  getValorInventario,
  getHistorialConsumo
};