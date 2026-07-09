"""
Inicialización de la aplicación Flask — Cable Latín
"""
import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import logging

load_dotenv()


def create_app():
    """Factory pattern para crear la aplicación Flask."""
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[logging.StreamHandler()]
    )
    logger = logging.getLogger(__name__)
    logger.info("Iniciando aplicación Cable Latín Backend")

    app = Flask(__name__)

    # CORS optimizado para aceptar headers Authorization desde cualquier puerto local de desarrollo
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    app.config['JSON_SORT_KEYS'] = False
    app.config['JSON_AS_ASCII'] = False 

    # ===================== IMPORTAR Y REGISTRAR BLUEPRINTS =====================
    from app.routes.auth import auth_bp
    from app.routes.clientes import clientes_bp
    from app.routes.facturas import facturas_bp
    from app.routes.pagos import pagos_bp
    from app.routes.reportes import reportes_bp
    from app.routes.usuarios import usuarios_bp  # <-- NUEVO Blueprint importado

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(clientes_bp, url_prefix='/api/clientes')
    app.register_blueprint(facturas_bp, url_prefix='/api/facturas')
    app.register_blueprint(pagos_bp, url_prefix='/api/pagos')
    app.register_blueprint(reportes_bp, url_prefix='/api/reportes')
    app.register_blueprint(usuarios_bp, url_prefix='/api/usuarios')  # <-- NUEVO Blueprint registrado

    # ===================== MANEJO GLOBAL DE ERRORES =====================

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'success': False, 'message': 'Endpoint no encontrado.'}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({'success': False, 'message': 'Método HTTP no permitido.'}), 405

    @app.errorhandler(500)
    def internal_error(e):
        logging.error(f"Error interno: {str(e)}")
        return jsonify({'success': False, 'message': 'Error interno del servidor.', 'errors': [str(e)]}), 500

    @app.errorhandler(Exception)
    def handle_exception(e):
        logging.exception(f"Excepción no manejada: {str(e)}")
        return jsonify({'success': False, 'message': 'Error interno no manejado.', 'errors': [str(e)]}), 500

    @app.route('/api/status', methods=['GET'])
    def status():
        return jsonify({
            'success': True,
            'message': 'Cable Latín Backend está operativo.',
            'version': '2.0.0',
            'entorno': os.getenv('FLASK_ENV', 'development')
        }), 200

    return app