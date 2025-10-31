using MapaWeb.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using System.Text.Json;

[Route("api/[controller]")]
[ApiController]
public class PoligonosController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly GeometryFactory _factory;

    public PoligonosController(AppDbContext context)
    {
        _context = context;
        _factory = new GeometryFactory(new PrecisionModel(), 4326);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetPoligonos()
    {
        var poligonos = await _context.Poligonos.ToListAsync();

        var resultado = poligonos.Select(p => new
        {
            id = p.Id,
            nombre = p.Nombre,
            coordenadas = p.Geometria.Coordinates.Select(c => new[] { c.Y, c.X }).ToList()
        });

        return Ok(resultado);
    }

    [HttpPost]
    public async Task<ActionResult<object>> PostPoligono([FromBody] PoligonoDto dto)
    {
        try
        {
            var coordenadas = new List<Coordinate>();
            foreach (var p in dto.Coordenadas)
            {
                coordenadas.Add(new Coordinate(p[1], p[0]));
            }

            if (coordenadas.Count > 0 && !coordenadas[0].Equals(coordenadas[coordenadas.Count - 1]))
            {
                coordenadas.Add(coordenadas[0]);
            }

            if (coordenadas.Count < 4)
            {
                return BadRequest(new { message = "Un polígono necesita al menos 3 puntos." });
            }

            var shell = _factory.CreateLinearRing(coordenadas.ToArray());
            var poligonoDb = _factory.CreatePolygon(shell);

            var nuevoPoligono = new Poligono
            {
                Nombre = dto.Nombre,
                Geometria = poligonoDb
            };

            _context.Poligonos.Add(nuevoPoligono);
            await _context.SaveChangesAsync();

            var resultado = new
            {
                id = nuevoPoligono.Id,
                nombre = nuevoPoligono.Nombre,
                coordenadas = nuevoPoligono.Geometria.Coordinates.Select(c => new[] { c.Y, c.X }).ToList()
            };

            return CreatedAtAction(nameof(GetPoligonos), new { id = nuevoPoligono.Id }, resultado);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error interno del servidor", details = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePoligono(int id)
    {
        var poligono = await _context.Poligonos.FindAsync(id);
        if (poligono == null)
        {
            return NotFound();
        }

        _context.Poligonos.Remove(poligono);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}