function cargarHistorial() {

  let historial = JSON.parse(localStorage.getItem("historial")) || [];

  let contenedor = document.getElementById("historial");

  if (historial.length === 0) {
    contenedor.innerHTML = "<p>No hay intentos aún 😢</p>";
    return;
  }

  contenedor.innerHTML = "";

  // 🔥 mostrar últimos primero
  historial.slice().reverse().forEach(i => {

    let colorNota = i.nota >= 13 ? "green" : "red";

    contenedor.innerHTML += `
      <div class="card">
        <p><strong>📚 Categoría:</strong> ${i.categoria}</p>

        <p><strong>🧪 Fase alcanzada:</strong> Fase ${i.fase}</p>

        <p><strong>🎯 Puntaje:</strong> ${i.puntaje} / ${i.total}</p>

        <p>
          <strong>📝 Nota:</strong> 
          <span style="color:${colorNota}; font-weight:bold;">
            ${i.nota}
          </span> / 20
        </p>

        <p><strong>⏰ Fecha:</strong> ${i.fecha}</p>
      </div>
    `;
  });

}

// =============================
// 🗑 BORRAR HISTORIAL
// =============================
function borrarHistorial() {

  if (confirm("¿Seguro que quieres borrar todo tu progreso?")) {
    localStorage.removeItem("historial");
    location.reload();
  }

}

// =============================
// 🔙 VOLVER
// =============================
function volver() {
  window.location.href = "index.html";
}

// =============================
// 🚀 INICIAR
// =============================
cargarHistorial();