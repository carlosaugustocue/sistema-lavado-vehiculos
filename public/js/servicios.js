/**
 * Funciones para la gestión de servicios de lavado
 * 
 * Implementa los requisitos funcionales:
 * - RF001: Registro de Vehículos
 * - RF002: Asignación de Servicios
 * - RF003: Registro de Insumos Utilizados
 * - RF004: Listado de Servicios Pendientes
 * - RF005: Historial de Servicios
 */

// Variables globales
let tiposVehiculos = [];
let tiposLavado = [];
let empleados = [];
let insumos = [];
let servicioActual = null;
let insumosSeleccionados = [];

// Cuando el DOM está listo
document.addEventListener('DOMContentLoaded', function() {
    // Determinar qué acción realizar según los parámetros URL
    const action = getUrlParameter('action');
    const id = getUrlParameter('id');
    const filter = getUrlParameter('filter');
    
    // Cargar datos maestros necesarios
    cargarDatosMaestros()
        .then(() => {
            // Configurar formulario si estamos en creación o edición
            if (action === 'new') {
                // Mostrar y configurar formulario de nuevo servicio
                mostrarFormularioNuevoServicio();
            } else if (id) {
                // Cargar y mostrar detalle de un servicio específico
                cargarDetalleServicio(id);
            } else if (filter === 'pendientes') {
                // Mostrar servicios pendientes
                cargarServiciosPendientes();
            } else {
                // Mostrar lista de servicios por defecto
                cargarListaServicios();
            }
        })
        .catch(error => {
            console.error('Error al inicializar la página de servicios:', error);
            showNotification('Error', 'No se pudieron cargar los datos necesarios.', 'error');
        });
    
    // Configurar event listeners para los elementos de la página
    setupEventListeners();
});

/**
 * Configura los event listeners para la página
 */
function setupEventListeners() {
    // Listener para el formulario de nuevo servicio
    const formNuevoServicio = document.getElementById('form-nuevo-servicio');
    if (formNuevoServicio) {
        formNuevoServicio.addEventListener('submit', function(e) {
            e.preventDefault();
            guardarNuevoServicio();
        });
    }
    
    // Listener para el botón de búsqueda por placa
    const btnBuscarPlaca = document.getElementById('btn-buscar-placa');
    if (btnBuscarPlaca) {
        btnBuscarPlaca.addEventListener('click', function() {
            const placa = document.getElementById('placa').value.trim();
            if (placa) {
                buscarVehiculoPorPlaca(placa);
            } else {
                showNotification('Error', 'Ingrese una placa para buscar', 'warning');
            }
        });
    }
    
    // Listener para cambios en el tipo de vehículo (para actualizar precio)
    const selectTipoVehiculo = document.getElementById('tipo-vehiculo');
    const selectTipoLavado = document.getElementById('tipo-lavado');
    
    if (selectTipoVehiculo && selectTipoLavado) {
        selectTipoVehiculo.addEventListener('change', actualizarPrecioServicio);
        selectTipoLavado.addEventListener('change', actualizarPrecioServicio);
    }
    
    // Listener para el botón de completar servicio
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('btn-completar-servicio')) {
            const idServicio = e.target.getAttribute('data-id');
            mostrarModalCompletarServicio(idServicio);
        }
    });
    
    // Listener para el botón de cancelar servicio
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('btn-cancelar-servicio')) {
            const idServicio = e.target.getAttribute('data-id');
            mostrarModalCancelarServicio(idServicio);
        }
    });
    
    // Listener para confirmar completar servicio
    const btnConfirmarCompletar = document.getElementById('btn-confirmar-completar');
    if (btnConfirmarCompletar) {
        btnConfirmarCompletar.addEventListener('click', function() {
            const idServicio = this.getAttribute('data-id');
            completarServicio(idServicio);
        });
    }
    
    // Listener para confirmar cancelar servicio
    const btnConfirmarCancelar = document.getElementById('btn-confirmar-cancelar');
    if (btnConfirmarCancelar) {
        btnConfirmarCancelar.addEventListener('click', function() {
            const idServicio = this.getAttribute('data-id');
            const motivo = document.getElementById('motivo-cancelacion').value;
            cancelarServicio(idServicio, motivo);
        });
    }
    
    // Listener para el botón de agregar insumo al servicio
    const btnAgregarInsumo = document.getElementById('btn-agregar-insumo');
    if (btnAgregarInsumo) {
        btnAgregarInsumo.addEventListener('click', agregarInsumoALista);
    }
    
    // Listener para buscar por placa (en lista de servicios)
    const formBuscarHistorial = document.getElementById('form-buscar-historial');
    if (formBuscarHistorial) {
        formBuscarHistorial.addEventListener('submit', function(e) {
            e.preventDefault();
            const placa = document.getElementById('input-buscar-placa').value.trim();
            if (placa) {
                cargarHistorialServiciosPorPlaca(placa);
            } else {
                showNotification('Error', 'Ingrese una placa para buscar', 'warning');
            }
        });
    }
}

/**
 * Carga los datos maestros necesarios para la página
 */
async function cargarDatosMaestros() {
    try {
        // Cargar tipos de vehículos
        const responseTiposVehiculos = await fetch('/api/servicios/tipos-vehiculos');
        tiposVehiculos = await responseTiposVehiculos.json();
        
        // Cargar tipos de lavado
        const responseTiposLavado = await fetch('/api/servicios/tipos-lavado');
        tiposLavado = await responseTiposLavado.json();
        
        // Cargar empleados disponibles
        const responseEmpleados = await fetch('/api/empleados/disponibles');
        empleados = await responseEmpleados.json();
        
        // Cargar insumos
        const responseInsumos = await fetch('/api/inventario');
        insumos = await responseInsumos.json();
        
        // Llenar selectores con los datos obtenidos
        llenarSelectores();
        
    } catch (error) {
        console.error('Error al cargar datos maestros:', error);
        throw error;
    }
}

/**
 * Llena los selectores con los datos maestros
 */
function llenarSelectores() {
    // Llenar selector de tipos de vehículos
    const selectTipoVehiculo = document.getElementById('tipo-vehiculo');
    if (selectTipoVehiculo) {
        selectTipoVehiculo.innerHTML = '<option value="">Seleccione un tipo de vehículo</option>';
        tiposVehiculos.forEach(tipo => {
            selectTipoVehiculo.innerHTML += `<option value="${tipo.id}">${tipo.tipo} - ${tipo.tamano}</option>`;
        });
    }
    
    // Llenar selector de tipos de lavado
    const selectTipoLavado = document.getElementById('tipo-lavado');
    if (selectTipoLavado) {
        selectTipoLavado.innerHTML = '<option value="">Seleccione un tipo de lavado</option>';
        tiposLavado.forEach(tipo => {
            selectTipoLavado.innerHTML += `<option value="${tipo.id}" data-costo="${tipo.costo}">${tipo.nombre} - ${formatCurrency(tipo.costo)}</option>`;
        });
    }
    
    // Llenar selector de empleados
    const selectEmpleado = document.getElementById('empleado-asignado');
    if (selectEmpleado) {
        selectEmpleado.innerHTML = '<option value="">Seleccione un empleado</option>';
        empleados.forEach(emp => {
            selectEmpleado.innerHTML += `<option value="${emp.id}">${emp.empleado} (${emp.servicios_pendientes} pendientes)</option>`;
        });
    }
    
    // Llenar selector de insumos
    const selectInsumo = document.getElementById('insumo');
    if (selectInsumo) {
        selectInsumo.innerHTML = '<option value="">Seleccione un insumo</option>';
        insumos.forEach(insumo => {
            // Solo mostrar insumos con stock disponible
            if (insumo.stock > 0) {
                selectInsumo.innerHTML += `<option value="${insumo.id}" data-stock="${insumo.stock}">${insumo.nombre} (Stock: ${insumo.stock})</option>`;
            }
        });
    }
}

