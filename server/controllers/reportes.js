/**
 * Controlador para la generación de reportes
 * 
 * Implementa los requisitos funcionales:
 * - RF006: Cálculo de Tiempo Promedio por Tipo de Lavado
 * - RF007: Reporte de Ingresos Diarios
 * - RF009: Carga de Trabajo por Empleado (parcialmente)
 */

const { query } = require('../config/db');

/**
 * Generar reporte de ingresos diarios (RF007)
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getIngresosDiarios(req, res) {
  try {
    const { inicio, fin } = req.query;
    let fechaInicio = inicio || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    let fechaFin = fin || new Date().toISOString().split('T')[0];
    
    const ingresos = await query(`
      SELECT 
        s.fecha,
        COUNT(s.id) AS total_servicios,
        SUM(s.precio) AS ingresos_totales,
        AVG(s.precio) AS precio_promedio,
        MIN(s.precio) AS precio_minimo,
        MAX(s.precio) AS precio_maximo
      FROM Servicio s
      WHERE s.fecha BETWEEN ? AND ?
        AND s.estado = 'Completado'
      GROUP BY s.fecha
      ORDER BY s.fecha
    `, [fechaInicio, fechaFin]);
    
    // Calcular totales
    const totales = {
      periodo: `${fechaInicio} al ${fechaFin}`,
      total_servicios: ingresos.reduce((sum, day) => sum + day.total_servicios, 0),
      ingresos_totales: ingresos.reduce((sum, day) => sum + day.ingresos_totales, 0),
      precio_promedio: ingresos.length > 0 ? ingresos.reduce((sum, day) => sum + day.precio_promedio, 0) / ingresos.length : 0,
      dias: ingresos.length
    };
    
    res.json({
      ingresos,
      totales
    });
  } catch (error) {
    console.error('Error al generar reporte de ingresos diarios:', error);
    res.status(500).json({ 
      message: 'Error al generar reporte de ingresos diarios', 
      error: error.message 
    });
  }
}

/**
 * Generar reporte de tiempo promedio por tipo de lavado (RF006)
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getTiempoPromedioLavado(req, res) {
  try {
    const { inicio, fin } = req.query;
    let fechaInicio = inicio || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    let fechaFin = fin || new Date().toISOString().split('T')[0];
    
    const tiempos = await query(`
      SELECT 
        tl.id,
        tl.nombre AS tipo_lavado,
        v.tipo AS tipo_vehiculo,
        v.tamano AS tamano_vehiculo,
        COUNT(s.id) AS total_servicios,
        AVG(TIMESTAMPDIFF(MINUTE, s.hora_recibe, s.hora_entrega)) AS tiempo_promedio_minutos,
        MIN(TIMESTAMPDIFF(MINUTE, s.hora_recibe, s.hora_entrega)) AS tiempo_minimo_minutos,
        MAX(TIMESTAMPDIFF(MINUTE, s.hora_recibe, s.hora_entrega)) AS tiempo_maximo_minutos
      FROM Servicio s
      JOIN Tipos_Lavado tl ON s.id_tipolavado = tl.id
      JOIN Vehiculos v ON s.id_tipovehiculo = v.id
      WHERE s.fecha BETWEEN ? AND ?
        AND s.estado = 'Completado'
        AND s.hora_entrega IS NOT NULL
      GROUP BY tl.id, tl.nombre, v.tipo, v.tamano
      ORDER BY tiempo_promedio_minutos
    `, [fechaInicio, fechaFin]);
    
    // Agrupar por tipo de lavado para facilitar visualización
    const tiemposPorTipo = {};
    tiempos.forEach(item => {
      if (!tiemposPorTipo[item.tipo_lavado]) {
        tiemposPorTipo[item.tipo_lavado] = {
          id: item.id,
          tipo_lavado: item.tipo_lavado,
          promedio_general: 0,
          total_servicios: 0,
          por_vehiculo: []
        };
      }
      
      tiemposPorTipo[item.tipo_lavado].por_vehiculo.push({
        tipo_vehiculo: item.tipo_vehiculo,
        tamano_vehiculo: item.tamano_vehiculo,
        tiempo_promedio_minutos: item.tiempo_promedio_minutos,
        tiempo_minimo_minutos: item.tiempo_minimo_minutos,
        tiempo_maximo_minutos: item.tiempo_maximo_minutos,
        total_servicios: item.total_servicios
      });
      
      tiemposPorTipo[item.tipo_lavado].total_servicios += item.total_servicios;
    });
    
    // Calcular promedio general por tipo de lavado
    Object.keys(tiemposPorTipo).forEach(tipo => {
      let sumaTiempos = 0;
      let totalServicios = 0;
      
      tiemposPorTipo[tipo].por_vehiculo.forEach(vehiculo => {
        sumaTiempos += vehiculo.tiempo_promedio_minutos * vehiculo.total_servicios;
        totalServicios += vehiculo.total_servicios;
      });
      
      tiemposPorTipo[tipo].promedio_general = sumaTiempos / totalServicios;
    });
    
    res.json({
      periodo: `${fechaInicio} al ${fechaFin}`,
      tiempos_detallados: tiempos,
      tiempos_por_tipo: Object.values(tiemposPorTipo)
    });
  } catch (error) {
    console.error('Error al generar reporte de tiempo promedio por tipo de lavado:', error);
    res.status(500).json({ 
      message: 'Error al generar reporte', 
      error: error.message 
    });
  }
}

/**
 * Generar reporte de carga de trabajo por empleado (RF009)
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getCargaTrabajoEmpleados(req, res) {
  try {
    const { fecha } = req.query;
    const fechaConsulta = fecha || new Date().toISOString().split('T')[0];
    
    const cargaTrabajo = await query(`
      SELECT 
        e.id,
        CONCAT(e.nombre, ' ', e.apellidos) AS empleado,
        COUNT(s.id) AS total_asignados,
        SUM(CASE WHEN s.hora_entrega IS NULL THEN 1 ELSE 0 END) AS pendientes,
        SUM(CASE WHEN s.hora_entrega IS NOT NULL THEN 1 ELSE 0 END) AS completados,
        AVG(CASE WHEN s.hora_entrega IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, s.hora_recibe, s.hora_entrega) ELSE NULL END) AS tiempo_promedio_minutos
      FROM Empleados e
      LEFT JOIN Servicio s ON e.id = s.id_emp_lava AND s.fecha = ?
      WHERE e.estado = 'Activo'
      GROUP BY e.id, e.nombre, e.apellidos
      ORDER BY total_asignados DESC
    `, [fechaConsulta]);
    
    // Obtener servicios pendientes por empleado
    const pendientesDetalle = [];
    for (const empleado of cargaTrabajo) {
      if (empleado.pendientes > 0) {
        const pendientes = await query(`
          SELECT 
            s.id,
            s.placa,
            s.hora_recibe,
            TIMESTAMPDIFF(MINUTE, s.hora_recibe, NOW()) AS minutos_en_espera,
            tl.nombre AS tipo_lavado,
            v.tipo AS tipo_vehiculo
          FROM Servicio s
          JOIN Tipos_Lavado tl ON s.id_tipolavado = tl.id
          JOIN Vehiculos v ON s.id_tipovehiculo = v.id
          WHERE s.id_emp_lava = ?
            AND s.fecha = ?
            AND s.hora_entrega IS NULL
            AND s.estado = 'Recibido'
          ORDER BY s.hora_recibe
        `, [empleado.id, fechaConsulta]);
        
        pendientesDetalle.push({
          id_empleado: empleado.id,
          empleado: empleado.empleado,
          servicios: pendientes
        });
      }
    }
    
    res.json({
      fecha: fechaConsulta,
      carga_trabajo: cargaTrabajo,
      pendientes_detalle: pendientesDetalle
    });
  } catch (error) {
    console.error('Error al generar reporte de carga de trabajo por empleado:', error);
    res.status(500).json({ 
      message: 'Error al generar reporte', 
      error: error.message 
    });
  }
}

/**
 * Generar reporte de distribución de servicios por día de la semana
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getDistribucionServiciosDias(req, res) {
  try {
    const { inicio, fin } = req.query;
    let fechaInicio = inicio || new Date(new Date().setDate(new Date().getDate() - 90)).toISOString().split('T')[0];
    let fechaFin = fin || new Date().toISOString().split('T')[0];
    
    const distribucion = await query(`
      SELECT 
        DAYNAME(s.fecha) AS dia_semana,
        COUNT(s.id) AS total_servicios,
        SUM(s.precio) AS ingresos_totales,
        AVG(s.precio) AS precio_promedio,
        AVG(CASE WHEN s.hora_entrega IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, s.hora_recibe, s.hora_entrega) ELSE NULL END) AS tiempo_promedio_minutos
      FROM Servicio s
      WHERE s.fecha BETWEEN ? AND ?
      GROUP BY DAYNAME(s.fecha)
      ORDER BY FIELD(
        DAYNAME(s.fecha), 
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
        'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
      )
    `, [fechaInicio, fechaFin]);
    
    // Traducir nombres de días si están en inglés
    const traduccionDias = {
      'Monday': 'Lunes',
      'Tuesday': 'Martes',
      'Wednesday': 'Miércoles',
      'Thursday': 'Jueves',
      'Friday': 'Viernes',
      'Saturday': 'Sábado',
      'Sunday': 'Domingo'
    };
    
    distribucion.forEach(dia => {
      if (traduccionDias[dia.dia_semana]) {
        dia.dia_semana = traduccionDias[dia.dia_semana];
      }
    });
    
    res.json({
      periodo: `${fechaInicio} al ${fechaFin}`,
      distribucion
    });
  } catch (error) {
    console.error('Error al generar reporte de distribución de servicios:', error);
    res.status(500).json({ 
      message: 'Error al generar reporte', 
      error: error.message 
    });
  }
}

/**
 * Generar reporte de eficiencia de empleados
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getEficienciaEmpleados(req, res) {
  try {
    const { inicio, fin } = req.query;
    let fechaInicio = inicio || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    let fechaFin = fin || new Date().toISOString().split('T')[0];
    
    const eficiencia = await query(`
      SELECT 
        e.id,
        CONCAT(e.nombre, ' ', e.apellidos) AS empleado,
        COUNT(s.id) AS total_servicios,
        COUNT(DISTINCT s.fecha) AS dias_trabajados,
        ROUND(AVG(CASE WHEN s.hora_entrega IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, s.hora_recibe, s.hora_entrega) ELSE NULL END), 2) AS tiempo_promedio_minutos,
        SUM(s.precio) AS valor_total_servicios,
        ROUND(SUM(s.precio) / COUNT(s.id), 2) AS valor_promedio_servicio
      FROM Empleados e
      JOIN Servicio s ON e.id = s.id_emp_lava
      WHERE s.fecha BETWEEN ? AND ?
        AND s.estado = 'Completado'
      GROUP BY e.id, e.nombre, e.apellidos
      ORDER BY tiempo_promedio_minutos ASC
    `, [fechaInicio, fechaFin]);
    
    // Obtener datos por tipo de lavado para cada empleado
    for (const emp of eficiencia) {
      const tiposLavado = await query(`
        SELECT 
          tl.nombre AS tipo_lavado,
          COUNT(s.id) AS total_servicios,
          ROUND(AVG(CASE WHEN s.hora_entrega IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, s.hora_recibe, s.hora_entrega) ELSE NULL END), 2) AS tiempo_promedio_minutos
        FROM Servicio s
        JOIN Tipos_Lavado tl ON s.id_tipolavado = tl.id
        WHERE s.id_emp_lava = ?
          AND s.fecha BETWEEN ? AND ?
          AND s.estado = 'Completado'
        GROUP BY tl.nombre
        ORDER BY total_servicios DESC
      `, [emp.id, fechaInicio, fechaFin]);
      
      emp.tipos_lavado = tiposLavado;
    }
    
    res.json({
      periodo: `${fechaInicio} al ${fechaFin}`,
      eficiencia
    });
  } catch (error) {
    console.error('Error al generar reporte de eficiencia de empleados:', error);
    res.status(500).json({ 
      message: 'Error al generar reporte', 
      error: error.message 
    });
  }
}

/**
 * Generar reporte de consumo de insumos
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getConsumoInsumos(req, res) {
  try {
    const { inicio, fin } = req.query;
    let fechaInicio = inicio || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    let fechaFin = fin || new Date().toISOString().split('T')[0];
    
    const consumoInsumos = await query(`
      SELECT 
        i.id,
        i.nombre AS insumo,
        ti.nombre AS tipo_insumo,
        SUM(is_s.cantidad) AS cantidad_total,
        COUNT(DISTINCT s.id) AS total_servicios,
        ROUND(SUM(is_s.cantidad * i.precio), 2) AS costo_total,
        ROUND(SUM(is_s.cantidad) / COUNT(DISTINCT s.id), 2) AS promedio_por_servicio
      FROM Insumos_Servicio is_s
      JOIN Insumos i ON is_s.id_insumo = i.id
      JOIN Tipos_Insumos ti ON i.id_tipo = ti.id
      JOIN Servicio s ON is_s.id_servicio = s.id
      WHERE s.fecha BETWEEN ? AND ?
      GROUP BY i.id, i.nombre, ti.nombre
      ORDER BY cantidad_total DESC
    `, [fechaInicio, fechaFin]);
    
    // Consumo de insumos por tipo de lavado
    const consumoPorTipoLavado = await query(`
      SELECT 
        tl.nombre AS tipo_lavado,
        i.nombre AS insumo,
        SUM(is_s.cantidad) AS cantidad_total,
        COUNT(DISTINCT s.id) AS total_servicios,
        ROUND(SUM(is_s.cantidad) / COUNT(DISTINCT s.id), 2) AS promedio_por_servicio
      FROM Insumos_Servicio is_s
      JOIN Insumos i ON is_s.id_insumo = i.id
      JOIN Servicio s ON is_s.id_servicio = s.id
      JOIN Tipos_Lavado tl ON s.id_tipolavado = tl.id
      WHERE s.fecha BETWEEN ? AND ?
      GROUP BY tl.nombre, i.nombre
      ORDER BY tl.nombre, cantidad_total DESC
    `, [fechaInicio, fechaFin]);
    
    // Agrupar por tipo de lavado
    const porTipoLavado = {};
    consumoPorTipoLavado.forEach(item => {
      if (!porTipoLavado[item.tipo_lavado]) {
        porTipoLavado[item.tipo_lavado] = [];
      }
      porTipoLavado[item.tipo_lavado].push(item);
    });
    
    // Totales
    const totalCosto = consumoInsumos.reduce((sum, item) => sum + item.costo_total, 0);
    const totalServicios = await query(`
      SELECT COUNT(id) AS total FROM Servicio 
      WHERE fecha BETWEEN ? AND ?
    `, [fechaInicio, fechaFin]);
    
    res.json({
      periodo: `${fechaInicio} al ${fechaFin}`,
      consumo_insumos: consumoInsumos,
      por_tipo_lavado: porTipoLavado,
      totales: {
        costo_total: totalCosto,
        total_servicios: totalServicios[0].total,
        costo_promedio_por_servicio: totalServicios[0].total > 0 ? totalCosto / totalServicios[0].total : 0
      }
    });
  } catch (error) {
    console.error('Error al generar reporte de consumo de insumos:', error);
    res.status(500).json({ 
      message: 'Error al generar reporte', 
      error: error.message 
    });
  }
}

/**
 * Generar reporte del dashboard (resumen)
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
async function getDashboard(req, res) {
  try {
    // Servicios pendientes del día
    const pendientes = await query(`
      SELECT COUNT(*) AS total
      FROM Servicio
      WHERE fecha = CURRENT_DATE 
        AND hora_entrega IS NULL 
        AND estado = 'Recibido'
    `);
    
    // Ingresos del día
    const ingresos = await query(`
      SELECT 
        COUNT(*) AS total_servicios,
        SUM(precio) AS ingresos_totales
      FROM Servicio
      WHERE fecha = CURRENT_DATE
    `);
    
    // Insumos con stock bajo
    const insumosStockBajo = await query(`
      SELECT COUNT(*) AS total
      FROM Inventario inv
      JOIN Insumos i ON inv.id_insumo = i.id
      WHERE inv.stock < inv.umbral_minimo
        AND i.estado = 'Activo'
    `);
    
    // Empleados activos hoy
    const empleadosActivos = await query(`
      SELECT COUNT(DISTINCT e.id) AS total
      FROM Empleados e
      JOIN Turnos_Empleados te ON e.id = te.id_empleado
      WHERE te.dia = DAYNAME(CURRENT_DATE)
        AND e.estado = 'Activo'
    `);
    
    // Tiempo promedio de servicio del día
    const tiempoPromedio = await query(`
      SELECT AVG(TIMESTAMPDIFF(MINUTE, hora_recibe, hora_entrega)) AS promedio_minutos
      FROM Servicio
      WHERE fecha = CURRENT_DATE
        AND hora_entrega IS NOT NULL
    `);
    
    // Servicios completados hoy por tipo
    const serviciosPorTipo = await query(`
      SELECT 
        tl.nombre AS tipo_lavado,
        COUNT(*) AS total
      FROM Servicio s
      JOIN Tipos_Lavado tl ON s.id_tipolavado = tl.id
      WHERE s.fecha = CURRENT_DATE
      GROUP BY tl.nombre
      ORDER BY total DESC
    `);
    
    res.json({
      fecha: new Date().toISOString().split('T')[0],
      servicios_pendientes: pendientes[0].total,
      ingresos_dia: {
        total_servicios: ingresos[0].total_servicios,
        ingresos_totales: ingresos[0].ingresos_totales || 0
      },
      insumos_stock_bajo: insumosStockBajo[0].total,
      empleados_activos: empleadosActivos[0].total,
      tiempo_promedio_servicio: tiempoPromedio[0].promedio_minutos || 0,
      servicios_por_tipo: serviciosPorTipo
    });
  } catch (error) {
    console.error('Error al generar reporte del dashboard:', error);
    res.status(500).json({ 
      message: 'Error al generar reporte', 
      error: error.message 
    });
  }
}

module.exports = {
  getIngresosDiarios,
  getTiempoPromedioLavado,
  getCargaTrabajoEmpleados,
  getDistribucionServiciosDias,
  getEficienciaEmpleados,
  getConsumoInsumos,
  getDashboard
};