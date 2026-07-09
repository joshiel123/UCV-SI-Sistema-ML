import difflib
import re
import datetime
import logging
# Base de datos de conocimiento de distritos válidos para el modelo de similitud

def extract_numeric(value) -> float:
    """Extract the first numeric value from a string possibly containing text.
    Returns 0.0 if no number is found.
    """
    if value is None:
        return 0.0
    # Convert to string and search for a number (int or float)
    s = str(value)
    match = re.search(r"[-+]?[0-9]*\.?[0-9]+", s)
    if match:
        try:
            return float(match.group(0))
        except ValueError:
            return 0.0
    return 0.0

def normalize_name_with_number(name: str) -> str:
    """Normalize plan names that may include numeric suffixes.
    Trims whitespace, collapses multiple spaces, and retains numeric parts.
    """
    if not name:
        return ""
    # Remove extra spaces and keep characters
    cleaned = " ".join(name.split())
    return cleaned

def parse_flexible_date(date_str: str):
    """Parse a date string trying multiple common formats.
    Returns a datetime.date object or None if parsing fails.
    """
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%Y/%m/%d"):
        try:
            return datetime.datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    logging.warning(f"Unable to parse date: {date_str}")
    return None
DISTRITOS_VALIDOS = [
    "Ate", "Lince", "San Isidro", "Miraflores", "Santiago de Surco", 
    "La Molina", "San Borja", "San Miguel", "Jesús María", "Magdalena del Mar"
]

# Diccionario inteligente para deducir planes según precios
PLANES_POR_PRECIO = {
    50.0: {"id_plan": "plan_basico", "nombre": "Plan Básico Cable"},
    80.0: {"id_plan": "plan_estandar", "nombre": "Plan Estándar Dúo"},
    120.0: {"id_plan": "plan_premium", "nombre": "Plan Premium Ultra"}
}

def corregir_distrito(distrito_sucio: str) -> tuple[str, bool]:
    """
    Usa el algoritmo de coincidencia de cadenas difflib (String Distance)
    como un modelo ligero de NLP para corregir distritos con errores de ortografía.
    """
    if not distrito_sucio:
        return "Ate", True # Imputación por defecto
        
    distrito_limpio = distrito_sucio.strip()
    # Buscar coincidencias cercanas con un umbral de similitud del 60%
    coincidencias = difflib.get_close_matches(distrito_limpio, DISTRITOS_VALIDOS, n=1, cutoff=0.6)
    
    if coincidencias:
        # Retorna el distrito corregido y si fue modificado
        return coincidencias[0], coincidencias[0].lower() != distrito_limpio.lower()
        
    return distrito_limpio, False

def imputar_plan_y_monto(monto_raw, plan_raw) -> tuple[float, str, str]:
    """
    Imputación predictiva: Si el plan viene vacío pero tenemos el monto, 
    o viceversa, deduce el valor correcto basándose en patrones históricos.
    """
    try:
        monto = extract_numeric(monto_raw)
    except Exception:
        monto = 0.0

    plan_nombre = str(plan_raw).strip() if plan_raw and not str(plan_raw).lower() == 'nan' else ""

    # Caso 1: Viene el precio pero no el nombre del plan (Imputar plan)
    if monto > 0.0 and not plan_nombre:
        # Busca el plan más cercano en nuestro mapa
        for precio, info in PLANES_POR_PRECIO.items():
            if abs(monto - precio) < 5.0: # Tolerancia de S/ 5
                return monto, info['id_plan'], info['nombre']
        return monto, "plan_personalizado", "Plan Personalizado"

    # Caso 2: Viene el plan pero no el monto (Imputar monto)
    if plan_nombre and monto == 0.0:
        for precio, info in PLANES_POR_PRECIO.items():
            if info['nombre'].lower() in plan_nombre.lower():
                return precio, info['id_plan'], info['nombre']
        return 50.0, "plan_basico", "Plan Básico Cable" # Por defecto

    return monto, "plan_basico", plan_nombre or "Plan Básico Cable"

def preprocess_record(record: dict) -> dict:
    """Apply all cleaning steps to a single data record.
    Expected keys (case‑insensitive):
        - 'distrito' or similar for district names
        - 'monto' for monetary amount
        - 'plan' for plan name
        - any key containing 'fecha' for dates
    Returns the record with cleaned values.
    """
    # Clean district
    district_key = next((k for k in record.keys() if 'distrito' in k.lower()), None)
    if district_key:
        clean_name, changed = corregir_distrito(str(record[district_key]))
        record[district_key] = clean_name
    # Clean numeric amount
    amount_key = next((k for k in record.keys() if 'monto' in k.lower()), None)
    if amount_key:
        record[amount_key] = extract_numeric(record[amount_key])
    # Normalize plan name
    plan_key = next((k for k in record.keys() if 'plan' in k.lower()), None)
    if plan_key:
        record[plan_key] = normalize_name_with_number(str(record[plan_key]))
    # Parse dates
    for k, v in list(record.items()):
        if 'fecha' in k.lower():
            parsed = parse_flexible_date(str(v))
            if parsed:
                record[k] = parsed
    # Re‑impute plan and amount if needed
    if amount_key and plan_key:
        monto, plan_id, plan_name = imputar_plan_y_monto(record[amount_key], record[plan_key])
        record[amount_key] = monto
        record[plan_key] = plan_name
        record['id_plan'] = plan_id
    return record
