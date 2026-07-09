from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class Factura:
    cliente_id: str
    plan_nombre: str
    monto: float
    fecha_vencimiento: str = ""
    estado: str = "Pendiente"
    observacion: str = ""
    creado_por: str = "sistema"
    fecha_creacion: str = field(default_factory=lambda: datetime.now().isoformat())

    def validate(self):
        errors = []

        if not self.cliente_id or not str(self.cliente_id).strip():
            errors.append("El campo cliente_id es obligatorio.")

        if not self.plan_nombre or not str(self.plan_nombre).strip():
            errors.append("El campo plan_nombre es obligatorio.")

        try:
            val_monto = float(self.monto)
            if val_monto <= 0:
                errors.append("El monto debe ser un valor numérico positivo mayor a cero.")
        except (ValueError, TypeError):
            errors.append("El monto provisto es inválido.")

        return errors