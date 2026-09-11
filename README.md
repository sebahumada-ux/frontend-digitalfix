# DigitalFix - Frontend

Frontend web del proyecto **DigitalFix**, plataforma para la gestión de órdenes de trabajo y servicios técnicos.

La aplicación fue desarrollada con Angular e integra autenticación mediante Microsoft Entra ID utilizando MSAL.

## Integrantes

- Sebastián Ahumada
- Benjamín Gutiérrez

## Tecnologías utilizadas

- Angular 22
- TypeScript
- HTML
- CSS
- Microsoft Authentication Library (MSAL)
- Microsoft Entra ID
- AWS API Gateway
- REST API

## Funcionalidades implementadas

### Autenticación

- Inicio de sesión con Microsoft Entra ID.
- Cierre de sesión.
- Obtención de access token mediante MSAL.
- Envío automático del token JWT hacia AWS API Gateway.

### Autorización por roles

La aplicación utiliza los roles incluidos en el token emitido por Microsoft Entra ID.

Roles implementados:

- Admin
- Supervisor
- Cliente

La navegación y las rutas disponibles cambian según el rol autenticado.

### Dashboard

El Dashboard muestra información general del sistema.

Para Admin y Supervisor:

- Total de órdenes.
- Órdenes activas.
- Órdenes cerradas.
- Órdenes canceladas.
- Servicios activos.
- Estado general de las órdenes.
- Órdenes recientes.

Para Cliente:

- Resumen de órdenes.
- Órdenes recientes.
- Acceso restringido al catálogo técnico.

### Órdenes de trabajo

El módulo de órdenes permite:

- Listar órdenes de trabajo.
- Crear nuevas órdenes.
- Consultar información de cliente, dirección y técnico.
- Visualizar el estado actual.
- Actualizar el estado de una orden según las transiciones permitidas.

Estados utilizados:

```text
CREADA
ASIGNADA
EN_DESPLAZAMIENTO
EN_EJECUCION
CERRADA
CANCELADA
````

Los usuarios Admin y Supervisor pueden modificar estados.

Los usuarios Cliente pueden consultar y crear órdenes, pero no modificar su estado.

### Catálogo técnico

El catálogo permite visualizar los servicios técnicos disponibles.

Información mostrada:

* Nombre.
* Descripción.
* Tarifa.
* Stock.
* Estado.

El acceso al catálogo está permitido únicamente para:

* Admin
* Supervisor

Los usuarios con rol Cliente son redirigidos hacia una ruta autorizada si intentan acceder directamente.

## Arquitectura

Flujo principal de comunicación:

```text
Angular
   |
   v
Microsoft Entra ID
   |
   v
JWT Access Token
   |
   v
AWS API Gateway
   |
   v
JWT Authorizer
   |
   v
VPC Link
   |
   v
Network Load Balancer
   |
   v
BFF Spring Boot
   |
   +-------------------+
   |                   |
   v                   v
Workorders          Catalog
   |                   |
   +---------+---------+
             |
             v
         Oracle Cloud
```

## Seguridad

La aplicación utiliza Microsoft Entra ID para autenticación.

MSAL obtiene un access token que es enviado automáticamente en las solicitudes HTTP:

```text
Authorization: Bearer <access_token>
```

La seguridad se aplica en distintos niveles:

```text
Angular
→ Role Guard
→ AWS API Gateway
→ JWT Authorizer
→ BFF
→ Autorización por roles
```

El control de rutas en Angular mejora la experiencia del usuario, mientras que la autorización real se valida nuevamente en el backend.

## Rutas principales

```text
/dashboard
/workorders
/catalog
```

Permisos:

| Ruta       | Admin | Supervisor | Cliente |
| ---------- | ----- | ---------- | ------- |
| Dashboard  | Sí    | Sí         | Sí      |
| Workorders | Sí    | Sí         | Sí      |
| Catalog    | Sí    | Sí         | No      |

## API utilizada

Las solicitudes del frontend se realizan mediante AWS API Gateway.

Endpoints principales:

```text
/api/bff/workorders
/api/bff/catalog/services
```

Operaciones utilizadas en Workorders:

```text
GET    /api/bff/workorders
POST   /api/bff/workorders
PUT    /api/bff/workorders/{id}/status
```

## Instalación

Clonar el repositorio:

```bash
git clone https://github.com/sebahumada-ux/frontend-digitalfix.git
```

Ingresar al proyecto:

```bash
cd frontend-digitalfix
```

Instalar dependencias:

```bash
npm install
```

## Ejecución local

Ejecutar:

```bash
ng serve
```

Abrir:

```text
http://localhost:4200
```

## Compilación

Para generar el build:

```bash
ng build
```

Los archivos compilados se generan en:

```text
dist/frontend-digitalfix
```

## Flujo de trabajo Git

El proyecto utiliza las siguientes ramas:

```text
main
development
feature/*
```

Flujo utilizado:

```text
feature/*
   ↓
Pull Request
   ↓
development
   ↓
Pull Request de release
   ↓
main
```

Cada funcionalidad fue desarrollada mediante una rama independiente y posteriormente integrada mediante Pull Request.

Entre las funcionalidades desarrolladas mediante este flujo se encuentran:

* Integración con MSAL.
* Vista protegida de órdenes.
* Control de acceso por roles.
* Creación de órdenes.
* Cambio de estado.
* Dashboard por rol.

## Estado del proyecto

Actualmente se encuentran implementados y validados:

* Autenticación con Microsoft Entra ID.
* Autorización por roles.
* Dashboard.
* Gestión de órdenes de trabajo.
* Consulta del catálogo técnico.
* Comunicación con AWS API Gateway.
* Consumo del BFF protegido mediante JWT.
* Compilación exitosa del frontend.
