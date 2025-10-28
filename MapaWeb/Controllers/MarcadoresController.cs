using MapaWeb.Data;
using MapaWeb.Models;
// Controllers/MarcadoresController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore; // Necesario para el DbContext

namespace MapaWeb.Controllers
{
    [Route("api/[controller]")] // La URL será /api/marcadores
    [ApiController]
    public class MarcadoresController : ControllerBase
    {
        private readonly AppDbContext _context; // Inyecta tu DbContext

        public MarcadoresController(AppDbContext context)
        {
            _context = context;
        }

        // LEER (Read)
        // GET: /api/marcadores
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Marcador>>> GetMarcadores()
        {
            // Devuelve todos los marcadores de la BBDD como un JSON
            return await _context.Marcadores.ToListAsync();
        }

        // CREAR (Create)
        // POST: /api/marcadores
        [HttpPost]
        public async Task<ActionResult<Marcador>> PostMarcador([FromBody] Marcador marcador)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Agrega el nuevo marcador y guarda los cambios
            _context.Marcadores.Add(marcador);
            await _context.SaveChangesAsync();

            // Devuelve el marcador creado (con su nuevo Id)
            return CreatedAtAction(nameof(GetMarcadores), new { id = marcador.Id }, marcador);
        }


        // EDITAR (Update)
        // PUT: /api/marcadores/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutMarcador(int id, [FromBody] Marcador marcadorActualizado)
        {
            // Busca el marcador original en la base de datos
            var marcador = await _context.Marcadores.FindAsync(id);

            if (marcador == null)
            {
                return NotFound();
            }

            // Actualiza las propiedades (en este caso, solo el nombre)
            marcador.Nombre = marcadorActualizado.Nombre;
            // Podrías actualizar también latitud y longitud si quisieras
            // marcador.latitud = marcadorActualizado.latitud;
            // marcador.longitud = marcadorActualizado.longitud;

            try
            {
                // Guarda los cambios en la BBDD
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                // (Manejo de errores por si alguien más lo borró, etc.)
                if (!_context.Marcadores.Any(e => e.Id == id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            // Devuelve "204 No Content" (éxito)
            return NoContent();
        }


        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMarcador(int id)
        {
            var marcador = await _context.Marcadores.FindAsync(id);

            if (marcador == null)
            {
                return NotFound();
            }

            _context.Marcadores.Remove(marcador);
            await _context.SaveChangesAsync();

            return NoContent();
        }

    }
}