/**
 * Muestra el formulario para crear un nuevo servicio
 */
function mostrarFormularioNuevoServicio() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    // Obtener la fecha y hora actual
    const now = new Date();
    const fechaActual = now.toISOString().split('T')[0];
    const horaActual = now.toTimeString().slice(0, 5);
    
    // Crear el HTML del formulario
    mainContent.innerHTML = `
        <div class="card">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0"><i class="bi bi-plus-circle"></i> Nuevo Servicio de Lavado</h5>
            </div>
            <div class="card-body">
                <form id="form-nuevo-servicio">
                    <!-- Datos básicos del servicio -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4>Datos del Vehículo</h4>
                            <hr>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="placa" class="form-label">Placa del Vehículo*</label>
                                    <div class="input-group">
                                        <input type="text" class="form-control" id="placa" name="placa" required placeholder="Ej: ABC123">
                                        <button type="button" id="btn-buscar-placa" class="btn btn-outline-primary">
                                            <i class="bi bi-search"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="tipo-vehiculo" class="form-label">Tipo de Vehículo*</label>
                                    <select class="form-select" id="tipo-vehiculo" name="tipo-vehiculo" required>
                                        <option value="">Seleccione...</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="mb-3" id="container-datos-cliente">
                                <div class="alert alert-info">
                                    <i class="bi bi-info-circle"></i> Datos del cliente se cargarán automáticamente si la placa está registrada.
                                </div>
                                <div class="mb-3">
                                    <label for="nombre-cliente" class="form-label">Nombre del Cliente</label>
                                    <input type="text" class="form-control" id="nombre-cliente" name="nombre-cliente" placeholder="Nombre del cliente">
                                </div>
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label for="telefono-cliente" class="form-label">Teléfono</label>
                                        <input type="tel" class="form-control" id="telefono-cliente" name="telefono-cliente" placeholder="Teléfono de contacto">
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label for="email-cliente" class="form-label">Email</label>
                                        <input type="email" class="form-control" id="email-cliente" name="email-cliente" placeholder="Email (opcional)">
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-4 mb-3">
                                        <label for="marca-vehiculo" class="form-label">Marca</label>
                                        <input type="text" class="form-control" id="marca-vehiculo" name="marca-vehiculo" placeholder="Marca">
                                    </div>
                                    <div class="col-md-4 mb-3">
                                        <label for="modelo-vehiculo" class="form-label">Modelo</label>
                                        <input type="text" class="form-control" id="modelo-vehiculo" name="modelo-vehiculo" placeholder="Modelo">
                                    </div>
                                    <div class="col-md-4 mb-3">
                                        <label for="color-vehiculo" class="form-label">Color</label>
                                        <input type="text" class="form-control" id="color-vehiculo" name="color-vehiculo" placeholder="Color">
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-6">
                            <h4>Datos del Servicio</h4>
                            <hr>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="fecha" class="form-label">Fecha*</label>
                                    <input type="date" class="form-control" id="fecha" name="fecha" required value="${fechaActual}">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="hora-recepcion" class="form-label">Hora de Recepción*</label>
                                    <input type="time" class="form-control" id="hora-recepcion" name="hora-recepcion" required value="${horaActual}">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="tipo-lavado" class="form-label">Tipo de Lavado*</label>
                                <select class="form-select" id="tipo-lavado" name="tipo-lavado" required>
                                    <option value="">Seleccione...</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="empleado-asignado" class="form-label">Empleado Asignado*</label>
                                <select class="form-select" id="empleado-asignado" name="empleado-asignado" required>
                                    <option value="">Seleccione...</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="precio" class="form-label">Precio Total*</label>
                                <div class="input-group">
                                    <span class="input-group-text">$</span>
                                    <input type="number" class="form-control" id="precio" name="precio" required min="0" step="1000">
                                </div>
                                <small class="form-text text-muted">El precio se sugiere automáticamente basado en el tipo de vehículo y lavado</small>
                            </div>
                            <div class="mb-3">
                                <label for="observaciones" class="form-label">Observaciones</label>
                                <textarea class="form-control" id="observaciones" name="observaciones" rows="3" placeholder="Observaciones adicionales..."></textarea>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Checklist de entrada -->
                    <div class="row mb-4">
                        <div class="col-12">
                            <h4>Checklist de Entrada del Vehículo</h4>
                            <hr>
                            <div class="row">
                                <div class="col-md-3 mb-3">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="check-rayaduras" name="check-rayaduras">
                                        <label class="form-check-label" for="check-rayaduras">Rayaduras</label>
                                    </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="check-abolladuras" name="check-abolladuras">
                                        <label class="form-check-label" for="check-abolladuras">Abolladuras</label>
                                    </div>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="nivel-combustible" class="form-label">Nivel de Combustible</label>
                                    <select class="form-select" id="nivel-combustible" name="nivel-combustible">
                                        <option value="Vacío">Vacío</option>
                                        <option value="1/4">1/4</option>
                                        <option value="1/2" selected>1/2</option>
                                        <option value="3/4">3/4</option>
                                        <option value="Lleno">Lleno</option>
                                    </select>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="objetos-valor" class="form-label">Objetos de Valor</label>
                                    <input type="text" class="form-control" id="objetos-valor" name="objetos-valor" placeholder="Objetos dejados en el vehículo...">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="kilometraje" class="form-label">Kilometraje</label>
                                    <input type="number" class="form-control" id="kilometraje" name="kilometraje" placeholder="Kilometraje actual">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="otros-detalles" class="form-label">Otros Detalles</label>
                                <textarea class="form-control" id="otros-detalles" name="otros-detalles" rows="2" placeholder="Otros detalles o condiciones del vehículo..."></textarea>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Insumos a utilizar -->
                    <div class="row mb-4">
                        <div class="col-12">
                            <h4>Insumos a Utilizar</h4>
                            <hr>
                            <div class="row">
                                <div class="col-md-5 mb-3">
                                    <label for="insumo" class="form-label">Insumo</label>
                                    <select class="form-select" id="insumo" name="insumo">
                                        <option value="">Seleccione un insumo</option>
                                    </select>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <label for="cantidad-insumo" class="form-label">Cantidad</label>
                                    <input type="number" class="form-control" id="cantidad-insumo" name="cantidad-insumo" min="1" value="1">
                                </div>
                                <div class="col-md-4 mb-3 d-flex align-items-end">
                                    <button type="button" id="btn-agregar-insumo" class="btn btn-success w-100">
                                        <i class="bi bi-plus-circle"></i> Agregar Insumo
                                    </button>
                                </div>
                            </div>
                            
                            <div class="table-responsive">
                                <table class="table table-bordered table-hover" id="tabla-insumos">
                                    <thead class="table-light">
                                        <tr>
                                            <th>Insumo</th>
                                            <th>Cantidad</th>
                                            <th>Precio Unit.</th>
                                            <th>Subtotal</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody id="lista-insumos">
                                        <tr>
                                            <td colspan="5" class="text-center">No hay insumos agregados</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Botones de acción -->
                    <div class="row">
                        <div class="col-12 text-center">
                            <button type="button" class="btn btn-secondary me-2" onclick="window.location.href='/servicios.html'">
                                <i class="bi bi-x-circle"></i> Cancelar
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <i class="bi bi-save"></i> Guardar Servicio
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Reiniciar lista de insumos seleccionados
    insumosSeleccionados = [];
}

/**
 * Actualiza el precio sugerido basado en el tipo de vehículo y lavado
 */
function actualizarPrecioServicio() {
    const selectTipoVehiculo = document.getElementById('tipo-vehiculo');
    const selectTipoLavado = document.getElementById('tipo-lavado');
    const inputPrecio = document.getElementById('precio');
    
    if (selectTipoVehiculo && selectTipoLavado && inputPrecio) {
        const tipoVehiculoId = selectTipoVehiculo.value;
        const tipoLavadoId = selectTipoLavado.value;
        
        // Si ambos están seleccionados
        if (tipoVehiculoId && tipoLavadoId) {
            // Obtener el costo base del tipo de lavado
            const tipoLavadoSeleccionado = tiposLavado.find(t => t.id == tipoLavadoId);
            if (tipoLavadoSeleccionado) {
                // Aplicar costo según el tipo de lavado
                inputPrecio.value = tipoLavadoSeleccionado.costo;
            }
        }
    }
}

/**
 * Busca un vehículo por placa para autocompletar datos
 * @param {string} placa - Placa del vehículo a buscar
 */
async function buscarVehiculoPorPlaca(placa) {
    try {
        const response = await fetch(`/api/servicios/vehiculo/${placa}`);
        const data = await response.json();
        
        if (data.length > 0) {
            const vehiculo = data[0];
            
            // Llenar datos del cliente y vehículo
            document.getElementById('nombre-cliente').value = vehiculo.nombre_cliente || '';
            document.getElementById('telefono-cliente').value = vehiculo.telefono || '';
            document.getElementById('email-cliente').value = vehiculo.email || '';
            document.getElementById('marca-vehiculo').value = vehiculo.marca || '';
            document.getElementById('modelo-vehiculo').value = vehiculo.modelo || '';
            document.getElementById('color-vehiculo').value = vehiculo.color || '';
            
            showNotification('Información', 'Datos del cliente cargados correctamente', 'success');
        } else {
            // Limpiar campos si no se encuentra
            document.getElementById('nombre-cliente').value = '';
            document.getElementById('telefono-cliente').value = '';
            document.getElementById('email-cliente').value = '';
            document.getElementById('marca-vehiculo').value = '';
            document.getElementById('modelo-vehiculo').value = '';
            document.getElementById('color-vehiculo').value = '';
            
            showNotification('Información', 'No se encontraron datos para esta placa. Por favor, ingrese los datos del cliente.', 'info');
        }
    } catch (error) {
        console.error('Error al buscar vehículo:', error);
        showNotification('Error', 'No se pudo buscar información del vehículo', 'error');
    }
}

/**
 * Agrega un insumo a la lista de insumos seleccionados
 */
function agregarInsumoALista() {
    const selectInsumo = document.getElementById('insumo');
    const inputCantidad = document.getElementById('cantidad-insumo');
    
    if (!selectInsumo.value) {
        showNotification('Error', 'Debe seleccionar un insumo', 'warning');
        return;
    }
    
    const cantidad = parseInt(inputCantidad.value);
    if (isNaN(cantidad) || cantidad <= 0) {
        showNotification('Error', 'La cantidad debe ser mayor a 0', 'warning');
        return;
    }
    
    // Obtener datos del insumo seleccionado
    const insumoSeleccionado = insumos.find(i => i.id == selectInsumo.value);
    if (!insumoSeleccionado) {
        showNotification('Error', 'Insumo no encontrado', 'error');
        return;
    }
    
    // Verificar stock disponible
    if (cantidad > insumoSeleccionado.stock) {
        showNotification('Error', `Stock insuficiente. Disponible: ${insumoSeleccionado.stock}`, 'warning');
        return;
    }
    
    // Verificar si ya está en la lista
    const insumoExistente = insumosSeleccionados.find(i => i.id_insumo == insumoSeleccionado.id);
    if (insumoExistente) {
        // Actualizar cantidad si ya existe
        insumoExistente.cantidad += cantidad;
        
        // Verificar que no exceda el stock disponible
        if (insumoExistente.cantidad > insumoSeleccionado.stock) {
            showNotification('Error', `Stock insuficiente. Disponible: ${insumoSeleccionado.stock}`, 'warning');
            insumoExistente.cantidad -= cantidad;
            return;
        }
    } else {
        // Agregar nuevo insumo a la lista
        insumosSeleccionados.push({
            id_insumo: insumoSeleccionado.id,
            nombre: insumoSeleccionado.nombre,
            cantidad: cantidad,
            precio: insumoSeleccionado.precio
        });
    }
    
    // Actualizar la tabla
    actualizarTablaInsumos();
    
    // Limpiar selección
    selectInsumo.value = '';
    inputCantidad.value = '1';
}

/**
 * Actualiza la tabla de insumos seleccionados
 */
function actualizarTablaInsumos() {
    const listaInsumos = document.getElementById('lista-insumos');
    
    if (insumosSeleccionados.length === 0) {
        listaInsumos.innerHTML = '<tr><td colspan="5" class="text-center">No hay insumos agregados</td></tr>';
        return;
    }
    
    listaInsumos.innerHTML = '';
    
    insumosSeleccionados.forEach((insumo, index) => {
        const subtotal = insumo.cantidad * insumo.precio;
        
        listaInsumos.innerHTML += `
            <tr>
                <td>${insumo.nombre}</td>
                <td class="text-center">${insumo.cantidad}</td>
                <td class="text-end">${formatCurrency(insumo.precio)}</td>
                <td class="text-end">${formatCurrency(subtotal)}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-danger" onclick="eliminarInsumo(${index})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

