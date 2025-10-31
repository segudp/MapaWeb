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

    // GET: /api/poligonos
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Poligono>>> GetPoligonos()
    {
        return await _context.Poligonos.ToListAsync();
    }

  
    [HttpPost]
    [HttpPost]
    public async Task<ActionResult<Poligono>> PostPoligono([FromBody] PoligonoDto dto)
    {
        try
        {
            // 1. Convertimos las coordenadas
            // El JS manda [[lat, lng], [lat, lng]]
            // NetTopologySuite usa (X, Y) -> (Lon, Lat)
            var coordenadas = new List<Coordinate>();
            foreach (var p in dto.Coordenadas)
            {
                // p[0] es lat, p[1] es lng
                coordenadas.Add(new Coordinate(p[1], p[0]));
            }

            // 2. Cerramos el polígono (el primer y último punto deben ser iguales)
            // Leaflet.Draw NO repite el primer punto, así que lo agregamos
            if (coordenadas.Count > 0 && !coordenadas[0].Equals(coordenadas[coordenadas.Count - 1]))
            {
                coordenadas.Add(coordenadas[0]);
            }

            // 3. Verificamos que sea un polígono válido (mínimo 4 puntos: A, B, C, A)
            if (coordenadas.Count < 4)
            {
                return BadRequest(new { message = "Un polígono necesita al menos 3 puntos." });
            }

            // 4. Creamos la geometría
            var shell = _factory.CreateLinearRing(coordenadas.ToArray());
            var poligonoDb = _factory.CreatePolygon(shell);

            var nuevoPoligono = new Poligono
            {
                Nombre = dto.Nombre,
                Geometria = poligonoDb
            };

            // 5. Guardamos en la BBDD
            _context.Poligonos.Add(nuevoPoligono);
            await _context.SaveChangesAsync(); // <-- Si esto falla, el catch lo agarra

            return CreatedAtAction(nameof(GetPoligonos), new { id = nuevoPoligono.Id }, nuevoPoligono);
        }
        catch (Exception ex)
        {
            // 6. Si algo falla, devolvemos el error 500 con detalles
            return StatusCode(500, new { message = "Error interno del servidor", details = ex.Message });
        }
    }


}