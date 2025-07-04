import { Link } from 'react-router-dom';

export default function ExcelTools() {
  return (
    <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
      <div className="flex flex-wrap justify-between gap-3 p-4">
        <div className="flex min-w-72 flex-col gap-3">
          <p className="text-[#101418] tracking-light text-[32px] font-bold leading-tight">Herramientas Excel</p>
          <p className="text-[#5c728a] text-sm font-normal leading-normal">Edita, convierte y analiza hojas de cálculo con facilidad.</p>
        </div>
      </div>
      <div className="pb-3">
        <div className="flex border-b border-[#d4dbe2] px-4 gap-8">
          <Link className="flex flex-col items-center justify-center border-b-[3px] border-b-[#dce7f3] text-[#101418] pb-[13px] pt-4" to="/excel/edit">
            <p className="text-[#101418] text-sm font-bold leading-normal tracking-[0.015em]">Editar</p>
          </Link>
          <Link className="flex flex-col items-center justify-center border-b-[3px] border-b-transparent text-[#5c728a] pb-[13px] pt-4" to="/excel/convert">
            <p className="text-[#5c728a] text-sm font-bold leading-normal tracking-[0.015em]">Convertir</p>
          </Link>
          <Link className="flex flex-col items-center justify-center border-b-[3px] border-b-transparent text-[#5c728a] pb-[13px] pt-4" to="/excel/analyze">
            <p className="text-[#5c728a] text-sm font-bold leading-normal tracking-[0.015em]">Analizar</p>
          </Link>
          <Link className="flex flex-col items-center justify-center border-b-[3px] border-b-transparent text-[#5c728a] pb-[13px] pt-4" to="/excel/other">
            <p className="text-[#5c728a] text-sm font-bold leading-normal tracking-[0.015em]">Otros</p>
          </Link>
        </div>
      </div>
      <h3 className="text-[#101418] text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Editar Excel</h3>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(158px,1fr))] gap-3 p-4">
        <div className="flex flex-1 gap-3 rounded-lg border border-[#d4dbe2] bg-gray-50 p-4 items-center">
          <div className="text-[#101418]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
              <path
                d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"
              ></path>
            </svg>
          </div>
          <h2 className="text-[#101418] text-base font-bold leading-tight">Combinar Excel</h2>
        </div>
        <div className="flex flex-1 gap-3 rounded-lg border border-[#d4dbe2] bg-gray-50 p-4 items-center">
          <div className="text-[#101418]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
              <path
                d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"
              ></path>
            </svg>
          </div>
          <h2 className="text-[#101418] text-base font-bold leading-tight">Dividir Excel</h2>
        </div>
        <div className="flex flex-1 gap-3 rounded-lg border border-[#d4dbe2] bg-gray-50 p-4 items-center">
          <div className="text-[#101418]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
              <path
                d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"
              ></path>
            </svg>
          </div>
          <h2 className="text-[#101418] text-base font-bold leading-tight">Desbloquear Excel</h2>
        </div>
        <div className="flex flex-1 gap-3 rounded-lg border border-[#d4dbe2] bg-gray-50 p-4 items-center">
          <div className="text-[#101418]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
              <path
                d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"
              ></path>
            </svg>
          </div>
          <h2 className="text-[#101418] text-base font-bold leading-tight">Proteger Excel</h2>
        </div>
        <div className="flex flex-1 gap-3 rounded-lg border border-[#d4dbe2] bg-gray-50 p-4 items-center">
          <div className="text-[#101418]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
              <path
                d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"
              ></path>
            </svg>
          </div>
          <h2 className="text-[#101418] text-base font-bold leading-tight">Editar Excel</h2>
        </div>
        <div className="flex flex-1 gap-3 rounded-lg border border-[#d4dbe2] bg-gray-50 p-4 items-center">
          <div className="text-[#101418]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
              <path
                d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"
              ></path>
            </svg>
          </div>
          <h2 className="text-[#101418] text-base font-bold leading-tight">Comprimir Excel</h2>
        </div>
      </div>
      <h3 className="text-[#101418] text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Convertir Excel</h3>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(158px,1fr))] gap-3 p-4">
        <div className="flex flex-1 gap-3 rounded-lg border border-[#d4dbe2] bg-gray-50 p-4 items-center">
          <div className="text-[#101418]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
              <path
                d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"
              ></path>
            </svg>
          </div>
          <h2 className="text-[#101418] text-base font-bold leading-tight">Excel a PDF</h2>
        </div>
        <div className="flex flex-1 gap-3 rounded-lg border border-[#d4dbe2] bg-gray-50 p-4 items-center">
          <div className="text-[#101418]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
              <path
                d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"
              ></path>
            </svg>
          </div>
          <h2 className="text-[#101418] text-base font-bold leading-tight">PDF a Excel</h2>
        </div>
        <div className="flex flex-1 gap-3 rounded-lg border border-[#d4dbe2] bg-gray-50 p-4 items-center">
          <div className="text-[#101418]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
              <path
                d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"
              ></path>
            </svg>
          </div>
          <h2 className="text-[#101418] text-base font-bold leading-tight">Excel a CSV</h2>
        </div>
        <div className="flex flex-1 gap-3 rounded-lg border border-[#d4dbe2] bg-gray-50 p-4 items-center">
          <div className="text-[#101418]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
              <path
                d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"
              ></path>
            </svg>
          </div>
          <h2 className="text-[#101418] text-base font-bold leading-tight">CSV a Excel</h2>
        </div>
        <div className="flex flex-1 gap-3 rounded-lg border border-[#d4dbe2] bg-gray-50 p-4 items-center">
          <div className="text-[#101418]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
              <path
                d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"
              ></path>
            </svg>
          </div>
          <h2 className="text-[#101418] text-base font-bold leading-tight">Excel a JPG</h2>
        </div>
        <div className="flex flex-1 gap-3 rounded-lg border border-[#d4dbe2] bg-gray-50 p-4 items-center">
          <div className="text-[#101418]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
              <path
                d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"
              ></path>
            </svg>
          </div>
          <h2 className="text-[#101418] text-base font-bold leading-tight">JPG a Excel</h2>
        </div>
      </div>
      <h3 className="text-[#101418] text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Analizar Excel</h3>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(158px,1fr))] gap-3 p-4">
        <div className="flex flex-1 gap-3 rounded-lg border border-[#d4dbe2] bg-gray-50 p-4 items-center">
          <div className="text-[#101418]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
              <path
                d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"
              ></path>
            </svg>
          </div>
          <h2 className="text-[#101418] text-base font-bold leading-tight">Comparar Excel</h2>
        </div>
        <div className="flex flex-1 gap-3 rounded-lg border border-[#d4dbe2] bg-gray-50 p-4 items-center">
          <div className="text-[#101418]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
              <path
                d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"
              ></path>
            </svg>
          </div>
          <h2 className="text-[#101418] text-base font-bold leading-tight">Ordenar Excel</h2>
        </div>
        <div className="flex flex-1 gap-3 rounded-lg border border-[#d4dbe2] bg-gray-50 p-4 items-center">
          <div className="text-[#101418]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
              <path
                d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"
              ></path>
            </svg>
          </div>
          <h2 className="text-[#101418] text-base font-bold leading-tight">Filtrar Excel</h2>
        </div>
        <div className="flex flex-1 gap-3 rounded-lg border border-[#d4dbe2] bg-gray-50 p-4 items-center">
          <div className="text-[#101418]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
              <path
                d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"
              ></path>
            </svg>
          </div>
          <h2 className="text-[#101418] text-base font-bold leading-tight">Resumir Excel</h2>
        </div>
        <div className="flex flex-1 gap-3 rounded-lg border border-[#d4dbe2] bg-gray-50 p-4 items-center">
          <div className="text-[#101418]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
              <path
                d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"
              ></path>
            </svg>
          </div>
          <h2 className="text-[#101418] text-base font-bold leading-tight">Tabla Dinámica</h2>
        </div>
        <div className="flex flex-1 gap-3 rounded-lg border border-[#d4dbe2] bg-gray-50 p-4 items-center">
          <div className="text-[#101418]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
              <path
                d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"
              ></path>
            </svg>
          </div>
          <h2 className="text-[#101418] text-base font-bold leading-tight">Limpiar Excel</h2>
        </div>
      </div>
    </div>
  );
} 
