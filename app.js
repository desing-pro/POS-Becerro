// CONFIGURACIÓN Y USUARIOS
const PIN_MASTER = "1234";
const MESEROS_PERMITIDOS = {
    "0001": "Mesero 1",
    "0002": "Mesero 2",
    "0003": "Mesero 3",
    "0004": "Mesero 4"
};

// SIMULACIÓN DE DISPOSITIVOS LICENCIADOS
let licenciasPermitidas = JSON.parse(localStorage.getItem("el_becerro_licencias")) || [];

let deviceUUID = localStorage.getItem("el_becerro_device_id");
if (!deviceUUID) {
    deviceUUID = "DEV-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem("el_becerro_device_id", deviceUUID);
}

if (licenciasPermitidas.length === 0) {
    licenciasPermitidas.push(deviceUUID);
    localStorage.setItem("el_becerro_licencias", JSON.stringify(licenciasPermitidas));
}

let usuarioActivo = null; // 'Master (Admin)' o 'Mesero X'
let pinIngresado = "";

// CATÁLOGO DE PRODUCTOS
const CATALOGO = [
    { id: 1, nombre: "Barbacoa por Kilo", precio: 400, categoria: "Barbacoa", tipoVenta: "peso", llevaComplementos: false, icono: "🥩" },
    { id: 2, nombre: "Taco", precio: 25, categoria: "Tacos", tipoVenta: "unidad", llevaComplementos: true, icono: "🌮" },
    { id: 3, nombre: "Lonche", precio: 70, categoria: "Lonches", tipoVenta: "unidad", llevaComplementos: true, icono: "🥖" },
    { id: 4, nombre: "Quesabirria", precio: 65, categoria: "Quesabirrias", tipoVenta: "unidad", llevaComplementos: true, icono: "🧀" },
    { id: 5, nombre: "Birria", precio: 80, categoria: "Birria", tipoVenta: "peso", llevaComplementos: false, icono: "🍲" },
    { id: 6, nombre: "Refrescos", precio: 25, categoria: "Bebidas", tipoVenta: "unidad", llevaComplementos: false, icono: "🥤" },
    { id: 7, nombre: "Agua", precio: 20, categoria: "Bebidas", tipoVenta: "unidad", llevaComplementos: false, icono: "💧" },
    { id: 8, nombre: "Consomé", precio: 35, categoria: "Birria", tipoVenta: "volumen", llevaComplementos: false, icono: "🥣" },
    { id: 9, nombre: "Tortillas", precio: 20, categoria: "Complementos", tipoVenta: "unidad", llevaComplementos: false, icono: "🫓" },
    { id: 10, nombre: "Pan", precio: 15, categoria: "Complementos", tipoVenta: "unidad", llevaComplementos: false, icono: "🍞" }
];

// ESTADO GLOBAL POS
let ordenActual = [];
let ticketsAbiertos = JSON.parse(localStorage.getItem("el_becerro_tickets_pos")) || {};
let productoTemporal = null;
let ticketEditandoId = null;
let metodoPagoSeleccionado = "efectivo";
let modoIngresoPeso = "gramos";

// ELEMENTOS DOM
const pantallaLogin = document.getElementById("pantalla-login");
const pantallaBloqueoLicencia = document.getElementById("pantalla-bloqueo-licencia");
const pinDots = document.getElementById("pin-dots");
const alertaLoginError = document.getElementById("alerta-login-error");
const lblDeviceId = document.getElementById("lbl-device-id");
const lblUsuarioActivo = document.getElementById("lbl-usuario-activo");
const btnCerrarSesion = document.getElementById("btn-cerrar-sesion");

const gridProductos = document.getElementById("grid-productos");
const listaTicket = document.getElementById("lista-ticket");
const totalOrdenElem = document.getElementById("total-orden");
const infoMesaActual = document.getElementById("info-mesa-actual");
const btnCambiarMesa = document.getElementById("btn-cambiar-mesa");
const indicadorEstadoTicket = document.getElementById("indicador-estado-ticket");
const badgeTickets = document.getElementById("badge-tickets");

const btnGuardarOrden = document.getElementById("btn-guardar-orden");
const btnCobrarDirecto = document.getElementById("btn-cobrar-directo");
const btnTicketsAbiertos = document.getElementById("btn-tickets-abiertos");
const btnLimpiarTicket = document.getElementById("btn-limpiar-ticket");

