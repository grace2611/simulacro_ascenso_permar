function cargarHistorial() {
  let historial = JSON.parse(localStorage.getItem("historial")) || [];

  let contenedor = document.getElementById("historial");

  if (historial.length === 0) {
    contenedor.innerHTML = "<p>No hay intentos aún 😢</p>";
    return;
  }

  historial.reverse().forEach(i => {
    contenedor.innerHTML += `
      <div class="card">
        <p><strong>📚 Categoría:</strong> ${i.categoria}</p>
        <p><strong>🎯 Puntaje:</strong> ${i.puntaje} / ${i.total}</p>
        <p><strong>📝 Nota:</strong> ${i.nota} / 20</p>
        <p><strong>⏰ Fecha:</strong> ${i.fecha}</p>
      </div>
    `;
  });
}

function volver() {
  window.location.href = "mainpage.html";
}

cargarHistorial();