using MapaWeb.Data;
using MapaWeb.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MapaWeb.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MarcadoresController : ControllerBase
    {
        private readonly AppDbContext _context; 
        public MarcadoresController(AppDbContext context)
        {
            _context = context;
        }
        // Devuelve la lista completa de marcadores
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Marcador>>> GetMarcadores()
        {
            return await _context.Marcadores.ToListAsync();
        }
        // Crea un nuevo marcador a partir de la solicitud
        [HttpPost]
        public async Task<ActionResult<Marcador>> PostMarcador([FromBody] Marcador marcador)
        {
            // Valida el modelo recibido
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            // Agrega el nuevo marcador y guarda
            _context.Marcadores.Add(marcador);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetMarcadores), new { id = marcador.Id }, marcador);
        }
        // Actualiza el nombre de un marcador que ya existe
        [HttpPut("{id}")]
        public async Task<IActionResult> PutMarcador(int id, [FromBody] Marcador marcadorActualizado)
        {
            var marcador = await _context.Marcadores.FindAsync(id);
            if (marcador == null)
            {
                return NotFound();
            }

            // Actualiza el nombre del marcador
            marcador.Nombre = marcadorActualizado.Nombre;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                // Verifica si el marcador sigue existiendo
                if (!_context.Marcadores.Any(e => e.Id == id))
                {
                    return NotFound();
                }
                else
                {
                    throw; 
                }
            }
            return NoContent();
        }
        // Elimina un marcador por ID
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMarcador(int id)
        {
            var marcador = await _context.Marcadores.FindAsync(id);

            if (marcador == null)
            {
                return NotFound();
            }

            // Elimina el marcador y guarda 
            _context.Marcadores.Remove(marcador);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