// MODALES
const modalModificador = document.getElementById("modal-modificador");
const modalGuardarMesa = document.getElementById("modal-guardar-mesa");
const modalTicketsAbiertos = document.getElementById("modal-tickets-abiertos");
const modalVerRecibo = document.getElementById("modal-ver-recibo");
const modalCobrar = document.getElementById("modal-cobrar");

// PESO Y LITROS
const seccionPesoKilo = document.getElementById("seccion-peso-kilo");
const precioKiloBaseElem = document.getElementById("precio-kilo-base");
const precioCalculadoPesoElem = document.getElementById("precio-calculado-peso");
const inputPesoCustom = document.getElementById("input-peso-custom");
const labelInputPeso = document.getElementById("label-input-peso");
const btnModoGramos = document.getElementById("btn-modo-gramos");
const btnModoDinero = document.getElementById("btn-modo-dinero");

const seccionVolumenLitro = document.getElementById("seccion-volumen-litro");
const precioLitroBaseElem = document.getElementById("precio-litro-base");
const precioCalculadoLitroElem = document.getElementById("precio-calculado-litro");
const inputMlCustom = document.getElementById("input-ml-custom");

const labelIngredientes = document.getElementById("label-ingredientes");
const seccionIngredientes = document.getElementById("seccion-ingredientes");
const controlCantidadPiezas = document.getElementById("control-cantidad-piezas");

const efectivoRecibidoInput = document.getElementById("efectivo-recibido");
const montoCambioElem = document.getElementById("monto-cambio");
const btnFinalizarVenta = document.getElementById("btn-finalizar-venta");
const alertaCobroError = document.getElementById("alerta-cobro-error");

/* VERIFICAR LICENCIA */
function verificarLicenciaTerminal() {
    lblDeviceId.textContent = deviceUUID;
    const autorizada = licenciasPermitidas.includes(deviceUUID);

    if (!autorizada) {
        document.getElementById("box-device-id-bloqueado").textContent = deviceUUID;
        pantallaBloqueoLicencia.classList.remove("oculto");
        pantallaLogin.classList.add("oculto");
        return false;
    }
    return true;
}

/* TECLADO PIN */
function ingresarDigitoPin(digito) {
    if (pinIngresado.length < 4) {
        pinIngresado += digito;
        actualizarVisorPin();
    }
    if (pinIngresado.length === 4) {
        validarPinLogin();
    }
}

function borrarDigitoPin() {
    pinIngresado = pinIngresado.slice(0, -1);
    actualizarVisorPin();
}

function limpiarPin() {
    pinIngresado = "";
    actualizarVisorPin();
}

function actualizarVisorPin() {
    pinDots.textContent = "•".repeat(pinIngresado.length) || "••••";
}

function validarPinLogin() {
    if (pinIngresado === PIN_MASTER) {
        iniciarSesion("Master (Admin)");
    } else if (MESEROS_PERMITIDOS[pinIngresado]) {
        iniciarSesion(MESEROS_PERMITIDOS[pinIngresado]);
    } else {
        alertaLoginError.classList.remove("oculto");
        setTimeout(() => {
            alertaLoginError.classList.add("oculto");
            limpiarPin();
        }, 1500);
    }
}

function iniciarSesion(nombreUsuario) {
    usuarioActivo = nombreUsuario;
    lblUsuarioActivo.textContent = usuarioActivo;
    pantallaLogin.classList.add("oculto");
    limpiarPin();

    if (usuarioActivo.startsWith("Mesero")) {
        btnCobrarDirecto.classList.add("oculto");
    } else {
        btnCobrarDirecto.classList.remove("oculto");
    }
    actualizarTicketVista();
}

btnCerrarSesion.addEventListener("click", () => {
    usuarioActivo = null;
    pantallaLogin.classList.remove("oculto");
});

/* BÚSQUEDA DE MESAS */
function buscarMesaOcupada(nombre) {
    if (!nombre) return null;
    const nombreNorm = nombre.trim().toLowerCase();
    const keyEncontrada = Object.keys(ticketsAbiertos).find(
        key => key.trim().toLowerCase() === nombreNorm
    );
    return keyEncontrada ? ticketsAbiertos[keyEncontrada] : null;
}

