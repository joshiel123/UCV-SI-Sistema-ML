from dataclasses import dataclass, field
from datetime import datetime, timezone
import re

ROLES_VALIDOS = ['administrador', 'supervisor', 'vendedor']

@dataclass
class Usuario:
    nombre: str
    usuario: str
    email: str
    rol: str
    telefono: str = ""
    estado: str = "Activo"
    fecha_registro: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
    def validate(self):
        errors = []
        if not self.nombre or not self.nombre.strip():
            errors.append("El nombre es requerido.")
        if not self.usuario or not self.usuario.strip():
            errors.append("El usuario es requerido.")
        if not self.email or not re.match(r"[^@]+@[^@]+\.[^@]+", self.email):
            errors.append("Email inválido.")
        if not self.rol or self.rol.lower() not in ROLES_VALIDOS:
            errors.append(f"Rol inválido. Opciones: {', '.join(ROLES_VALIDOS)}")
        return errors