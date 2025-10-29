using System.ComponentModel.DataAnnotations;
using NetTopologySuite.Geometries;

namespace MapaWeb.Models
{
    public class Marcador
    {
        public int Id { get; set; }

        [Required]
        public string Nombre { get; set; }

        [Required]
        public Point Ubicacion { get; set; }
    }
}