/* RENDERIZADO DE PRODUCTOS */
function renderizarProductos() {
    gridProductos.innerHTML = "";

    CATALOGO.forEach(p => {
        const card = document.createElement("div");
        card.className = "card-producto";

        let etiqueta = "";
        let precioTexto = `$${p.precio.toFixed(2)}`;

        if (p.tipoVenta === "peso") {
            etiqueta = `<span class="etiqueta-medida">⚖️ Por Peso</span>`;
            precioTexto += " /Kg";
        } else if (p.tipoVenta === "volumen") {
            etiqueta = `<span class="etiqueta-medida">🥛 Por Litro</span>`;
            precioTexto += " /L";
        }

        card.innerHTML = `
            <div class="icono-card">${p.icono || '🍽️'}</div>
            <div class="info-card">
                <h4>${p.nombre}</h4>
                ${etiqueta}
            </div>
            <span class="precio">${precioTexto}</span>
        `;
        card.addEventListener("click", () => abrirModalModificador(p));
        gridProductos.appendChild(card);
    });
}

/* MODAL MODIFICADOR */
function abrirModalModificador(producto) {
    productoTemporal = {
        ...producto,
        cantidad: 1,
        gramos: producto.tipoVenta === "peso" ? 1000 : null,
        ml: producto.tipoVenta === "volumen" ? 1000 : null,
        precioUnitario: producto.precio,
        cebolla: producto.llevaComplementos ? "Con cebolla" : null,
        cilantro: producto.llevaComplementos ? "Con cilantro" : null,
        comentario: ""
    };

    document.getElementById("modal-prod-nombre").textContent = `${producto.icono || ''} ${producto.nombre}`;
    document.getElementById("cant-modal").textContent = "1";
    document.getElementById("comentario-cocina").value = "";

    if (producto.llevaComplementos) {
        labelIngredientes.classList.remove("oculto");
        seccionIngredientes.classList.remove("oculto");
        resetearPillsIngredientes();
    } else {
        labelIngredientes.classList.add("oculto");
        seccionIngredientes.classList.add("oculto");
    }

    seccionPesoKilo.classList.add("oculto");
    seccionVolumenLitro.classList.add("oculto");
    controlCantidadPiezas.classList.add("oculto");

    if (producto.tipoVenta === "peso") {
        seccionPesoKilo.classList.remove("oculto");
        precioKiloBaseElem.textContent = producto.precio.toFixed(2);
        cambiarModoIngresoPeso("gramos");
        inputPesoCustom.value = "1000";
        actualizarCalculoPesoDesdeGramos(1000);
        
        document.querySelectorAll(".btn-medida-gramo").forEach(bg => bg.classList.remove("activa"));
        const btn1000g = document.querySelector('.btn-medida-gramo[data-gramos="1000"]');
        if (btn1000g) btn1000g.classList.add("activa");
    } else if (producto.tipoVenta === "volumen") {
        seccionVolumenLitro.classList.remove("oculto");
        precioLitroBaseElem.textContent = producto.precio.toFixed(2);
        inputMlCustom.value = "1000";
        actualizarCalculoLitro(1000);
        document.querySelectorAll(".btn-medida-ml").forEach(bm => bm.classList.remove("activa"));
        const btn1000ml = document.querySelector('.btn-medida-ml[data-ml="1000"]');
        if (btn1000ml) btn1000ml.classList.add("activa");
    } else {
        controlCantidadPiezas.classList.remove("oculto");
    }

    modalModificador.classList.remove("oculto");
}

function resetearPillsIngredientes() {
    document.querySelectorAll('#pills-cebolla .btn-pill-opt').forEach(b => {
        if (b.dataset.val === "Con cebolla") b.classList.add("activa");
        else b.classList.remove("activa");
    });
    document.querySelectorAll('#pills-cilantro .btn-pill-opt').forEach(b => {
        if (b.dataset.val === "Con cilantro") b.classList.add("activa");
        else b.classList.remove("activa");
    });
}

document.querySelectorAll(".btn-pill-opt").forEach(btn => {
    btn.addEventListener("click", () => {
        const tipoIng = btn.dataset.ing;
        const contenedor = btn.parentElement;

        contenedor.querySelectorAll(".btn-pill-opt").forEach(b => b.classList.remove("activa"));
        btn.classList.add("activa");

        if (tipoIng === "cebolla") {
            productoTemporal.cebolla = btn.dataset.val;
        } else if (tipoIng === "cilantro") {
            productoTemporal.cilantro = btn.dataset.val;
        }
    });
});

/* MODO PESO / DINERO */
btnModoGramos.addEventListener("click", () => cambiarModoIngresoPeso("gramos"));
btnModoDinero.addEventListener("click", () => cambiarModoIngresoPeso("dinero"));

