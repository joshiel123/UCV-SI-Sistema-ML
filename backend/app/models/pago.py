"""
Modelo de datos para un Pago — Cable Latín
Fuente única de verdad para validaciones del dominio.
"""
from dataclasses import dataclass, field
from datetime import datetime

# Fuente única de verdad — importada también desde pagos.py (routes)
METODOS_PAGO_VALIDOS = ['Efectivo', 'Transferencia', 'Yape', 'Plin', 'Tarjeta', 'Otro']


@dataclass
class Pago:
    """
    Representa un pago registrado en el sistema.

    Attributes:
        servicio_id     (str):   ID del servicio/factura asociado.
        monto           (float): Monto pagado. Debe ser positivo.
        metodo_pago     (str):   Método utilizado. Ver METODOS_PAGO_VALIDOS.
        observacion     (str):   Nota opcional sobre el pago.
        procesado_por   (str):   Usuario que registró el pago.
        uid_procesador  (str):   UID del usuario que registró el pago.
        fecha_pago      (str):   Fecha ISO generada automáticamente.
    """
    servicio_id:    str
    monto:          float
    metodo_pago:    str  = 'Efectivo'
    observacion:    str  = ''
    procesado_por:  str  = 'sistema'
    uid_procesador: str  = ''
    fecha_pago:     str  = field(default_factory=lambda: datetime.now().isoformat())

    def validate(self) -> list[str]:
        """
        Valida los campos del pago.

        Returns:
            list[str]: Lista de mensajes de error. Vacía si no hay errores.
        """
        errors = []

        if not (self.servicio_id or '').strip():
            errors.append('servicio_id es requerido.')

        if not isinstance(self.monto, (int, float)) or self.monto <= 0:
            errors.append('El monto debe ser un número positivo.')

        if self.metodo_pago not in METODOS_PAGO_VALIDOS:
            errors.append(
                f'Método de pago inválido. Opciones: {", ".join(METODOS_PAGO_VALIDOS)}.'
            )

        return errors

    def to_dict(self) -> dict:
        """
        Serializa el pago a diccionario para persistir en Firestore.

        Returns:
            dict: Representación del pago como diccionario.
        """
        return {
            'servicio_id':    self.servicio_id,
            'monto':          self.monto,
            'metodo_pago':    self.metodo_pago,
            'observacion':    self.observacion,
            'procesado_por':  self.procesado_por,
            'uid_procesador': self.uid_procesador,
            'fecha_pago':     self.fecha_pago,
        }