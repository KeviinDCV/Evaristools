# 🛠️ Guía de Desarrollo - EvarisTools

## 🚀 Inicio Rápido

### Ejecutar el Proyecto Completo

Para ejecutar tanto el frontend (React) como el backend (Python Flask) simultáneamente:

```bash
# Comando principal (RECOMENDADO)
npm run dev:full

# Comando alternativo
npm start
```

Este comando ejecutará:
- **Frontend**: React + Vite en `http://localhost:5173`
- **Backend**: Python Flask en `http://localhost:5000`

### Ejecutar Servicios por Separado

Si necesitas ejecutar los servicios individualmente:

```bash
# Solo Frontend (React + Vite)
npm run dev

# Solo Backend (Python Flask)
npm run server
```

## 📋 Requisitos Previos

### Frontend
- Node.js 18.0.0 o superior
- npm 9.0.0 o superior

### Backend (Opcional)
- Python 3.8 o superior
- pip (gestor de paquetes de Python)

## 🔧 Configuración Inicial

### 1. Instalar Dependencias del Frontend

```bash
npm install
```

### 2. Configurar Backend (Opcional)

```bash
# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

## 🎯 Funcionalidades por Servicio

### Frontend (React + Vite)
- **OCR**: Reconocimiento óptico de caracteres
- **Manipulación PDF**: Unir, dividir, comprimir PDFs
- **Generador QR**: Códigos QR institucionales
- **Conversiones**: Imágenes a PDF y viceversa

### Backend (Python Flask)
- **Conversiones Office**: Word, Excel, PowerPoint a PDF
- **Procesamiento avanzado**: Funcionalidades que requieren LibreOffice
- **API REST**: Endpoints para conversiones complejas

## 🔄 Flujo de Desarrollo

### Desarrollo Normal
1. Ejecutar `npm run dev:full`
2. Abrir `http://localhost:5173` en el navegador
3. Los cambios en el frontend se reflejan automáticamente
4. Los cambios en el backend requieren reiniciar el servidor

### Solo Frontend
Si solo trabajas en funcionalidades del frontend:
1. Ejecutar `npm run dev`
2. Las funcionalidades que requieren backend no estarán disponibles

### Solo Backend
Si solo trabajas en el backend:
1. Ejecutar `npm run server`
2. Usar herramientas como Postman para probar endpoints

## 🛠️ Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Solo frontend (React + Vite) |
| `npm run server` | Solo backend (Python Flask) |
| `npm run dev:full` | Frontend + Backend simultáneamente |
| `npm start` | Alias de `dev:full` |
| `npm run build` | Construir para producción |
| `npm run preview` | Vista previa de la construcción |

## 🔍 Debugging

### Frontend
- Usar las herramientas de desarrollo del navegador
- React DevTools para inspeccionar componentes
- Console.log para debugging básico

### Backend
- Los logs aparecen en la terminal donde se ejecuta `npm run server`
- Usar `print()` para debugging básico
- Flask tiene modo debug activado en desarrollo

## 📁 Estructura de Archivos Importantes

```
evaristools/
├── src/                    # Código fuente del frontend
│   ├── components/         # Componentes React
│   ├── pages/             # Páginas de la aplicación
│   └── services/          # Servicios y utilidades
├── server.py              # Servidor backend Flask
├── requirements.txt       # Dependencias Python
├── package.json          # Configuración npm y scripts
└── vite.config.cjs       # Configuración de Vite
```

## 🚨 Solución de Problemas

### Error: "Puerto 5173 ya está en uso"
```bash
# Matar proceso en el puerto
npx kill-port 5173
# o cambiar puerto
npm run dev -- --port 3000
```

### Error: "Puerto 5000 ya está en uso"
```bash
# Matar proceso en el puerto (Windows)
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Matar proceso en el puerto (macOS/Linux)
lsof -ti:5000 | xargs kill -9
```

### Error: "Python no encontrado"
- Asegúrate de tener Python instalado
- En Windows, puede ser `python` o `py`
- Verifica con `python --version`

### Error: "LibreOffice no encontrado"
- Instala LibreOffice desde [libreoffice.org](https://www.libreoffice.org/)
- Asegúrate de que esté en el PATH del sistema

## 📝 Notas de Desarrollo

- El frontend funciona completamente sin el backend
- El backend es opcional y solo se necesita para conversiones Office
- Los archivos se procesan localmente en el navegador cuando es posible
- El backend solo se usa para funcionalidades que requieren LibreOffice

## 🔗 Enlaces Útiles

- [Documentación de React](https://reactjs.org/docs)
- [Documentación de Vite](https://vitejs.dev/guide/)
- [Documentación de Flask](https://flask.palletsprojects.com/)
- [Documentación de TypeScript](https://www.typescriptlang.org/docs/)