function cambiarModoIngresoPeso(modo) {
    modoIngresoPeso = modo;
    if (modo === "gramos") {
        btnModoGramos.classList.add("activa");
        btnModoDinero.classList.remove("activa");
        labelInputPeso.textContent = "Gramos exactos:";
        inputPesoCustom.placeholder = "Ej. 350";
        inputPesoCustom.value = Math.round(productoTemporal.gramos || 1000);
        actualizarCalculoPesoDesdeGramos(inputPesoCustom.value);
    } else {
        btnModoDinero.classList.add("activa");
        btnModoGramos.classList.remove("activa");
        labelInputPeso.textContent = "Monto en Dinero ($):";
        inputPesoCustom.placeholder = "Ej. 120";
        
        const dineroActual = (productoTemporal.precioUnitario / 1000) * (productoTemporal.gramos || 1000);
        inputPesoCustom.value = dineroActual.toFixed(2);
        actualizarCalculoPesoDesdeDinero(dineroActual);
    }
}

inputPesoCustom.addEventListener("input", (e) => {
    document.querySelectorAll(".btn-medida-gramo").forEach(b => b.classList.remove("activa"));
    const valor = parseFloat(e.target.value) || 0;
    if (modoIngresoPeso === "gramos") {
        actualizarCalculoPesoDesdeGramos(valor);
    } else {
        actualizarCalculoPesoDesdeDinero(valor);
    }
});

function actualizarCalculoPesoDesdeGramos(gramos) {
    gramos = parseFloat(gramos) || 0;
    productoTemporal.gramos = gramos;
    const subtotal = (productoTemporal.precioUnitario / 1000) * gramos;
    precioCalculadoPesoElem.textContent = `$${subtotal.toFixed(2)}`;
}

function actualizarCalculoPesoDesdeDinero(montoDinero) {
    montoDinero = parseFloat(montoDinero) || 0;
    const gramosCalculados = (montoDinero * 1000) / productoTemporal.precioUnitario;
    productoTemporal.gramos = gramosCalculados;
    precioCalculadoPesoElem.textContent = `$${montoDinero.toFixed(2)}`;
}

document.querySelectorAll(".btn-medida-gramo").forEach(btn => {
    btn.addEventListener("click", () => {
        cambiarModoIngresoPeso("gramos");
        document.querySelectorAll(".btn-medida-gramo").forEach(b => b.classList.remove("activa"));
        btn.classList.add("activa");
        const gramos = parseFloat(btn.dataset.gramos);
        inputPesoCustom.value = gramos;
        actualizarCalculoPesoDesdeGramos(gramos);
    });
});

function actualizarCalculoLitro(ml) {
    ml = parseFloat(ml) || 0;
    productoTemporal.ml = ml;
    const subtotal = (productoTemporal.precioUnitario / 1000) * ml;
    precioCalculadoLitroElem.textContent = `$${subtotal.toFixed(2)}`;
}

document.querySelectorAll(".btn-medida-ml").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".btn-medida-ml").forEach(b => b.classList.remove("activa"));
        btn.classList.add("activa");
        const ml = parseFloat(btn.dataset.ml);
        inputMlCustom.value = ml;
        actualizarCalculoLitro(ml);
    });
});

inputMlCustom.addEventListener("input", (e) => {
    document.querySelectorAll(".btn-medida-ml").forEach(b => b.classList.remove("activa"));
    actualizarCalculoLitro(e.target.value);
});

document.getElementById("btn-cant-menos").addEventListener("click", () => {
    if (productoTemporal.cantidad > 1) {
        productoTemporal.cantidad--;
        document.getElementById("cant-modal").textContent = productoTemporal.cantidad;
    }
});

document.getElementById("btn-cant-mas").addEventListener("click", () => {
    productoTemporal.cantidad++;
    document.getElementById("cant-modal").textContent = productoTemporal.cantidad;
});

