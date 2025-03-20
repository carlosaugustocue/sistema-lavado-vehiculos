/**
 * Archivo JavaScript principal para el Sistema de Gestión de Lavado de Vehículos
 * Contiene funciones comunes utilizadas en todas las páginas
 */

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar componentes de Bootstrap
    initializeBootstrapComponents();
    
    // Cargar datos del dashboard si estamos en la página principal
    if (isHomePage()) {
      loadDashboardData();
    }
    
    // Comprobar el estado de conexión a la API
    checkAPIStatus();
    
    // Agregar listeners para enlaces y botones
    setupEventListeners();
    
    // Mostrar notificaciones pendientes
    processNotifications();
  });
  
  /**
   * Comprueba si estamos en la página principal
   * @returns {boolean} - true si es la página principal (index.html)
   */
  function isHomePage() {
    const path = window.location.pathname;
    return path === '/' || path === '/index.html' || path.endsWith('index.html');
  }
  
  /**
   * Inicializa los componentes de Bootstrap que requieren JavaScript
   */
  function initializeBootstrapComponents() {
    // Inicializar tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    
    // Inicializar popovers
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
    [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
    
    // Inicializar toasts
    const toastElList = document.querySelectorAll('.toast');
    [...toastElList].map(toastEl => new bootstrap.Toast(toastEl));
  }
  
  /**
   * Verifica el estado de la conexión a la API
   */
  async function checkAPIStatus() {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      
      if (data.status !== 'ok') {
        showNotification('Error de conexión', 'No se pudo establecer conexión con la base de datos. Algunas funciones pueden no estar disponibles.', 'error');
      }
    } catch (error) {
      console.error('Error al verificar estado de la API:', error);
      showNotification('Error de conexión', 'No se pudo establecer conexión con el servidor. Por favor, recargue la página.', 'error');
    }
  }
  
  /**
   * Configura los event listeners para la página
   */
  function setupEventListeners() {
    // Listener para los botones de recarga
    const refreshButtons = document.querySelectorAll('.btn-refresh');
    refreshButtons.forEach(button => {
      button.addEventListener('click', function() {
        const targetId = this.getAttribute('data-refresh-target');
        if (targetId) {
          const targetElement = document.getElementById(targetId);
          if (targetElement) {
            const loadingFunction = this.getAttribute('data-loading-function');
            if (loadingFunction && window[loadingFunction]) {
              window[loadingFunction]();
            }
          }
        }
      });
    });
    
    // Listener para enlaces de navegación (marcar el activo)
    const currentUrl = window.location.href;
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    navLinks.forEach(link => {
      if (currentUrl.includes(link.getAttribute('href'))) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
    
    // Si estamos en index.html, marcar "Inicio" como activo
    if (isHomePage()) {
      document.querySelector('.navbar-nav .nav-link[href="/"]')?.classList.add('active');
    }
  }
  
  /**
   * Carga los datos para el dashboard
   */
  async function loadDashboardData() {
    try {
      showLoader('resumen-dashboard');
      
      // Cargar datos del dashboard
      const response = await fetch('/api/reportes/dashboard');
      const data = await response.json();
      
      // Actualizar contadores
      document.getElementById('servicios-pendientes').textContent = data.servicios_pendientes;
      document.getElementById('ventas-hoy').textContent = formatCurrency(data.ingresos_dia.ingresos_totales);
      document.getElementById('insumos-bajos').textContent = data.insumos_stock_bajo;
      document.getElementById('empleados-activos').textContent = data.empleados_activos;
      
      // Cargar últimos servicios
      await loadLatestServices();
      
      // Cargar próximos turnos
      await loadUpcomingShifts();
      
      hideLoader('resumen-dashboard');
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
      hideLoader('resumen-dashboard');
      showNotification('Error', 'No se pudieron cargar los datos del dashboard.', 'error');
    }
  }
  
  /**
   * Carga los últimos servicios para el dashboard
   */
  async function loadLatestServices() {
    try {
      const response = await fetch('/api/servicios?limite=5');
      const data = await response.json();
      
      const tableBody = document.getElementById('ultimos-servicios');
      if (!tableBody) return;
      
      // Limpiar tabla
      tableBody.innerHTML = '';
      
      if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No hay servicios registrados</td></tr>';
        return;
      }
      
      // Agregar filas
      data.forEach(servicio => {
        const badgeClass = getBadgeClassForStatus(servicio.estado);
        tableBody.innerHTML += `
          <tr>
            <td>${servicio.placa}</td>
            <td>${servicio.tipo_lavado}</td>
            <td><span class="badge ${badgeClass}">${servicio.estado}</span></td>
            <td>
              <a href="/servicios.html?id=${servicio.id}" class="btn btn-sm btn-primary">
                <i class="bi bi-eye"></i>
              </a>
            </td>
          </tr>
        `;
      });
    } catch (error) {
      console.error('Error al cargar últimos servicios:', error);
      document.getElementById('ultimos-servicios').innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error al cargar datos</td></tr>';
    }
  }
  
  /**
   * Carga los próximos turnos para el dashboard
   */
  async function loadUpcomingShifts() {
    try {
      // Obtener el día actual
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const currentDay = days[new Date().getDay()];
      
      const response = await fetch('/api/empleados/turnos');
      const data = await response.json();
      
      const tableBody = document.getElementById('proximos-turnos');
      if (!tableBody) return;
      
      // Limpiar tabla
      tableBody.innerHTML = '';
      
      if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" class="text-center">No hay turnos programados</td></tr>';
        return;
      }
      
      // Filtrar turnos para el día actual
      const todayShifts = data.filter(turno => turno.dia === currentDay);
      
      if (todayShifts.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" class="text-center">No hay turnos programados para hoy</td></tr>';
        return;
      }
      
      // Agregar filas
      todayShifts.forEach(turno => {
        tableBody.innerHTML += `
          <tr>
            <td>${turno.empleado}</td>
            <td>${turno.dia}</td>
            <td>${formatTime(turno.hora_inicio)} - ${formatTime(turno.hora_final)}</td>
          </tr>
        `;
      });
    } catch (error) {
      console.error('Error al cargar próximos turnos:', error);
      document.getElementById('proximos-turnos').innerHTML = '<tr><td colspan="3" class="text-center text-danger">Error al cargar datos</td></tr>';
    }
  }
  
  /**
   * Muestra una notificación toast
   * @param {string} title - Título de la notificación
   * @param {string} message - Mensaje a mostrar
   * @param {string} type - Tipo de notificación (success, error, warning, info)
   */
  function showNotification(title, message, type = 'info') {
    // Crear contenedor de toasts si no existe
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    // Crear el toast
    const toastId = 'toast-' + Date.now();
    const bgClass = type === 'error' ? 'bg-danger' : 
                    type === 'success' ? 'bg-success' : 
                    type === 'warning' ? 'bg-warning' : 'bg-info';
    
    const toastHtml = `
      <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="5000">
        <div class="toast-header ${bgClass} text-white">
          <strong class="me-auto">${title}</strong>
          <small>${new Date().toLocaleTimeString()}</small>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
          ${message}
        </div>
      </div>
    `;
    
    // Agregar al contenedor
    toastContainer.innerHTML += toastHtml;
    
    // Inicializar y mostrar
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
    
    // Eliminar después de cerrar
    toastElement.addEventListener('hidden.bs.toast', function() {
      toastElement.remove();
    });
  }
  
  /**
   * Procesa las notificaciones guardadas en sessionStorage
   */
  function processNotifications() {
    const notifications = JSON.parse(sessionStorage.getItem('notifications') || '[]');
    
    if (notifications.length > 0) {
      notifications.forEach(notification => {
        showNotification(notification.title, notification.message, notification.type);
      });
      
      // Limpiar notificaciones
      sessionStorage.removeItem('notifications');
    }
  }
  
  /**
   * Guarda una notificación para ser mostrada en la próxima página
   * @param {string} title - Título de la notificación
   * @param {string} message - Mensaje a mostrar
   * @param {string} type - Tipo de notificación (success, error, warning, info)
   */
  function saveNotification(title, message, type = 'info') {
    const notifications = JSON.parse(sessionStorage.getItem('notifications') || '[]');
    notifications.push({ title, message, type });
    sessionStorage.setItem('notifications', JSON.stringify(notifications));
  }
  
  /**
   * Muestra un loader en un elemento específico
   * @param {string} elementId - ID del elemento donde mostrar el loader
   */
  function showLoader(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.add('position-relative');
      
      // Verificar si ya existe un loader
      if (element.querySelector('.loading-overlay')) {
        return;
      }
      
      const loader = document.createElement('div');
      loader.className = 'loading-overlay';
      loader.innerHTML = '<div class="loading-spinner"></div>';
      
      element.appendChild(loader);
    }
  }
  
  /**
   * Oculta el loader de un elemento específico
   * @param {string} elementId - ID del elemento donde ocultar el loader
   */
  function hideLoader(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      const loader = element.querySelector('.loading-overlay');
      if (loader) {
        loader.remove();
      }
    }
  }
  
  /**
   * Formatea un valor monetario
   * @param {number} value - Valor a formatear
   * @returns {string} - Valor formateado como moneda
   */
  function formatCurrency(value) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value || 0);
  }
  
  /**
   * Formatea una fecha en formato legible
   * @param {string} dateString - Fecha en formato ISO
   * @returns {string} - Fecha formateada
   */
  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  
  /**
   * Formatea una hora en formato legible
   * @param {string} timeString - Hora en formato HH:MM:SS
   * @returns {string} - Hora formateada
   */
  function formatTime(timeString) {
    if (!timeString) return '';
    // Convertir de 24h a 12h
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }
  
  /**
   * Devuelve la clase CSS para un estado de servicio
   * @param {string} status - Estado del servicio
   * @returns {string} - Clase CSS para el badge
   */
  function getBadgeClassForStatus(status) {
    switch (status.toLowerCase()) {
      case 'recibido':
        return 'badge-pending bg-warning';
      case 'completado':
        return 'badge-completed bg-success';
      case 'cancelado':
        return 'badge-cancelled bg-danger';
      case 'en proceso':
        return 'badge-processing bg-info';
      default:
        return 'bg-secondary';
    }
  }
  
  /**
   * Obtiene parámetros de la URL
   * @param {string} param - Nombre del parámetro a obtener
   * @returns {string|null} - Valor del parámetro o null si no existe
   */
  function getUrlParameter(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }
  
  /**
   * Redirige a otra página guardando una notificación
   * @param {string} url - URL de destino
   * @param {string} title - Título de la notificación
   * @param {string} message - Mensaje a mostrar
   * @param {string} type - Tipo de notificación
   */
  function redirectWithNotification(url, title, message, type) {
    saveNotification(title, message, type);
    window.location.href = url;
  }
  
  /**
   * Exportación para tests
   */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      formatCurrency,
      formatDate,
      formatTime,
      getBadgeClassForStatus,
      getUrlParameter
    };
  }