/**
 * Elimina un insumo de la lista
 * @param {number} index - Índice del insumo a eliminar
 */
function eliminarInsumo(index) {
    if (index >= 0 && index < insumosSeleccionados.length) {
        insumosSeleccionados.splice(index, 1);
        actualizarTablaInsumos();
    }
}

/**
 * Guarda un nuevo servicio
 */
async function guardarNuevoServicio() {
    try {
        // Mostrar indicador de carga
        showLoader('main-content');
        
        // Obtener datos del formulario
        const placa = document.getElementById('placa').value;
        const idTipoVehiculo = document.getElementById('tipo-vehiculo').value;
        const idTipoLavado = document.getElementById('tipo-lavado').value;
        const idEmpleadoAsignado = document.getElementById('empleado-asignado').value;
        const fecha = document.getElementById('fecha').value;
        const horaRecepcion = document.getElementById('hora-recepcion').value;
        const precio = document.getElementById('precio').value;
        const observaciones = document.getElementById('observaciones').value;
        
        // Datos del cliente
        const nombreCliente = document.getElementById('nombre-cliente').value;
        const telefonoCliente = document.getElementById('telefono-cliente').value;
        const emailCliente = document.getElementById('email-cliente').value;
        const marcaVehiculo = document.getElementById('marca-vehiculo').value;
        const modeloVehiculo = document.getElementById('modelo-vehiculo').value;
        const colorVehiculo = document.getElementById('color-vehiculo').value;
        
        // Datos del checklist
        const rayaduras = document.getElementById('check-rayaduras').checked;
        const abolladuras = document.getElementById('check-abolladuras').checked;
        const nivelCombustible = document.getElementById('nivel-combustible').value;
        const objetosValor = document.getElementById('objetos-valor').value;
        const kilometraje = document.getElementById('kilometraje').value;
        const otrosDetalles = document.getElementById('otros-detalles').value;
        
        // Validar campos requeridos
        if (!placa || !idTipoVehiculo || !idTipoLavado || !idEmpleadoAsignado || !fecha || !horaRecepcion || !precio) {
            showNotification('Error', 'Todos los campos marcados con * son obligatorios', 'error');
            hideLoader('main-content');
            return;
        }
        
        // Construir objeto de datos para enviar
        const servicioData = {
            fecha: fecha,
            id_emp_recibe: empleados[0].id,  // Por ahora, usamos el primer empleado como recepcionista
            id_emp_lava: idEmpleadoAsignado,
            id_tipovehiculo: idTipoVehiculo,
            id_tipolavado: idTipoLavado,
            hora_recibe: `${fecha}T${horaRecepcion}:00`,
            precio: parseFloat(precio),
            placa: placa.toUpperCase(),
            observaciones: observaciones,
            
            // Incluir datos del cliente solo si se proporcionó un nombre
            cliente: nombreCliente ? {
                nombre: nombreCliente,
                telefono: telefonoCliente,
                email: emailCliente,
                marca: marcaVehiculo,
                modelo: modeloVehiculo,
                color: colorVehiculo
            } : null,
            
            // Datos del checklist
            checklist: {
                rayaduras: rayaduras,
                abolladuras: abolladuras,
                nivel_combustible: nivelCombustible,
                objetos_valor: objetosValor,
                kilometraje: kilometraje ? parseInt(kilometraje) : 0,
                otros_detalles: otrosDetalles
            },
            
            // Insumos seleccionados
            insumos: insumosSeleccionados
        };
        
        // Enviar datos al servidor
        const response = await fetch('/api/servicios', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(servicioData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al crear el servicio');
        }
        
        const data = await response.json();
        
        // Redireccionar con mensaje de éxito
        redirectWithNotification(
            '/servicios.html',
            'Servicio Creado',
            `El servicio para el vehículo ${placa.toUpperCase()} ha sido creado exitosamente.`,
            'success'
        );
        
    } catch (error) {
        console.error('Error al guardar servicio:', error);
        showNotification('Error', error.message || 'No se pudo guardar el servicio', 'error');
        hideLoader('main-content');
    }
}

/**
 * Carga la lista de servicios
 */
async function cargarListaServicios() {
    try {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        
        // Mostrar indicador de carga
        showLoader('main-content');
        
        // Crear contenedor de lista
        mainContent.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2>Gestión de Servicios</h2>
                <div>
                    <a href="/servicios.html?action=new" class="btn btn-primary">
                        <i class="bi bi-plus-circle"></i> Nuevo Servicio
                    </a>
                </div>
            </div>
            
            <div class="card mb-4">
                <div class="card-header bg-primary text-white">
                    <div class="d-flex justify-content-between align-items-center">
                        <h5 class="mb-0"><i class="bi bi-search"></i> Buscar por Placa</h5>
                    </div>
                </div>
                <div class="card-body">
                    <form id="form-buscar-historial" class="row g-3">
                        <div class="col-md-8">
                            <input type="text" class="form-control" id="input-buscar-placa" placeholder="Ingrese la placa del vehículo">
                        </div>
                        <div class="col-md-4">
                            <button type="submit" class="btn btn-primary w-100">
                                <i class="bi bi-search"></i> Buscar Historial
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <div class="d-flex justify-content-between align-items-center">
                        <h5 class="mb-0"><i class="bi bi-list-ul"></i> Últimos Servicios</h5>
                        <div>
                            <a href="/servicios.html?filter=pendientes" class="btn btn-sm btn-light">
                                <i class="bi bi-hourglass-split"></i> Ver Pendientes
                            </a>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover table-striped">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Fecha</th>
                                    <th>Placa</th>
                                    <th>Tipo Vehículo</th>
                                    <th>Tipo Lavado</th>
                                    <th>Asignado a</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="tabla-servicios">
                                <tr>
                                    <td colspan="8" class="text-center">Cargando servicios...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        // Cargar datos de servicios
        const response = await fetch('/api/servicios?limite=20');
        const servicios = await response.json();
        
        const tablaServicios = document.getElementById('tabla-servicios');
        if (!tablaServicios) return;
        
        // Limpiar tabla
        tablaServicios.innerHTML = '';
        
        if (servicios.length === 0) {
            tablaServicios.innerHTML = '<tr><td colspan="8" class="text-center">No hay servicios registrados</td></tr>';
            hideLoader('main-content');
            return;
        }
        
        // Llenar tabla con datos
        servicios.forEach(servicio => {
            const badgeClass = getBadgeClassForStatus(servicio.estado);
            
            tablaServicios.innerHTML += `
                <tr>
                    <td>${servicio.id}</td>
                    <td>${formatDate(servicio.fecha)}</td>
                    <td>${servicio.placa}</td>
                    <td>${servicio.tipo_vehiculo}</td>
                    <td>${servicio.tipo_lavado}</td>
                    <td>${servicio.lavado_por}</td>
                    <td><span class="badge ${badgeClass}">${servicio.estado}</span></td>
                    <td>
                        <a href="/servicios.html?id=${servicio.id}" class="btn btn-sm btn-info">
                            <i class="bi bi-eye"></i>
                        </a>
                        ${servicio.estado === 'Recibido' ? `
                            <button class="btn btn-sm btn-success btn-completar-servicio" data-id="${servicio.id}">
                                <i class="bi bi-check-circle"></i>
                            </button>
                            <button class="btn btn-sm btn-danger btn-cancelar-servicio" data-id="${servicio.id}">
                                <i class="bi bi-x-circle"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });
        
        hideLoader('main-content');
        
    } catch (error) {
        console.error('Error al cargar lista de servicios:', error);
        document.getElementById('main-content').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> Error al cargar servicios: ${error.message}
            </div>
        `;
        hideLoader('main-content');
    }
}

/**
 * Carga el historial de servicios por placa
 * @param {string} placa - Placa del vehículo
 */
async function cargarHistorialServiciosPorPlaca(placa) {
    try {
        showLoader('main-content');
        
        const response = await fetch(`/api/servicios/placa/${placa}`);
        const data = await response.json();
        
        const mainContent = document.getElementById('main-content');
        
        // Crear contenido HTML para mostrar el historial
        let html = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2>Historial de Servicios - Placa: ${placa}</h2>
                <div>
                    <button class="btn btn-secondary me-2" onclick="cargarListaServicios()">
                        <i class="bi bi-arrow-left"></i> Volver
                    </button>
                    <a href="/servicios.html?action=new" class="btn btn-primary">
                        <i class="bi bi-plus-circle"></i> Nuevo Servicio
                    </a>
                </div>
            </div>
        `;
        
        // Mostrar información del vehículo y cliente si existe
        if (data.cliente) {
            html += `
                <div class="card mb-4">
                    <div class="card-header bg-info text-white">
                        <h5 class="mb-0"><i class="bi bi-person"></i> Información del Cliente</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <p><strong>Cliente:</strong> ${data.cliente.nombre}</p>
                                <p><strong>Teléfono:</strong> ${data.cliente.telefono || 'No registrado'}</p>
                                <p><strong>Email:</strong> ${data.cliente.email || 'No registrado'}</p>
                            </div>
                            <div class="col-md-6">
                                <p><strong>Vehículo:</strong> ${data.vehiculo.marca || ''} ${data.vehiculo.modelo || ''}</p>
                                <p><strong>Color:</strong> ${data.vehiculo.color || 'No registrado'}</p>
                                <p><strong>Placa:</strong> ${data.placa}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Mostrar historial de servicios
        html += `
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0"><i class="bi bi-clock-history"></i> Historial de Servicios</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Fecha</th>
                                    <th>Tipo Lavado</th>
                                    <th>Empleado</th>
                                    <th>Precio</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
        
        if (data.servicios.length === 0) {
            html += '<tr><td colspan="7" class="text-center">No hay servicios registrados para este vehículo</td></tr>';
        } else {
            data.servicios.forEach(servicio => {
                const badgeClass = getBadgeClassForStatus(servicio.estado);
                
                html += `
                    <tr>
                        <td>${servicio.id}</td>
                        <td>${formatDate(servicio.fecha)}</td>
                        <td>${servicio.tipo_lavado}</td>
                        <td>${servicio.lavado_por}</td>
                        <td>${formatCurrency(servicio.precio)}</td>
                        <td><span class="badge ${badgeClass}">${servicio.estado}</span></td>
                        <td>
                            <a href="/servicios.html?id=${servicio.id}" class="btn btn-sm btn-info">
                                <i class="bi bi-eye"></i>
                            </a>
                            ${servicio.estado === 'Recibido' ? `
                                <button class="btn btn-sm btn-success btn-completar-servicio" data-id="${servicio.id}">
                                    <i class="bi bi-check-circle"></i>
                                </button>
                                <button class="btn btn-sm btn-danger btn-cancelar-servicio" data-id="${servicio.id}">
                                    <i class="bi bi-x-circle"></i>
                                </button>
                            ` : ''}
                        </td>
                    </tr>
                `;
            });
        }
        
        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>Total de servicios:</strong> ${data.total_servicios}
                        </div>
                        <div>
                            <a href="/servicios.html?action=new" class="btn btn-primary">
                                <i class="bi bi-plus-circle"></i> Nuevo Servicio para esta Placa
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        mainContent.innerHTML = html;
        hideLoader('main-content');
        
    } catch (error) {
        console.error('Error al cargar historial por placa:', error);
        showNotification('Error', 'No se pudo cargar el historial de servicios', 'error');
        hideLoader('main-content');
    }
}

/**
 * Carga los servicios pendientes (RF004)
 */
async function cargarServiciosPendientes() {
    try {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        
        // Mostrar indicador de carga
        showLoader('main-content');
        
        // Crear contenedor de lista
        mainContent.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2>Servicios Pendientes</h2>
                <div>
                    <button class="btn btn-secondary me-2" onclick="cargarListaServicios()">
                        <i class="bi bi-arrow-left"></i> Volver
                    </button>
                    <a href="/servicios.html?action=new" class="btn btn-primary">
                        <i class="bi bi-plus-circle"></i> Nuevo Servicio
                    </a>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header bg-warning text-dark">
                    <div class="d-flex justify-content-between align-items-center">
                        <h5 class="mb-0"><i class="bi bi-hourglass-split"></i> Servicios Pendientes de Entrega</h5>
                        <button class="btn btn-sm btn-dark btn-refresh" data-refresh-target="tabla-pendientes" data-loading-function="cargarServiciosPendientes">
                            <i class="bi bi-arrow-clockwise"></i> Actualizar
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Placa</th>
                                    <th>Tipo Vehículo</th>
                                    <th>Tipo Lavado</th>
                                    <th>Ingreso</th>
                                    <th>Tiempo Espera</th>
                                    <th>Asignado a</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="tabla-pendientes">
                                <tr>
                                    <td colspan="8" class="text-center">Cargando servicios pendientes...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        // Cargar datos de servicios pendientes
        const response = await fetch('/api/servicios/pendientes');
        const servicios = await response.json();
        
        const tablaPendientes = document.getElementById('tabla-pendientes');
        if (!tablaPendientes) return;
        
        // Limpiar tabla
        tablaPendientes.innerHTML = '';
        
        if (servicios.length === 0) {
            tablaPendientes.innerHTML = '<tr><td colspan="8" class="text-center">No hay servicios pendientes</td></tr>';
            hideLoader('main-content');
            return;
        }
        
        // Llenar tabla con datos
        servicios.forEach(servicio => {
            // Calcular tiempo de espera en formato legible
            const minutosEspera = servicio.minutos_en_espera;
            let tiempoEspera = '';
            
            if (minutosEspera < 60) {
                tiempoEspera = `${minutosEspera} min`;
            } else {
                const horas = Math.floor(minutosEspera / 60);
                const minutos = minutosEspera % 60;
                tiempoEspera = `${horas}h ${minutos}min`;
            }
            
            // Determinar clase de alerta según tiempo de espera
            let alertClass = '';
            if (minutosEspera > 120) {
                alertClass = 'text-danger fw-bold';
            } else if (minutosEspera > 60) {
                alertClass = 'text-warning fw-bold';
            }
            
            tablaPendientes.innerHTML += `
                <tr>
                    <td>${servicio.id}</td>
                    <td>${servicio.placa}</td>
                    <td>${servicio.tipo_vehiculo}</td>
                    <td>${servicio.tipo_lavado}</td>
                    <td>${new Date(servicio.hora_recibe).toLocaleTimeString()}</td>
                    <td class="${alertClass}">${tiempoEspera}</td>
                    <td>${servicio.lavado_por}</td>
                    <td>
                        <a href="/servicios.html?id=${servicio.id}" class="btn btn-sm btn-info">
                            <i class="bi bi-eye"></i>
                        </a>
                        <button class="btn btn-sm btn-success btn-completar-servicio" data-id="${servicio.id}">
                            <i class="bi bi-check-circle"></i>
                        </button>
                        <button class="btn btn-sm btn-danger btn-cancelar-servicio" data-id="${servicio.id}">
                            <i class="bi bi-x-circle"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        hideLoader('main-content');
        
    } catch (error) {
        console.error('Error al cargar servicios pendientes:', error);
        document.getElementById('main-content').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> Error al cargar servicios pendientes: ${error.message}
            </div>
        `;
        hideLoader('main-content');
    }
}

/**
 * Carga el detalle de un servicio específico
 * @param {string} id - ID del servicio a cargar
 */
async function cargarDetalleServicio(id) {
    try {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        
        // Mostrar indicador de carga
        showLoader('main-content');
        
        // Cargar datos del servicio
        const response = await fetch(`/api/servicios/${id}`);
        
        if (!response.ok) {
            throw new Error('No se pudo cargar el servicio');
        }
        
        servicioActual = await response.json();
        
        // Formatear fechas para mostrar
        const fechaServicio = formatDate(servicioActual.fecha);
        const horaRecepcion = new Date(servicioActual.hora_recibe).toLocaleTimeString();
        let horaEntrega = 'Pendiente';
        let duracion = 'En proceso';
        
        if (servicioActual.hora_entrega) {
            horaEntrega = new Date(servicioActual.hora_entrega).toLocaleTimeString();
            
            // Calcular duración
            const inicio = new Date(servicioActual.hora_recibe);
            const fin = new Date(servicioActual.hora_entrega);
            const diffMs = fin - inicio;
            const diffMin = Math.round(diffMs / 60000);
            
            if (diffMin < 60) {
                duracion = `${diffMin} minutos`;
            } else {
                const horas = Math.floor(diffMin / 60);
                const minutos = diffMin % 60;
                duracion = `${horas}h ${minutos}min`;
            }
        }
        
        // Determinar clase de badge según estado
        const badgeClass = getBadgeClassForStatus(servicioActual.estado);
        
        // Crear contenido HTML para mostrar el detalle
        let html = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2>Detalle de Servicio #${servicioActual.id}</h2>
                <div>
                    <button class="btn btn-secondary me-2" onclick="cargarListaServicios()">
                        <i class="bi bi-arrow-left"></i> Volver
                    </button>
                    <a href="/servicios.html?action=new" class="btn btn-primary">
                        <i class="bi bi-plus-circle"></i> Nuevo Servicio
                    </a>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-8">
                    <!-- Datos generales del servicio -->
                    <div class="card mb-4">
                        <div class="card-header bg-primary text-white">
                            <h5 class="mb-0"><i class="bi bi-info-circle"></i> Información del Servicio</h5>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <p><strong>Estado:</strong> <span class="badge ${badgeClass}">${servicioActual.estado}</span></p>
                                    <p><strong>Fecha:</strong> ${fechaServicio}</p>
                                    <p><strong>Hora Recepción:</strong> ${horaRecepcion}</p>
                                    <p><strong>Hora Entrega:</strong> ${horaEntrega}</p>
                                    <p><strong>Duración:</strong> ${duracion}</p>
                                </div>
                                <div class="col-md-6">
                                    <p><strong>Tipo de Vehículo:</strong> ${servicioActual.tipo_vehiculo}</p>
                                    <p><strong>Placa:</strong> ${servicioActual.placa}</p>
                                    <p><strong>Tipo de Lavado:</strong> ${servicioActual.tipo_lavado}</p>
                                    <p><strong>Precio:</strong> ${formatCurrency(servicioActual.precio)}</p>
                                    <p><strong>Asignado a:</strong> ${servicioActual.lavado_por}</p>
                                </div>
                            </div>
                            
                            <hr>
                            
                            <div class="row">
                                <div class="col-12">
                                    <p><strong>Observaciones:</strong></p>
                                    <p>${servicioActual.observaciones || 'Sin observaciones'}</p>
                                </div>
                            </div>
                        </div>
                        <div class="card-footer">
                            <div class="d-flex justify-content-end">
                                ${servicioActual.estado === 'Recibido' ? `
                                    <button class="btn btn-success me-2 btn-completar-servicio" data-id="${servicioActual.id}">
                                        <i class="bi bi-check-circle"></i> Marcar como Completado
                                    </button>
                                    <button class="btn btn-danger btn-cancelar-servicio" data-id="${servicioActual.id}">
                                        <i class="bi bi-x-circle"></i> Cancelar Servicio
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Checklist de entrada -->
                    <div class="card mb-4">
                        <div class="card-header bg-info text-white">
                            <h5 class="mb-0"><i class="bi bi-clipboard-check"></i> Checklist de Entrada</h5>
                        </div>
                        <div class="card-body">
                            ${servicioActual.checklist ? `
                                <div class="row">
                                    <div class="col-md-6">
                                        <p>
                                            <strong>Rayaduras:</strong> 
                                            ${servicioActual.checklist.rayaduras ? 
                                                '<span class="badge bg-warning">Sí</span>' : 
                                                '<span class="badge bg-success">No</span>'}
                                        </p>
                                        <p>
                                            <strong>Abolladuras:</strong> 
                                            ${servicioActual.checklist.abolladuras ? 
                                                '<span class="badge bg-warning">Sí</span>' : 
                                                '<span class="badge bg-success">No</span>'}
                                        </p>
                                        <p><strong>Objetos de Valor:</strong> ${servicioActual.checklist.objetos_valor || 'Ninguno'}</p>
                                    </div>
                                    <div class="col-md-6">
                                        <p><strong>Nivel de Combustible:</strong> ${servicioActual.checklist.nivel_combustible || 'No registrado'}</p>
                                        <p><strong>Kilometraje:</strong> ${servicioActual.checklist.kilometraje || 'No registrado'}</p>
                                    </div>
                                </div>
                                ${servicioActual.checklist.otros_detalles ? `
                                    <hr>
                                    <p><strong>Otros Detalles:</strong></p>
                                    <p>${servicioActual.checklist.otros_detalles}</p>
                                ` : ''}
                            ` : `
                                <div class="alert alert-warning mb-0">
                                    <i class="bi bi-exclamation-triangle"></i> No se registró checklist de entrada para este servicio.
                                </div>
                            `}
                        </div>
                    </div>
                </div>
                
                <div class="col-md-4">
                    <!-- Información del cliente y vehículo -->
                    <div class="card mb-4">
                        <div class="card-header bg-success text-white">
                            <h5 class="mb-0"><i class="bi bi-person"></i> Cliente y Vehículo</h5>
                        </div>
                        <div class="card-body">
                        ${servicioActual.cliente ? `
                            <p><strong>Cliente:</strong> ${servicioActual.cliente.nombre}</p>
                            <p><strong>Teléfono:</strong> ${servicioActual.cliente.telefono || 'No registrado'}</p>
                            <p><strong>Email:</strong> ${servicioActual.cliente.email || 'No registrado'}</p>
                            <hr>
                            <p><strong>Vehículo:</strong> ${servicioActual.vehiculo.marca || ''} ${servicioActual.vehiculo.modelo || ''}</p>
                            <p><strong>Color:</strong> ${servicioActual.vehiculo.color || 'No registrado'}</p>
                            <p><strong>Placa:</strong> ${servicioActual.placa}</p>
                            <div class="mt-3">
                                <a href="/servicios.html?filter=placa&placa=${servicioActual.placa}" class="btn btn-outline-primary btn-sm w-100">
                                    <i class="bi bi-clock-history"></i> Ver Historial de Servicios
                                </a>
                            </div>
                        ` : `
                            <div class="alert alert-info mb-3">
                                <i class="bi bi-info-circle"></i> No se encontraron datos registrados del cliente.
                            </div>
                            <p><strong>Placa del Vehículo:</strong> ${servicioActual.placa}</p>
                        `}
                    </div>
                </div>
                
                <!-- Insumos utilizados -->
                <div class="card">
                    <div class="card-header bg-warning text-dark">
                        <h5 class="mb-0"><i class="bi bi-box-seam"></i> Insumos Utilizados</h5>
                    </div>
                    <div class="card-body">
                        ${servicioActual.insumos && servicioActual.insumos.length > 0 ? `
                            <div class="table-responsive">
                                <table class="table table-sm table-hover">
                                    <thead>
                                        <tr>
                                            <th>Insumo</th>
                                            <th class="text-center">Cantidad</th>
                                            <th class="text-end">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${servicioActual.insumos.map(insumo => `
                                            <tr>
                                                <td>${insumo.nombre}</td>
                                                <td class="text-center">${insumo.cantidad}</td>
                                                <td class="text-end">${formatCurrency(insumo.cantidad * insumo.precio)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <th colspan="2" class="text-end">Total Insumos:</th>
                                            <th class="text-end">${formatCurrency(servicioActual.insumos.reduce((total, insumo) => total + (insumo.cantidad * insumo.precio), 0))}</th>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ` : `
                            <div class="alert alert-warning mb-0">
                                <i class="bi bi-exclamation-triangle"></i> No hay insumos registrados para este servicio.
                            </div>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    mainContent.innerHTML = html;
    
    // Ocultar indicador de carga
    hideLoader('main-content');
    
} catch (error) {
    console.error('Error al cargar detalle del servicio:', error);
    document.getElementById('main-content').innerHTML = `
        <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle"></i> Error al cargar el servicio: ${error.message}
            <div class="mt-3">
                <button class="btn btn-secondary" onclick="cargarListaServicios()">
                    <i class="bi bi-arrow-left"></i> Volver a la lista
                </button>
            </div>
        </div>
    `;
    hideLoader('main-content');
}
}

/**
* Muestra el modal para completar un servicio
* @param {string} idServicio - ID del servicio a completar
*/
function mostrarModalCompletarServicio(idServicio) {
// Verificar si ya existe el modal en el DOM
let modalCompletar = document.getElementById('modal-completar-servicio');

if (!modalCompletar) {
    // Crear el modal si no existe
    const modalHTML = `
        <div class="modal fade" id="modal-completar-servicio" tabindex="-1" aria-labelledby="modalCompletarLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title" id="modalCompletarLabel">Completar Servicio</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p>Está a punto de marcar como completado el servicio. ¿Desea continuar?</p>
                        
                        <div class="mb-3">
                            <label for="hora-entrega" class="form-label">Hora de Entrega</label>
                            <input type="time" class="form-control" id="hora-entrega" required>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">¿Desea agregar insumos adicionales?</label>
                            <div class="input-group mb-2">
                                <select class="form-select" id="insumo-adicional">
                                    <option value="">Seleccione un insumo...</option>
                                </select>
                                <input type="number" class="form-control" id="cantidad-adicional" placeholder="Cant." min="1" value="1">
                                <button class="btn btn-outline-secondary" type="button" id="btn-agregar-insumo-adicional">
                                    <i class="bi bi-plus"></i>
                                </button>
                            </div>
                            
                            <div class="table-responsive">
                                <table class="table table-sm table-bordered" id="tabla-insumos-adicionales">
                                    <thead>
                                        <tr>
                                            <th>Insumo</th>
                                            <th>Cantidad</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody id="lista-insumos-adicionales">
                                        <tr>
                                            <td colspan="3" class="text-center">No hay insumos adicionales</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-success" id="btn-confirmar-completar">
                            <i class="bi bi-check-circle"></i> Completar Servicio
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Agregar el modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    modalCompletar = document.getElementById('modal-completar-servicio');
    
    // Configurar event listeners del modal
    const btnAgregarInsumo = document.getElementById('btn-agregar-insumo-adicional');
    if (btnAgregarInsumo) {
        btnAgregarInsumo.addEventListener('click', agregarInsumoAdicional);
    }
}

// Configurar hora actual por defecto
const horaActual = new Date().toTimeString().slice(0, 5);
document.getElementById('hora-entrega').value = horaActual;

// Llenar selector de insumos
const selectInsumo = document.getElementById('insumo-adicional');
selectInsumo.innerHTML = '<option value="">Seleccione un insumo...</option>';
insumos.forEach(insumo => {
    if (insumo.stock > 0) {
        selectInsumo.innerHTML += `<option value="${insumo.id}" data-stock="${insumo.stock}">${insumo.nombre} (Stock: ${insumo.stock})</option>`;
    }
});

// Limpiar lista de insumos adicionales
insumosSeleccionados = [];
document.getElementById('lista-insumos-adicionales').innerHTML = '<tr><td colspan="3" class="text-center">No hay insumos adicionales</td></tr>';

// Establecer ID del servicio en el botón de confirmar
const btnConfirmar = document.getElementById('btn-confirmar-completar');
btnConfirmar.setAttribute('data-id', idServicio);

// Mostrar el modal
const modal = new bootstrap.Modal(modalCompletar);
modal.show();
}

/**
* Agrega un insumo adicional a la lista al completar servicio
*/
function agregarInsumoAdicional() {
const selectInsumo = document.getElementById('insumo-adicional');
const inputCantidad = document.getElementById('cantidad-adicional');

if (!selectInsumo.value) {
    showNotification('Error', 'Debe seleccionar un insumo', 'warning');
    return;
}

const cantidad = parseInt(inputCantidad.value);
if (isNaN(cantidad) || cantidad <= 0) {
    showNotification('Error', 'La cantidad debe ser mayor a 0', 'warning');
    return;
}

// Obtener datos del insumo seleccionado
const insumoSeleccionado = insumos.find(i => i.id == selectInsumo.value);
if (!insumoSeleccionado) {
    showNotification('Error', 'Insumo no encontrado', 'error');
    return;
}

// Verificar stock disponible
if (cantidad > insumoSeleccionado.stock) {
    showNotification('Error', `Stock insuficiente. Disponible: ${insumoSeleccionado.stock}`, 'warning');
    return;
}

// Verificar si ya está en la lista
const insumoExistente = insumosSeleccionados.find(i => i.id_insumo == insumoSeleccionado.id);
if (insumoExistente) {
    // Actualizar cantidad si ya existe
    insumoExistente.cantidad += cantidad;
    
    // Verificar que no exceda el stock disponible
    if (insumoExistente.cantidad > insumoSeleccionado.stock) {
        showNotification('Error', `Stock insuficiente. Disponible: ${insumoSeleccionado.stock}`, 'warning');
        insumoExistente.cantidad -= cantidad;
        return;
    }
} else {
    // Agregar nuevo insumo a la lista
    insumosSeleccionados.push({
        id_insumo: insumoSeleccionado.id,
        nombre: insumoSeleccionado.nombre,
        cantidad: cantidad,
        precio: insumoSeleccionado.precio
    });
}

// Actualizar la tabla
actualizarTablaInsumosAdicionales();

// Limpiar selección
selectInsumo.value = '';
inputCantidad.value = '1';
}

/**
* Actualiza la tabla de insumos adicionales
*/
function actualizarTablaInsumosAdicionales() {
const listaInsumos = document.getElementById('lista-insumos-adicionales');

if (insumosSeleccionados.length === 0) {
    listaInsumos.innerHTML = '<tr><td colspan="3" class="text-center">No hay insumos adicionales</td></tr>';
    return;
}

listaInsumos.innerHTML = '';

insumosSeleccionados.forEach((insumo, index) => {
    listaInsumos.innerHTML += `
        <tr>
            <td>${insumo.nombre}</td>
            <td class="text-center">${insumo.cantidad}</td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-danger" onclick="eliminarInsumoAdicional(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `;
});
}

/**
* Elimina un insumo adicional de la lista
* @param {number} index - Índice del insumo a eliminar
*/
function eliminarInsumoAdicional(index) {
if (index >= 0 && index < insumosSeleccionados.length) {
    insumosSeleccionados.splice(index, 1);
    actualizarTablaInsumosAdicionales();
}
}

/**
* Completa un servicio
* @param {string} idServicio - ID del servicio a completar
*/
async function completarServicio(idServicio) {
try {
    // Mostrar indicador de carga
    const btnConfirmar = document.getElementById('btn-confirmar-completar');
    btnConfirmar.disabled = true;
    btnConfirmar.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Procesando...';
    
    // Obtener hora de entrega
    const horaEntrega = document.getElementById('hora-entrega').value;
    
    if (!horaEntrega) {
        showNotification('Error', 'Debe ingresar la hora de entrega', 'warning');
        btnConfirmar.disabled = false;
        btnConfirmar.innerHTML = '<i class="bi bi-check-circle"></i> Completar Servicio';
        return;
    }
    
    // Construir fecha y hora completa de entrega
    const fechaHoraEntrega = `${new Date().toISOString().split('T')[0]}T${horaEntrega}:00`;
    
    // Enviar datos al servidor
    const response = await fetch(`/api/servicios/${idServicio}/completar`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            hora_entrega: fechaHoraEntrega,
            insumos_adicionales: insumosSeleccionados
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al completar el servicio');
    }
    
    // Cerrar modal
    const modalElement = document.getElementById('modal-completar-servicio');
    const modal = bootstrap.Modal.getInstance(modalElement);
    modal.hide();
    
    // Mostrar notificación de éxito
    showNotification('Éxito', 'Servicio completado correctamente', 'success');
    
    // Recargar la página actual
    const id = getUrlParameter('id');
    const filter = getUrlParameter('filter');
    
    if (id) {
        cargarDetalleServicio(id);
    } else if (filter === 'pendientes') {
        cargarServiciosPendientes();
    } else {
        cargarListaServicios();
    }
    
} catch (error) {
    console.error('Error al completar servicio:', error);
    showNotification('Error', error.message || 'No se pudo completar el servicio', 'error');
    
    // Restablecer botón
    const btnConfirmar = document.getElementById('btn-confirmar-completar');
    btnConfirmar.disabled = false;
    btnConfirmar.innerHTML = '<i class="bi bi-check-circle"></i> Completar Servicio';
}
}

/**
* Muestra el modal para cancelar un servicio
* @param {string} idServicio - ID del servicio a cancelar
*/
function mostrarModalCancelarServicio(idServicio) {
// Verificar si ya existe el modal en el DOM
let modalCancelar = document.getElementById('modal-cancelar-servicio');

if (!modalCancelar) {
    // Crear el modal si no existe
    const modalHTML = `
        <div class="modal fade" id="modal-cancelar-servicio" tabindex="-1" aria-labelledby="modalCancelarLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title" id="modalCancelarLabel">Cancelar Servicio</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-warning">
                            <i class="bi bi-exclamation-triangle"></i> Está a punto de cancelar el servicio. Esta acción no se puede deshacer.
                        </div>
                        
                        <div class="mb-3">
                            <label for="motivo-cancelacion" class="form-label">Motivo de Cancelación</label>
                            <textarea class="form-control" id="motivo-cancelacion" rows="3" placeholder="Ingrese el motivo de la cancelación..."></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" class="btn btn-danger" id="btn-confirmar-cancelar">
                            <i class="bi bi-x-circle"></i> Cancelar Servicio
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Agregar el modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    modalCancelar = document.getElementById('modal-cancelar-servicio');
}

// Limpiar campo de motivo
document.getElementById('motivo-cancelacion').value = '';

// Establecer ID del servicio en el botón de confirmar
const btnConfirmar = document.getElementById('btn-confirmar-cancelar');
btnConfirmar.setAttribute('data-id', idServicio);

// Mostrar el modal
const modal = new bootstrap.Modal(modalCancelar);
modal.show();
}

/**
* Cancela un servicio
* @param {string} idServicio - ID del servicio a cancelar
* @param {string} motivo - Motivo de la cancelación
*/
async function cancelarServicio(idServicio, motivo) {
try {
    // Mostrar indicador de carga
    const btnConfirmar = document.getElementById('btn-confirmar-cancelar');
    btnConfirmar.disabled = true;
    btnConfirmar.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Procesando...';
    
    // Enviar datos al servidor
    const response = await fetch(`/api/servicios/${idServicio}/cancelar`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ motivo })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al cancelar el servicio');
    }
    
    // Cerrar modal
    const modalElement = document.getElementById('modal-cancelar-servicio');
    const modal = bootstrap.Modal.getInstance(modalElement);
    modal.hide();
    
    // Mostrar notificación de éxito
    showNotification('Éxito', 'Servicio cancelado correctamente', 'success');
    
    // Recargar la página actual
    const id = getUrlParameter('id');
    const filter = getUrlParameter('filter');
    
    if (id) {
        cargarDetalleServicio(id);
    } else if (filter === 'pendientes') {
        cargarServiciosPendientes();
    } else {
        cargarListaServicios();
    }
    
} catch (error) {
    console.error('Error al cancelar servicio:', error);
    showNotification('Error', error.message || 'No se pudo cancelar el servicio', 'error');
    
    // Restablecer botón
    const btnConfirmar = document.getElementById('btn-confirmar-cancelar');
    btnConfirmar.disabled = false;
    btnConfirmar.innerHTML = '<i class="bi bi-x-circle"></i> Cancelar Servicio';
}
}