<img width="963" height="373" alt="image" src="https://github.com/user-attachments/assets/be4f412d-6c37-48ad-a4c6-0961dc543570" /># Aplicación de Machine Learning en la Validación de Datos de Clientes en una empresa de Telecomunicaciones

[![Python Version](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Flask Framework](https://img.shields.io/badge/Flask-2.3.3-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Firebase Service](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![JavaScript ES6](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5 Markup](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Glossary/HTML5)
[![CSS3 Styling](https://img.shapes.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)

## 📋 Tabla de Contenidos
- [Descripción](#-descripción)
- [Objetivos del Software](#-objetivos-del-software)
- [Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [Arquitectura del Sistema](#-arquitectura-del-sistema)
- [Funcionalidades Principales](#-funcionalidades-principales)
- [Flujo de Funcionamiento](#-flujo-de-funcionamiento)
- [Módulo de Machine Learning y Calidad de Datos](#-módulo-de-machine-learning-y-calidad-de-datos)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Instalación y Configuración](#-instalación-y-configuración)
- [Documentación de la API](#-documentación-de-la-api)
- [Capturas del Sistema](#-capturas-del-sistema)
- [Contexto de Investigación](#-contexto-de-investigación)
- [Posibles Mejoras Futuras](#-posibles-mejoras-futuras)
- [Licencia](#-licencia)
- [Créditos](#-créditos)

---

## 📝 Descripción

Este sistema consiste en una plataforma web inteligente de gestión de clientes, servicios y facturación para la empresa de telecomunicaciones **Cable Latín**. El núcleo diferenciador del software es su **Módulo de Importación Inteligente de Clientes**, el cual automatiza la carga masiva de clientes a partir de hojas de cálculo Excel. 

El sistema aborda el problema de la **degradación de la calidad de datos** en sistemas de información (como nombres duplicados, distritos con errores tipográficos, inconsistencias en tarifas asociadas a planes y documentos inválidos). Para resolverlo, el backend implementa un pipeline de validación y limpieza que combina reglas estructuradas de negocio con un modelo ligero de procesamiento de lenguaje natural (NLP) basado en similitud de cadenas, garantizando que solo la información limpia y consistente sea almacenada en la base de datos no relacional de **Firebase Firestore**.

Este software ha sido diseñado y desarrollado como parte del desarrollo de una investigación académica universitaria enfocada en la aplicación de algoritmos de coincidencia de patrones para la mejora del gobierno de datos en organizaciones del sector telecomunicaciones.

---

## 🎯 Objetivos del Software

### Objetivo General
Desarrollar un sistema de información web que optimice el proceso de registro e importación masiva de clientes mediante la aplicación de algoritmos de similitud y reglas de consistencia de negocio, reduciendo el error humano y la contaminación de la base de datos.

### Objetivos Funcionales
- **Automatizar la Limpieza Ortográfica**: Corregir de forma autónoma los nombres de los distritos ingresados con errores ortográficos o tipográficos leves en archivos de carga masiva.
- **Deducir e Imputar Datos Faltantes**: Completar automáticamente información de planes o montos utilizando la correlación histórica del tarifario vigente.
- **Identificar Inconsistencias**: Detectar duplicidad en lotes de importación y validar la coherencia lógica de las longitudes de los documentos de identidad según su tipo (DNI o RUC).
- **Proteger la Persistencia de Datos**: Filtrar y descartar registros irrecuperables (sin nombre o identificación válida) antes de impactar la base de datos Firestore.
- **Auditoría Transparente**: Proveer una interfaz visual interactiva que resuma de forma detallada las métricas de calidad del lote procesado (analizados, corregidos, duplicados, descartados, etc.).

---

## 🛠️ Tecnologías Utilizadas

| Componente | Tecnología / Librería | Versión | Descripción / Propósito |
| :--- | :--- | :--- | :--- |
| **Frontend** | HTML5 / CSS3 / JavaScript | ES6 / Vanilla | Interfaz de usuario interactiva y fluida sin frameworks pesados. |
| **Backend** | Flask | 2.3.3 | Microframework de Python para la exposición de la API REST. |
| **Base de Datos** | Firebase Firestore | Cloud | Base de datos NoSQL documental orientada a documentos para persistencia. |
| **Autenticación** | PyJWT / Firebase Auth | 2.8.0 / REST | Emisión de tokens de acceso seguros y login mediante la REST API de Google. |
| **Machine Learning** | Pandas | 2.1.4 | Procesamiento de dataframes y manipulación de archivos estructurados. |
| **Machine Learning** | OpenPyXL | 3.1.2 | Motor de lectura y escritura para archivos binarios de formato Excel (`.xlsx`). |
| **Machine Learning** | Difflib (Standard Library) | N/A | Algoritmo NLP de coincidencia de patrones y cálculo de distancia de texto. |
| **Seguridad / CORS** | Flask-CORS | 4.0.0 | Manejo de políticas de intercambio de recursos de origen cruzado para desarrollo. |

---

## 🏢 Arquitectura del Sistema

El software adopta una arquitectura cliente-servidor desacoplada que se comunica de la siguiente manera:

```
[ Frontend (HTML5/JS/CSS) ]
           │
           ▼  (HTTP REST API + JWT Bearer Token)
     [ API Flask ]
           │
           ├─► [ Middleware de Autenticación / RBAC ]
           │
           ├─► [ Módulo de Machine Learning (cleaner.py) ]
           │
           ▼
 [ Cloud Firestore ]  ◄───► [ Firebase Auth (Identity Toolkit) ]
           │
           ▼
[ Reportes Excel (Pandas / OpenPyXL) ]
```

1. **Frontend**: El navegador carga los archivos estáticos HTML/JS/CSS y se comunica de manera asíncrona mediante `fetch` enviando el token JWT en el encabezado `Authorization: Bearer <token>`.
2. **API Flask**: Enruta las peticiones de los módulos del negocio, verifica privilegios con decoradores RBAC (`@token_required` y `@role_required`) y controla excepciones globales.
3. **Módulo de Machine Learning (Calidad de Datos)**: Intercepta el flujo durante la carga de archivos Excel procesando cada registro mediante funciones predictivas y algoritmos de coincidencia de cadenas (`cleaner.py`).
4. **Cloud Firestore**: Repositorio NoSQL estructurado que almacena colecciones jerárquicas del proyecto (`personal`, `clientes`, `servicios_clientes`, `pagos`).
5. **Reportes**: Generador que lee colecciones de la base de datos y compila archivos Excel estilizados y estructurados multi-pestaña para descarga directa.

---

## ⚡ Funcionalidades Principales

*   **Autenticación y RBAC**: Registro y login de usuarios contra Firebase Auth. Maneja control de accesos basado en roles (`vendedor`, `supervisor`, `administrador`). Incorpora protección contra ataques de fuerza bruta (bloqueo automático de cuenta por 30 segundos tras 3 intentos erróneos).
*   **Gestión de Clientes**: CRUD completo y búsqueda predictiva multi-parámetro de registros de clientes residenciales.
*   **Importación Mediante Excel con ML**: Carga masiva de archivos `.xlsx` y `.xls` que ejecuta un flujo en tiempo real para auditar y sanear registros antes de almacenarlos.
*   **Validación Inteligente**:
    *   **Detección de Duplicados**: Evaluación única en el lote mediante el almacenamiento temporal en sets hash de documentos de identidad para evitar sobreescrituras indeseadas.
    *   **Corrección de Distritos (NLP)**: Ajuste inteligente de escritura de distritos de Lima Metropolitana.
    *   **Imputación Automática**: Autocompletado del nombre del plan de internet contratado a partir del costo mensual declarado y viceversa.
    *   **Detección de Inconsistencias**: Alertas de discrepancias en la longitud de documentos y planes asignados con montos no tarifados.
*   **Dashboard Interactivo**: Visualización gráfica del total de clientes activos, facturación total recaudada (suma dinámica de pagos), distribución de clientes por plan y gráficos de tendencia de ingresos diarios.
*   **Gestión de Facturas / Servicios**: Control de servicios asociados a clientes en estados *Pendiente Pago*, *Activo* o *Suspendido*. Autocalcula fechas límites de pago en el servidor.
*   **Gestión de Pagos**: Asiento de transacciones con métodos de pago configurables (*Efectivo*, *Transferencia*, *Yape*, *Plin*, *Tarjeta*, *Otro*).
*   **Reportes en Servidor**: Exportación en demanda de hojas de cálculo automatizadas con formato corporativo (fuentes legibles, cabeceras estructuradas, auto-ancho de celdas y paneles inmovilizados).

---

## 🔄 Flujo de Funcionamiento

El siguiente es el flujo cronológico del proceso de importación:

```
[Usuario]                 [JS Frontend]             [API Flask / Route]       [Cleaner ML / DB]
    │                           │                           │                         │
    │─── 1. Inicia Sesión ─────►│                           │                         │
    │                           │─── 2. POST /login ───────►│                         │
    │                           │◄── 3. Retorna JWT ────────│                         │
    │                           │                           │                         │
    │─── 4. Sube Archivo Excel ►│                           │                         │
    │                           │─── 5. POST /importar-ml ─►│                         │
    │                           │   (Envia Multipart File)  │─── 6. Iterar filas ────►│
    │                           │                           │                         │
    │                           │                           │   [ Limpieza / ML ]     │
    │                           │                           │   - NLP Distritos       │
    │                           │                           │   - Imputar Planes      │
    │                           │                           │   - Validar DNI/RUC     │
    │                           │                           │   - Contar métricas     │
    │                           │                           │                         │
    │                           │                           │◄── 7. Retorna contadores│
    │                           │◄── 8. JSON con métricas ──│                         │
    │◄── 9. Muestra Alerta Alert│                           │                         │
    │    de Validación Finalizada                           │                         │
```

---

## 🤖 Módulo de Machine Learning y Calidad de Datos

El archivo `backend/app/ml/utils/cleaner.py` concentra las funciones del núcleo inteligente del sistema:

### 1. NLP de Similitud de Cadenas (`SequenceMatcher`)
Para corregir los nombres de distritos alterados por errores tipográficos, se utiliza la librería estándar `difflib`. El sistema cuenta con un catálogo rígido de distritos de Lima Metropolitana autorizados (`DISTRITOS_VALIDOS`):
```python
DISTRITOS_VALIDOS = [
    "Ate", "Lince", "San Isidro", "Miraflores", "Santiago de Surco", 
    "La Molina", "San Borja", "San Miguel", "Jesús María", "Magdalena del Mar"
]
```
Cuando ingresa un distrito sucio (ej: `"Miraflorez"` o `"San Borjaa"`), la función `corregir_distrito` calcula su coeficiente de similitud de texto utilizando el algoritmo de coincidencia de patrones (Gestalt Pattern Matching). Si la coincidencia más cercana tiene una similitud **igual o mayor al 60% (`cutoff=0.6`)**, el nombre es corregido automáticamente y se incrementa el contador de **distritos corregidos** y **errores tipográficos**.

### 2. Imputación Predictiva de Planes
El sistema utiliza el tarifario oficial de Cable Latín estructurado en reglas de correspondencia:
- **Plan Básico Cable**: S/. 50.0
- **Plan Estándar Dúo**: S/. 80.0
- **Plan Premium Ultra**: S/. 120.0

La función `imputar_plan_y_monto` evalúa la información por fila:
- **Caso A (Imputación de Plan)**: Si el nombre del plan está vacío (`NaN`), pero el monto cobrado es numérico, el sistema deduce el plan correspondiente basándose en la proximidad matemática al tarifario oficial (tolerancia de S/. 5.0) y completa el registro.
- **Caso B (Imputación de Monto)**: Si el plan es provisto pero el precio es `0` o vacío, se lee la etiqueta del plan y se auto-asigna la tarifa por defecto que corresponde a ese producto.

### 3. Detección de Inconsistencias Lógicas
El sistema identifica y expone contradicciones lógicas antes de que pasen a Firestore:
- **Monto Incorrecto**: Si un registro tiene declarado tanto un plan como un monto, pero el monto cobrado no concuerda con las tarifas autorizadas (ej: un plan Premium facturado a S/. 50.0), se registra una **inconsistencia lógica**.
- **Tipo de Documento Incompatible**: Si un registro es marcado como `DNI` pero posee 11 dígitos, o es marcado como `RUC` pero posee 8 dígitos, se registra la inconsistencia estructural.

---

## 📁 Estructura del Proyecto

```
Cablelatin1.1/
│
├── backend/                              # Servidor Flask (Python)
│   ├── app/                              # Módulo principal de la aplicación
│   │   ├── config/                       # Parámetros y seguridad compartida
│   │   │   └── security.py               # Configuración de JWT_SECRET
│   │   ├── ml/                           # Módulo de Machine Learning y NLP
│   │   │   └── utils/
│   │   │       └── cleaner.py            # Algoritmos de corrección y limpieza
│   │   ├── models/                       # Dataclasses y modelos de validación
│   │   │   ├── cliente.py
│   │   │   ├── factura.py
│   │   │   ├── pago.py
│   │   │   └── usuario.py
│   │   ├── routes/                       # Endpoints y Controladores REST API
│   │   │   ├── auth.py
│   │   │   ├── clientes.py
│   │   │   ├── facturas.py
│   │   │   ├── pagos.py
│   │   │   ├── reportes.py
│   │   │   └── usuarios.py
│   │   ├── services/                     # Lógica intermedia y middleware
│   │   │   ├── auth_middleware.py        # Decoradores JWT y RBAC
│   │   │   └── firebase_service.py       # Conexión directa a Firestore
│   │   └── __init__.py                   # Inicializador y manejador de Flask
│   │
│   ├── firebase-credentials.json         # Credenciales privadas de Firebase (SDK)
│   ├── requirements.txt                  # Archivo de dependencias del servidor
│   ├── run.py                            # Punto de entrada para el servidor Flask
│   └── crear_admin.py                    # Script de utilidad para inicializar BD
│
├── public/                               # Frontend Estático
│   ├── css/                              # Hojas de estilo Vanilla CSS
│   ├── js/                               # Controladores y peticiones API (Vanilla JS)
│   ├── clientes.html                     # Gestión e importación de clientes
│   ├── facturas.html                     # Visualización y cobro de facturas
│   ├── index.html                        # Punto de entrada / Redireccionador
│   ├── login.html                        # Interfaz de inicio de sesión
│   ├── pagos.html                        # Registro histórico de transacciones
│   ├── reportes.html                     # Panel para descargas de reportes Excel
│   └── tablero.html                      # Panel Dashboard con métricas globales
│
├── firebase.json                         # Configuración para Firebase Hosting
└── README.md                             # Documentación oficial del proyecto
```

---

## ⚙️ Instalación y Configuración

### Requisitos Previos
- **Python 3.10 o superior** instalado en el sistema.
- **Node.js** (opcional, si se desea desplegar/servir localmente mediante firebase-cli).
- Una cuenta en **Firebase** con un proyecto Firestore e Identity Toolkit habilitados.

### 1. Configuración de Variables de Entorno del Backend
Crea un archivo `.env` en la ruta `/backend/` tomando como referencia el archivo `.env.example`:
```ini
FLASK_APP=run.py
FLASK_ENV=development
FLASK_DEBUG=True
JWT_SECRET=tu_clave_secreta_jwt_para_firmar_tokens
PROYECTO_ID=tu-id-de-proyecto-firebase
FIREBASE_WEB_API_KEY=tu_web_api_key_de_firebase_auth
FIREBASE_CREDENTIALS_PATH=firebase-credentials.json
```

### 2. Configuración de Credenciales de Firebase Admin SDK
Descarga la clave privada en formato JSON desde la consola de Firebase (*Configuración del proyecto > Cuentas de servicio > Generar nueva clave privada*) y guárdala con el nombre `firebase-credentials.json` en la ruta `/backend/`.

### 3. Instalación de Dependencias del Servidor
Abre una consola dentro del directorio `/backend/` e instala los paquetes necesarios:
```bash
pip install -r requirements.txt
```

### 4. Inicialización de la Base de Datos
Para generar un usuario administrador inicial en Firestore y Firebase Auth, ejecuta el script utilitario:
```bash
python crear_admin.py
```
*Credenciales de prueba generadas:*
- **Usuario:** `admin`
- **Contraseña:** `admin_password123`
- **Email:** `admin@cablelatin.com`

### 5. Ejecución del Backend (Flask)
Inicia el servidor Flask ejecutando:
```bash
python run.py
```
El servidor web de desarrollo se desplegará en la dirección local: `http://localhost:5000`

### 6. Ejecución del Frontend (Servidor Local)
Puedes visualizar y probar el frontend levantando cualquier servidor estático local sobre la carpeta `/public`. Por ejemplo, utilizando Python en una consola ubicada en `/public/`:
```bash
python -m http.server 8000
```
Luego, accede en tu navegador a: `http://localhost:8000/login.html`

---

## 🌐 Documentación de la API

La API REST del servidor backend expone los siguientes endpoints estructurados por módulos:

### Módulo: Autenticación (`/api/auth`)
| Método | Ruta | Descripción | Rol Requerido |
| :--- | :--- | :--- | :--- |
| `POST` | `/login` | Valida credenciales contra Firebase Auth y emite un JWT. | Público |
| `GET` | `/verificar-token` | Comprueba la firma y vigencia del token Bearer provisto. | Público |
| `POST` | `/registro` | Registra una nueva credencial en Auth y su perfil en Firestore. | Público |

### Módulo: Clientes (`/api/clientes`)
| Método | Ruta | Descripción | Rol Requerido |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Lista los clientes del sistema con opciones de búsqueda. | Vendedor / Supervisor / Admin |
| `GET` | `/<cliente_id>` | Recupera los detalles de un cliente específico. | Vendedor / Supervisor / Admin |
| `POST` | `/` | Registra manualmente un nuevo cliente en Firestore. | Vendedor / Supervisor / Admin |
| `PUT` | `/<cliente_id>` | Actualiza la información de contacto de un cliente. | Vendedor / Supervisor / Admin |
| `DELETE` | `/<cliente_id>` | Cambia el estado del cliente a *Inactivo* (baja lógica). | Supervisor / Admin |
| `POST` | `/importar-ml` | Procesa un archivo Excel, aplica limpieza ML y almacena los registros válidos. | Supervisor / Admin |

### Módulo: Facturas y Servicios (`/api/facturas`)
| Método | Ruta | Descripción | Rol Requerido |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Obtiene los servicios del sistema con datos del cliente asignado. | Vendedor / Supervisor / Admin |
| `PUT` | `/<servicio_id>` | Modifica precios o ciclos de facturación de un servicio. | Vendedor / Supervisor / Admin |
| `PUT` | `/<servicio_id>/pagar` | Marca una factura como pagada y extiende automáticamente su fecha de vencimiento. | Vendedor / Supervisor / Admin |

### Módulo: Pagos (`/api/pagos`)
| Método | Ruta | Descripción | Rol Requerido |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Obtiene el historial de pagos registrados en el sistema. | Supervisor / Admin |
| `POST` | `/procesar` | Registra de forma segura un pago y actualiza el estado del servicio. | Vendedor / Supervisor / Admin |

### Módulo: Reportes (`/api/reportes`)
| Método | Ruta | Descripción | Rol Requerido |
| :--- | :--- | :--- | :--- |
| `GET` | `/dashboard` | Retorna los contadores e ingresos agregados para el Dashboard. | Vendedor / Supervisor / Admin |
| `GET` | `/generar-excel` | Genera y sirve un archivo binario `.xlsx` con reportes consolidados. | Supervisor / Admin |

### Módulo: Usuarios (`/api/usuarios`)
| Método | Ruta | Descripción | Rol Requerido |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Lista todos los usuarios con perfiles de personal técnico. | Admin |
| `GET` | `/<uid>` | Recupera el detalle de un usuario administrativo o vendedor. | Admin |
| `PUT` | `/<uid>` | Modifica los datos de perfil y roles del personal. | Admin |
| `DELETE` | `/<uid>` | Elimina de forma permanente un usuario de Firestore y Firebase Auth. | Admin |

---

## 📸 Capturas del Sistema
*(En esta sección se integrarán posteriormente las capturas de pantalla de la interfaz gráfica en formato de imagen una vez sea desplegada la interfaz final)*
- **Captura 1**: Formulario de Inicio de Sesión y Seguridad contra Fuerza Bruta.
- **Captura 2**: Dashboard Principal con Gráficos Estadísticos de Facturación y Clientes.
- **Captura 3**: Interfaz de Importación de Clientes y Modal de Resultados ML/Calidad de Datos.
- **Captura 4**: Historial de Facturas y Registro de Transacciones por Ventanilla.

---

## 🎓 Contexto de Investigación
Este software y sus algoritmos integrados fueron desarrollados para respaldar la parte práctica y metodológica del trabajo de investigación del curso de vv titulada:
> **"Aplicación de Machine Learning en la Validación de Datos de Clientes de la Empresa Cable Latín"**

El proyecto demuestra empíricamente cómo el uso de algoritmos de procesamiento de texto y reglas automatizadas disminuyen considerablemente el volumen de datos basura persistidos en bases de datos empresariales, mejorando los indicadores clave de calidad de datos corporativa.

---

## 🚀 Posibles Mejoras Futuras
- **Modelo NLP Distribuido**: Integrar embeddings semánticos o modelos de lenguaje pre-entrenados locales para corregir direcciones complejas de manera conceptual en lugar de sintáctica.
- **Notificaciones Automatizadas**: Implementar servicios de mensajería (SMS o Email) para alertar automáticamente a los clientes sobre sus estados de facturación.
- **Pasarela de Pagos**: Integrar un procesador de cobros con tarjetas bancarias (ej. Stripe o Culqi) directamente en el flujo de pagos.

---

## 📄 Licencia
Este proyecto es software de carácter académico y está sujeto a los términos de propiedad intelectual y licencias internas de la institución universitaria de investigación.

---

## 👥 Créditos
Desarrollado en su totalidad por el equipo de investigación para el curso de Sistemas Inteligentes y como evidencia práctica de trabajo de investigacion en Ingeniería de Sistemas e Informática.

---

---

## 🙏 Agradecimientos

Expresamos nuestro sincero agradecimiento al **Ing. Luis Enrique Paraguay Arzapalo**, docente del curso **Sistemas Inteligentes**, por compartir sus conocimientos, orientación y experiencia durante el desarrollo de este proyecto. Sus enseñanzas en el área de Machine Learning, entre otras; que fueron fundamentales para comprender y aplicar técnicas de validación inteligente dentro de un contexto empresarial, contribuyendo significativamente al desarrollo de esta investigación y de la solución implementada.

