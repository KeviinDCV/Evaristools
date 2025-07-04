# 🚀 Inicio Rápido - EvarisTools

## ⚡ Ejecutar Ambos Servicios (Frontend + Backend)

### Opción 1: Comando npm (Recomendado)
```bash
npm run dev:full
```

### Opción 2: Script de Windows
```bash
start-dev.bat
```

### Opción 3: Script de Unix/Linux/macOS
```bash
./start-dev.sh
```

### Opción 4: Comando alternativo
```bash
npm start
```

## 🎯 URLs de Acceso

Una vez ejecutado cualquiera de los comandos anteriores:

- **Frontend (React)**: http://localhost:3000
- **Backend (Flask)**: http://localhost:5000

## 📋 Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev:full` | **Frontend + Backend** (Recomendado) |
| `npm start` | Alias de `dev:full` |
| `npm run dev` | Solo Frontend |
| `npm run server` | Solo Backend |
| `npm run dev:frontend` | Alias de `dev` |
| `npm run dev:backend` | Alias de `server` |
| `npm run build` | Construir para producción |
| `npm run preview` | Vista previa de producción |
| `npm run clean` | Limpiar archivos temporales |
| `npm run setup` | Configuración inicial |

## 🛠️ Configuración Inicial (Solo Primera Vez)

### 1. Instalar Dependencias del Frontend
```bash
npm install
```

### 2. Configurar Backend (Opcional)
```bash
# Crear entorno virtual de Python
python -m venv venv

# Activar entorno virtual
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Instalar dependencias Python
pip install -r requirements.txt
```

## 🔧 Funcionalidades por Servicio

### ✅ Solo Frontend (sin backend)
- ✅ OCR (Reconocimiento de texto)
- ✅ Manipulación de PDFs (unir, dividir, comprimir)
- ✅ Generador de códigos QR
- ✅ Conversión de imágenes a PDF
- ✅ Conversión de PDF a imágenes

### ⚡ Frontend + Backend (funcionalidad completa)
- ✅ Todas las funcionalidades del frontend
- ✅ Conversión de Word a PDF
- ✅ Conversión de Excel a PDF
- ✅ Conversión de PowerPoint a PDF
- ✅ Conversiones avanzadas con LibreOffice

## 🚨 Solución de Problemas

### Error: "Puerto ya está en uso"
```bash
# Matar procesos en puertos específicos
npx kill-port 3000 5000
```

### Error: "Python no encontrado"
- Instalar Python desde python.org
- Verificar que esté en el PATH del sistema

### Error: "concurrently no encontrado"
```bash
npm install
```

## 💡 Consejos

- **Desarrollo normal**: Usa `npm run dev:full` para tener todas las funcionalidades
- **Solo frontend**: Usa `npm run dev` si no necesitas conversiones Office
- **Debugging**: Cada servicio muestra sus logs con colores diferentes
- **Detener**: Presiona `Ctrl+C` para detener ambos servicios

## 📞 Soporte

Si tienes problemas:
1. Revisa la documentación completa en `README.md`
2. Consulta la guía de desarrollo en `DEVELOPMENT.md`
3. Contacta al equipo de desarrollo
