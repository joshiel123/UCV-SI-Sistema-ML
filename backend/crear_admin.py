import firebase_admin
from firebase_admin import credentials, firestore, auth
import os

creds_path = 'firebase-credentials.json'
try:
    if not firebase_admin._apps:
        if os.path.exists(creds_path):
            cred = credentials.Certificate(creds_path)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()
except Exception as e:
    print(f"❌ Error al inicializar Firebase: {e}")
    exit(1)

db = firestore.client()
PROYECTO_ID = 'cablelatin-prueba'

print("⏳ Verificando usuario administrador...")

email = 'admin@cablelatin.com'
password = 'admin_password123'
username = 'admin'
rol = 'administrador'
nombre = 'Administrador Sistema'

try:
    try:
        user_record = auth.get_user_by_email(email)
        print("ℹ️ Usuario en Firebase Auth ya existe.")
    except auth.UserNotFoundError:
        user_record = auth.create_user(
            email=email,
            password=password,
            display_name=nombre
        )
        print("✅ Usuario creado en Firebase Auth.")

    uid = user_record.uid

    # Verificar si existe en Firestore
    personal_ref = db.collection('artifacts').document(PROYECTO_ID).collection('public').document('data').collection('personal')
    docs = personal_ref.where('email', '==', email).limit(1).stream()
    
    exists = False
    for doc in docs:
        exists = True
        print("ℹ️ Usuario en Firestore ya existe.")
        break

    if not exists:
        datos_usuario = {
            'uid': uid,
            'usuario': username,
            'email': email,
            'rol': rol,
            'estado': 'Activo',
            'nombre': nombre
        }
        personal_ref.add(datos_usuario)
        print("✅ Usuario registrado en Firestore con rol administrador.")

    print("✅ ¡Admin listo!")

except Exception as e:
    print(f"❌ Error al crear admin: {e}")