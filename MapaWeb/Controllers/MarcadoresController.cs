using MapaWeb.Data;
using MapaWeb.Models;
using MapaWeb.Models.DTOs; // 1. Importar el DTO
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries; // 2. Importar NetTopologySuite

namespace MapaWeb.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MarcadoresController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly GeometryFactory _geometryFactory; // 3. Factory para crear geometrías

        public MarcadoresController(AppDbContext context, GeometryFactory factory)
        {
            _context = context;
            _geometryFactory = factory; // <-- Lo asignás
                                        // BORRAMOS LA LÍNEA: _geometryFactory = new GeometryFactory(new Point(0, 0)...);
        }

        //public MarcadoresController(AppDbContext context)
        //{
        //    _context = context;
        //    // 4. Inicializar el Factory con SRID 4326 (WGS 84)
        //    _geometryFactory = new GeometryFactory(new Point(0, 0).Factory.PrecisionModel, 4326);
        //}

        // ---
        // GET (Todos) - Devuelve los marcadores
        // ---
        // NOTA: Esto ahora devolverá un JSON complejo (GeoJSON) en la
        // propiedad "ubicacion", lo cual es perfecto para Leaflet.
        [HttpGet]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<MarcadorDto>>> GetMarcadores()
        {
            var marcadores = await _context.Marcadores.ToListAsync();

            var dtos = marcadores.Select(m => new MarcadorDto
            {
                Id = m.Id,
                Nombre = m.Nombre,
                Latitud = m.Ubicacion.Y,
                Longitud = m.Ubicacion.X
            }).ToList();

            return dtos;
        }

        // ---
        // POST (Crear) - Adaptado para usar DTO
        // ---
        [HttpPost]
        [HttpPost]
        public async Task<ActionResult<MarcadorDto>> PostMarcador([FromBody] MarcadorDto marcadorDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var ubicacion = _geometryFactory.CreatePoint(new Coordinate(marcadorDto.Longitud, marcadorDto.Latitud));

            var marcador = new Marcador
            {
                Nombre = marcadorDto.Nombre,
                Ubicacion = ubicacion
            };

            _context.Marcadores.Add(marcador);
            await _context.SaveChangesAsync();

            // Devolver el DTO con el Id generado
            marcadorDto.Id = marcador.Id;

            return CreatedAtAction(nameof(GetMarcadores), new { id = marcador.Id }, marcadorDto);
        }

        // ---
        // PUT (Actualizar) - Adaptado para usar DTO
        // ---
        [HttpPut("{id}")]
        public async Task<ActionResult<MarcadorDto>> PutMarcador(int id, [FromBody] MarcadorDto marcadorDto)
        {
            var marcador = await _context.Marcadores.FindAsync(id);
            if (marcador == null)
            {
                return NotFound();
            }

            marcador.Nombre = marcadorDto.Nombre;
            marcador.Ubicacion = _geometryFactory.CreatePoint(new Coordinate(marcadorDto.Longitud, marcadorDto.Latitud));

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Marcadores.Any(e => e.Id == id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            marcadorDto.Id = id;
            return Ok(marcadorDto);
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