/* AGREGAR AL TICKET */
document.getElementById("btn-confirmar-agregar").addEventListener("click", () => {
    productoTemporal.comentario = document.getElementById("comentario-cocina").value.trim();

    const partesOpciones = [];
    if (productoTemporal.llevaComplementos) {
        if (productoTemporal.cebolla) partesOpciones.push(productoTemporal.cebolla);
        if (productoTemporal.cilantro) partesOpciones.push(productoTemporal.cilantro);
    }
    productoTemporal.opcionesTexto = partesOpciones.join(" | ");

    let subtotalCalculado = 0;
    if (productoTemporal.tipoVenta === "peso") {
        subtotalCalculado = (productoTemporal.precioUnitario / 1000) * productoTemporal.gramos * productoTemporal.cantidad;
    } else if (productoTemporal.tipoVenta === "volumen") {
        subtotalCalculado = (productoTemporal.precioUnitario / 1000) * productoTemporal.ml * productoTemporal.cantidad;
    } else {
        subtotalCalculado = productoTemporal.precioUnitario * productoTemporal.cantidad;
    }
    productoTemporal.subtotal = subtotalCalculado;

    if (productoTemporal.gramos) {
        productoTemporal.gramos = Math.round(productoTemporal.gramos * 100) / 100;
    }

    const indiceExistente = ordenActual.findIndex(item =>
        item.id === productoTemporal.id &&
        item.cebolla === productoTemporal.cebolla &&
        item.cilantro === productoTemporal.cilantro &&
        item.comentario === productoTemporal.comentario &&
        item.gramos === productoTemporal.gramos &&
        item.ml === productoTemporal.ml
    );

    if (indiceExistente !== -1) {
        ordenActual[indiceExistente].cantidad += productoTemporal.cantidad;
        if (ordenActual[indiceExistente].tipoVenta === "unidad") {
            ordenActual[indiceExistente].subtotal = ordenActual[indiceExistente].cantidad * ordenActual[indiceExistente].precioUnitario;
        } else {
            ordenActual[indiceExistente].subtotal += productoTemporal.subtotal;
        }
    } else {
        ordenActual.push({ ...productoTemporal });
    }

    actualizarTicketVista();
    cerrarTodosModales();
});

/* RENDERIZAR TICKET ACTUAL */
function actualizarTicketVista() {
    listaTicket.innerHTML = "";
    const esMesero = usuarioActivo && usuarioActivo.startsWith("Mesero");

    if (ordenActual.length === 0) {
        listaTicket.innerHTML = `
            <div class="ticket-vacio">
                <span class="icono-vacio">🛒</span>
                <p>No hay productos en la orden</p>
                <small>Toca un producto para agregarlo</small>
            </div>
        `;
        totalOrdenElem.textContent = "$0.00";
        btnGuardarOrden.disabled = true;
        btnCobrarDirecto.disabled = true;
        btnLimpiarTicket.disabled = true;
        btnLimpiarTicket.style.opacity = "0.3";
        return;
    }

    // SI LA ORDEN AÚN NO SE HA GUARDADO (ticketEditandoId === null), EL MESERO PUEDE USAR EL BOTÓN DE LIMPIAR
    // SI YA ESTÁ GUARDADA Y SE ESTÁ EDITANDO, SE BLOQUEA PARA EL MESERO
    if (esMesero && ticketEditandoId !== null) {
        btnLimpiarTicket.disabled = true;
        btnLimpiarTicket.style.opacity = "0.3";
        btnLimpiarTicket.style.cursor = "not-allowed";
    } else {
        btnLimpiarTicket.disabled = false;
        btnLimpiarTicket.style.opacity = "1";
        btnLimpiarTicket.style.cursor = "pointer";
    }

    let total = 0;
    ordenActual.forEach((item, index) => {
        total += item.subtotal;

        const div = document.createElement("div");
        div.className = "item-ticket";

        let detalleTexto = "";
        if (item.tipoVenta === "peso") {
            detalleTexto = `${item.cantidad}x (${item.gramos.toFixed(1)}g) @ $${item.precioUnitario}/Kg`;
        } else if (item.tipoVenta === "volumen") {
            detalleTexto = `${item.cantidad}x (${item.ml}ml) @ $${item.precioUnitario}/L`;
        } else {
            detalleTexto = `${item.cantidad}x $${item.precioUnitario.toFixed(2)}`;
        }

        // EL MESERO PUEDE ELIMINAR CUALQUIER ITEM SI EL TICKET AÚN NO SE HA GUARDADO (ticketEditandoId === null)
        const puedeEliminar = !esMesero || (esMesero && ticketEditandoId === null);

        div.innerHTML = `
            <div class="item-info">
                <strong>${item.icono || ''} ${item.nombre}</strong>
                <small>${detalleTexto}</small>
                ${item.opcionesTexto ? `<small>• ${item.opcionesTexto}</small>` : ""}
                ${item.comentario ? `<small>💬 ${item.comentario}</small>` : ""}
            </div>
            <div class="item-derecha">
                <span class="item-precio">$${item.subtotal.toFixed(2)}</span>
                ${puedeEliminar ? `<button class="btn-eliminar-item" onclick="eliminarItemTicket(${index})">Eliminar</button>` : `<small style="color:#999; margin-top:4px;">Bloqueado</small>`}
            </div>
        `;
        listaTicket.appendChild(div);
    });

    totalOrdenElem.textContent = `$${total.toFixed(2)}`;
    btnGuardarOrden.disabled = false;
    if (!esMesero) {
        btnCobrarDirecto.disabled = false;
    }
    actualizarBadgeTickets();
}

