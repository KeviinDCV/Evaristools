from flask import Flask, request, send_file, jsonify, after_this_request
from flask_cors import CORS
import os
import subprocess
import tempfile
import uuid
from werkzeug.utils import secure_filename
import sys
import shutil
import threading
import time
import requests
from datetime import datetime, timedelta
import PyPDF2
import json
import zipfile
import io
import logging
from PIL import Image, ImageDraw, ImageFont
import pymupdf as fitz  # PyMuPDF
import base64

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})  # Permitir solicitudes CORS de cualquier origen

# Configuración de la carpeta temporal
current_dir = os.path.dirname(os.path.abspath(__file__))
# Usar el separador de ruta del sistema operativo y normalizar la ruta
UPLOAD_FOLDER = os.path.normpath(os.path.join(current_dir, 'temp'))

# Variable para almacenar la última vez que se limpió la carpeta temporal
last_cleanup_time = datetime.now()
# Tiempo de vida máximo de los archivos temporales (en minutos)
MAX_FILE_AGE_MINUTES = 30

# Crear la carpeta temporal si no existe
if not os.path.exists(UPLOAD_FOLDER):
    try:
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    except Exception as e:
        print(f"Error al crear carpeta temporal: {str(e)}")
        sys.exit(1)

# Asegurarse de que la carpeta temporal tenga permisos de escritura y sea accesible
try:
    test_file_path = os.path.join(UPLOAD_FOLDER, "test_write.txt")
    with open(test_file_path, 'w') as f:
        f.write("Test write permission")
    os.remove(test_file_path)
except Exception as e:
    print(f"ERROR: No hay permisos de escritura en la carpeta temporal: {str(e)}")
    print(f"Por favor, asegúrese de que la carpeta {UPLOAD_FOLDER} existe y tiene permisos de escritura")
    sys.exit(1)

# Función para eliminar archivos temporales más antiguos que MAX_FILE_AGE_MINUTES
def cleanup_temp_files():
    """Elimina archivos temporales antiguos"""
    global last_cleanup_time
    
    # Solo realizar limpieza cada cierto tiempo para no sobrecargar el sistema
    if (datetime.now() - last_cleanup_time).total_seconds() < 300:  # 5 minutos
        return
        
    last_cleanup_time = datetime.now()
    count = 0
    
    try:
        cutoff_time = datetime.now() - timedelta(minutes=MAX_FILE_AGE_MINUTES)
        
        for filename in os.listdir(UPLOAD_FOLDER):
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            
            # Verificar si es un archivo
            if os.path.isfile(file_path):
                # Obtener el tiempo de modificación del archivo
                file_mod_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                
                # Si el archivo es más antiguo que el tiempo máximo, eliminarlo
                if file_mod_time < cutoff_time:
                    try:
                        os.remove(file_path)
                        count += 1
                    except Exception:
                        pass
    except Exception:
        pass

# Función que inicia un hilo para eliminar archivos específicos con un retardo
def delayed_file_cleanup(files_to_delete, delay_seconds=1):
    """Elimina archivos específicos después de un retardo para asegurar que la descarga se complete"""
    def delete_files():
        # Esperar el tiempo especificado
        time.sleep(delay_seconds)
        
        # Eliminar cada archivo de la lista
        for file_path in files_to_delete:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception:
                pass
    
    # Iniciar un hilo para la eliminación retardada
    cleanup_thread = threading.Thread(target=delete_files)
    cleanup_thread.daemon = True  # El hilo se cerrará cuando el programa principal termine
    cleanup_thread.start()

# Detectar LibreOffice al inicio
def find_libreoffice():
    """Busca la instalación de LibreOffice en el sistema"""
    soffice_paths = [
        "soffice",  # Versión estándar para sistemas con LibreOffice en PATH
        "libreoffice",  # Alternativa para Linux
        "/usr/bin/soffice",  # Ubicación común en Linux
        "/usr/bin/libreoffice", 
        "/opt/libreoffice/program/soffice",  # Instalación alternativa en Linux
        "C:\\Program Files\\LibreOffice\\program\\soffice.exe",  # Windows (64-bit)
        "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",  # Windows (32-bit)
        "/Applications/LibreOffice.app/Contents/MacOS/soffice",  # macOS
    ]
    
    for path in soffice_paths:
        try:
            # Verificar si el archivo existe directamente
            if os.path.exists(path):
                return path
                
            # Intentar encontrar el comando en PATH
            if path in ["soffice", "libreoffice"]:
                result = subprocess.run(
                    ["where", path] if os.name == 'nt' else ["which", path],
                    capture_output=True,
                    check=False
                )
                if result.returncode == 0:
                    found_path = result.stdout.decode('utf-8').strip()
                    return found_path
        except Exception:
            continue
    
    return None

# Detectar Ghostscript al inicio
def find_ghostscript():
    """Busca la instalación de Ghostscript en el sistema"""
    gs_paths = [
        "gs",  # Versión estándar para sistemas con Ghostscript en PATH
        "gswin64c",  # Windows (64-bit)
        "gswin32c",  # Windows (32-bit)
        "/usr/bin/gs",  # Ubicación común en Linux
        "C:\\Program Files\\gs\\gs*\\bin\\gswin64c.exe",  # Windows (64-bit) - ej. C:\Program Files\gs\gs9.56.1\bin\gswin64c.exe
        "C:\\Program Files (x86)\\gs\\gs*\\bin\\gswin32c.exe",  # Windows (32-bit)
    ]
    
    for path in gs_paths:
        try:
            # Si el path contiene asterisco, buscar coincidencias
            if '*' in path:
                import glob
                matches = glob.glob(path)
                if matches:
                    return matches[0]  # Devolver la primera coincidencia
                continue
                
            # Verificar si el archivo existe directamente
            if os.path.exists(path):
                return path
                
            # Intentar encontrar el comando en PATH
            if path in ["gs", "gswin64c", "gswin32c"]:
                result = subprocess.run(
                    ["where", path] if os.name == 'nt' else ["which", path],
                    capture_output=True,
                    check=False
                )
                if result.returncode == 0:
                    found_path = result.stdout.decode('utf-8').strip()
                    return found_path
        except Exception:
            continue
    
    return None

# Función para detectar LibreOffice y Ghostscript al inicio
LIBREOFFICE_PATH = find_libreoffice()
GHOSTSCRIPT_PATH = find_ghostscript()

# Informar sobre la disponibilidad de las herramientas
logger.info(f"LibreOffice encontrado: {'SI' if LIBREOFFICE_PATH else 'NO'}")
logger.info(f"Ghostscript encontrado: {'SI' if GHOSTSCRIPT_PATH else 'NO'}")

# Función genérica para procesar conversiones mediante LibreOffice
def process_libreoffice_conversion(input_file, allowed_extensions, input_type_name):
    """Función común para procesar conversiones con LibreOffice"""
    # Verificar si LibreOffice está disponible
    if not LIBREOFFICE_PATH:
        return jsonify({'error': 'El servicio de conversión no está disponible en este momento.'}), 500
    
    # Verificar si se envió un archivo
    if 'file' not in request.files:
        return jsonify({'error': 'No se envió ningún archivo'}), 400
    
    file = request.files['file']
    
    # Verificar que el archivo tenga nombre
    if file.filename == '':
        return jsonify({'error': 'No se seleccionó ningún archivo'}), 400
    
    # Verificar la extensión del archivo
    if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
        return jsonify({'error': f'El archivo debe ser un documento {input_type_name} ({", ".join(allowed_extensions)})'}), 400
    
    # Crear un nombre único para el archivo temporal
    filename = secure_filename(file.filename)
    temp_id = str(uuid.uuid4())
    input_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_{filename}")
    
    # Verificar si tenemos permisos de escritura en la carpeta temporal
    if not os.access(os.path.dirname(UPLOAD_FOLDER), os.W_OK):
        return jsonify({'error': 'Error de permisos en el servidor.'}), 500
    
    # Guardar el archivo
    try:
        file.save(input_path)
    except Exception as e:
        return jsonify({'error': f'Error al procesar el archivo: {str(e)}'}), 500
    
    # Verificar que el archivo se guardó correctamente
    if not os.path.exists(input_path):
        return jsonify({'error': 'Error al procesar el archivo.'}), 500
    
    # Nombre del archivo PDF resultante
    pdf_filename = os.path.splitext(filename)[0] + '.pdf'
    output_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_{pdf_filename}")
    
    try:
        # Usar LibreOffice para convertir el documento
        command = [
            LIBREOFFICE_PATH,
            "--headless",
            "--convert-to", "pdf",
            "--outdir", UPLOAD_FOLDER,
            input_path
        ]
        
        process = subprocess.run(command, capture_output=True, text=True)
        
        if process.returncode != 0:
            return jsonify({
                'error': f'Error al convertir el documento a PDF.'
            }), 500
        
        # LibreOffice cambia el nombre del archivo de salida
        # El nombre del PDF generado será el mismo que el archivo original, pero con extensión .pdf
        libreoffice_output = os.path.join(
            UPLOAD_FOLDER, 
            os.path.splitext(os.path.basename(input_path))[0] + ".pdf"
        )
        
        # Si el archivo existe pero con un nombre diferente, lo movemos
        if os.path.exists(libreoffice_output) and libreoffice_output != output_path:
            try:
                shutil.move(libreoffice_output, output_path)
            except Exception:
                # Si no podemos moverlo, usamos el que existe
                output_path = libreoffice_output
        
        # Verificar que el PDF se creó
        if not os.path.exists(output_path):
            return jsonify({
                'error': 'Error al generar el PDF.'
            }), 500
        
        # Lista de archivos a eliminar después de la descarga
        files_to_delete = [input_path, output_path]
        
        # Configurar limpieza retardada para eliminar archivos después de la descarga
        @after_this_request
        def cleanup_after_request(response):
            # Solo iniciar el hilo de limpieza si la respuesta es exitosa
            if response.status_code == 200:
                delayed_file_cleanup(files_to_delete, delay_seconds=2)
            return response
        
        # Enviar el archivo PDF como respuesta
        return send_file(output_path, 
                        as_attachment=True,
                        download_name=pdf_filename,
                        mimetype='application/pdf')
        
    except Exception as e:
        return jsonify({'error': 'Error durante la conversión del documento.'}), 500

@app.route('/', methods=['GET'])
def home():
    # Ejecutar limpieza automática en cada acceso a la ruta principal
    cleanup_temp_files()
    
    return jsonify({
        "status": "Servidor de conversión funcionando",
        "herramientas_disponibles": [
            "Word a PDF", 
            "Excel a PDF", 
            "PowerPoint a PDF",
            "Dividir PDF",
            "Fusionar PDF",
            "Comprimir PDF"
        ]
    })

@app.route('/system-info', methods=['GET'])
def system_info():
    """Devuelve información sobre el sistema y servicios disponibles"""
    try:
        # Limpiar archivos temporales
        cleanup_temp_files()
        
        # Utilizar la variable global LIBREOFFICE_PATH
        global LIBREOFFICE_PATH, GHOSTSCRIPT_PATH
        
        # Diccionario con información del sistema
        info = {
            'server': 'EvariTools Server',
            'version': '1.0.0',
            'os': os.name,
            'services': {
                'document_conversion': {
                    'available': bool(LIBREOFFICE_PATH),
                    'path': LIBREOFFICE_PATH if LIBREOFFICE_PATH else None
                },
                'pdf_conversion': {
                    'available': bool(GHOSTSCRIPT_PATH),
                    'path': GHOSTSCRIPT_PATH if GHOSTSCRIPT_PATH else None
                }
            },
            'temp_dir': {
                'path': UPLOAD_FOLDER,
                'writable': os.access(UPLOAD_FOLDER, os.W_OK),
                'free_space_mb': shutil.disk_usage(UPLOAD_FOLDER).free / (1024 * 1024) if os.path.exists(UPLOAD_FOLDER) else 0
            }
        }
        
        return jsonify(info)
        
    except Exception as e:
        return jsonify({'error': f'Error al obtener información del sistema: {str(e)}'}), 500

@app.route('/convert-word-to-pdf', methods=['POST'])
def convert_word_to_pdf():
    """Convierte documentos Word a PDF usando LibreOffice"""
    cleanup_temp_files()
    return process_libreoffice_conversion(
        request.files['file'] if 'file' in request.files else None,
        ['.doc', '.docx'],
        'Word'
    )

@app.route('/convert-excel-to-pdf', methods=['POST'])
def convert_excel_to_pdf():
    """Convierte hojas de cálculo Excel a PDF usando LibreOffice"""
    cleanup_temp_files()
    return process_libreoffice_conversion(
        request.files['file'] if 'file' in request.files else None,
        ['.xls', '.xlsx', '.ods'],
        'Excel'
    )

@app.route('/convert-powerpoint-to-pdf', methods=['POST'])
def convert_powerpoint_to_pdf():
    """Convierte presentaciones PowerPoint a PDF usando LibreOffice"""
    cleanup_temp_files()
    return process_libreoffice_conversion(
        request.files['file'] if 'file' in request.files else None,
        ['.ppt', '.pptx', '.odp'],
        'PowerPoint'
    )

