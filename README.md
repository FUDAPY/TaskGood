<div align="center">
  <img src="docs/assets/banner.png" alt="TaskGood Banner" width="700" style="border-radius: 16px; margin-bottom: 20px;" />

  # TaskGood
  ### Sistema Avanzado de Gestión de Tareas PWA
  **Desarrollado por el equipo de ingeniería de ZETTI DIGITAL PY**

  [![Licencia: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
  [![Stack](https://img.shields.io/badge/Stack-NestJS%20%7C%20React%20%7C%20MongoDB-blue.svg)](#arquitectura-del-sistema)
  [![Despliegue](https://img.shields.io/badge/Deploy-Dokploy%20(Single%20Dockerfile)-green.svg)](#despliegue-en-dokploy)
</div>

---

## 1. Visión del Producto y Arquitectura

**TaskGood** es una plataforma empresarial diseñada para la asignación, supervisión y ejecución fluida de flujos de trabajo corporativos. Integra una arquitectura Monorepo optimizada para despliegues contenerizados de alto rendimiento:

- **Backend (NestJS + TypeScript):** Expone APIs REST seguras, gestiona la persistencia en MongoDB mediante Mongoose, orquesta tareas en segundo plano con `@nestjs/schedule` y gestiona WebSockets para notificaciones y emparejamiento de WhatsApp en tiempo real. Asimismo, sirve de manera eficiente los archivos estáticos compilados de la aplicación web en producción.
- **Frontend (React + Vite + Tailwind CSS):** Interfaz interactiva de alta fidelidad optimizada como Progressive Web App (PWA). Cuenta con diseño responsivo, soporte offline con Service Worker y notificaciones Push.
- **Seguridad de Grado Corporativo:** Autenticación JWT con hashing Bcrypt, control de acceso basado en roles (`RolesGuard`) y protocolo estricto de primer inicio de sesión (`FirstLoginGuard`).
- **Canal de Notificaciones WhatsApp:** Integración con `whatsapp-web.js` mediante el protocolo de **Pairing Code** (código de 8 dígitos), eliminando el escaneo de códigos QR y operando en entornos headless de Linux bajo Docker sin interfaz gráfica.

---

## 2. Características Principales

### 2.1. Protocolo First-Login (Seguridad en Primer Acceso)
- La base de datos inicializa mediante seed un superadministrador con credenciales por defecto:
  - **Correo:** `task@prueba.com`
  - **Contraseña:** `741963`
  - **Bandera:** `isFirstLogin: true`
- Un guardián global intercepta todas las peticiones a la API del usuario mientras mantenga dicha bandera activa, bloqueando cualquier acción operativa y forzando la actualización inmediata de correo y contraseña.

### 2.2. Pipeline Efímero del Funcionario (Cero Fatiga Cognitiva)
- **Visión Efímera:** El funcionario únicamente visualiza las tareas programadas exactamente para el día en curso (HOY). Al finalizar la jornada, la vista queda limpia.
- **Zen UI:** Si no existen tareas pendientes, el sistema presenta un mensaje diario de serenidad extraído de una cuidada selección de reflexiones orientadas al enfoque mental y la calma profesional.
- **Justificación Obligatoria e Inmutable:** Para marcar una tarea como *Finalizada* o *Rechazada*, el sistema exige ingresar una justificación detallada que se almacena permanentemente en el historial inmutable de auditoría.
- **Diseño Adaptativo:**
  - *Escritorio (>768px):* Tablero Kanban horizontal con columnas por estado.
  - *Dispositivos Móviles (<768px):* Vista vertical optimizada en tarjetas y pestañas rápidas.

### 2.3. Panel Panorámico del Administrador
- **Historial Completo:** Acceso sin restricciones a todas las tareas pasadas, presentes y futuras.
- **Cuadrícula Mensual:** Vista en calendario mensual en escritorio con navegación fluida y vista complementaria en lista.
- **Filtros Avanzados:** Filtrado multidimensional por rango de fechas, funcionario asignado y estado.
- **Métricas & Ranking:** Estadísticas de rendimiento global y ranking de funcionarios con mayor carga de trabajo asignada.
- **Auditoría de Justificaciones:** Consulta con un clic del motivo exacto registrado por el funcionario al finalizar o rechazar tareas.

### 2.4. WhatsApp Pairing Code & Cron Jobs
- **Vinculación por Código:** El administrador ingresa su número con prefijo internacional y el sistema genera un código alfanumérico de 8 dígitos para vincular la sesión desde la opción *"Vincular con el número de teléfono"* en WhatsApp.
- **Recordatorios Automáticos:** Un Cron Job programado diariamente a las 08:00 AM inspecciona las tareas permanentes de la semana y envía un recordatorio preventivo con 24 horas de antelación al teléfono del funcionario responsable.

---

## 3. Variables de Entorno

Cree un archivo `.env` en la raíz del backend (o configúrelo en el panel de variables de entorno de Dokploy):

```env
# Puerto del Servidor
PORT=3000

# Conexión a Base de Datos MongoDB (Obligatorio)
MONGO_URI=mongodb://catella:080105g@task-back-khnme5:27017/?authSource=admin&directConnection=true

# Clave Secreta para Tokens JWT
JWT_SECRET=zetti_digital_py_taskgood_secure_key_2026

# Ruta del Ejecutable de Chrome en Contenedor (Asignado automáticamente en Dockerfile)
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Claves VAPID para Web Push Notifications (Opcional / Preconfiguradas)
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
VAPID_PRIVATE_KEY=UUxI4O8M3Mv5_sB8u3xH7T0q1hH6yK9P4Y0F6r3fF4Q
VAPID_SUBJECT=mailto:admin@taskgood.app
```

---

## 4. Despliegue en Dokploy

El proyecto está diseñado para desplegarse en Dokploy directamente desde el repositorio Git mediante un único `Dockerfile` multi-stage optimizado, sin necesidad de orquestadores `docker-compose`.

### Pasos en Dokploy:
1. Cree una nueva aplicación en Dokploy y vincule el repositorio:
   ```
   https://github.com/FUDAPY/TaskGood.git
   ```
2. Seleccione el método de construcción **Dockerfile** (ubicado en la raíz `/Dockerfile`).
3. En la sección **Environment**, agregue la variable `MONGO_URI` apuntando a su base de datos MongoDB interna o externa:
   ```env
   MONGO_URI=mongodb://catella:080105g@task-back-khnme5:27017/?authSource=admin&directConnection=true
   ```
4. Configure el puerto del contenedor en **3000**.
5. **(Crítico para persistencia de WhatsApp)** Añada un volumen persistente en Dokploy para resguardar la sesión:
   - **Mount Path:** `/app/data/whatsapp-auth`
   - Esto garantiza que al reiniciar el contenedor, actualizar variables o desplegar nuevas versiones en Dokploy, la sesión de WhatsApp vinculada permanezca activa sin requerir nuevo código de emparejamiento.
6. Haga clic en **Deploy**. Dokploy compilará el frontend en Vite, compilará la API NestJS, configurará el navegador Chromium para WhatsApp y levantará la aplicación lista para producción.

---

## 5. Desarrollo Local

### Requisitos Previos:
- Node.js v20+ o v22+
- npm v10+
- Instancia activa de MongoDB

### Instalación y Compilación:

```bash
# 1. Instalar dependencias
cd backend && npm install
cd ../frontend && npm install
cd ..

# 2. Compilar el proyecto completo (Frontend + Backend)
npm run build

# 3. Ejecutar en desarrollo
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend
npm run dev:frontend

# 4. Ejecutar pruebas unitarias
cd backend && npm test
```

---

## 6. Licencia y Derechos

Este proyecto se distribuye bajo los términos de la Licencia MIT.  
Consulte el archivo [LICENSE](LICENSE) para mayores detalles.

Todos los derechos reservados para **ZETTI DIGITAL PY**.  
Sitio Web: [https://zetti.grupooh.online/](https://zetti.grupooh.online/)  
Autoría: **Giuliano Catella**
