# backend/app/models/cliente.py

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class Cliente:
    nombre: str
    apellido: str
    tipo_documento: str
    numero_documento: str
    email: str = ""
    telefono: str = ""
    direccion: str = ""
    distrito: str = ""
    referencia: str = ""
    plan_servicio: str = ""
    estado: str = "Activo"
    registrado_por: str = "sistema"
    fecha_registro: str = field(default_factory=lambda: datetime.now().isoformat())

    def validate(self):
        errors = []

        if not self.nombre.strip():
            errors.append("El nombre es requerido.")

        if not self.apellido.strip():
            errors.append("El apellido es requerido.")

        if self.tipo_documento not in ["DNI", "RUC"]:
            errors.append("Tipo de documento inválido.")

        numero_limpio = str(self.numero_documento).strip()

        if not numero_limpio.isdigit():
            errors.append(
                f"El número de documento ({self.tipo_documento}) "
                "debe contener únicamente dígitos numéricos."
            )
        elif self.tipo_documento == "DNI" and len(numero_limpio) != 8:
            errors.append("El DNI debe tener 8 dígitos.")
        elif self.tipo_documento == "RUC" and len(numero_limpio) != 11:
            errors.append("El RUC debe tener 11 dígitos.")

        return errors