@app.route('/split-pdf', methods=['POST'])
def split_pdf():
    """Divide un PDF en páginas individuales o rangos de páginas"""
    cleanup_temp_files()
    
    # Verificar si se envió un archivo
    if 'file' not in request.files:
        return jsonify({'error': 'No se envió ningún archivo'}), 400
    
    file = request.files['file']
    
    # Verificar que el archivo tenga nombre
    if file.filename == '':
        return jsonify({'error': 'No se seleccionó ningún archivo'}), 400
    
    # Verificar que el archivo sea PDF
    if not file.filename.endswith('.pdf'):
        return jsonify({'error': 'El archivo debe ser un documento PDF (.pdf)'}), 400
    
    # Obtener el modo de división
    split_mode = request.form.get('mode', 'all')
    split_ranges = []
    
    # Si el modo es "range", obtener los rangos
    if split_mode == 'range':
        try:
            ranges_json = request.form.get('ranges', '[]')
            split_ranges = json.loads(ranges_json)
        except json.JSONDecodeError:
            return jsonify({'error': 'Formato de rangos inválido'}), 400
    
    # Crear un nombre único para el archivo temporal
    filename = secure_filename(file.filename)
    temp_id = str(uuid.uuid4())
    input_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_{filename}")
    
    # Guardar el archivo
    try:
        file.save(input_path)
    except Exception as e:
        return jsonify({'error': f'Error al procesar el archivo: {str(e)}'}), 500
    
    # Verificar que el archivo se guardó correctamente
    if not os.path.exists(input_path):
        return jsonify({'error': 'Error al procesar el archivo.'}), 500
    
    # Lista para los archivos generados (que se eliminarán después)
    output_files = []
    output_files.append(input_path)  # Agregar el archivo original
    
    try:
        # Abrir el PDF
        pdf_reader = PyPDF2.PdfReader(input_path)
        num_pages = len(pdf_reader.pages)
        
        # Si no hay páginas, devolver error
        if num_pages == 0:
            return jsonify({'error': 'El PDF está vacío o dañado.'}), 400
        
        # Preparar el archivo ZIP para la respuesta
        zip_buffer = io.BytesIO()
        
        # Crear archivo ZIP
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            base_filename = os.path.splitext(filename)[0]
            
            if split_mode == 'all':
                # Dividir todas las páginas individualmente
                for i in range(num_pages):
                    pdf_writer = PyPDF2.PdfWriter()
                    pdf_writer.add_page(pdf_reader.pages[i])
                    
                    # Nombre del archivo individual
                    page_filename = f"{base_filename}_pagina_{i+1}.pdf"
                    output_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_{page_filename}")
                    
                    # Guardar la página individual
                    with open(output_path, 'wb') as output_pdf:
                        pdf_writer.write(output_pdf)
                    
                    # Agregar al ZIP y a la lista de archivos a eliminar
                    zip_file.write(output_path, page_filename)
                    output_files.append(output_path)
                    
            elif split_mode == 'range':
                # Dividir por rangos específicos
                for i, range_info in enumerate(split_ranges):
                    start_page = max(1, int(range_info.get('start', 1)))
                    end_page = min(num_pages, int(range_info.get('end', num_pages)))
                    
                    # Ajustar a base 0 para PyPDF2
                    start_page_idx = start_page - 1
                    end_page_idx = end_page - 1
                    
                    if start_page_idx > end_page_idx or start_page_idx < 0 or end_page_idx >= num_pages:
                        continue
                    
                    pdf_writer = PyPDF2.PdfWriter()
                    
                    # Añadir páginas en el rango
                    for j in range(start_page_idx, end_page_idx + 1):
                        pdf_writer.add_page(pdf_reader.pages[j])
                    
                    # Nombre del archivo individual
                    range_filename = f"{base_filename}_paginas_{start_page}-{end_page}.pdf"
                    output_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_{range_filename}")
                    
                    # Guardar el archivo de rango
                    with open(output_path, 'wb') as output_pdf:
                        pdf_writer.write(output_pdf)
                    
                    # Agregar al ZIP y a la lista de archivos a eliminar
                    zip_file.write(output_path, range_filename)
                    output_files.append(output_path)
        
        # Cerrar el buffer del ZIP y preparar para enviar
        zip_buffer.seek(0)
        
        # Nombre del archivo ZIP a descargar
        zip_filename = f"{base_filename}_dividido.zip"
        
        # Configurar limpieza retardada para eliminar archivos después de la descarga
        @after_this_request
        def cleanup_after_request(response):
            # Solo iniciar el hilo de limpieza si la respuesta es exitosa
            if response.status_code == 200:
                delayed_file_cleanup(output_files, delay_seconds=2)
            return response
        
        # Enviar el archivo ZIP como respuesta
        return send_file(
            io.BytesIO(zip_buffer.getvalue()),
            as_attachment=True,
            download_name=zip_filename,
            mimetype='application/zip'
        )
        
    except Exception as e:
        return jsonify({'error': f'Error al dividir el PDF: {str(e)}'}), 500

@app.route('/clean-temp', methods=['GET'])
def clean_temp():
    """Limpia la carpeta temporal de archivos"""
    try:
        count = 0
        total_size = 0
        
        for file in os.listdir(UPLOAD_FOLDER):
            file_path = os.path.join(UPLOAD_FOLDER, file)
            try:
                if os.path.isfile(file_path):
                    size = os.path.getsize(file_path)
                    total_size += size
                    os.remove(file_path)
                    count += 1
            except Exception:
                pass
        
        global last_cleanup_time
        last_cleanup_time = datetime.now()
        
        return jsonify({
            "status": "success",
            "message": f"Se eliminaron {count} archivos temporales",
            "espacio_liberado_kb": round(total_size / 1024, 2)
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Error al limpiar la carpeta temporal: {str(e)}"
        }), 500

@app.route('/merge-pdf', methods=['POST'])
def merge_pdf():
    """Fusiona múltiples archivos PDF en uno solo"""
    cleanup_temp_files()
    
    # Verificar si se enviaron archivos
    if 'files[]' not in request.files:
        return jsonify({'error': 'No se enviaron archivos'}), 400
    
    files = request.files.getlist('files[]')
    
    # Verificar que se enviaron al menos 2 archivos
    if len(files) < 2:
        return jsonify({'error': 'Se requieren al menos 2 archivos PDF para fusionar'}), 400
    
    # Verificar que todos los archivos sean PDFs
    for file in files:
        if not file.filename.endswith('.pdf'):
            return jsonify({'error': 'Todos los archivos deben ser documentos PDF (.pdf)'}), 400
    
    # Lista de archivos temporales (para limpieza posterior)
    temp_files = []
    
    # Ruta para el archivo de salida
    temp_id = str(uuid.uuid4())
    output_filename = f"{temp_id}_merged.pdf"
    output_path = os.path.join(UPLOAD_FOLDER, output_filename)
    
    try:
        # Crear un nuevo PDF para la fusión
        pdf_merger = PyPDF2.PdfMerger()
        
        # Procesar cada archivo
        for file in files:
            # Crear un nombre único para el archivo temporal
            filename = secure_filename(file.filename)
            temp_file_id = str(uuid.uuid4())
            input_path = os.path.join(UPLOAD_FOLDER, f"{temp_file_id}_{filename}")
            
            # Guardar el archivo
            try:
                file.save(input_path)
                temp_files.append(input_path)  # Agregarlo a la lista para limpieza
            except Exception as e:
                return jsonify({'error': f'Error al procesar el archivo {filename}: {str(e)}'}), 500
            
            # Verificar que el archivo se guardó correctamente
            if not os.path.exists(input_path):
                return jsonify({'error': f'Error al procesar el archivo {filename}'}), 500
            
            # Añadir el PDF al merger
            try:
                pdf_merger.append(input_path)
            except Exception as e:
                return jsonify({'error': f'Error al fusionar el archivo {filename}. El archivo puede estar dañado o protegido: {str(e)}'}), 400
        
        # Guardar el PDF fusionado
        pdf_merger.write(output_path)
        pdf_merger.close()
        
        # Agregar el archivo de salida a la lista de limpieza
        temp_files.append(output_path)
        
        # Configurar limpieza retardada para eliminar archivos después de la descarga
        @after_this_request
        def cleanup_after_request(response):
            # Solo iniciar el hilo de limpieza si la respuesta es exitosa
            if response.status_code == 200:
                delayed_file_cleanup(temp_files, delay_seconds=2)
            return response
        
        # Enviar el archivo PDF fusionado como respuesta
        return send_file(
            output_path,
            as_attachment=True,
            download_name="documentos_fusionados.pdf",
            mimetype='application/pdf'
        )
        
    except Exception as e:
        # Limpiar archivos temporales en caso de error
        for file_path in temp_files:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except:
                pass
        
        return jsonify({'error': f'Error al fusionar PDFs: {str(e)}'}), 500

@app.route('/compress-pdf', methods=['POST'])
def compress_pdf():
    """Comprime un archivo PDF según el nivel de compresión seleccionado"""
    cleanup_temp_files()
    
    # Verificar si se envió un archivo
    if 'file' not in request.files:
        return jsonify({'error': 'No se envió ningún archivo'}), 400
    
    file = request.files['file']
    
    # Verificar que el archivo tenga nombre
    if file.filename == '':
        return jsonify({'error': 'No se seleccionó ningún archivo'}), 400
    
    # Verificar que el archivo sea PDF
    if not file.filename.endswith('.pdf'):
        return jsonify({'error': 'El archivo debe ser un documento PDF (.pdf)'}), 400
    
    # Obtener el nivel de compresión
    compression_level = request.form.get('compressionLevel', 'medium')
    if compression_level not in ['low', 'medium', 'high']:
        compression_level = 'medium'  # valor predeterminado
    
    # Crear un nombre único para el archivo temporal
    filename = secure_filename(file.filename)
    temp_id = str(uuid.uuid4())
    input_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_{filename}")
    
    # Guardar el archivo
    try:
        file.save(input_path)
    except Exception as e:
        return jsonify({'error': f'Error al procesar el archivo: {str(e)}'}), 500
    
    # Verificar que el archivo se guardó correctamente
    if not os.path.exists(input_path):
        return jsonify({'error': 'Error al procesar el archivo.'}), 500
    
    # Nombre del archivo PDF comprimido
    output_filename = f"comprimido_{filename}"
    output_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_{output_filename}")
    
    # Definir calidad de compresión según el nivel
    if compression_level == 'low':
        # Compresión suave
        image_quality = 90
    elif compression_level == 'medium':
        # Compresión media
        image_quality = 70
    else:  # high
        # Compresión fuerte
        image_quality = 30
    
    try:
        # Usar pikepdf para comprimir el PDF
        import pikepdf
        import copy
        from pikepdf import PdfImage, Name, PdfError
        
        print(f"Comprimiendo {input_path} con nivel {compression_level}")
        input_size = os.path.getsize(input_path)
        print(f"Tamaño original: {input_size / 1024:.2f} KB")
        
        # Abrir el PDF con pikepdf
        with pikepdf.open(input_path) as pdf:
            # Modificador de imágenes - versión muy agresiva
            for page_num, page in enumerate(pdf.pages):
                try:
                    contents_key = Name.Contents
                    if contents_key not in page:
                        continue
                        
                    for image_key in ('/XObject', '/Resources/XObject'):
                        try:
                            xobjects = page.get_inheritable(Name('/XObject'))
                            if xobjects is None:
                                continue
                                
                            for k, v in dict(xobjects).items():
                                try:
                                    pim = PdfImage(v)
                                    
                                    if pim.image is not None and hasattr(pim.image, 'mode'):
                                        # Reducir la calidad solo para imágenes a color o escala de grises
                                        if pim.image.mode in ('RGB', 'RGBA', 'CMYK', 'L'):
                                            format = 'JPEG'
                                            # Usar una calidad agresiva para ciertas imágenes
                                            if pim.width > 1000 or pim.height > 1000:
                                                quality = max(15, image_quality - 20)  # Muy agresivo para imágenes grandes
                                            else:
                                                quality = image_quality
                                            
                                            try:
                                                import io
                                                
                                                # Convertir a RGB si es CMYK
                                                img = pim.image
                                                if img.mode == 'CMYK':
                                                    img = img.convert('RGB')
                                                
                                                # Para imágenes muy grandes, redimensionar
                                                if pim.width > 2000 or pim.height > 2000:
                                                    ratio = min(2000 / pim.width, 2000 / pim.height)
                                                    new_width = int(pim.width * ratio)
                                                    new_height = int(pim.height * ratio)
                                                    img = img.resize((new_width, new_height), Image.LANCZOS)
                                                
                                                out = io.BytesIO()
                                                img.save(out, format=format, quality=quality, optimize=True)
                                                out.seek(0)
                                                
                                                # Reemplazar la imagen original
                                                xobjects[k] = pdf.make_stream(out.read())
                                            except Exception as img_err:
                                                print(f"Error procesando imagen: {img_err}")
                                except PdfError:
                                    continue
                        except Exception as e:
                            print(f"Error procesando recursos de página {page_num}: {e}")
                except Exception as e:
                    print(f"Error procesando página {page_num}: {e}")
            
            # Configuraciones específicas para optimizar el PDF por completo
            save_options = {
                'compress_streams': True,
                'object_stream_mode': pikepdf.ObjectStreamMode.generate,
                'normalize_content': True,
                'linearize': False,  # True puede hacer PDFs más rápidos para web pero a veces más grandes
            }
            
            # Guardar el PDF comprimido
            pdf.save(output_path, **save_options)
            
        output_size = os.path.getsize(output_path)
        print(f"Tamaño comprimido: {output_size / 1024:.2f} KB")
        print(f"Ratio de compresión: {output_size / input_size * 100:.2f}%")
        
        # Si el PDF comprimido es más grande que el original, usar el original
        if output_size >= input_size:
            import shutil
            print("El archivo comprimido es más grande que el original. Usando el original.")
            shutil.copy(input_path, output_path)
            output_size = input_size
    
    except Exception as e:
        print(f"Error en compresión con pikepdf: {e}")
        print("Intentando compresión alternativa...")
        
        # Compresión alternativa con PyPDF2
        try:
            import PyPDF2
            
            reader = PyPDF2.PdfReader(input_path)
            writer = PyPDF2.PdfWriter()
            
            # Copiar cada página
            for page in reader.pages:
                writer.add_page(page)
            
            # Comprimir con todas las opciones habilitadas
            writer._compress = True
            writer._compress_streams = True
                
            # Guardar el PDF comprimido
            with open(output_path, 'wb') as output_file:
                writer.write(output_file)
                
            output_size = os.path.getsize(output_path)
            
            # Si el PDF comprimido es más grande que el original, usar el original
            if output_size >= input_size:
                import shutil
                print("El archivo comprimido es más grande que el original. Usando el original.")
                shutil.copy(input_path, output_path)
                output_size = input_size
                
        except Exception as e:
            return jsonify({'error': f'Error al comprimir el PDF: {str(e)}'}), 500
    
    # Obtener estadísticas de compresión
    input_size = os.path.getsize(input_path)
    output_size = os.path.getsize(output_path)
    compression_ratio = 100 - (output_size / input_size * 100)
    compression_info = {
        'input_size': input_size,
        'output_size': output_size,
        'ratio': compression_ratio
    }
    
    print(f"Compresión final: {compression_info}")
    
    # Lista de archivos a eliminar después de la descarga
    files_to_delete = [input_path, output_path]
    
    # Configurar limpieza retardada para eliminar archivos después de la descarga
    @after_this_request
    def cleanup_after_request(response):
        # Solo iniciar el hilo de limpieza si la respuesta es exitosa
        if response.status_code == 200:
            delayed_file_cleanup(files_to_delete, delay_seconds=2)
        return response
    
    # Enviar el archivo PDF comprimido
    return send_file(
        output_path, 
        as_attachment=True,
        download_name=output_filename,
        mimetype='application/pdf'
    )

