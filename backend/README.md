# Cable Latín - Backend Python

## Estructura del Backend

```
backend/
├── run.py                 # Punto de entrada de la aplicación
├── requirements.txt       # Dependencias Python
└── app/
    ├── __init__.py        # Factory de Flask
    ├── services/
    │   ├── firebase_service.py      # Conexión y operaciones Firebase
    ├── routes/
    │   ├── auth.py        # Autenticación (login, registro)
    │   ├── clientes.py    # CRUD de clientes
    │   ├── facturas.py    # Gestión de facturas
    │   ├── pagos.py       # Procesamiento de pagos
    │   └── reportes.py    # Reportes y dashboard
```

## Instalación y Configuración

### 1. Instalar dependencias
```bash
cd backend
pip install -r requirements.txt
```

### 2. Configurar Firebase Credentials

#### Opción A: Con archivo de credenciales (Recomendado)
1. Descarga el archivo `serviceAccountKey.json` de Firebase Console:
   - Firebase Console → Proyecto → ⚙️ Configuración del proyecto
   - Pestaña "Cuentas de servicio"
   - "Generar nueva clave privada"

2. Coloca el archivo en la carpeta `backend/` y renómbralo a `firebase-credentials.json`

#### Opción B: Sin archivo (Variables de entorno)
Configura las variables de entorno con tus credenciales de Firebase.

### 3. Ejecutar el servidor
```bash
python run.py
```

El servidor estará disponible en `http://localhost:5000`

## API Endpoints

### Autenticación
- `POST /api/auth/login` - Login de usuario
- `POST /api/auth/registro` - Registrar nuevo usuario
- `GET /api/auth/verificar-session` - Verificar sesión activa

### Clientes
- `GET /api/clientes` - Obtener lista de clientes
- `POST /api/clientes` - Crear nuevo cliente
- `GET /api/clientes/<id>` - Obtener cliente específico

### Facturas
- `GET /api/facturas` - Obtener facturas
- `POST /api/facturas/crear` - Crear factura

### Pagos
- `POST /api/pagos/procesar` - Procesar pago

### Reportes
- `GET /api/reportes/dashboard` - Datos del dashboard

## Consumo desde Frontend

El frontend (HTML) hace peticiones AJAX a estos endpoints:

```javascript
// Ejemplo: Login
fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        usuario: 'admin',
        contraseña: 'admin123'
    })
})
.then(response => response.json())
.then(data => console.log(data))
```

## Notas Importantes

- Firebase está configurado con el proyecto `cablelatin-prueba`
- Los datos se almacenan en Firestore (nube)
- No se necesita base de datos local
- CORS está habilitado para desarrollo
