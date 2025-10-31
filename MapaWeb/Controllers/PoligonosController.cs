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

    public PoligonosController(AppDbContext context, GeometryFactory factory)
    {
        _context = context;
<<<<<<< HEAD
        _factory = factory; // <-- Lo asignás
        // BORRAMOS LA LÍNEA: _factory = new GeometryFactory(new PrecisionModel(), 4326);
=======
<<<<<<< HEAD
        _factory = new GeometryFactory(new PrecisionModel(), 4326);
=======
        _factory = factory; // <-- Lo asignás
        // BORRAMOS LA LÍNEA: _factory = new GeometryFactory(new PrecisionModel(), 4326);
>>>>>>> 82f565b (sistema de poligonos funcando de 10)
>>>>>>> bf58317f9111719693eb87794629ca9af9b32940
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

<<<<<<< HEAD


    [HttpPost]
    public async Task<IActionResult> PostPoligono([FromBody] PoligonoDto dto)
    {
        try
        {
            // Validación básica
            if (dto == null)
            {
                return BadRequest(new { message = "El DTO es nulo." });
            }

            if (string.IsNullOrWhiteSpace(dto.Nombre))
            {
                return BadRequest(new { message = "El nombre es requerido." });
            }

            if (dto.Coordenadas == null || dto.Coordenadas.Count < 3)
=======
<<<<<<< HEAD
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
=======


    [HttpPost]
    public async Task<IActionResult> PostPoligono([FromBody] PoligonoDto dto)
    {
        try
        {
            // Validación básica
            if (dto == null)
            {
                return BadRequest(new { message = "El DTO es nulo." });
            }

            if (string.IsNullOrWhiteSpace(dto.Nombre))
>>>>>>> 82f565b (sistema de poligonos funcando de 10)
            {
                return BadRequest(new { message = "El nombre es requerido." });
            }

<<<<<<< HEAD
            if (coordenadas.Count < 4)
=======
            if (dto.Coordenadas == null || dto.Coordenadas.Count < 3)
>>>>>>> 82f565b (sistema de poligonos funcando de 10)
>>>>>>> bf58317f9111719693eb87794629ca9af9b32940
            {
                return BadRequest(new { message = "Un polígono necesita al menos 3 puntos." });
            }

<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
>>>>>>> bf58317f9111719693eb87794629ca9af9b32940
            // 1. Convertimos [lat, lng] a Coordinate(lng, lat)
            var coordenadas = dto.Coordenadas
                .Select(p => new Coordinate(p[1], p[0])) // p[1]=lng, p[0]=lat
                .ToList();

            // 2. Cerramos el polígono si no está cerrado
            if (!coordenadas[0].Equals2D(coordenadas[^1]))
            {
                coordenadas.Add(coordenadas[0]);
            }

            // 3. Validamos cantidad de puntos
            if (coordenadas.Count < 4)
            {
                return BadRequest(new { message = "Polígono inválido después del cierre." });
            }

            // 4. Creamos la geometría
>>>>>>> 82f565b (sistema de poligonos funcando de 10)
            var shell = _factory.CreateLinearRing(coordenadas.ToArray());
            var poligonoGeometria = _factory.CreatePolygon(shell);

            // Validamos
            if (!poligonoGeometria.IsValid)
            {
                return BadRequest(new { message = "El polígono no es válido geométricamente." });
            }

            var nuevoPoligono = new Poligono
            {
                Nombre = dto.Nombre,
                Geometria = poligonoGeometria
            };

<<<<<<< HEAD
            // 5. Guardamos
            _context.Poligonos.Add(nuevoPoligono);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                id = nuevoPoligono.Id,
                nombre = nuevoPoligono.Nombre,
                mensaje = "Polígono guardado exitosamente"
            });

        }
        catch (Exception ex)
        {
=======
<<<<<<< HEAD
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
=======
            // 5. Guardamos
            _context.Poligonos.Add(nuevoPoligono);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                id = nuevoPoligono.Id,
                nombre = nuevoPoligono.Nombre,
                mensaje = "Polígono guardado exitosamente"
            });

        }
        catch (Exception ex)
        {
>>>>>>> bf58317f9111719693eb87794629ca9af9b32940
            // ✅ Capturamos TODA la cadena de excepciones
            var errorDetails = new
            {
                message = ex.Message,
                innerException = ex.InnerException?.Message,
                innerInnerException = ex.InnerException?.InnerException?.Message,
                stackTrace = ex.StackTrace
            };

            // Log en consola
            Console.WriteLine($"❌ ERROR: {ex.Message}");
            Console.WriteLine($"❌ Inner: {ex.InnerException?.Message}");
            Console.WriteLine($"❌ InnerInner: {ex.InnerException?.InnerException?.Message}");

            return StatusCode(500, errorDetails);
<<<<<<< HEAD
=======
>>>>>>> 82f565b (sistema de poligonos funcando de 10)
>>>>>>> bf58317f9111719693eb87794629ca9af9b32940
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
<<<<<<< HEAD

        _context.Poligonos.Remove(poligono);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> PutPoligono(int id, [FromBody] PoligonoDto dto)
    {
        var poligono = await _context.Poligonos.FindAsync(id);
        if (poligono == null)
        {
            return NotFound();
        }

        // 1. Actualizar el nombre
        poligono.Nombre = dto.Nombre;

        // 2. Re-crear la geometría (igual que en el POST)
        var coordenadas = dto.Coordenadas
            .Select(p => new Coordinate(p[1], p[0])) // (Lon, Lat)
            .ToList();

        if (!coordenadas[0].Equals2D(coordenadas[^1]))
        {
            coordenadas.Add(coordenadas[0]);
        }

        if (coordenadas.Count < 4)
        {
            return BadRequest(new { message = "Polígono inválido." });
        }

        var shell = _factory.CreateLinearRing(coordenadas.ToArray());
        poligono.Geometria = _factory.CreatePolygon(shell); // Actualiza la geometría

        // 3. Guardar cambios
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error al actualizar", details = ex.Message });
        }

        return NoContent(); // Éxito
    }
=======
<<<<<<< HEAD
=======
>>>>>>> bf58317f9111719693eb87794629ca9af9b32940

        _context.Poligonos.Remove(poligono);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> PutPoligono(int id, [FromBody] PoligonoDto dto)
    {
        var poligono = await _context.Poligonos.FindAsync(id);
        if (poligono == null)
        {
            return NotFound();
        }

        // 1. Actualizar el nombre
        poligono.Nombre = dto.Nombre;

        // 2. Re-crear la geometría (igual que en el POST)
        var coordenadas = dto.Coordenadas
            .Select(p => new Coordinate(p[1], p[0])) // (Lon, Lat)
            .ToList();

        if (!coordenadas[0].Equals2D(coordenadas[^1]))
        {
            coordenadas.Add(coordenadas[0]);
        }

        if (coordenadas.Count < 4)
        {
            return BadRequest(new { message = "Polígono inválido." });
        }

        var shell = _factory.CreateLinearRing(coordenadas.ToArray());
        poligono.Geometria = _factory.CreatePolygon(shell); // Actualiza la geometría

        // 3. Guardar cambios
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error al actualizar", details = ex.Message });
        }

        return NoContent(); // Éxito
    }
>>>>>>> 82f565b (sistema de poligonos funcando de 10)

        _context.Poligonos.Remove(poligono);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}