@app.route('/pdf-to-jpg', methods=['POST'])
def pdf_to_jpg():
    """Convierte páginas de PDF en imágenes JPG"""
    try:
        # Verificar si hay un archivo en la petición
        if 'file' not in request.files:
            return jsonify({'error': 'No se ha proporcionado un archivo PDF'}), 400
        
        file = request.files['file']
        
        # Verificar si se seleccionó un archivo
        if file.filename == '':
            return jsonify({'error': 'No se ha seleccionado un archivo'}), 400
        
        # Verificar si el archivo es un PDF
        if not file.filename.endswith('.pdf'):
            return jsonify({'error': 'El archivo debe ser un PDF'}), 400
        
        # Obtener calidad de imagen y rango de páginas
        if request.form.get('imageQuality') == 'low':
            quality = 30  # Baja calidad
        elif request.form.get('imageQuality') == 'medium':
            quality = 60  # Calidad media
        elif request.form.get('imageQuality') == 'high':
            quality = 90  # Alta calidad
        else:
            quality = 60  # Por defecto, calidad media
        
        # Procesar rangos de páginas
        page_range = request.form.get('pageRange', 'all')
        
        # Generar un ID único para los archivos temporales
        temp_id = str(uuid.uuid4())
        
        # Guardar el archivo subido temporalmente
        upload_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_{file.filename}")
        file.save(upload_path)
        filename = file.filename
        
        # Preparar ruta para guardar las imágenes
        import io
        
        # Crear un archivo zip para almacenar todas las imágenes
        zip_filename = f"{temp_id}_pdf_images.zip"
        zip_path = os.path.join(UPLOAD_FOLDER, zip_filename)
        
        with zipfile.ZipFile(zip_path, 'w') as zip_file:
            try:
                # Abrir el PDF
                pdf_document = fitz.open(upload_path)
                
                # Determinar las páginas a procesar
                if page_range == 'all':
                    pages_to_process = range(pdf_document.page_count)
                else:
                    # Parsear el rango personalizado
                    pages_to_process = []
                    ranges = page_range.split(',')
                    for r in ranges:
                        if '-' in r:
                            start, end = map(int, r.split('-'))
                            pages_to_process.extend(range(start-1, end))
                        else:
                            pages_to_process.append(int(r) - 1)
                    
                    # Eliminar duplicados y ordenar
                    pages_to_process = sorted(set(pages_to_process))
                    
                    # Verificar que las páginas existan
                    pages_to_process = [p for p in pages_to_process if 0 <= p < pdf_document.page_count]
                
                # Convertir las páginas a JPG y añadirlas al ZIP
                dpi = 300  # Resolución de la imagen (mayor para mejor calidad)
                
                # Procesar cada página seleccionada
                for page_num in pages_to_process:
                    page = pdf_document.load_page(page_num)
                    
                    # Renderizar página a imagen con la resolución deseada
                    pix = page.get_pixmap(matrix=fitz.Matrix(dpi/72, dpi/72))
                    
                    # Crear un archivo temporal para la imagen JPG
                    img_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_page_{page_num}.jpg")
                    
                    # Guardar la imagen como JPG
                    pix.save(img_path)
                    
                    # Optimizar la imagen con PIL si es necesario
                    img = Image.open(img_path)
                    img.save(img_path, format='JPEG', quality=quality, optimize=True)
                    
                    # Añadir la imagen al ZIP
                    zip_file.write(img_path, f"page_{page_num}.jpg")
                    
                    # Eliminar el archivo temporal de la imagen
                    os.remove(img_path)
                
                pdf_document.close()
                
            except Exception as e:
                logger.error(f"Error procesando PDF: {e}")
                return jsonify({'error': f'Error al procesar el PDF: {str(e)}'}), 500
        
        # Eliminar el archivo PDF temporal
        os.remove(upload_path)
        
        # Devolver el archivo ZIP
        return send_file(
            zip_path,
            as_attachment=True,
            download_name=f"{os.path.splitext(filename)[0]}_images.zip",
            mimetype='application/zip'
        )
    
    except Exception as e:
        logger.error(f"Error en conversión PDF a JPG: {e}")
        return jsonify({'error': f'Error al procesar la solicitud: {str(e)}'}), 500

@app.route('/jpg-to-pdf', methods=['POST'])
def jpg_to_pdf():
    """Convierte imágenes JPG a un archivo PDF"""
    try:
        logger.info("Inicio de solicitud JPG a PDF")
        # Verificar si hay imágenes en la petición
        if 'images' not in request.files:
            logger.error("No se han proporcionado imágenes")
            return jsonify({'error': 'No se han proporcionado imágenes'}), 400
        
        # Obtener las imágenes subidas (pueden ser múltiples)
        image_files = request.files.getlist('images')
        
        # Verificar si se seleccionaron imágenes
        if len(image_files) == 0 or all(img.filename == '' for img in image_files):
            logger.error("No se han seleccionado imágenes")
            return jsonify({'error': 'No se han seleccionado imágenes'}), 400
        
        logger.info(f"Procesando {len(image_files)} imágenes")
        
        # Generar un ID único para los archivos temporales
        temp_id = str(uuid.uuid4())
        
        # Obtener parámetros adicionales
        document_title = request.form.get('documentTitle', 'Documento PDF')
        page_size = request.form.get('pageSize', 'a4')
        
        logger.info(f"Título: {document_title}, Tamaño: {page_size}")
        
        # Crear un nuevo documento PDF
        from reportlab.lib.pagesizes import A4, LETTER, LEGAL
        from reportlab.pdfgen import canvas
        from reportlab.lib.units import mm
        from reportlab.lib.utils import ImageReader
        from PIL import Image
        import io
        import os
        
        # Determinar el tamaño de página para el PDF
        page_size_map = {
            'a4': A4,
            'letter': LETTER,
            'legal': LEGAL,
        }
        
        # Ruta para el archivo PDF temporal
        pdf_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_output.pdf")
        
        # Verificar que la carpeta temporal exista
        if not os.path.exists(UPLOAD_FOLDER):
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            
        logger.info(f"Carpeta temporal: {UPLOAD_FOLDER}")
        logger.info(f"PDF path: {pdf_path}")
        
        # Guardar las imágenes temporalmente
        temp_image_paths = []
        
        for i, img_file in enumerate(image_files):
            # Solo procesar archivos de imagen válidos
            if img_file and img_file.filename != '':
                img_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_img_{i}_{img_file.filename}")
                img_file.save(img_path)
                temp_image_paths.append(img_path)
                logger.info(f"Imagen guardada: {img_path}")
        
        # Definir el DPI para las imágenes
        dpi = 300
        
        # Si se seleccionó "fit", determinar el tamaño de página según la primera imagen
        if page_size == 'fit' and temp_image_paths:
            try:
                with Image.open(temp_image_paths[0]) as img:
                    # Convertir de píxeles a mm (asumiendo 300 DPI)
                    width_mm = img.width / dpi * 25.4
                    height_mm = img.height / dpi * 25.4
                    custom_page_size = (width_mm * mm, height_mm * mm)
                    logger.info(f"Tamaño de página personalizado: {width_mm}mm x {height_mm}mm")
            except Exception as e:
                logger.error(f"Error al calcular tamaño personalizado: {e}")
                custom_page_size = page_size_map.get(page_size, A4)
        else:
            custom_page_size = page_size_map.get(page_size, A4)
            logger.info(f"Usando tamaño de página predefinido: {page_size}")
        
        # Crear el PDF con reportlab
        try:
            c = canvas.Canvas(pdf_path, pagesize=custom_page_size)
            
            # Configurar los metadatos del PDF
            c.setTitle(document_title)
            c.setAuthor("EvariScan")
            c.setSubject("Imágenes convertidas a PDF")
            
            # Procesar cada imagen
            for img_path in temp_image_paths:
                try:
                    img = Image.open(img_path)
                    
                    # Si es PNG con transparencia, convertir a RGB con fondo blanco
                    if img.mode == 'RGBA':
                        background = Image.new('RGB', img.size, (255, 255, 255))
                        background.paste(img, mask=img.split()[3])  # 3 es el canal alpha
                        img = background
                    elif img.mode != 'RGB':
                        img = img.convert('RGB')
                    
                    # Obtener el tamaño de página actual
                    page_width, page_height = custom_page_size
                    
                    # Ajustar la imagen para que quepa en la página con márgenes
                    margin_mm = 10 * mm  # 10mm de margen
                    max_width = page_width - (2 * margin_mm)
                    max_height = page_height - (2 * margin_mm)
                    
                    # Calcular la escala para ajustar la imagen dentro de los márgenes
                    img_width_pt = img.width / dpi * 72
                    img_height_pt = img.height / dpi * 72
                    
                    # Determinar el factor de escala
                    width_ratio = max_width / img_width_pt
                    height_ratio = max_height / img_height_pt
                    scale_factor = min(width_ratio, height_ratio)
                    
                    # Calcular las dimensiones finales de la imagen
                    final_width = img_width_pt * scale_factor
                    final_height = img_height_pt * scale_factor
                    
                    # Calcular la posición para centrar la imagen en la página
                    x_pos = (page_width - final_width) / 2
                    y_pos = (page_height - final_height) / 2
                    
                    logger.info(f"Procesando imagen {img_path}: {img.width}x{img.height} -> {final_width}x{final_height}")
                    
                    # Guardar la imagen temporalmente en un formato que reportlab pueda manejar
                    img_buffer = io.BytesIO()
                    img.save(img_buffer, format='JPEG', quality=95)
                    img_buffer.seek(0)
                    
                    # Añadir la imagen al PDF
                    c.drawImage(
                        ImageReader(img_buffer), 
                        x_pos, y_pos, 
                        width=final_width, 
                        height=final_height
                    )
                    
                    # Cerrar el buffer
                    img_buffer.close()
                    
                    # Añadir una nueva página para la siguiente imagen
                    c.showPage()
                    
                except Exception as img_err:
                    logger.error(f"Error procesando imagen {img_path}: {img_err}")
                    # Continuar con la siguiente imagen si hay un error
            
            # Guardar el PDF
            c.save()
            logger.info(f"PDF creado exitosamente: {pdf_path}")
            
            # Eliminar las imágenes temporales
            for img_path in temp_image_paths:
                try:
                    os.remove(img_path)
                except Exception as e:
                    logger.error(f"Error al eliminar imagen temporal {img_path}: {e}")
            
            # Verificar que el PDF existe
            if not os.path.exists(pdf_path):
                logger.error("El archivo PDF no se creó correctamente")
                return jsonify({'error': 'Error al crear el PDF'}), 500
                
            # Configurar limpieza automática del archivo después de la descarga
            @after_this_request
            def cleanup_after_request(response):
                # Solo iniciar el hilo de limpieza si la respuesta es exitosa
                if response.status_code == 200:
                    delayed_file_cleanup([pdf_path], delay_seconds=5)
                return response
            
            # Devolver el PDF generado
            logger.info("Enviando PDF al cliente")
            return send_file(
                pdf_path,
                as_attachment=True,
                download_name=f"{document_title.replace(' ', '_')}.pdf",
                mimetype='application/pdf'
            )
            
        except Exception as canvas_err:
            logger.error(f"Error al crear el canvas del PDF: {canvas_err}")
            return jsonify({'error': f'Error al crear el PDF: {str(canvas_err)}'}), 500
    
    except Exception as e:
        logger.error(f"Error en conversión JPG a PDF: {e}")
        return jsonify({'error': f'Error al procesar la solicitud: {str(e)}'}), 500