function eliminarItemTicket(index) {
    const esMesero = usuarioActivo && usuarioActivo.startsWith("Mesero");
    if (esMesero && ticketEditandoId !== null) {
        alert("⛔ No puedes eliminar productos de un ticket que ya fue guardado. Solicita autorización a caja (Master).");
        return;
    }
    ordenActual.splice(index, 1);
    actualizarTicketVista();
}

/* GUARDAR TICKET Y VALIDAR MESAS */
btnGuardarOrden.addEventListener("click", () => {
    if (ticketEditandoId) {
        guardarEnTicket(ticketEditandoId);
    } else {
        abrirModalGuardarMesa();
    }
});

btnCambiarMesa.addEventListener("click", abrirModalGuardarMesa);

function abrirModalGuardarMesa() {
    const grid = document.getElementById("grid-mesas-guardar");
    grid.innerHTML = "";

    document.getElementById("nombre-para-llevar").value = ticketEditandoId || "";

    for (let i = 1; i <= 6; i++) {
        const nombreMesa = `Mesa ${i}`;
        const ticketExistente = buscarMesaOcupada(nombreMesa);
        const ocupada = ticketExistente && ticketExistente.id !== ticketEditandoId;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `btn-mesa-item ${ocupada ? "ocupada" : "libre"}`;
        btn.textContent = `${nombreMesa} ${ocupada ? "🔴 OCUPADA" : "🟢"}`;
        
        if (ocupada) {
            btn.disabled = true;
            btn.title = "Esta mesa ya se encuentra ocupada";
        } else {
            btn.addEventListener("click", () => guardarEnTicket(nombreMesa));
        }
        grid.appendChild(btn);
    }

    modalGuardarMesa.classList.remove("oculto");
}

document.getElementById("btn-confirmar-llevar").addEventListener("click", () => {
    const nombreInput = document.getElementById("nombre-para-llevar").value.trim();
    const nombre = nombreInput || ticketEditandoId || "Para Llevar";
    guardarEnTicket(nombre);
});

