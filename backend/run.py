"""
Aplicación principal - Punto de entrada
Cable Latín Backend Python (Flask)
"""
import os
from dotenv import load_dotenv

# Cargar variables de entorno desde .env ANTES de importar la app
load_dotenv()

from app import create_app

# Crear la aplicación
app = create_app()

if __name__ == '__main__':
    # Ejecutar en modo desarrollo
    # En producción, usar Gunicorn u otro WSGI server
    debug_mode = os.getenv('FLASK_DEBUG', 'True').lower() in ('true', '1', 'yes')
    
    print("=" * 50)
    print("  Cable Latín Backend - Iniciando servidor")
    print(f"  Entorno: {os.getenv('FLASK_ENV', 'development')}")
    print(f"  Debug:   {debug_mode}")
    print(f"  Puerto:  5000")
    print("=" * 50)
    
    app.run(
        debug=debug_mode,
        host='0.0.0.0',
        port=5000,
        threaded=True
    )