@app.route('/pdf-to-pdfa', methods=['POST'])
def pdf_to_pdfa():
    """Convierte un PDF estándar a formato PDF/A para archivo y preservación a largo plazo"""
    try:
        logger.info("Inicio de solicitud PDF a PDF/A")
        
        # Verificar si Ghostscript está disponible
        if not GHOSTSCRIPT_PATH:
            logger.error("Ghostscript no está disponible para la conversión a PDF/A")
            return jsonify({'error': 'Ghostscript no está disponible en el servidor. No se puede realizar la conversión a PDF/A.'}), 500
            
        # Verificar si hay un archivo en la petición
        if 'file' not in request.files:
            logger.error("No se ha proporcionado un archivo PDF")
            return jsonify({'error': 'No se ha proporcionado un archivo PDF'}), 400
        
        file = request.files['file']
        
        # Verificar si se seleccionó un archivo
        if file.filename == '':
            logger.error("No se ha seleccionado un archivo")
            return jsonify({'error': 'No se ha seleccionado un archivo'}), 400
        
        # Verificar si el archivo es un PDF
        if not file.filename.endswith('.pdf'):
            logger.error("El archivo debe ser un PDF")
            return jsonify({'error': 'El archivo debe ser un PDF'}), 400
        
        # Obtener el nivel de conformidad de PDF/A
        conformance_level = request.form.get('conformanceLevel', 'pdfa-2b')
        
        logger.info(f"Procesando PDF a PDF/A con nivel de conformidad: {conformance_level}")
        
        # Generar un ID único para los archivos temporales
        temp_id = str(uuid.uuid4())
        
        # Guardar el archivo subido temporalmente
        upload_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_{file.filename}")
        file.save(upload_path)
        filename = file.filename
        
        logger.info(f"Archivo guardado temporalmente: {upload_path}")
        
        # Ruta para el archivo PDF/A de salida
        output_filename = f"{os.path.splitext(filename)[0]}_pdfa.pdf"
        output_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_{output_filename}")
        
        try:
            # Usamos Ghostscript para convertir a PDF/A
            import subprocess
            
            # Configurar parámetros de conversión según el nivel solicitado
            gs_pdfa_defs = {
                'pdfa-1b': 'PDFA1B',
                'pdfa-2b': 'PDFA2B',
                'pdfa-3b': 'PDFA3B',
                'pdfa-2u': 'PDFA2U',
                'pdfa-3u': 'PDFA3U'
            }
            
            # Usar el nivel solicitado o el predeterminado
            pdfa_def = gs_pdfa_defs.get(conformance_level, 'PDFA2B')
            
            # Comando para Ghostscript (ajustado según el sistema operativo)
            gs_command = [
                GHOSTSCRIPT_PATH,
                '-dPDFA={}'.format('2' if 'pdfa-2' in conformance_level else ('3' if 'pdfa-3' in conformance_level else '1')),
                '-dBATCH',
                '-dNOPAUSE',
                '-dNOOUTERSAVE',
                '-dPDFACompatibilityPolicy=1',
                '-sProcessColorModel=DeviceRGB',
                '-sColorConversionStrategy=RGB',
                '-sDEVICE=pdfwrite',
                '-dPDFSETTINGS=/prepress',
                f'-sOutputFile={output_path}',
                upload_path
            ]
            
            # Ejecutar el comando
            logger.info(f"Ejecutando Ghostscript con comando: {' '.join(gs_command)}")
            result = subprocess.run(gs_command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            # Verificar que la conversión fue exitosa
            if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                logger.error("Falló la conversión a PDF/A - archivo no generado")
                return jsonify({'error': 'Error al convertir a PDF/A: Ghostscript no generó el archivo de salida'}), 500
                
            logger.info(f"PDF/A generado exitosamente: {output_path}")
            
            # Configurar limpieza automática del archivo después de la descarga
            @after_this_request
            def cleanup_after_request(response):
                # Solo iniciar el hilo de limpieza si la respuesta es exitosa
                if response.status_code == 200:
                    delayed_file_cleanup([upload_path, output_path], delay_seconds=5)
                return response
            
            # Devolver el PDF/A generado
            logger.info(f"Enviando PDF/A al cliente: {output_filename}")
            return send_file(
                output_path,
                as_attachment=True,
                download_name=output_filename,
                mimetype='application/pdf'
            )
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Error de GhostScript: {e.stderr.decode() if e.stderr else 'No hay mensaje de error'}")
            return jsonify({'error': f'Error al convertir a PDF/A: Error de Ghostscript - {e.stderr.decode() if e.stderr else "Error desconocido"}'}), 500
        except Exception as e:
            logger.error(f"Error en la conversión a PDF/A: {e}")
            return jsonify({'error': f'Error al procesar la solicitud: {str(e)}'}), 500
        finally:
            # Limpiar archivos en caso de error
            try:
                if os.path.exists(upload_path):
                    os.remove(upload_path)
            except Exception as e:
                logger.error(f"Error al eliminar archivo temporal: {e}")
    
    except Exception as e:
        logger.error(f"Error en conversión PDF a PDF/A: {e}")
        return jsonify({'error': f'Error al procesar la solicitud: {str(e)}'}), 500

@app.route('/sign-pdf', methods=['POST'])
def sign_pdf():
    """Añade una firma a un documento PDF"""
    try:
        logger.info("Iniciando proceso de firma de PDF")
        
        # Verificar si hay un archivo en la petición
        if 'file' not in request.files:
            logger.error("No se ha proporcionado un archivo PDF")
            return jsonify({'error': 'No se ha proporcionado un archivo PDF'}), 400
        
        pdf_file = request.files['file']
        
        # Verificar si se seleccionó un archivo
        if pdf_file.filename == '':
            logger.error("No se ha seleccionado un archivo")
            return jsonify({'error': 'No se ha seleccionado un archivo'}), 400
        
        # Verificar si el archivo es un PDF
        if not pdf_file.filename.endswith('.pdf'):
            logger.error("El archivo debe ser un PDF")
            return jsonify({'error': 'El archivo debe ser un PDF'}), 400
        
        # Obtener parámetros de la firma
        signature_type = request.form.get('signatureType', 'text')  # 'text' o 'draw'
        signature_name = request.form.get('signatureName', '')  # para firma de texto
        signature_position = request.form.get('signaturePosition', 'bottom-right')
        signature_image = None
        
        # Si es firma dibujada, obtener la imagen
        if signature_type == 'draw' and 'signatureImage' in request.files:
            signature_image = request.files['signatureImage']
        
        # Crear IDs únicos para archivos temporales
        temp_id = str(uuid.uuid4())
        pdf_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_{pdf_file.filename}")
        output_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_firmado_{pdf_file.filename}")
        
        # Guardar el PDF original
        pdf_file.save(pdf_path)
        
        # Crear firma según el tipo
        signature_img_path = None
        
        try:
            if signature_type == 'text':
                # Crear imagen con firma de texto
                from PIL import Image, ImageDraw, ImageFont
                import io
                
                # Dimensiones de la imagen de la firma
                width = 400
                height = 100
                
                # Crear imagen en blanco con fondo transparente
                signature_img = Image.new('RGBA', (width, height), (255, 255, 255, 0))
                draw = ImageDraw.Draw(signature_img)
                
                # Intenta usar una fuente de firma, si está disponible
                try:
                    font_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets', 'fonts', 'signature.ttf')
                    if os.path.exists(font_path):
                        font = ImageFont.truetype(font_path, size=32)
                    else:
                        # Usar fuente por defecto si no se encuentra la específica
                        font = ImageFont.load_default()
                except Exception:
                    font = ImageFont.load_default()
                
                # Dibujar el texto
                text_color = (0, 0, 0, 255)  # Negro
                draw.text((10, 20), signature_name, font=font, fill=text_color)
                
                # Guardar la imagen de la firma
                signature_img_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_signature.png")
                signature_img.save(signature_img_path, format='PNG')
                
            elif signature_type == 'draw' and signature_image:
                # Guardar la imagen de la firma dibujada
                signature_img_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_signature.png")
                signature_image.save(signature_img_path)
            else:
                return jsonify({'error': 'Tipo de firma no válido o falta imagen de firma'}), 400
            
            # Procesar el PDF y añadir la firma
            from PyPDF2 import PdfReader, PdfWriter
            from reportlab.pdfgen import canvas
            from reportlab.lib.pagesizes import letter
            import io
            
            # Crear un PDF temporal con la firma
            packet = io.BytesIO()
            can = canvas.Canvas(packet, pagesize=letter)
            
            # Determinar posición según la opción seleccionada
            if signature_position == 'bottom-right':
                x, y = 450, 100
            elif signature_position == 'bottom-left':
                x, y = 100, 100
            elif signature_position == 'top-right':
                x, y = 450, 700
            elif signature_position == 'top-left':
                x, y = 100, 700
            else:
                x, y = 450, 100  # Por defecto abajo a la derecha
            
            # Añadir la imagen al canvas
            can.drawImage(signature_img_path, x, y, width=130, height=50, mask='auto')
            can.save()
            
            # Mover al comienzo del StringIO buffer
            packet.seek(0)
            
            # Crear un nuevo PDF con la firma
            new_pdf = PdfReader(packet)
            
            # Leer el PDF original
            existing_pdf = PdfReader(pdf_path)
            writer = PdfWriter()
            
            # Añadir la firma a la última página
            page = existing_pdf.pages[-1]
            page.merge_page(new_pdf.pages[0])
            
            # Añadir todas las páginas al nuevo documento
            for i in range(len(existing_pdf.pages)):
                if i == len(existing_pdf.pages) - 1:
                    # La última página ya fue procesada
                    writer.add_page(page)
                else:
                    writer.add_page(existing_pdf.pages[i])
            
            # Escribir el PDF resultante
            with open(output_path, 'wb') as output_file:
                writer.write(output_file)
            
            logger.info(f"PDF firmado correctamente: {output_path}")
            
            # Lista de archivos temporales para limpiar
            temp_files = [pdf_path, output_path]
            if signature_img_path:
                temp_files.append(signature_img_path)
            
            # Configurar limpieza después de la solicitud
            @after_this_request
            def cleanup_after_request(response):
                # Solo iniciar el hilo de limpieza si la respuesta es exitosa
                if response.status_code == 200:
                    delayed_file_cleanup(temp_files, delay_seconds=5)
                return response
            
            # Devolver el PDF firmado
            return send_file(
                output_path,
                as_attachment=True,
                download_name=f"firmado_{pdf_file.filename}",
                mimetype='application/pdf'
            )
            
        except Exception as e:
            logger.error(f"Error al firmar el PDF: {str(e)}")
            if signature_img_path and os.path.exists(signature_img_path):
                os.remove(signature_img_path)
            return jsonify({'error': f'Error al procesar el PDF: {str(e)}'}), 500
            
    except Exception as e:
        logger.error(f"Error en la firma de PDF: {str(e)}")
        return jsonify({'error': f'Error al procesar la solicitud: {str(e)}'}), 500

@app.route('/watermark-pdf', methods=['POST'])
def watermark_pdf():
    """Añade una marca de agua a un documento PDF"""
    try:
        logger.info("Iniciando proceso de marca de agua en PDF")
        
        # Verificar si hay un archivo en la petición
        if 'file' not in request.files:
            logger.error("No se ha proporcionado un archivo PDF")
            return jsonify({'error': 'No se ha proporcionado un archivo PDF'}), 400
        
        pdf_file = request.files['file']
        
        # Verificar si se seleccionó un archivo
        if pdf_file.filename == '':
            logger.error("No se ha seleccionado un archivo")
            return jsonify({'error': 'No se ha seleccionado un archivo'}), 400
        
        # Verificar si el archivo es un PDF
        if not pdf_file.filename.endswith('.pdf'):
            logger.error("El archivo debe ser un PDF")
            return jsonify({'error': 'El archivo debe ser un PDF'}), 400
        
        # Obtener parámetros de la marca de agua
        watermark_type = request.form.get('watermarkType', 'text')  # 'text' o 'image'
        watermark_text = request.form.get('watermarkText', 'CONFIDENCIAL')
        watermark_opacity = int(request.form.get('watermarkOpacity', 30))
        watermark_position = request.form.get('watermarkPosition', 'center')
        watermark_rotation = int(request.form.get('watermarkRotation', 45))
        
        # Crear IDs únicos para archivos temporales
        temp_id = str(uuid.uuid4())
        pdf_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_{pdf_file.filename}")
        output_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_watermark_{pdf_file.filename}")
        
        # Guardar el PDF original
        pdf_file.save(pdf_path)
        
        # Crear marca de agua según el tipo
        watermark_img_path = None
        
        try:
            if watermark_type == 'text':
                # Crear imagen con marca de agua de texto
                from PIL import Image, ImageDraw, ImageFont
                
                # Dimensiones de la imagen para la marca de agua
                width = 600
                height = 600
                
                # Crear imagen en blanco con fondo transparente
                watermark_img = Image.new('RGBA', (width, height), (255, 255, 255, 0))
                draw = ImageDraw.Draw(watermark_img)
                
                # Intentar usar una fuente, si está disponible
                try:
                    # Usar la fuente del sistema
                    font = ImageFont.truetype("arial.ttf", size=60)
                except Exception:
                    # Usar fuente por defecto si no se encuentra la específica
                    font = ImageFont.load_default()
                
                # Calcular las dimensiones del texto para centrarlo
                # Método antiguo descontinuado: text_width, text_height = draw.textsize(watermark_text, font=font)
                # En versiones recientes de Pillow, usar textbbox o getbbox
                if hasattr(font, "getbbox"):
                    # Pillow >= 9.2.0
                    bbox = font.getbbox(watermark_text)
                    text_width, text_height = bbox[2] - bbox[0], bbox[3] - bbox[1]
                elif hasattr(font, "getsize"):
                    # Pillow < 9.2.0 pero > 8.0.0
                    text_width, text_height = font.getsize(watermark_text)
                else:
                    # Fallback para versiones muy antiguas
                    text_width, text_height = 300, 50  # Valor predeterminado razonable
                
                position = ((width - text_width) / 2, (height - text_height) / 2)
                
                # Dibujar el texto con la opacidad especificada
                opacity = int(255 * watermark_opacity / 100)
                text_color = (0, 0, 0, opacity)  # Negro con opacidad variable
                
                # Asegurarse de que la opacidad esté en el rango correcto
                if opacity < 0:
                    opacity = 0
                elif opacity > 255:
                    opacity = 255
                
                # Dibujar el texto con la función correcta según la versión de Pillow
                try:
                    # Método más reciente
                    draw.text(position, watermark_text, font=font, fill=text_color)
                except Exception as e:
                    logger.error(f"Error al dibujar texto: {e}")
                    # Fallback si hay algún error
                    try:
                        # Intentar con texto simple
                        draw.text(position, watermark_text, fill=text_color)
                    except:
                        logger.error("Error en fallback para dibujar texto")
                
                # Rotar la imagen si es necesario
                if watermark_rotation != 0:
                    try:
                        watermark_img = watermark_img.rotate(watermark_rotation, expand=True, resample=Image.BICUBIC)
                    except:
                        # Fallback para versiones antiguas de Pillow
                        watermark_img = watermark_img.rotate(watermark_rotation, expand=True)
                
                # Guardar la imagen de la marca de agua
                watermark_img_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_watermark.png")
                watermark_img.save(watermark_img_path, format='PNG')
            elif watermark_type == 'image' and 'watermarkImage' in request.files:
                # Guardar la imagen de la marca de agua
                watermark_image = request.files['watermarkImage']
                watermark_img_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_watermark.png")
                watermark_image.save(watermark_img_path)
                
                try:
                    # Procesar la imagen con Pillow para ajustar opacidad
                    from PIL import Image
                    
                    # Abrir la imagen y convertir a RGBA si no lo está ya
                    img = Image.open(watermark_img_path)
                    if img.mode != 'RGBA':
                        img = img.convert("RGBA")
                    
                    # Ajustar la opacidad de la imagen
                    # Asegurarse de que la opacidad esté en el rango correcto (0-100)
                    if watermark_opacity < 0:
                        watermark_opacity = 0
                    elif watermark_opacity > 100:
                        watermark_opacity = 100
                    
                    # Crear una imagen con la opacidad ajustada
                    pixels = img.load()
                    width, height = img.size
                    for y in range(height):
                        for x in range(width):
                            r, g, b, a = pixels[x, y]
                            # Ajustar opacidad manteniendo el canal alfa proporcional
                            pixels[x, y] = (r, g, b, int(a * watermark_opacity / 100))
                    
                    # Rotar la imagen si es necesario
                    if watermark_rotation != 0:
                        try:
                            # Método más reciente con antialiasing
                            img = img.rotate(watermark_rotation, expand=True, resample=Image.BICUBIC)
                        except:
                            # Fallback para versiones antiguas de Pillow
                            img = img.rotate(watermark_rotation, expand=True)
                    
                    # Guardar la imagen procesada
                    img.save(watermark_img_path, "PNG")
                except Exception as e:
                    logger.error(f"Error al procesar imagen de marca de agua: {e}")
                    # Si hay un error, intentamos usar la imagen original sin procesar
            else:
                return jsonify({'error': 'Tipo de marca de agua no válido o falta imagen'}), 400
            
            # Procesar el PDF y añadir la marca de agua
            from PyPDF2 import PdfReader, PdfWriter
            from reportlab.pdfgen import canvas
            from reportlab.lib.pagesizes import letter
            import io
            
            # Leer el PDF original
            existing_pdf = PdfReader(pdf_path)
            writer = PdfWriter()
            
            # Aplicar marca de agua a cada página
            for page_num in range(len(existing_pdf.pages)):
                page = existing_pdf.pages[page_num]
                
                # Obtener dimensiones de la página
                page_width = float(page.mediabox.width)
                page_height = float(page.mediabox.height)
                
                # Crear un PDF temporal con la marca de agua
                packet = io.BytesIO()
                can = canvas.Canvas(packet, pagesize=(page_width, page_height))
                
                # Ajustar dimensiones de la marca de agua según la posición
                if watermark_position == 'tile':
                    # Para mosaico, usar dimensiones más pequeñas
                    watermark_width = page_width * 0.3
                    watermark_height = page_height * 0.3
                    
                    # Calcular cuántas marcas se necesitan para cubrir la página
                    columns = int(page_width / watermark_width) + 1
                    rows = int(page_height / watermark_height) + 1
                    
                    # Dibujar la marca de agua en un patrón de mosaico
                    for row in range(rows):
                        for col in range(columns):
                            x = col * watermark_width
                            y = row * watermark_height
                            can.drawImage(
                                watermark_img_path, 
                                x, y, 
                                width=watermark_width, 
                                height=watermark_height, 
                                mask='auto'
                            )
                else:
                    # Para posiciones específicas, ajustar tamaño según ubicación
                    if watermark_position == 'center':
                        # Marca de agua grande en el centro
                        watermark_width = page_width * 0.7
                        watermark_height = page_height * 0.7
                        x = page_width / 2 - watermark_width / 2
                        y = page_height / 2 - watermark_height / 2
                    elif watermark_position in ['top-left', 'top-right', 'bottom-left', 'bottom-right']:
                        # Marca de agua más pequeña en las esquinas
                        watermark_width = page_width * 0.3
                        watermark_height = page_height * 0.3
                        
                        # Establecer posición según la esquina seleccionada
                        margin = min(page_width, page_height) * 0.05  # Margen del 5%
                        
                        if watermark_position == 'top-left':
                            x, y = margin, page_height - watermark_height - margin
                        elif watermark_position == 'top-right':
                            x, y = page_width - watermark_width - margin, page_height - watermark_height - margin
                        elif watermark_position == 'bottom-left':
                            x, y = margin, margin
                        elif watermark_position == 'bottom-right':
                            x, y = page_width - watermark_width - margin, margin
                    else:
                        # Centro por defecto
                        watermark_width = page_width * 0.7
                        watermark_height = page_height * 0.7
                        x = page_width / 2 - watermark_width / 2
                        y = page_height / 2 - watermark_height / 2
                    
                    # Añadir la imagen al canvas en la posición calculada
                    can.drawImage(
                        watermark_img_path, 
                        x, y, 
                        width=watermark_width, 
                        height=watermark_height, 
                        mask='auto'
                    )
                
                can.save()
                
                # Mover al comienzo del StringIO buffer
                packet.seek(0)
                
                # Crear un nuevo PDF con la marca de agua
                new_pdf = PdfReader(packet)
                
                # Fusionar la página original con la marca de agua
                page.merge_page(new_pdf.pages[0])
                
                # Añadir la página al nuevo documento
                writer.add_page(page)
            
            # Escribir el PDF resultante
            with open(output_path, 'wb') as output_file:
                writer.write(output_file)
            
            logger.info(f"PDF con marca de agua creado correctamente: {output_path}")
            
            # Lista de archivos temporales para limpiar
            temp_files = [pdf_path, output_path]
            if watermark_img_path:
                temp_files.append(watermark_img_path)
            
            # Configurar limpieza después de la solicitud
            @after_this_request
            def cleanup_after_request(response):
                # Solo iniciar el hilo de limpieza si la respuesta es exitosa
                if response.status_code == 200:
                    delayed_file_cleanup(temp_files, delay_seconds=5)
                return response
            
            # Devolver el PDF con marca de agua
            return send_file(
                output_path,
                as_attachment=True,
                download_name=f"watermark_{pdf_file.filename}",
                mimetype='application/pdf'
            )
            
        except Exception as e:
            logger.error(f"Error al añadir marca de agua al PDF: {str(e)}")
            if watermark_img_path and os.path.exists(watermark_img_path):
                os.remove(watermark_img_path)
            return jsonify({'error': f'Error al procesar el PDF: {str(e)}'}), 500
            
    except Exception as e:
        logger.error(f"Error en marca de agua PDF: {str(e)}")
        return jsonify({'error': f'Error al procesar la solicitud: {str(e)}'}), 500

@app.route('/rotate-pdf', methods=['POST'])
def rotate_pdf():
    """Rota las páginas de un documento PDF"""
    try:
        logger.info("Iniciando proceso de rotación de PDF")
        
        # Verificar si hay un archivo en la petición
        if 'file' not in request.files:
            logger.error("No se ha proporcionado un archivo PDF")
            return jsonify({'error': 'No se ha proporcionado un archivo PDF'}), 400
        
        pdf_file = request.files['file']
        
        # Verificar si se seleccionó un archivo
        if pdf_file.filename == '':
            logger.error("No se ha seleccionado un archivo")
            return jsonify({'error': 'No se ha seleccionado un archivo'}), 400
        
        # Verificar si el archivo es un PDF
        if not pdf_file.filename.endswith('.pdf'):
            logger.error("El archivo debe ser un PDF")
            return jsonify({'error': 'El archivo debe ser un PDF'}), 400
        
        # Obtener parámetros de rotación
        rotation_angle = int(request.form.get('rotationAngle', '90'))
        rotate_all_pages = request.form.get('rotateAllPages', 'true').lower() == 'true'
        page_range = request.form.get('pageRange', '')
        
        # Crear IDs únicos para archivos temporales
        temp_id = str(uuid.uuid4())
        pdf_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_{pdf_file.filename}")
        output_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_rotado_{pdf_file.filename}")
        
        # Guardar el PDF original
        pdf_file.save(pdf_path)
        
        try:
            # Procesar el PDF para rotar sus páginas
            from PyPDF2 import PdfReader, PdfWriter
            
            # Leer el PDF original
            reader = PdfReader(pdf_path)
            writer = PdfWriter()
            
            # Determinar qué páginas rotar
            pages_to_rotate = []
            if rotate_all_pages:
                pages_to_rotate = list(range(len(reader.pages)))
            else:
                # Procesar el formato de rango (por ejemplo: "1-3,5,7-9")
                ranges = page_range.split(',')
                for r in ranges:
                    r = r.strip()
                    if not r:
                        continue
                        
                    try:
                        if '-' in r:
                            # Procesar un rango (por ejemplo: "1-3")
                            start, end = map(int, r.split('-'))
                            # Validar que el rango sea válido
                            if start > 0 and end >= start:
                                # Restar 1 porque las páginas de PyPDF2 son de base 0, pero el usuario ve desde 1
                                start = max(0, start - 1)  # Asegurar que no sea negativo
                                end = min(len(reader.pages), end)  # Asegurar que no exceda el límite
                                pages_to_rotate.extend(range(start, end))
                        else:
                            # Procesar un número individual (por ejemplo: "5")
                            page_num = int(r)
                            if page_num > 0 and page_num <= len(reader.pages):
                                # Restar 1 por la misma razón
                                pages_to_rotate.append(page_num - 1)
                    except ValueError:
                        # Ignorar valores no numéricos
                        logger.warning(f"Valor de rango de página no válido: {r}")
                        continue
            
            # Eliminar duplicados y ordenar
            pages_to_rotate = sorted(set(pages_to_rotate))
            
            # Verificar que haya páginas para rotar
            if not pages_to_rotate:
                logger.warning("No se encontraron páginas válidas para rotar")
                if not rotate_all_pages:
                    return jsonify({'error': 'No se encontraron páginas válidas en el rango especificado'}), 400
            
            # Aplicar rotación a las páginas seleccionadas
            for i in range(len(reader.pages)):
                page = reader.pages[i]
                
                if i in pages_to_rotate:
                    # Aplicar rotación (PyPDF2 usa 90 grados en sentido horario)
                    page.rotate(rotation_angle)
                
                writer.add_page(page)
            
            # Escribir el PDF resultante
            with open(output_path, 'wb') as output_file:
                writer.write(output_file)
            
            logger.info(f"PDF rotado correctamente: {output_path}")
            
            # Configurar limpieza después de la solicitud
            @after_this_request
            def cleanup_after_request(response):
                # Solo iniciar el hilo de limpieza si la respuesta es exitosa
                if response.status_code == 200:
                    delayed_file_cleanup([pdf_path, output_path], delay_seconds=5)
                return response
            
            # Devolver el PDF rotado
            return send_file(
                output_path,
                as_attachment=True,
                download_name=f"rotado_{pdf_file.filename}",
                mimetype='application/pdf'
            )
            
        except Exception as e:
            logger.error(f"Error al rotar el PDF: {str(e)}")
            return jsonify({'error': f'Error al procesar el PDF: {str(e)}'}), 500
            
    except Exception as e:
        logger.error(f"Error en la rotación de PDF: {str(e)}")
        return jsonify({'error': f'Error al procesar la solicitud: {str(e)}'}), 500

@app.route('/sort-pdf', methods=['POST'])
def sort_pdf():
    """Reordena las páginas de un documento PDF"""
    try:
        logger.info("Iniciando proceso de reordenación de PDF")
        
        # Verificar si hay un archivo en la petición
        if 'file' not in request.files:
            logger.error("No se ha proporcionado un archivo PDF")
            return jsonify({'error': 'No se ha proporcionado un archivo PDF'}), 400
        
        pdf_file = request.files['file']
        
        # Verificar si se seleccionó un archivo
        if pdf_file.filename == '':
            logger.error("No se ha seleccionado un archivo")
            return jsonify({'error': 'No se ha seleccionado un archivo'}), 400
        
        # Verificar si el archivo es un PDF
        if not pdf_file.filename.endswith('.pdf'):
            logger.error("El archivo debe ser un PDF")
            return jsonify({'error': 'El archivo debe ser un PDF'}), 400
        
        # Obtener el nuevo orden de páginas
        page_order = request.form.get('pageOrder', '')
        if not page_order:
            logger.error("No se ha especificado el orden de páginas")
            return jsonify({'error': 'No se ha especificado el orden de páginas'}), 400
        
        try:
            # Convertir la cadena de orden a una lista de índices (base 0)
            try:
                page_order = json.loads(page_order)
            except json.JSONDecodeError as e:
                logger.error(f"Error al decodificar JSON de orden de páginas: {e}")
                return jsonify({'error': 'Formato de orden de páginas incorrecto. Se esperaba un array JSON.'}), 400
            
            # Verificar que sea una lista
            if not isinstance(page_order, list):
                logger.error(f"El orden de páginas no es una lista: {type(page_order)}")
                return jsonify({'error': 'El orden de páginas debe ser una lista de números.'}), 400
            
            # Verificar que la lista no esté vacía
            if not page_order:
                logger.error("Lista de orden de páginas vacía")
                return jsonify({'error': 'El orden de páginas no puede estar vacío.'}), 400
            
            # Convertir a enteros y validar
            try:
                # Convertir de base 1 (frontend) a base 0 (PyPDF2)
                page_order = [int(i) - 1 for i in page_order]
            except (ValueError, TypeError) as e:
                logger.error(f"Error al convertir índices de página a enteros: {e}")
                return jsonify({'error': 'Los índices de página deben ser números enteros.'}), 400
        except Exception as e:
            logger.error(f"Error al procesar el orden de páginas: {str(e)}")
            return jsonify({'error': 'Formato de orden de páginas incorrecto. Detalles: ' + str(e)}), 400
        
        # Crear IDs únicos para archivos temporales
        temp_id = str(uuid.uuid4())
        pdf_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_{pdf_file.filename}")
        output_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_reordenado_{pdf_file.filename}")
        
        # Guardar el PDF original
        pdf_file.save(pdf_path)
        
        try:
            # Procesar el PDF para reordenar sus páginas
            from PyPDF2 import PdfReader, PdfWriter
            
            # Leer el PDF original
            reader = PdfReader(pdf_path)
            writer = PdfWriter()
            
            # Verificar que los índices sean válidos
            if max(page_order) >= len(reader.pages) or min(page_order) < 0:
                logger.error("Índices de página fuera de rango")
                return jsonify({'error': 'Índices de página fuera de rango'}), 400
            
            # Añadir páginas en el nuevo orden
            for page_idx in page_order:
                writer.add_page(reader.pages[page_idx])
            
            # Escribir el PDF resultante
            with open(output_path, 'wb') as output_file:
                writer.write(output_file)
            
            logger.info(f"PDF reordenado correctamente: {output_path}")
            
            # Configurar limpieza después de la solicitud
            @after_this_request
            def cleanup_after_request(response):
                # Solo iniciar el hilo de limpieza si la respuesta es exitosa
                if response.status_code == 200:
                    delayed_file_cleanup([pdf_path, output_path], delay_seconds=5)
                return response
            
            # Devolver el PDF reordenado
            return send_file(
                output_path,
                as_attachment=True,
                download_name=f"reordenado_{pdf_file.filename}",
                mimetype='application/pdf'
            )
            
        except Exception as e:
            logger.error(f"Error al reordenar el PDF: {str(e)}")
            return jsonify({'error': f'Error al procesar el PDF: {str(e)}'}), 500
            
    except Exception as e:
        logger.error(f"Error en la reordenación de PDF: {str(e)}")
        return jsonify({'error': f'Error al procesar la solicitud: {str(e)}'}), 500

@app.route('/get-pdf-info', methods=['POST'])
def get_pdf_info():
    """Obtiene información básica de un archivo PDF, como el número de páginas"""
    try:
        logger.info("Obteniendo información del PDF")
        
        # Verificar si hay un archivo en la petición
        if 'file' not in request.files:
            logger.error("No se ha proporcionado un archivo PDF")
            return jsonify({'error': 'No se ha proporcionado un archivo PDF'}), 400
        
        pdf_file = request.files['file']
        
        # Verificar si se seleccionó un archivo
        if pdf_file.filename == '':
            logger.error("No se ha seleccionado un archivo")
            return jsonify({'error': 'No se ha seleccionado un archivo'}), 400
        
        # Verificar si el archivo es un PDF
        if not pdf_file.filename.endswith('.pdf'):
            logger.error("El archivo debe ser un PDF")
            return jsonify({'error': 'El archivo debe ser un PDF'}), 400
        
        # Crear ID único para archivo temporal
        temp_id = str(uuid.uuid4())
        pdf_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_{pdf_file.filename}")
        
        # Guardar el PDF
        pdf_file.save(pdf_path)
        
        try:
            # Obtener información del PDF
            from PyPDF2 import PdfReader
            
            reader = PdfReader(pdf_path)
            page_count = len(reader.pages)
            
            # Información básica del documento
            info = {
                'pageCount': page_count,
                'filename': pdf_file.filename,
                'filesize': os.path.getsize(pdf_path)
            }
            
            # Limpiar el archivo temporal
            if os.path.exists(pdf_path):
                os.remove(pdf_path)
            
            return jsonify(info)
            
        except Exception as e:
            logger.error(f"Error al procesar el PDF: {str(e)}")
            if os.path.exists(pdf_path):
                os.remove(pdf_path)
            return jsonify({'error': f'Error al procesar el PDF: {str(e)}'}), 500
            
    except Exception as e:
        logger.error(f"Error al obtener información del PDF: {str(e)}")
        return jsonify({'error': f'Error al procesar la solicitud: {str(e)}'}), 500

@app.route('/get-pdf-thumbnails', methods=['POST'])
def get_pdf_thumbnails():
    """Genera miniaturas para cada página de un PDF"""
    try:
        logger.info("Generando miniaturas de PDF")
        
        # Verificar si hay un archivo en la petición
        if 'file' not in request.files:
            logger.error("No se ha proporcionado un archivo PDF")
            return jsonify({'error': 'No se ha proporcionado un archivo PDF'}), 400
        
        pdf_file = request.files['file']
        
        # Verificar si se seleccionó un archivo
        if pdf_file.filename == '':
            logger.error("No se ha seleccionado un archivo")
            return jsonify({'error': 'No se ha seleccionado un archivo'}), 400
        
        # Verificar si el archivo es un PDF
        if not pdf_file.filename.endswith('.pdf'):
            logger.error("El archivo debe ser un PDF")
            return jsonify({'error': 'El archivo debe ser un PDF'}), 400
        
        # Crear ID único para archivo temporal
        temp_id = str(uuid.uuid4())
        pdf_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_{pdf_file.filename}")
        
        # Guardar el PDF
        pdf_file.save(pdf_path)
        
        try:
            # Generar miniaturas de cada página
            from PyPDF2 import PdfReader
            from PIL import Image
            import pymupdf as fitz  # PyMuPDF
            import base64
            import io
            
            # Leer el PDF con PyMuPDF (fitz)
            pdf_document = fitz.open(pdf_path)
            page_count = len(pdf_document)
            
            # Preparar array para las miniaturas
            thumbnails = []
            
            # Generar miniaturas para cada página
            for page_num in range(page_count):
                page = pdf_document.load_page(page_num)
                
                # Renderizar página como imagen con resolución reducida
                # Usar una resolución baja para miniaturas
                matrix = fitz.Matrix(0.3, 0.3)  # Escala 0.3 (30% del tamaño original)
                pix = page.get_pixmap(matrix=matrix)
                
                # Convertir a imagen PIL
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                
                # Convertir imagen a base64
                buffer = io.BytesIO()
                img.save(buffer, format="JPEG", quality=70)
                buffer.seek(0)
                img_base64 = base64.b64encode(buffer.read()).decode('utf-8')
                
                # Agregar miniatura a la lista
                thumbnails.append({
                    'page_num': page_num + 1,  # Base 1 para el frontend
                    'thumbnail': f"data:image/jpeg;base64,{img_base64}",
                    'width': pix.width,
                    'height': pix.height
                })
            
            # Cerrar el documento
            pdf_document.close()
            
            # Eliminar el archivo temporal
            if os.path.exists(pdf_path):
                os.remove(pdf_path)
            
            # Devolver las miniaturas
            return jsonify({
                'page_count': page_count,
                'thumbnails': thumbnails
            })
            
        except Exception as e:
            logger.error(f"Error al generar miniaturas: {str(e)}")
            if os.path.exists(pdf_path):
                os.remove(pdf_path)
            return jsonify({'error': f'Error al procesar el PDF: {str(e)}'}), 500
            
    except Exception as e:
        logger.error(f"Error al obtener miniaturas del PDF: {str(e)}")
        return jsonify({'error': f'Error al procesar la solicitud: {str(e)}'}), 500

@app.route('/preview-rotated-pdf', methods=['POST'])
def preview_rotated_pdf():
    """Genera una vista previa de un PDF con sus páginas rotadas"""
    try:
        logger.info("Generando vista previa de PDF rotado")
        
        # Verificar si hay un archivo en la petición
        if 'file' not in request.files:
            logger.error("No se ha proporcionado un archivo PDF")
            return jsonify({'error': 'No se ha proporcionado un archivo PDF'}), 400
        
        pdf_file = request.files['file']
        
        # Verificar si se seleccionó un archivo
        if pdf_file.filename == '':
            logger.error("No se ha seleccionado un archivo")
            return jsonify({'error': 'No se ha seleccionado un archivo'}), 400
        
        # Verificar si el archivo es un PDF
        if not pdf_file.filename.endswith('.pdf'):
            logger.error("El archivo debe ser un PDF")
            return jsonify({'error': 'El archivo debe ser un PDF'}), 400
        
        # Obtener parámetros de rotación
        rotation_angle = int(request.form.get('rotationAngle', '90'))
        pages_to_rotate = request.form.get('pagesToRotate', '')
        
        logger.info(f"Vista previa con ángulo: {rotation_angle}, páginas: {pages_to_rotate}")
        
        # Crear ID único para archivo temporal
        temp_id = str(uuid.uuid4())
        pdf_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_{pdf_file.filename}")
        
        # Guardar el PDF original
        pdf_file.save(pdf_path)
        
        try:
            # Usar PyMuPDF (fitz) para todo el proceso en lugar de PyPDF2
            import pymupdf as fitz  # PyMuPDF
            import base64
            import io
            from PIL import Image, ImageDraw, ImageFont
            
            # Abrir el PDF con PyMuPDF
            pdf_document = fitz.open(pdf_path)
            
            # Determinar qué páginas rotar
            pages_to_rotate_indices = []
            total_pages = len(pdf_document)
            
            # Ahora verificamos si pages_to_rotate es la cadena "all"
            if pages_to_rotate == "all":
                # Rotar todas las páginas
                pages_to_rotate_indices = list(range(total_pages))
                logger.info(f"Rotando todas las páginas ({total_pages}) - indicador 'all' recibido")
            elif pages_to_rotate:
                # Procesar la lista de páginas a rotar
                try:
                    pages_to_rotate_list = json.loads(pages_to_rotate)
                    # Convertir a base 0 para PyMuPDF
                    pages_to_rotate_indices = [int(p) - 1 for p in pages_to_rotate_list]
                    logger.info(f"Páginas a rotar (índices): {pages_to_rotate_indices}")
                except Exception as e:
                    logger.error(f"Error al procesar lista de páginas: {e}")
                    # Si hay error, asumir que todas las páginas se rotan
                    pages_to_rotate_indices = list(range(total_pages))
                    logger.info("Rotando todas las páginas debido a error en formato")
            else:
                # Si no se especifica o es vacío, asumir todas las páginas
                pages_to_rotate_indices = list(range(total_pages))
                logger.info(f"Rotando todas las páginas ({total_pages}) - páginas no especificadas")
            
            # Crear copia del PDF para aplicar rotaciones
            temp_output_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_preview_{pdf_file.filename}")
            
            # Verificar los ángulos actuales de las páginas antes de rotar
            logger.info("Ángulos actuales antes de rotar:")
            for i in range(total_pages):
                page = pdf_document[i]
                current_rotation = page.rotation
                logger.info(f"Página {i+1}: rotación actual = {current_rotation}")
            
            # Aplicar rotaciones a las páginas seleccionadas
            rotated_pages = []
            for i in range(total_pages):
                if i in pages_to_rotate_indices:
                    # Aplicar rotación a la página
                    page = pdf_document[i]
                    # En PyMuPDF, podemos establecer la rotación directamente
                    # y es acumulativa con cualquier rotación existente
                    current_rotation = page.rotation
                    # Aplicar la nueva rotación
                    new_rotation = (current_rotation + rotation_angle) % 360
                    page.set_rotation(new_rotation)
                    logger.info(f"Rotando página {i+1} de {current_rotation}° a {new_rotation}°")
                    rotated_pages.append(i)
            
            # Guardar el PDF modificado
            pdf_document.save(temp_output_path)
            pdf_document.close()
            
            # Reabrir el documento para verificar y generar miniaturas
            pdf_document = fitz.open(temp_output_path)
            
            # Verificar los ángulos después de rotar
            logger.info("Ángulos después de rotar:")
            for i in range(total_pages):
                page = pdf_document[i]
                current_rotation = page.rotation
                logger.info(f"Página {i+1}: rotación final = {current_rotation}")
            
            # Generar miniaturas del PDF rotado
            thumbnails = []
            
            for page_num in range(total_pages):
                page = pdf_document.load_page(page_num)
                
                # Renderizar página como imagen con resolución reducida
                matrix = fitz.Matrix(0.3, 0.3)  # Escala 0.3
                pix = page.get_pixmap(matrix=matrix)
                
                # Convertir a imagen PIL
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                
                # Verificar si esta página fue rotada
                is_rotated = (page_num in pages_to_rotate_indices)
                
                # Añadir indicador visual para páginas rotadas
                if is_rotated:
                    draw = ImageDraw.Draw(img)
                    # Añadir un indicador de rotación más visible
                    draw.rectangle([(img.width - 50, 0), (img.width, 50)], 
                                   fill=(255, 100, 0))  # Naranja más intenso
                    
                    # Intentar usar una fuente, o usar la predeterminada si no está disponible
                    try:
                        font = ImageFont.truetype("arial.ttf", 20)
                    except:
                        font = ImageFont.load_default()
                    
                    # Añadir el texto con el ángulo de rotación
                    rotation_text = f"{rotation_angle}°"
                    # Usar el método correcto según la versión de Pillow
                    try:
                        text_bbox = font.getbbox(rotation_text)
                        text_width = text_bbox[2] - text_bbox[0]
                        text_height = text_bbox[3] - text_bbox[1]
                    except:
                        # Versiones antiguas de Pillow
                        try:
                            text_width, text_height = font.getsize(rotation_text)
                        except:
                            text_width, text_height = 20, 20  # Valores por defecto
                    
                    # Centrar el texto en el rectángulo
                    text_x = img.width - 25 - text_width // 2
                    text_y = 25 - text_height // 2
                    
                    # Dibujar el texto en blanco para que destaque
                    draw.text((text_x, text_y), rotation_text, fill=(255, 255, 255), font=font)
                
                # Convertir imagen a base64
                buffer = io.BytesIO()
                img.save(buffer, format="JPEG", quality=70)
                buffer.seek(0)
                img_base64 = base64.b64encode(buffer.read()).decode('utf-8')
                
                # Agregar miniatura a la lista
                thumbnails.append({
                    'page_num': page_num + 1,  # Base 1 para el frontend
                    'thumbnail': f"data:image/jpeg;base64,{img_base64}",
                    'width': pix.width,
                    'height': pix.height,
                    'is_rotated': is_rotated  # Usar la lista que usamos para la rotación
                })
                
                logger.info(f"Miniatura generada para página {page_num+1}, rotada: {is_rotated}")
            
            # Cerrar el documento
            pdf_document.close()
            
            # Eliminar archivos temporales
            if os.path.exists(pdf_path):
                os.remove(pdf_path)
            if os.path.exists(temp_output_path):
                os.remove(temp_output_path)
            
            # Devolver las miniaturas
            rotated_count = len(rotated_pages)
            logger.info(f"Total de miniaturas: {len(thumbnails)}, páginas rotadas: {rotated_count}")
            
            result = {
                'page_count': total_pages,
                'thumbnails': thumbnails,
                'rotation_angle': rotation_angle,
                'rotated_pages_count': rotated_count
            }
            
            logger.info(f"Vista previa generada con éxito. Ángulo: {rotation_angle}, páginas rotadas: {rotated_count}")
            
            return jsonify(result)
            
        except Exception as e:
            logger.error(f"Error al generar vista previa de PDF rotado: {str(e)}")
            if os.path.exists(pdf_path):
                os.remove(pdf_path)
            return jsonify({'error': f'Error al procesar el PDF: {str(e)}'}), 500
            
    except Exception as e:
        logger.error(f"Error al generar vista previa de PDF rotado: {str(e)}")
        return jsonify({'error': f'Error al procesar la solicitud: {str(e)}'}), 500

    """Recorta las páginas de un documento PDF usando coordenadas exactas con alta precisión"""
    try:
        logger.info("Iniciando proceso de recorte exacto de PDF")
        
        # Verificar si hay un archivo en la petición
        if 'file' not in request.files:
            logger.error("No se ha proporcionado un archivo PDF")
            return jsonify({'error': 'No se ha proporcionado un archivo PDF'}), 400
        
        pdf_file = request.files['file']
        
        # Verificar si se seleccionó un archivo
        if pdf_file.filename == '':
            logger.error("No se ha seleccionado un archivo")
            return jsonify({'error': 'No se ha seleccionado un archivo'}), 400
        
        # Verificar si el archivo es un PDF
        if not pdf_file.filename.endswith('.pdf'):
            logger.error("El archivo debe ser un PDF")
            return jsonify({'error': 'El archivo debe ser un PDF'}), 400
        
        # Obtener tipo de recorte (márgenes o área exacta)
        crop_type = request.form.get('cropType', 'exact')
        
        # Si es recorte por márgenes, obtener los valores
        margins = {
            'top': float(request.form.get('marginTop', 0)),
            'right': float(request.form.get('marginRight', 0)),
            'bottom': float(request.form.get('marginBottom', 0)),
            'left': float(request.form.get('marginLeft', 0))
        }
        
        # Obtener las coordenadas exactas para el recorte
        crop_exact = None
        debug_info = None
        
        if crop_type == 'exact':
            try:
                crop_exact_json = request.form.get('cropExact', '{}')
                logger.info(f"Datos de coordenadas exactas recibidos: {crop_exact_json}")
                
                crop_exact = json.loads(crop_exact_json)
                if not isinstance(crop_exact, dict) or not all(k in crop_exact for k in ['x', 'y', 'width', 'height']):
                    logger.error("Formato de coordenadas de recorte incorrecto")
                    return jsonify({'error': 'El formato de las coordenadas de recorte es incorrecto'}), 400
                
                # Verificar que los valores estén en el rango [0,1]
                for key, value in crop_exact.items():
                    if not (0 <= value <= 1):
                        logger.warning(f"Valor fuera de rango para {key}: {value}. Se ajustará al rango [0,1]")
                        crop_exact[key] = max(0, min(1, value))
                
                # Asegurar que width y height no hagan que se exceda 1 en total
                if crop_exact['x'] + crop_exact['width'] > 1:
                    crop_exact['width'] = 1 - crop_exact['x']
                if crop_exact['y'] + crop_exact['height'] > 1:
                    crop_exact['height'] = 1 - crop_exact['y']
                
                # Procesar información de depuración si está disponible
                if 'debugInfo' in request.form:
                    debug_info_json = request.form.get('debugInfo', '{}')
                    debug_info = json.loads(debug_info_json)
                    logger.info(f"Información de depuración recibida: {debug_info_json}")
                
                logger.info(f"Coordenadas de recorte exactas: {crop_exact}")
            except json.JSONDecodeError:
                logger.error("Error al decodificar las coordenadas JSON")
                return jsonify({'error': 'Error al decodificar las coordenadas JSON'}), 400
            except (ValueError, TypeError) as e:
                logger.error(f"Error al procesar valores de las coordenadas: {str(e)}")
                return jsonify({'error': f'Error al procesar valores de las coordenadas: {str(e)}'}), 400
        
        # Obtener información sobre a qué páginas aplicar el recorte
        apply_to_all_pages = request.form.get('applyToAllPages', 'true').lower() == 'true'
        page_range = request.form.get('pageRange', '')
        
        # Crear IDs únicos para archivos temporales
        temp_id = str(uuid.uuid4())
        pdf_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_{pdf_file.filename}")
        output_path = os.path.join(UPLOAD_FOLDER, f"{temp_id}_recortado_{pdf_file.filename}")
        
        # Guardar el PDF original
        pdf_file.save(pdf_path)
        
        try:
            # Procesar el PDF para recortar sus páginas usando PyMuPDF (fitz)
            doc = fitz.open(pdf_path)
            
            # Determinar qué páginas recortar
            pages_to_crop = []
            if apply_to_all_pages:
                pages_to_crop = list(range(len(doc)))
            else:
                # Procesar el formato de rango (por ejemplo: "1-3,5,7-9")
                if page_range:
                    ranges = page_range.split(',')
                    for r in ranges:
                        r = r.strip()
                        if not r:
                            continue
                            
                        try:
                            if '-' in r:
                                # Procesar un rango (por ejemplo: "1-3")
                                start, end = map(int, r.split('-'))
                                # Validar que el rango sea válido
                                if start > 0 and end >= start:
                                    # Restar 1 porque las páginas son de base 0, pero el usuario ve desde 1
                                    start = max(0, start - 1)  # Asegurar que no sea negativo
                                    end = min(len(doc), end)  # Asegurar que no exceda el límite
                                    pages_to_crop.extend(range(start, end))
                            else:
                                # Procesar un número individual (por ejemplo: "5")
                                page_num = int(r)
                                if page_num > 0 and page_num <= len(doc):
                                    # Restar 1 por la misma razón
                                    pages_to_crop.append(page_num - 1)
                        except ValueError:
                            # Ignorar valores no numéricos
                            logger.warning(f"Valor de rango de página no válido: {r}")
                            continue
                
                # Eliminar duplicados y ordenar
                pages_to_crop = sorted(set(pages_to_crop))
            
            # Verificar que haya páginas para recortar
            if not pages_to_crop:
                logger.warning("No se encontraron páginas válidas para recortar")
                if not apply_to_all_pages:
                    return jsonify({'error': 'No se encontraron páginas válidas en el rango especificado'}), 400
                else:
                    # Si se especificó todas las páginas pero no hay ninguna, usar todas
                    pages_to_crop = list(range(len(doc)))
            
            # Recortar las páginas seleccionadas
            for page_num in pages_to_crop:
                page = doc[page_num]
                
                # Obtener el tamaño de la página en puntos
                page_rect = page.rect
                
                if crop_type == 'margins':
                    # Convertir márgenes de mm a puntos (1 mm = 2.83465 puntos)
                    mm_to_point = 2.83465
                    margin_top = margins['top'] * mm_to_point
                    margin_right = margins['right'] * mm_to_point
                    margin_bottom = margins['bottom'] * mm_to_point
                    margin_left = margins['left'] * mm_to_point
                    
                    # Crear un nuevo rectángulo con los márgenes aplicados
                    new_rect = fitz.Rect(
                        page_rect.x0 + margin_left,
                        page_rect.y0 + margin_top,
                        page_rect.x1 - margin_right,
                        page_rect.y1 - margin_bottom
                    )
                    
                    # Verificar que el rectángulo sigue siendo válido
                    if new_rect.x0 >= new_rect.x1 or new_rect.y0 >= new_rect.y1:
                        logger.warning(f"Los márgenes son demasiado grandes para la página {page_num + 1}")
                        continue
                    
                    # Recortar la página
                    page.set_cropbox(new_rect)
                    
                elif crop_type == 'exact' and crop_exact:
                    try:
                        # Información detallada de depuración
                        logger.info(f"Procesando página {page_num + 1} para recorte exacto")
                        logger.info(f"Dimensiones de página: {page_rect.width}x{page_rect.height}")
                        logger.info(f"Coordenadas relativas exactas: x={crop_exact['x']}, y={crop_exact['y']}, "
                                    f"width={crop_exact['width']}, height={crop_exact['height']}")
                        
                        # Convertir coordenadas relativas (0-1) a puntos con alta precisión
                        x0 = crop_exact['x'] * page_rect.width + page_rect.x0
                        y0 = crop_exact['y'] * page_rect.height + page_rect.y0
                        x1 = x0 + crop_exact['width'] * page_rect.width
                        y1 = y0 + crop_exact['height'] * page_rect.height
                        
                        # Crear rectángulo de recorte exacto
                        crop_rect = fitz.Rect(x0, y0, x1, y1)
                        
                        # Verificar que el rectángulo sigue siendo válido
                        if crop_rect.x0 >= crop_rect.x1 or crop_rect.y0 >= crop_rect.y1:
                            logger.warning(f"El área de recorte es inválida para la página {page_num + 1}")
                            continue
                        
                        # Registro para depuración
                        logger.info(f"Rectángulo de recorte exacto: ({x0:.2f},{y0:.2f}) - ({x1:.2f},{y1:.2f})")
                        
                        # No ajustar el rectángulo - usar los valores exactos calculados
                        # Esto es crucial para mantener la precisión
                        
                        # Recortar la página con el rectángulo exacto
                        page.set_cropbox(crop_rect)
                        
                        # Registrar el éxito del recorte
                        logger.info(f"Página {page_num + 1} recortada correctamente con coordenadas exactas")
                    except Exception as page_error:
                        logger.error(f"Error al recortar la página {page_num + 1}: {str(page_error)}")
                        # Continuar con la siguiente página
            
            # Guardar el PDF recortado
            doc.save(output_path)
            doc.close()
            
            
            # Configurar limpieza después de la solicitud
            @after_this_request
            def cleanup_after_request(response):
                # Solo iniciar el hilo de limpieza si la respuesta es exitosa
                if response.status_code == 200:
                    delayed_file_cleanup([pdf_path, output_path], delay_seconds=5)
                return response
            
            # Devolver el PDF recortado
            return send_file(
                output_path,
                as_attachment=True,
                download_name=f"recortado_{pdf_file.filename}",
                mimetype='application/pdf'
            )
            
        except Exception as e:
            logger.error(f"Error al recortar el PDF con método exacto: {str(e)}")
            return jsonify({'error': f'Error al procesar el PDF: {str(e)}'}), 500
            
    except Exception as e:
        logger.error(f"Error en el recorte exacto de PDF: {str(e)}")
        return jsonify({'error': f'Error al procesar la solicitud: {str(e)}'}), 500

@app.route('/add-page-numbers', methods=['POST'])
def add_page_numbers():
    """Añade números de página a un archivo PDF"""
    # Ejecutar limpieza automática
    cleanup_temp_files()
    
    try:
        # Verificar si se ha enviado un archivo
        if 'file' not in request.files:
            return jsonify({'error': 'No se ha proporcionado ningún archivo'}), 400
            
        file = request.files['file']
        
        # Verificar si se ha seleccionado un archivo
        if file.filename == '':
            return jsonify({'error': 'No se ha seleccionado ningún archivo'}), 400
            
        # Verificar si el archivo es un PDF
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Solo se permiten archivos PDF'}), 400
        
        # Obtener parámetros
        position = request.form.get('position', 'bottom-center')
        starting_number = int(request.form.get('startingNumber', 1))
        font_size = int(request.form.get('fontSize', 12))
        font_family = request.form.get('fontFamily', 'Helvetica')
        format_type = request.form.get('format', '1, 2, 3')
        margin = int(request.form.get('margin', 15))
        exclude_first_page = request.form.get('excludeFirstPage', 'false').lower() == 'true'
        
        # Mapear las fuentes seleccionadas a las fuentes integradas de PyMuPDF
        # PyMuPDF tiene estas fuentes integradas: helv (Helvetica), tiro (Times Roman), cour (Courier), symb (Symbol), zadb (Zapf Dingbats)
        font_map = {
            'Arial': 'helv',  # Helvetica es similar a Arial
            'Helvetica': 'helv',
            'Times New Roman': 'tiro',
            'Courier New': 'cour',
            'Verdana': 'helv',  # Usar Helvetica como fallback para Verdana
            # Cualquier otra fuente usará Helvetica por defecto
        }
        
        # Obtener el nombre de fuente seguro
        safe_font = font_map.get(font_family, 'helv')
        
        # Generar nombres de archivos únicos
        input_filename = secure_filename(file.filename)
        temp_input_path = os.path.join(UPLOAD_FOLDER, f"input_{uuid.uuid4()}_{input_filename}")
        output_path = os.path.join(UPLOAD_FOLDER, f"numbered_{uuid.uuid4()}_{input_filename}")
        
        # Guardar el archivo subido
        file.save(temp_input_path)
        
        # Procesar el PDF con PyMuPDF (fitz)
        doc = fitz.open(temp_input_path)
        total_pages = len(doc)
        
        # Determinar qué páginas procesar (todas o excluir la primera)
        start_page = 1 if exclude_first_page else 0
        pages_to_process = range(start_page, total_pages)
        
        # Función para convertir números según el formato
        def format_number(page_num, total_pages):
            page_index = page_num + 1  # Convertir a índice base-1 para mostrar
            actual_number = starting_number + page_num - (1 if exclude_first_page else 0)
            
            if format_type == '1, 2, 3':
                return str(actual_number)
            elif format_type == 'Página 1, Página 2':
                return f"Página {actual_number}"
            elif format_type == '1 de N':
                return f"{actual_number} de {total_pages - (1 if exclude_first_page else 0)}"
            elif format_type == 'i, ii, iii':
                # Función para convertir a números romanos en minúsculas
                def int_to_roman_lower(num):
                    val = [
                        1000, 900, 500, 400,
                        100, 90, 50, 40,
                        10, 9, 5, 4,
                        1
                    ]
                    syms = [
                        "M", "CM", "D", "CD",
                        "C", "XC", "L", "XL",
                        "X", "IX", "V", "IV",
                        "I"
                    ]
                    roman_num = ''
                    i = 0
                    while num > 0:
                        for _ in range(num // val[i]):
                            roman_num += syms[i]
                            num -= val[i]
                        i += 1
                    return roman_num.lower()
                
                return int_to_roman_lower(actual_number)
            elif format_type == 'I, II, III':
                # Función para convertir a números romanos en mayúsculas
                def int_to_roman_upper(num):
                    val = [
                        1000, 900, 500, 400,
                        100, 90, 50, 40,
                        10, 9, 5, 4,
                        1
                    ]
                    syms = [
                        "M", "CM", "D", "CD",
                        "C", "XC", "L", "XL",
                        "X", "IX", "V", "IV",
                        "I"
                    ]
                    roman_num = ''
                    i = 0
                    while num > 0:
                        for _ in range(num // val[i]):
                            roman_num += syms[i]
                            num -= val[i]
                        i += 1
                    return roman_num
                
                return int_to_roman_upper(actual_number)
            else:
                return str(actual_number)
        
        # Añadir números de página a cada página en el documento
        for page_num in pages_to_process:
            page = doc[page_num]
            page_text = format_number(page_num - (1 if exclude_first_page else 0), total_pages)
            
            # Determinar posición
            rect = page.rect
            text_width = font_size * len(page_text) * 0.5  # Estimación aproximada
            margin_pts = margin * 2.83465  # Convertir mm a puntos (1mm ≈ 2.83465pt)
            
            if position == 'bottom-center':
                x = (rect.width - text_width) / 2
                y = rect.height - margin_pts
            elif position == 'bottom-right':
                x = rect.width - text_width - margin_pts
                y = rect.height - margin_pts
            elif position == 'bottom-left':
                x = margin_pts
                y = rect.height - margin_pts
            elif position == 'top-center':
                x = (rect.width - text_width) / 2
                y = margin_pts
            elif position == 'top-right':
                x = rect.width - text_width - margin_pts
                y = margin_pts
            elif position == 'top-left':
                x = margin_pts
                y = margin_pts
            else:  # Por defecto, abajo al centro
                x = (rect.width - text_width) / 2
                y = rect.height - margin_pts
            
            # Insertar el texto del número de página usando la fuente segura
            page.insert_text(
                point=(x, y),
                text=page_text,
                fontsize=font_size,
                fontname=safe_font,
                color=(0, 0, 0)  # Negro
            )
        
        # Guardar el documento modificado
        doc.save(output_path)
        doc.close()
        
        # Configurar respuesta para descargar el archivo
        @after_this_request
        def cleanup_after_request(response):
            # Solo iniciar el hilo de limpieza si la respuesta es exitosa
            if response.status_code == 200:
                # Eliminar archivos después de un breve retraso para asegurar la descarga
                delayed_file_cleanup([temp_input_path, output_path])
            return response
        
        return send_file(
            output_path,
            as_attachment=True,
            download_name=f"numerado_{input_filename}",
            mimetype='application/pdf'
        )
        
    except Exception as e:
        logger.error(f"Error al añadir números de página: {str(e)}")
        return jsonify({'error': f'Error al procesar el archivo: {str(e)}'}), 500

@app.route('/protect-pdf', methods=['POST'])
def protect_pdf():
    """Protege un PDF con contraseña"""
    # Ejecutar limpieza automática
    cleanup_temp_files()
    
    try:
        # Verificar si se ha enviado un archivo
        if 'file' not in request.files:
            return jsonify({'error': 'No se ha proporcionado ningún archivo'}), 400
            
        file = request.files['file']
        
        # Verificar si se ha seleccionado un archivo
        if file.filename == '':
            return jsonify({'error': 'No se ha seleccionado ningún archivo'}), 400
            
        # Verificar si el archivo es un PDF
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Solo se permiten archivos PDF'}), 400
        
        # Obtener parámetros
        password = request.form.get('password', '')
        if not password:
            return jsonify({'error': 'No se ha proporcionado una contraseña'}), 400
            
        # Generar nombres de archivos únicos
        input_filename = secure_filename(file.filename)
        temp_input_path = os.path.join(UPLOAD_FOLDER, f"input_{uuid.uuid4()}_{input_filename}")
        output_path = os.path.join(UPLOAD_FOLDER, f"protected_{uuid.uuid4()}_{input_filename}")
        
        # Guardar el archivo subido
        file.save(temp_input_path)
        
        logger.info(f"Protegiendo PDF con contraseña")
        
        # Abrir el PDF y aplicar protección
        doc = fitz.open(temp_input_path)
        
        # Configurar opciones de encriptación básicas sin especificar permisos
        doc.save(
            output_path,
            encryption=fitz.PDF_ENCRYPT_AES_256,  # Usar AES 256
            owner_pw=password,  # Contraseña de propietario (acceso completo)
            user_pw=password    # Contraseña de usuario (acceso restringido)
        )
        doc.close()
        
        # Configurar respuesta para descargar el archivo
        @after_this_request
        def cleanup_after_request(response):
            # Solo iniciar el hilo de limpieza si la respuesta es exitosa
            if response.status_code == 200:
                # Eliminar archivos después de un breve retraso para asegurar la descarga
                delayed_file_cleanup([temp_input_path, output_path])
            return response
        
        return send_file(
            output_path,
            as_attachment=True,
            download_name=f"protegido_{input_filename}",
            mimetype='application/pdf'
        )
        
    except Exception as e:
        logger.error(f"Error al proteger el PDF: {str(e)}")
        return jsonify({'error': f'Error al procesar el archivo: {str(e)}'}), 500

@app.route('/unlock-pdf', methods=['POST'])
def unlock_pdf():
    """Desbloquea un PDF protegido con contraseña"""
    # Ejecutar limpieza automática
    cleanup_temp_files()
    
    try:
        # Verificar si se ha enviado un archivo
        if 'file' not in request.files:
            return jsonify({'error': 'No se ha proporcionado ningún archivo'}), 400
            
        file = request.files['file']
        
        # Verificar si se ha seleccionado un archivo
        if file.filename == '':
            return jsonify({'error': 'No se ha seleccionado ningún archivo'}), 400
            
        # Verificar si el archivo es un PDF
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Solo se permiten archivos PDF'}), 400
        
        # Obtener la contraseña
        password = request.form.get('password', '')
        if not password:
            return jsonify({'error': 'No se ha proporcionado una contraseña'}), 400
            
        # Generar nombres de archivos únicos
        input_filename = secure_filename(file.filename)
        temp_input_path = os.path.join(UPLOAD_FOLDER, f"input_{uuid.uuid4()}_{input_filename}")
        output_path = os.path.join(UPLOAD_FOLDER, f"unlocked_{uuid.uuid4()}_{input_filename}")
        
        # Guardar el archivo subido
        file.save(temp_input_path)
        
        try:
            # Intentar abrir el PDF con la contraseña proporcionada
            doc = fitz.open(temp_input_path)
            
            # Verificar si el documento está encriptado
            if doc.is_encrypted:
                # Intentar autenticar con la contraseña
                # authenticate devuelve: 0=fallido, 1=usuario, 2=propietario, 4=no encriptado
                result = doc.authenticate(password)
                
                if result == 0:
                    # Si la autenticación falla, devolver error
                    doc.close()
                    return jsonify({'error': 'Contraseña incorrecta'}), 400
                    
                # Si llegamos aquí, la autenticación fue exitosa
                # Crear un nuevo documento sin encriptación
                new_doc = fitz.open()
                
                # Copiar todas las páginas al nuevo documento
                for page_num in range(len(doc)):
                    new_doc.insert_pdf(doc, from_page=page_num, to_page=page_num)
                
                # Guardar el nuevo documento sin encriptación
                new_doc.save(output_path)
                new_doc.close()
            else:
                # Si el PDF no está encriptado, simplemente copiarlo
                doc.save(output_path)
                
            doc.close()
            
            # Configurar respuesta para descargar el archivo
            @after_this_request
            def cleanup_after_request(response):
                # Solo iniciar el hilo de limpieza si la respuesta es exitosa
                if response.status_code == 200:
                    # Eliminar archivos después de un breve retraso para asegurar la descarga
                    delayed_file_cleanup([temp_input_path, output_path])
                return response
            
            return send_file(
                output_path,
                as_attachment=True,
                download_name=f"desbloqueado_{input_filename}",
                mimetype='application/pdf'
            )
            
        except fitz.FileDataError:
            return jsonify({'error': 'El archivo PDF está dañado o no es válido'}), 400
        except Exception as e:
            return jsonify({'error': f'Error al desbloquear el PDF: {str(e)}'}), 400
        
    except Exception as e:
        logger.error(f"Error al desbloquear el PDF: {str(e)}")
        return jsonify({'error': f'Error al procesar el archivo: {str(e)}'}), 500

@app.route('/summarize-document', methods=['POST'])
def summarize_document():
    """
    Procesa un documento PDF o de texto y genera un resumen utilizando LM Studio.
    """
    # Ejecutar limpieza automática en cada solicitud
    cleanup_temp_files()
    
    try:
        # Verificar si se ha enviado un archivo
        if 'file' not in request.files:
            return jsonify({'error': 'No se ha enviado ningún archivo'}), 400
            
        file = request.files['file']
        
        # Verificar si el archivo es válido
        if file.filename == '':
            return jsonify({'error': 'Archivo no válido'}), 400
            
        # Obtener extensión del archivo
        file_extension = os.path.splitext(file.filename)[1].lower()
        
        # Crear un nombre de archivo único
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        input_file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        
        # Guardar el archivo
        file.save(input_file_path)
        
        # Extraer texto del archivo según su tipo
        extracted_text = ""
        
        if file_extension == '.pdf':
            try:
                # Usar PyMuPDF para extraer texto de PDFs
                pdf_document = fitz.open(input_file_path)
                for page_num in range(len(pdf_document)):
                    page = pdf_document[page_num]
                    extracted_text += page.get_text()
                pdf_document.close()
            except Exception as e:
                return jsonify({'error': f'Error al extraer texto del PDF: {str(e)}'}), 500
        
        elif file_extension in ['.txt', '.md', '.html']:
            # Para archivos de texto, simplemente leer el contenido
            with open(input_file_path, 'r', encoding='utf-8', errors='ignore') as f:
                extracted_text = f.read()
        
        elif file_extension in ['.doc', '.docx', '.rtf']:
            # Para documentos Word, podríamos usar una biblioteca como python-docx
            # Pero aquí asumiremos que no está implementado
            return jsonify({'error': 'Los archivos DOC/DOCX aún no están soportados'}), 400
        
        else:
            return jsonify({'error': 'Formato de archivo no soportado'}), 400
        
        # Guardar el texto extraído completo
        full_document_text = extracted_text
        
        # Limitar el texto para el resumen para evitar problemas con el modelo
        max_tokens = 5000
        if len(extracted_text) > max_tokens:
            extracted_text = extracted_text[:max_tokens] + "..."
        
        # Preparar la solicitud para LM Studio
        try:
            import requests
            
            # URL de la API de LM Studio
            lm_studio_url = "http://127.0.0.1:1234/v1/chat/completions"
            
            # Preparar la solicitud
            prompt = f"""
            Por favor, genera un resumen conciso del siguiente documento.
            Identifica los puntos principales, las ideas clave y la información más relevante.
            El resumen debe ser claro y mantener la estructura lógica original.
            
            DOCUMENTO:
            {extracted_text}
            """
            
            payload = {
                "messages": [
                    {"role": "system", "content": "Eres un asistente especializado en crear resúmenes concisos y precisos de documentos."},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 1000,
                "temperature": 0.2,
                "stream": False
            }
            
            # Realizar la solicitud a LM Studio
            response = requests.post(lm_studio_url, json=payload)
            
            if response.status_code == 200:
                result = response.json()
                summary = result['choices'][0]['message']['content']
                
                # Procesar el resumen para eliminar el formato Markdown
                def clean_markdown_format(text):
                    # Eliminar asteriscos dobles (negrita) pero mantener el texto
                    cleaned_text = text.replace("**", "")
                    # Eliminar otros formatos Markdown si es necesario
                    # cleaned_text = cleaned_text.replace("*", "")  # Cursiva
                    # cleaned_text = cleaned_text.replace("###", "").replace("##", "").replace("#", "")  # Títulos
                    return cleaned_text
                
                summary = clean_markdown_format(summary)
                
                # Crear respuesta
                result_data = {
                    'summary': summary,
                    'original_filename': file.filename,
                    'full_text': full_document_text  # Incluir el texto completo
                }
                
                # Eliminar el archivo temporal
                try:
                    os.remove(input_file_path)
                except:
                    pass
                    
                return jsonify(result_data)
            else:
                return jsonify({'error': f'Error al comunicarse con LM Studio: {response.text}'}), 500
                
        except Exception as e:
            return jsonify({'error': f'Error al procesar el resumen: {str(e)}'}), 500
            
    except Exception as e:
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

# Endpoint para chat con contexto del documento
@app.route('/document-chat', methods=['POST'])
def document_chat():
    """
    Recibe una pregunta y el contexto de un documento, y genera una respuesta basada en el contexto
    utilizando LM Studio.
    """
    try:
        data = request.json
        if not data or 'question' not in data or 'context' not in data:
            return jsonify({'error': 'Se requiere una pregunta y el contexto del documento'}), 400
            
        question = data['question']
        context = data['context']
        
        # Limitar el contexto si es demasiado grande para evitar problemas con el modelo
        max_context_length = 12000  # Aproximadamente 3000 tokens
        if len(context) > max_context_length:
            # Tomamos la primera parte y la última parte del documento
            first_part = context[:int(max_context_length * 0.7)]  # 70% del inicio
            last_part = context[-int(max_context_length * 0.3):]  # 30% del final
            context = first_part + "\n...[Contenido omitido por longitud]...\n" + last_part
        
        # URL de LM Studio
        lm_studio_url = "http://127.0.0.1:1234/v1/chat/completions"
        
        # Construir el prompt con la pregunta y el contexto
        prompt = f"""Basado en el siguiente contenido del documento, responde a la pregunta del usuario.
        No inventes información que no esté en el contexto proporcionado.
        Si no puedes responder a la pregunta con la información disponible, indica que no puedes encontrar esa información en el documento.
        
        CONTEXTO DEL DOCUMENTO:
        {context}
        
        PREGUNTA DEL USUARIO:
        {question}
        
        RESPUESTA:"""
        
        # Parámetros para la solicitud a LM Studio
        payload = {
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3,
            "max_tokens": 1024
        }
        
        # Realizar la solicitud a LM Studio
        response = requests.post(lm_studio_url, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            answer = result['choices'][0]['message']['content']
            
            # Procesar la respuesta para eliminar el formato Markdown
            def clean_markdown_format(text):
                # Eliminar asteriscos dobles (negrita) pero mantener el texto
                cleaned_text = text.replace("**", "")
                return cleaned_text
                
            cleaned_answer = clean_markdown_format(answer)
            
            return jsonify({
                'answer': cleaned_answer
            })
        else:
            return jsonify({'error': f'Error en la comunicación con LM Studio: {response.status_code}'}), 500
            
    except Exception as e:
        logger.error(f"Error en document_chat: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Iniciando el servidor en http://localhost:5000...")
    print("Presiona CTRL+C para detenerlo")
    app.run(debug=True, port=5000, host='0.0.0.0') 