function guardarEnTicket(identificador) {
    if (!identificador || !identificador.trim()) {
        alert("⚠️ Ingresa un nombre o selecciona una mesa válida.");
        return;
    }

    let idFinal = identificador.trim();
    const ticketExistente = buscarMesaOcupada(idFinal);

    if (idFinal.toLowerCase().startsWith("para llevar") && ticketExistente && ticketExistente.id !== ticketEditandoId) {
        let contador = 2;
        while (buscarMesaOcupada(`Para Llevar ${contador}`)) {
            contador++;
        }
        idFinal = `Para Llevar ${contador}`;
    } 
    else if (ticketExistente && ticketExistente.id !== ticketEditandoId) {
        alert(`⛔ LA MESA O IDENTIFICADOR "${ticketExistente.id}" YA ESTÁ OCUPADA.\n\nPor favor selecciona una mesa libre o escribe un identificador distinto.`);
        return;
    }

    if (ticketEditandoId && ticketEditandoId !== idFinal) {
        delete ticketsAbiertos[ticketEditandoId];
    }

    let meseroCreador = usuarioActivo;
    if (ticketExistente && ticketExistente.atendidoPor) {
        meseroCreador = ticketExistente.atendidoPor;
    }

    ticketsAbiertos[idFinal] = {
        id: idFinal,
        items: [...ordenActual],
        atendidoPor: meseroCreador,
        fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    localStorage.setItem("el_becerro_tickets_pos", JSON.stringify(ticketsAbiertos));
    alert(`✅ Comanda guardada con éxito en: ${idFinal}`);

    limpiarOrdenActual();
    cerrarTodosModales();
    actualizarBadgeTickets();
}

/* TICKETS ABIERTOS */
btnTicketsAbiertos.addEventListener("click", abrirModalTicketsAbiertos);

function abrirModalTicketsAbiertos() {
    const contenedor = document.getElementById("lista-tickets-abiertos");
    contenedor.innerHTML = "";

    const llaves = Object.keys(ticketsAbiertos);
    if (llaves.length === 0) {
        contenedor.innerHTML = "<p style='color:#777; grid-column: 1/-1;'>No hay tickets abiertos.</p>";
    } else {
        llaves.forEach(key => {
            const ticket = ticketsAbiertos[key];
            const total = ticket.items.reduce((sum, item) => sum + item.subtotal, 0);

            const esSuTicket = !usuarioActivo.startsWith("Mesero") || ticket.atendidoPor === usuarioActivo;

            const card = document.createElement("div");
            card.className = "card-ticket-abierto";
            card.innerHTML = `
                <h4>🪑 ${ticket.id}</h4>
                <small>Atiende: ${ticket.atendidoPor || 'N/A'} (${ticket.fecha})</small>
                <div class="monto">$${total.toFixed(2)}</div>
                <div class="acciones-card-ticket">
                    ${esSuTicket ? `<button class="btn-mini btn-mini-cargar" onclick="cargarTicketActual('${ticket.id}')">Editar</button>` : `<button class="btn-mini" style="background:#f0f0f0; color:#999;" disabled>Bloqueado</button>`}
                    <button class="btn-mini btn-mini-cuenta" onclick="verCuentaTicket('${ticket.id}')">Cuenta</button>
                    ${!usuarioActivo.startsWith("Mesero") ? `<button class="btn-mini btn-mini-cobrar" onclick="prepararCobro('${ticket.id}')">Cobrar</button>` : ``}
                </div>
            `;
            contenedor.appendChild(card);
        });
    }

    modalTicketsAbiertos.classList.remove("oculto");
}

/* CARGAR TICKET PARA EDITAR */
function cargarTicketActual(key) {
    const ticket = ticketsAbiertos[key];
    if (!ticket) return;

    if (usuarioActivo.startsWith("Mesero") && ticket.atendidoPor !== usuarioActivo) {
        alert("⛔ No puedes modificar un ticket que pertenece a otro mesero.");
        return;
    }

    ordenActual = JSON.parse(JSON.stringify(ticket.items));
    ticketEditandoId = ticket.id;

    infoMesaActual.textContent = ticket.id;
    btnCambiarMesa.classList.remove("oculto");
    indicadorEstadoTicket.textContent = `Editando: ${ticket.id}`;
    indicadorEstadoTicket.style.background = "#e65100";

    actualizarTicketVista();
    cerrarTodosModales();
}

/* VER RECIBO / PRE-CUENTA */
function verCuentaTicket(key) {
    const ticket = ticketsAbiertos[key];
    if (!ticket) return;

    const contenedor = document.getElementById("contenedor-recibo-impresion");
    let total = 0;

    let itemsHtml = ticket.items.map(item => {
        total += item.subtotal;

        let descCant = "";
        if (item.tipoVenta === "peso") {
            descCant = `${item.cantidad}x (${item.gramos.toFixed(1)}g)`;
        } else if (item.tipoVenta === "volumen") {
            descCant = `${item.cantidad}x (${item.ml}ml)`;
        } else {
            descCant = `${item.cantidad}x`;
        }

        return `
            <div class="item-recibo">
                <span>${descCant} ${item.nombre}</span>
                <strong>$${item.subtotal.toFixed(2)}</strong>
            </div>
            ${item.opcionesTexto ? `<div class="item-recibo-sub">• ${item.opcionesTexto}</div>` : ""}
            ${item.comentario ? `<div class="item-recibo-sub">💬 ${item.comentario}</div>` : ""}
        `;
    }).join("");

    contenedor.innerHTML = `
        <div class="encabezado-recibo">
            <h2>EL BECERRO</h2>
            <p>PRE-CUENTA / COMANDA</p>
            <p><strong>Ubicación:</strong> ${ticket.id}</p>
            <p><strong>Mesero:</strong> ${ticket.atendidoPor || 'N/A'}</p>
            <p><strong>Hora:</strong> ${ticket.fecha}</p>
        </div>
        <div class="cuerpo-recibo">
            ${itemsHtml}
        </div>
        <div class="totales-recibo">
            <span>TOTAL: $${total.toFixed(2)}</span>
        </div>
    `;

    cerrarTodosModales();
    modalVerRecibo.classList.remove("oculto");
}

document.getElementById("btn-imprimir-cuenta").addEventListener("click", () => {
    window.print();
});

/* COBRO */
btnCobrarDirecto.addEventListener("click", () => {
    if (usuarioActivo.startsWith("Mesero")) return;
    if (ordenActual.length === 0) return;
    prepararCobro(null);
});

function prepararCobro(key) {
    if (usuarioActivo.startsWith("Mesero")) return;

    if (key) {
        cargarTicketActual(key);
    }

    const total = ordenActual.reduce((sum, item) => sum + item.subtotal, 0);

    if (total <= 0) {
        alert("⚠️ No se puede cobrar un ticket con total $0.00");
        return;
    }

    document.getElementById("monto-total-cobro").textContent = `$${total.toFixed(2)}`;
    efectivoRecibidoInput.value = "";
    montoCambioElem.textContent = "$0.00";

    validarCandadosCobro();
    cerrarTodosModales();
    modalCobrar.classList.remove("oculto");
}

document.querySelectorAll(".tab-pago").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".tab-pago").forEach(t => t.classList.remove("activa"));
        tab.classList.add("activa");
        metodoPagoSeleccionado = tab.dataset.metodo;

        const seccionEfectivo = document.getElementById("seccion-efectivo");
        if (metodoPagoSeleccionado === "efectivo") {
            seccionEfectivo.classList.remove("oculto");
        } else {
            seccionEfectivo.classList.add("oculto");
        }
        validarCandadosCobro();
    });
});

