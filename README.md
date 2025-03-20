# Sistema de Gestión para Lavado de Vehículos

Sistema de gestión integral para administrar operaciones de un negocio de lavado de vehículos, incluyendo registro de servicios, control de inventario, gestión de empleados y generación de reportes.

## Características

- **Registro de Vehículos:** Captura todos los datos relevantes cuando un cliente llega con su vehículo.
- **Asignación de Servicios:** Asigna automáticamente servicios basados en el tipo de vehículo y selección del cliente.
- **Control de Inventario:** Gestiona insumos de lavado con alertas de stock bajo.
- **Gestión de Empleados:** Administra turnos y carga de trabajo de empleados.
- **Reportes en Tiempo Real:** Genera informes de ingresos, tiempos de atención y eficiencia.
- **Panel de Control:** Dashboard con información actualizada de servicios pendientes y completados.

## Requisitos del Sistema

- Node.js (v18.0.0 o superior)
- MySQL (v8.4 o superior)
- Navegador web compatible con HTML5, CSS3 y ES6

## Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/usuario/sistema-lavado-vehiculos.git
cd sistema-lavado-vehiculos
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar la base de datos:
   - Crear un archivo `.env` en la raíz del proyecto basado en `.env.example`
   - Modificar las credenciales de la base de datos en el archivo `.env`

4. Crear y poblar la base de datos:
```bash
npm run setup-db
```
   O ejecutar manualmente el script SQL:
```bash
mysql -u [usuario] -p < ./scripts/database.sql
```

5. Iniciar la aplicación:
```bash
npm start
```

6. Acceder a la aplicación:
   - Abrir en el navegador: http://localhost:3000

## Estructura del Proyecto

```
sistema-lavado-vehiculos/
├── public/                         # Archivos estáticos del frontend
│   ├── css/                        # Hojas de estilo
│   ├── js/                         # Scripts de JavaScript para el cliente
│   └── img/                        # Imágenes y recursos visuales
├── server/                         # Backend de la aplicación
│   ├── config/                     # Configuración de la aplicación
│   ├── controllers/                # Controladores de la API
│   ├── routes/                     # Rutas de la API
│   └── models/                     # Modelos de datos
├── views/                          # Vistas HTML
├── scripts/                        # Scripts de utilidad (SQL, etc.)
└── app.js                          # Punto de entrada de la aplicación
```

## Uso de la Aplicación

### Pantalla Principal
El Dashboard muestra un resumen de la actividad diaria, incluyendo:
- Servicios pendientes
- Ingresos del día
- Empleados actualmente trabajando
- Insumos con stock bajo

### Gestión de Servicios
Para registrar un nuevo servicio:
1. Haga clic en "Nuevo Servicio" en el Dashboard o navegue a la sección de Servicios
2. Complete el formulario con los datos del vehículo y cliente
3. Seleccione el tipo de lavado y asigne un empleado
4. Complete el checklist de entrada del vehículo
5. Guarde el registro

### Reportes
La sección de Reportes permite generar informes detallados sobre:
- Ingresos diarios
- Tiempo promedio por tipo de lavado
- Carga de trabajo por empleado
- Alertas de stock bajo
- Eficiencia por empleado

## Desarrollo

Para ejecutar la aplicación en modo desarrollo con recarga automática:
```bash
npm run dev
```

### Pruebas
Para ejecutar las pruebas unitarias:
```bash
npm test
```

### Linting
Para verificar el estilo de código:
```bash
npm run lint
```

## Licencia

Este proyecto está licenciado bajo la licencia MIT - ver el archivo LICENSE para más detalles.

## Autor

Desarrollado por Mario Alexander Ruiz Marulanda, PMP.