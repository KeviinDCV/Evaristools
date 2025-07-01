# EvariScan

EvariScan es una aplicación web para digitalización y procesamiento de documentos, especializada en OCR (Reconocimiento Óptico de Caracteres) y herramientas para manipulación de PDFs.

## Características principales

- **Herramienta OCR**: Convierte documentos escaneados e imágenes a texto editable.
  - Soporte para múltiples idiomas (Español, Inglés, Francés, Alemán, Italiano, Portugués)
  - Vista previa de imágenes
  - Exportación de texto a archivo o portapapeles

- **Herramientas PDF**:
  - Unir varios archivos PDF en uno solo
  - Dividir un PDF en múltiples archivos por rangos de páginas
  - Comprimir PDFs con diferentes niveles de calidad

## Requisitos previos

- Node.js (versión 14 o superior)
- npm o yarn

## Instalación

1. Clona este repositorio
2. Instala las dependencias:

```bash
npm install
```

3. Añade el archivo `logo.png` a la carpeta `public` para el logo de la aplicación

## Desarrollo

Para iniciar el servidor de desarrollo:

```bash
npm run dev
```

## Construcción para producción

Para generar los archivos de producción:

```bash
npm run build
```

## Tecnologías utilizadas

- React con TypeScript
- React Router para navegación
- Material UI para la interfaz de usuario
- Tesseract.js para OCR
- pdf-lib para manipulación de PDFs

## Estructura del proyecto

- `/src/components`: Componentes reutilizables
- `/src/pages`: Páginas principales de la aplicación
- `/src/services`: Servicios y utilidades
- `/src/assets`: Recursos estáticos
- `/public`: Archivos públicos (incluye logo.png)

# Evaristools - Conversión de Word a PDF

## Requisitos del servidor

Para que la conversión de Word a PDF funcione correctamente, necesitas configurar un pequeño servidor Python. Sigue estos pasos:

### 1. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 2. Configurar el software de conversión

**Opción 1: LibreOffice (Multiplataforma - Windows, Linux, Mac)**

1. Descarga e instala LibreOffice desde [https://www.libreoffice.org/download](https://www.libreoffice.org/download)
2. Asegúrate de que `soffice` o `libreoffice` está disponible en la línea de comandos

**Opción 2: Microsoft Word (Solo Windows)**

1. Asegúrate de tener Microsoft Word instalado
2. Esta opción utilizará la API COM de Windows para controlar Word

### 3. Ejecutar el servidor

```bash
python server.py
```

El servidor se ejecutará en `http://localhost:5000` y estará listo para recibir solicitudes de conversión.

## Configuración del cliente

Por defecto, el frontend está configurado para conectarse a `http://localhost:5000`. Si necesitas cambiar esta URL, modifica el archivo `src/pages/WordToPdf.tsx` y actualiza la URL en la función `convertWordToPdf`.

## Solución de problemas

### Si la conversión no funciona:

1. Verifica que el servidor Python esté ejecutándose
2. Comprueba que LibreOffice o Microsoft Word estén correctamente instalados
3. Revisa los logs del servidor para ver posibles errores
4. Asegúrate de que no hay problemas de CORS (el servidor ya tiene habilitado CORS)

### Si los PDFs generados no se ven correctamente:

1. Verifica la instalación de LibreOffice/Word
2. Intenta abrir el documento original en LibreOffice/Word y exportarlo manualmente como PDF para comparar resultados 