efectivoRecibidoInput.addEventListener("input", validarCandadosCobro);

document.querySelectorAll(".btn-billete").forEach(btn => {
    btn.addEventListener("click", () => {
        const total = ordenActual.reduce((sum, item) => sum + item.subtotal, 0);
        let monto = 0;

        if (btn.dataset.monto === "exacto") {
            monto = total;
        } else {
            monto = parseFloat(btn.dataset.monto);
        }

        efectivoRecibidoInput.value = monto;
        validarCandadosCobro();
    });
});

function validarCandadosCobro() {
    const total = ordenActual.reduce((sum, item) => sum + item.subtotal, 0);

    if (metodoPagoSeleccionado !== "efectivo") {
        btnFinalizarVenta.disabled = false;
        alertaCobroError.classList.add("oculto");
        return;
    }

    const recibido = parseFloat(efectivoRecibidoInput.value) || 0;
    const cambio = recibido - total;

    if (recibido < total || isNaN(recibido)) {
        btnFinalizarVenta.disabled = true;
        alertaCobroError.classList.remove("oculto");
        montoCambioElem.textContent = "$0.00";
    } else {
        btnFinalizarVenta.disabled = false;
        alertaCobroError.classList.add("oculto");
        montoCambioElem.textContent = `$${cambio.toFixed(2)}`;
    }
}

document.getElementById("btn-finalizar-venta").addEventListener("click", () => {
    const total = ordenActual.reduce((sum, item) => sum + item.subtotal, 0);
    const recibido = parseFloat(efectivoRecibidoInput.value) || total;
    const cambio = recibido - total;

    alert(`🎉 VENTA COBRADA CON ÉXITO\n\nTotal: $${total.toFixed(2)}\nRecibido: $${recibido.toFixed(2)}\nCambio: $${cambio.toFixed(2)}`);

    if (ticketEditandoId && ticketsAbiertos[ticketEditandoId]) {
        delete ticketsAbiertos[ticketEditandoId];
        localStorage.setItem("el_becerro_tickets_pos", JSON.stringify(ticketsAbiertos));
    }

    limpiarOrdenActual();
    cerrarTodosModales();
    actualizarBadgeTickets();
});

/* UTILIDADES Y NAVEGACIÓN */
function limpiarOrdenActual() {
    ordenActual = [];
    ticketEditandoId = null;
    infoMesaActual.textContent = "Venta Directa";
    btnCambiarMesa.classList.add("oculto");
    indicadorEstadoTicket.textContent = "Nueva Venta";
    indicadorEstadoTicket.style.background = "#7a2323";
    actualizarTicketVista();
}

function actualizarBadgeTickets() {
    badgeTickets.textContent = Object.keys(ticketsAbiertos).length;
}

function cerrarTodosModales() {
    document.querySelectorAll(".modal-overlay").forEach(m => m.classList.add("oculto"));
}

document.querySelectorAll(".btn-cerrar-modal").forEach(b => {
    b.addEventListener("click", cerrarTodosModales);
});

btnLimpiarTicket.addEventListener("click", () => {
    const esMesero = usuarioActivo && usuarioActivo.startsWith("Mesero");
    if (esMesero && ticketEditandoId !== null) {
        alert("⛔ No puedes vaciar la orden de un ticket que ya fue guardado. Solicita autorización a caja (Master).");
        return;
    }
    limpiarOrdenActual();
});

// INICIALIZACIÓN
if (verificarLicenciaTerminal()) {
    renderizarProductos();
    actualizarTicketVista();
    actualizarBadgeTickets();
}
